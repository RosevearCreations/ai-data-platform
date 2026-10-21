import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  INTEGRATION_CONTRACTS,
  INTEGRATION_PACKAGE_TTL_MS,
  integrationConsumerConfiguration,
  integrationFingerprint,
  integrationPackageId,
  integrationReplayKey,
  validateIntegrationPackage,
  type ConsumerAcknowledgement,
  type IntegrationOperation,
  type IntegrationPackageV1,
  type IntegrationScalar,
  type IntegrationTarget,
  type LiveConsumerHandshake
} from "./integration-delivery";
import {
  listSuccessiveCycleRecurrencePlanningForUser,
  continuationCycleCorrectivePlanFingerprint,
  type ContinuationCycleCorrectiveDeliveryPlan,
  type SuccessiveCycleRecurrencePlanningModel
} from "./successive-cycle-recurrence-planning";
import {
  loadApprovedSuccessiveCycleCorrectivePlanContext
} from "./successive-cycle-corrective-delivery-execution";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const CONTINUATION_CYCLE_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const CONTINUATION_CYCLE_DELIVERY_RETRY_LIMIT = 5;
export const CONTINUATION_CYCLE_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface ContinuationCycleCorrectiveExecutionContext {
  plan: ContinuationCycleCorrectiveDeliveryPlan;
  predecessorSuccessiveCyclePackage: IntegrationPackageV1;
  continuationCyclePackage: IntegrationPackageV1;
  consumerId: string;
}

export interface ContinuationCycleCorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  continuationCyclePlanId: string;
  successiveCycleRetriageId: string;
  successiveCycleRecurrenceId: string;
  successiveCycleReclosureId: string;
  successiveCycleReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  continuationCyclePlanFingerprint: string;
  sourceSuccessiveCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessiveCycleReclosureFingerprint: string;
  predecessorSuccessiveCyclePlanId: string;
  predecessorSuccessiveCycleDeliveryId: string;
  predecessorSuccessiveCyclePackageId: string;
  predecessorSuccessiveCycleReplayKey: string;
  predecessorSuccessiveCyclePackageFingerprint: string;
  continuationCyclePackageId: string;
  continuationCycleReplayKey: string;
  continuationCyclePackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunHttpStatus: number | null;
  dryRunConsumerReceivedAt: string;
  dryRunAcknowledgement: Record<string, unknown>;
  activationFingerprint: string;
  activatedBy: string;
  activatedAt: string;
  expiresAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  revocationNote: string;
  canManage: boolean;
}

export interface ContinuationCycleCorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  continuationCyclePlanId: string;
  predecessorSuccessiveCycleDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  continuationCyclePlanFingerprint: string;
  activationFingerprint: string;
  continuationCyclePackageId: string;
  continuationCycleReplayKey: string;
  continuationCyclePackageFingerprint: string;
  idempotencyKey: string;
  status: "reserved" | "accepted" | "rejected" | "transport-error";
  attemptCount: number;
  validationCode: string;
  httpStatus: number | null;
  consumerReceivedAt: string | null;
  acknowledgement: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  lastAttemptAt: string;
  updatedAt: string;
  canManage: boolean;
}

export interface ContinuationCycleCorrectiveDeliveryModel {
  planning: SuccessiveCycleRecurrencePlanningModel;
  activations: ContinuationCycleCorrectiveDeliveryActivation[];
  deliveries: ContinuationCycleCorrectiveLiveDelivery[];
  contracts: Array<{
    target: IntegrationTarget;
    configured: boolean;
    endpointOrigin: string | null;
  }>;
  totals: {
    approvedPlans: number;
    approvedPlansWithoutActiveActivation: number;
    activeActivations: number;
    acceptedDeliveries: number;
    retryableTransportErrors: number;
  };
}

type ActivationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role?: WorkspaceRole;
  activation_id: string;
  continuation_cycle_plan_id: string;
  successive_cycle_retriage_id: string;
  successive_cycle_recurrence_id: string;
  successive_cycle_reclosure_id: string;
  successive_cycle_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  continuation_cycle_plan_fingerprint: string;
  source_successive_cycle_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successive_cycle_reclosure_fingerprint: string;
  predecessor_successive_cycle_plan_id: string;
  predecessor_successive_cycle_delivery_id: string;
  predecessor_successive_cycle_package_id: string;
  predecessor_successive_cycle_replay_key: string;
  predecessor_successive_cycle_package_fingerprint: string;
  continuation_cycle_package_id: string;
  continuation_cycle_replay_key: string;
  continuation_cycle_package_fingerprint: string;
  dry_run_validation_code: string;
  dry_run_http_status: number | null;
  dry_run_consumer_received_at: Date;
  dry_run_acknowledgement: Record<string, unknown>;
  activation_fingerprint: string;
  activated_by: string;
  activated_at: Date;
  expires_at: Date;
  revoked_by: string | null;
  revoked_at: Date | null;
  revocation_note: string;
};

type DeliveryRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role?: WorkspaceRole;
  delivery_id: string;
  activation_id: string;
  continuation_cycle_plan_id: string;
  predecessor_successive_cycle_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  continuation_cycle_plan_fingerprint: string;
  activation_fingerprint: string;
  continuation_cycle_package_id: string;
  continuation_cycle_replay_key: string;
  continuation_cycle_package_fingerprint: string;
  idempotency_key: string;
  status: "reserved" | "accepted" | "rejected" | "transport-error";
  attempt_count: number;
  validation_code: string;
  http_status: number | null;
  consumer_received_at: Date | null;
  acknowledgement: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  last_attempt_at: Date;
  updated_at: Date;
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonical(nested)])
    );
  }
  return value;
}

function fingerprint(prefix: string, value: unknown) {
  return prefix + createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function isScalar(value: unknown): value is IntegrationScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

async function requireManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("continuation_cycle_delivery_manager_required");
  }
  return role;
}

export function continuationCycleActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " CONTINUATION-CYCLE CORRECTIVE";
}

export function continuationCycleExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " CONTINUATION-CYCLE CORRECTIVE";
}

export function continuationCycleActivationFingerprint(input: {
  continuationCyclePlanFingerprint: string;
  sourceSuccessiveCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessiveCycleReclosureFingerprint: string;
  consumerId: string;
  continuationCyclePackageId: string;
  continuationCycleReplayKey: string;
  continuationCyclePackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("continuation-cycle-activation1-", input);
}

export function buildContinuationCycleCorrectiveExecutionPackage(
  plan: ContinuationCycleCorrectiveDeliveryPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("continuation_cycle_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = continuationCycleCorrectivePlanFingerprint({
    successiveCycleRetriageId: plan.successiveCycleRetriageId,
    successiveCycleRecurrenceId: plan.successiveCycleRecurrenceId,
    successiveCycleReclosureId: plan.successiveCycleReclosureId,
    successiveCycleReclosureRegressionCheckId: plan.successiveCycleReclosureRegressionCheckId,
    predecessorSuccessiveCyclePlanId: plan.predecessorSuccessiveCyclePlanId,
    predecessorSuccessiveCycleDeliveryId: plan.predecessorSuccessiveCycleDeliveryId,
    sourceSuccessiveCycleRecurrenceFingerprint: plan.sourceSuccessiveCycleRecurrenceFingerprint,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceSuccessiveCycleReclosureFingerprint: plan.sourceSuccessiveCycleReclosureFingerprint,
    sourceSuccessiveCyclePackageId: plan.sourceSuccessiveCyclePackageId,
    sourceSuccessiveCycleReplayKey: plan.sourceSuccessiveCycleReplayKey,
    sourceSuccessiveCyclePackageFingerprint: plan.sourceSuccessiveCyclePackageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("continuation_cycle_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.sourceSuccessiveCyclePackageId ||
    predecessorPackage.replayKey !== plan.sourceSuccessiveCycleReplayKey ||
    predecessorPackage.fingerprint !== plan.sourceSuccessiveCyclePackageFingerprint
  ) {
    throw new Error("continuation_cycle_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("continuation_cycle_delivery_scope_required");
  }

  const predecessorByKey = new Map(
    predecessorPackage.operations.map((operation) => [
      operation.integrationKey,
      operation
    ])
  );
  const seen = new Set<string>();
  const operations: IntegrationOperation[] = [];

  for (const scope of plan.correctionScope) {
    if (seen.has(scope.integrationKey)) {
      throw new Error("continuation_cycle_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("continuation_cycle_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("continuation_cycle_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("continuation_cycle_delivery_scope_field_mismatch");
    }

    const values: Record<string, IntegrationScalar> = {};
    for (const field of governedFields) {
      const desired = scope.desiredValues[field];
      const predecessorValue = predecessor.values[field];
      if (
        !isScalar(desired) ||
        !Object.prototype.hasOwnProperty.call(predecessor.values, field) ||
        !Object.is(desired, predecessorValue)
      ) {
        throw new Error("continuation_cycle_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("continuation_cycle_delivery_restore_requires_predecessor_create");
      }
      action = "create";
    } else {
      action = "update";
    }

    operations.push({
      action,
      integrationKey: scope.integrationKey,
      values,
      sourceEvidence: { ...predecessor.sourceEvidence }
    });
  }

  const approvedAt = plan.reviewedAt;
  const batchId = "continuation-cycle-plan:" + plan.continuationCyclePlanId;
  const contract = INTEGRATION_CONTRACTS[plan.target];
  const packageFingerprint = integrationFingerprint({
    target: plan.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt: predecessorPackage.sourceDatasetUpdatedAt,
    operations
  });
  const packageId = integrationPackageId({
    target: plan.target,
    batchId,
    approvedAt,
    fingerprint: packageFingerprint
  });
  const replayKey = integrationReplayKey({
    target: plan.target,
    packageId,
    fingerprint: packageFingerprint
  });
  const result: IntegrationPackageV1 = {
    version: 1,
    schemaId: contract.schemaId,
    target: plan.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    packageId,
    replayKey,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt: predecessorPackage.sourceDatasetUpdatedAt,
    generatedAt: approvedAt,
    expiresAt: new Date(
      new Date(approvedAt).getTime() + INTEGRATION_PACKAGE_TTL_MS
    ).toISOString(),
    fingerprint: packageFingerprint,
    operations
  };

  if (
    result.packageId === predecessorPackage.packageId ||
    result.replayKey === predecessorPackage.replayKey
  ) {
    throw new Error("continuation_cycle_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("continuation_cycle_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertContinuationCyclePackageExecutable(
  continuationCyclePackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(continuationCyclePackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("continuation_cycle_delivery_plan_window_expired");
  }
}

export async function loadApprovedContinuationCycleCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; continuationCyclePlanId: string; allowClosedCase?: boolean }
): Promise<ContinuationCycleCorrectiveExecutionContext> {
  const planning = await listSuccessiveCycleRecurrencePlanningForUser(userId);
  const plan = planning.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.continuationCyclePlanId === input.continuationCyclePlanId
  );
  if (!plan) throw new Error("continuation_cycle_delivery_plan_not_found");
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("continuation_cycle_delivery_approved_plan_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      successive_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      successive_cycle_reclosure_fingerprint: string;
      latest_successive_cycle_recurrence_id: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              recurrence.successive_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.successive_cycle_reclosure_fingerprint,
              (
                select newest.successive_cycle_recurrence_id
                from app.workspace_reconciliation_successive_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.successive_cycle_recurrence_id desc
                limit 1
              ) as latest_successive_cycle_recurrence_id,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.successive_cycle_package_id as predecessor_package_id,
              predecessor_delivery.successive_cycle_replay_key as predecessor_replay_key,
              predecessor_delivery.successive_cycle_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_continuation_cycle_corrective_delivery_plans p
       join app.workspace_successive_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.successive_cycle_retriage_id=p.successive_cycle_retriage_id
       join app.workspace_reconciliation_successive_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.successive_cycle_recurrence_id=p.successive_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_successive_cycle_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.successive_cycle_plan_id=p.predecessor_successive_cycle_plan_id
       join app.workspace_successive_cycle_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_successive_cycle_delivery_id
       where p.workspace_id=$1 and p.continuation_cycle_plan_id=$2
       limit 1`,
      [input.workspaceId, input.continuationCyclePlanId]
    );
    return result.rows[0] ?? null;
  });

  if (!gate) throw new Error("continuation_cycle_delivery_plan_not_found");
  if (
    gate.plan_status !== "approved" ||
    gate.retriage_status !== "approved" ||
    (!input.allowClosedCase && gate.case_status !== "open") ||
    (input.allowClosedCase && gate.case_status !== "open" && gate.case_status !== "closed")
  ) {
    throw new Error("continuation_cycle_delivery_execution_gate_closed");
  }
  if (
    plan.successiveCycleRecurrenceId !== gate.latest_successive_cycle_recurrence_id ||
    plan.sourceSuccessiveCycleRecurrenceFingerprint !== gate.successive_cycle_recurrence_fingerprint ||
    plan.sourceRegressionFingerprint !== gate.regression_fingerprint ||
    plan.sourceSuccessiveCycleReclosureFingerprint !== gate.successive_cycle_reclosure_fingerprint
  ) {
    throw new Error("continuation_cycle_delivery_successive_cycle_recurrence_identity_changed");
  }
  if (
    gate.predecessor_plan_status !== "approved" ||
    gate.predecessor_delivery_status !== "accepted" ||
    plan.sourceSuccessiveCyclePackageId !== gate.predecessor_package_id ||
    plan.sourceSuccessiveCycleReplayKey !== gate.predecessor_replay_key ||
    plan.sourceSuccessiveCyclePackageFingerprint !== gate.predecessor_package_fingerprint
  ) {
    throw new Error("continuation_cycle_delivery_predecessor_not_accepted");
  }

  const predecessorContext = await loadApprovedSuccessiveCycleCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      successiveCyclePlanId: plan.predecessorSuccessiveCyclePlanId,
      allowClosedCase: input.allowClosedCase
    }
  );
  if (
    predecessorContext.successiveCyclePackage.packageId !== gate.predecessor_package_id ||
    predecessorContext.successiveCyclePackage.replayKey !== gate.predecessor_replay_key ||
    predecessorContext.successiveCyclePackage.fingerprint !== gate.predecessor_package_fingerprint ||
    predecessorContext.consumerId !== gate.consumer_id
  ) {
    throw new Error("continuation_cycle_delivery_predecessor_reconstruction_mismatch");
  }

  const continuationCyclePackage = buildContinuationCycleCorrectiveExecutionPackage(
    plan,
    predecessorContext.successiveCyclePackage
  );

  return {
    plan,
    predecessorSuccessiveCyclePackage: predecessorContext.successiveCyclePackage,
    continuationCyclePackage,
    consumerId: gate.consumer_id
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): ContinuationCycleCorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    continuationCyclePlanId: row.continuation_cycle_plan_id,
    successiveCycleRetriageId: row.successive_cycle_retriage_id,
    successiveCycleRecurrenceId: row.successive_cycle_recurrence_id,
    successiveCycleReclosureId: row.successive_cycle_reclosure_id,
    successiveCycleReclosureRegressionCheckId: row.successive_cycle_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    continuationCyclePlanFingerprint: row.continuation_cycle_plan_fingerprint,
    sourceSuccessiveCycleRecurrenceFingerprint: row.source_successive_cycle_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessiveCycleReclosureFingerprint: row.source_successive_cycle_reclosure_fingerprint,
    predecessorSuccessiveCyclePlanId: row.predecessor_successive_cycle_plan_id,
    predecessorSuccessiveCycleDeliveryId: row.predecessor_successive_cycle_delivery_id,
    predecessorSuccessiveCyclePackageId: row.predecessor_successive_cycle_package_id,
    predecessorSuccessiveCycleReplayKey: row.predecessor_successive_cycle_replay_key,
    predecessorSuccessiveCyclePackageFingerprint:
      row.predecessor_successive_cycle_package_fingerprint,
    continuationCyclePackageId: row.continuation_cycle_package_id,
    continuationCycleReplayKey: row.continuation_cycle_replay_key,
    continuationCyclePackageFingerprint: row.continuation_cycle_package_fingerprint,
    dryRunValidationCode: row.dry_run_validation_code,
    dryRunHttpStatus: row.dry_run_http_status,
    dryRunConsumerReceivedAt: row.dry_run_consumer_received_at.toISOString(),
    dryRunAcknowledgement:
      row.dry_run_acknowledgement &&
      typeof row.dry_run_acknowledgement === "object"
        ? row.dry_run_acknowledgement
        : {},
    activationFingerprint: row.activation_fingerprint,
    activatedBy: row.activated_by,
    activatedAt: row.activated_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at?.toISOString() ?? null,
    revocationNote: row.revocation_note,
    canManage: role === "owner" || role === "admin"
  };
}

function deliveryFromRow(
  row: DeliveryRow,
  role: WorkspaceRole
): ContinuationCycleCorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    continuationCyclePlanId: row.continuation_cycle_plan_id,
    predecessorSuccessiveCycleDeliveryId: row.predecessor_successive_cycle_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    continuationCyclePlanFingerprint: row.continuation_cycle_plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    continuationCyclePackageId: row.continuation_cycle_package_id,
    continuationCycleReplayKey: row.continuation_cycle_replay_key,
    continuationCyclePackageFingerprint: row.continuation_cycle_package_fingerprint,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    attemptCount: Number(row.attempt_count),
    validationCode: row.validation_code,
    httpStatus: row.http_status,
    consumerReceivedAt: row.consumer_received_at?.toISOString() ?? null,
    acknowledgement:
      row.acknowledgement && typeof row.acknowledgement === "object"
        ? row.acknowledgement
        : {},
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    lastAttemptAt: row.last_attempt_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    canManage: role === "owner" || role === "admin"
  };
}

export async function listContinuationCycleCorrectiveDeliveryForUser(
  userId: string
): Promise<ContinuationCycleCorrectiveDeliveryModel> {
  const planning = await listSuccessiveCycleRecurrencePlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name,wm.role
       from app.workspace_continuation_cycle_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=a.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by a.activated_at desc,a.activation_id desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name,wm.role
       from app.workspace_continuation_cycle_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=d.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by d.updated_at desc,d.delivery_id desc
       limit 500`
    );
    return { activations: activations.rows, deliveries: deliveries.rows };
  });

  const activations = data.activations.map((row) =>
    activationFromRow(row, row.role ?? "member")
  );
  const deliveries = data.deliveries.map((row) =>
    deliveryFromRow(row, row.role ?? "member")
  );
  const activePlanIds = new Set(
    activations
      .filter(
        (item) =>
          item.status === "active" &&
          new Date(item.expiresAt).getTime() > Date.now()
      )
      .map((item) => item.workspaceId + ":" + item.continuationCyclePlanId)
  );
  const targets = ["rosie-dazzlers","devil-n-dove"] as const;
  const contracts = targets.map((target) => {
    const config = integrationConsumerConfiguration(target);
    return {
      target,
      configured: config.configured,
      endpointOrigin: config.endpointOrigin
    };
  });

  return {
    planning,
    activations,
    deliveries,
    contracts,
    totals: {
      approvedPlans: planning.plans.filter((item) => item.status === "approved").length,
      approvedPlansWithoutActiveActivation: planning.plans.filter(
        (item) =>
          item.status === "approved" &&
          !activePlanIds.has(item.workspaceId + ":" + item.continuationCyclePlanId)
      ).length,
      activeActivations: activations.filter(
        (item) =>
          item.status === "active" &&
          new Date(item.expiresAt).getTime() > Date.now()
      ).length,
      acceptedDeliveries: deliveries.filter((item) => item.status === "accepted").length,
      retryableTransportErrors: deliveries.filter(
        (item) =>
          item.status === "transport-error" &&
          item.attemptCount < CONTINUATION_CYCLE_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createContinuationCycleCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: ContinuationCycleCorrectiveExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertContinuationCyclePackageExecutable(input.context.continuationCyclePackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("continuation_cycle_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.continuationCyclePackage.target ||
    acknowledgement.packageId !== input.context.continuationCyclePackage.packageId ||
    acknowledgement.replayKey !== input.context.continuationCyclePackage.replayKey ||
    acknowledgement.fingerprint !== input.context.continuationCyclePackage.fingerprint
  ) {
    throw new Error("continuation_cycle_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("continuation_cycle_delivery_consumer_identity_changed");
  }

  const activationFingerprint = continuationCycleActivationFingerprint({
    continuationCyclePlanFingerprint: input.context.plan.planFingerprint,
    sourceSuccessiveCycleRecurrenceFingerprint: input.context.plan.sourceSuccessiveCycleRecurrenceFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    sourceSuccessiveCycleReclosureFingerprint: input.context.plan.sourceSuccessiveCycleReclosureFingerprint,
    consumerId: input.consumerId,
    continuationCyclePackageId: input.context.continuationCyclePackage.packageId,
    continuationCycleReplayKey: input.context.continuationCyclePackage.replayKey,
    continuationCyclePackageFingerprint: input.context.continuationCyclePackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const gate = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      successive_cycle_recurrence_id: string;
      latest_successive_cycle_recurrence_id: string;
      successive_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      successive_cycle_reclosure_fingerprint: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,p.successive_cycle_recurrence_id,
              (
                select newest.successive_cycle_recurrence_id
                from app.workspace_reconciliation_successive_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.successive_cycle_recurrence_id desc
                limit 1
              ) as latest_successive_cycle_recurrence_id,
              recurrence.successive_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.successive_cycle_reclosure_fingerprint,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.successive_cycle_package_id as predecessor_package_id,
              predecessor_delivery.successive_cycle_replay_key as predecessor_replay_key,
              predecessor_delivery.successive_cycle_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_continuation_cycle_corrective_delivery_plans p
       join app.workspace_successive_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.successive_cycle_retriage_id=p.successive_cycle_retriage_id
       join app.workspace_reconciliation_successive_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.successive_cycle_recurrence_id=p.successive_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_successive_cycle_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.successive_cycle_plan_id=p.predecessor_successive_cycle_plan_id
       join app.workspace_successive_cycle_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_successive_cycle_delivery_id
       where p.workspace_id=$1 and p.continuation_cycle_plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.continuationCyclePlanId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("continuation_cycle_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.retriage_status !== "approved" ||
      current.case_status !== "open" ||
      current.successive_cycle_recurrence_id !== current.latest_successive_cycle_recurrence_id
    ) {
      throw new Error("continuation_cycle_delivery_execution_gate_closed");
    }
    if (
      current.successive_cycle_recurrence_fingerprint !== input.context.plan.sourceSuccessiveCycleRecurrenceFingerprint ||
      current.regression_fingerprint !== input.context.plan.sourceRegressionFingerprint ||
      current.successive_cycle_reclosure_fingerprint !== input.context.plan.sourceSuccessiveCycleReclosureFingerprint
    ) {
      throw new Error("continuation_cycle_delivery_successive_cycle_recurrence_identity_changed");
    }
    if (
      current.predecessor_plan_status !== "approved" ||
      current.predecessor_delivery_status !== "accepted" ||
      current.consumer_id !== input.consumerId ||
      current.predecessor_package_id !== input.context.predecessorSuccessiveCyclePackage.packageId ||
      current.predecessor_replay_key !== input.context.predecessorSuccessiveCyclePackage.replayKey ||
      current.predecessor_package_fingerprint !== input.context.predecessorSuccessiveCyclePackage.fingerprint
    ) {
      throw new Error("continuation_cycle_delivery_predecessor_identity_changed");
    }

    await client.query(
      `update app.workspace_continuation_cycle_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and continuation_cycle_plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.continuationCyclePlanId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_continuation_cycle_delivery_activations
       where workspace_id=$1 and continuation_cycle_plan_id=$2
         and status='active' and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.continuationCyclePlanId]
    );
    if (active.rows[0]) {
      if (active.rows[0].activation_fingerprint === activationFingerprint) {
        return active.rows[0].activation_id;
      }
      throw new Error("continuation_cycle_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(
      input.context.continuationCyclePackage.expiresAt
    ).getTime();
    const expiresAt = new Date(
      Math.min(now + CONTINUATION_CYCLE_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("continuation_cycle_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_continuation_cycle_delivery_activations (
        workspace_id,activation_id,continuation_cycle_plan_id,successive_cycle_retriage_id,
        successive_cycle_recurrence_id,successive_cycle_reclosure_id,successive_cycle_reclosure_regression_check_id,case_id,target,
        status,consumer_id,continuation_cycle_plan_fingerprint,
        source_successive_cycle_recurrence_fingerprint,source_regression_fingerprint,
        source_successive_cycle_reclosure_fingerprint,predecessor_successive_cycle_plan_id,
        predecessor_successive_cycle_delivery_id,predecessor_successive_cycle_package_id,
        predecessor_successive_cycle_replay_key,predecessor_successive_cycle_package_fingerprint,
        continuation_cycle_package_id,continuation_cycle_replay_key,
        continuation_cycle_package_fingerprint,dry_run_validation_code,
        dry_run_http_status,dry_run_consumer_received_at,dry_run_acknowledgement,
        activation_fingerprint,activated_by,activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28,now(),$29
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.continuationCyclePlanId,
        input.context.plan.successiveCycleRetriageId,
        input.context.plan.successiveCycleRecurrenceId,
        input.context.plan.successiveCycleReclosureId,
        input.context.plan.successiveCycleReclosureRegressionCheckId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceSuccessiveCycleRecurrenceFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.sourceSuccessiveCycleReclosureFingerprint,
        input.context.plan.predecessorSuccessiveCyclePlanId,
        input.context.plan.predecessorSuccessiveCycleDeliveryId,
        input.context.predecessorSuccessiveCyclePackage.packageId,
        input.context.predecessorSuccessiveCyclePackage.replayKey,
        input.context.predecessorSuccessiveCyclePackage.fingerprint,
        input.context.continuationCyclePackage.packageId,
        input.context.continuationCyclePackage.replayKey,
        input.context.continuationCyclePackage.fingerprint,
        acknowledgement.code.slice(0,96),
        input.dryRunHttpStatus,
        acknowledgement.receivedAt,
        JSON.stringify(input.dryRunAcknowledgement),
        activationFingerprint,
        userId,
        expiresAt.toISOString()
      ]
    );
    return activationId;
  });
}

export async function getActiveContinuationCycleCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    continuationCyclePlanId: string;
    consumerId: string;
    continuationCyclePackage: IntegrationPackageV1;
  }
) {
  assertContinuationCyclePackageExecutable(input.continuationCyclePackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_continuation_cycle_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_continuation_cycle_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id
        and p.continuation_cycle_plan_id=a.continuation_cycle_plan_id
       join app.workspace_successive_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.successive_cycle_retriage_id=p.successive_cycle_retriage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where a.workspace_id=$1 and a.continuation_cycle_plan_id=$2
         and a.status='active' and a.expires_at>now()
         and p.status='approved' and t.status='approved'
         and c.status='open'
       limit 1`,
      [input.workspaceId, input.continuationCyclePlanId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("continuation_cycle_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.continuation_cycle_package_id !== input.continuationCyclePackage.packageId ||
      row.continuation_cycle_replay_key !== input.continuationCyclePackage.replayKey ||
      row.continuation_cycle_package_fingerprint !== input.continuationCyclePackage.fingerprint
    ) {
      throw new Error("continuation_cycle_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentContinuationCycleCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: ContinuationCycleCorrectiveDeliveryActivation;
    plan: ContinuationCycleCorrectiveDeliveryPlan;
    consumerId: string;
    continuationCyclePackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: ContinuationCycleCorrectiveLiveDelivery;
}> {
  assertContinuationCyclePackageExecutable(input.continuationCyclePackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      continuation_cycle_plan_id: string;
      consumer_id: string;
      continuation_cycle_package_id: string;
      continuation_cycle_replay_key: string;
      continuation_cycle_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,continuation_cycle_plan_id,
              consumer_id,continuation_cycle_package_id,continuation_cycle_replay_key,
              continuation_cycle_package_fingerprint
       from app.workspace_continuation_cycle_delivery_activations
       where workspace_id=$1 and activation_id=$2
       limit 1`,
      [input.workspaceId, input.activation.activationId]
    );
    const active = activationResult.rows[0];
    if (
      !active ||
      active.status !== "active" ||
      active.expires_at.getTime() <= Date.now()
    ) {
      throw new Error("continuation_cycle_delivery_activation_required");
    }
    if (
      active.continuation_cycle_plan_id !== input.plan.continuationCyclePlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.continuation_cycle_package_id !== input.continuationCyclePackage.packageId ||
      active.continuation_cycle_replay_key !== input.continuationCyclePackage.replayKey ||
      active.continuation_cycle_package_fingerprint !== input.continuationCyclePackage.fingerprint
    ) {
      throw new Error("continuation_cycle_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_continuation_cycle_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.continuation_cycle_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.continuationCyclePackage.packageId
      ]
    );
    const row = existing.rows[0];
    if (row) {
      const delivery = deliveryFromRow(row, role);
      if (row.status === "accepted") {
        return { shouldSend: false, reason: "accepted", delivery };
      }
      if (row.status === "rejected") {
        return { shouldSend: false, reason: "rejected", delivery };
      }
      const stale =
        Date.now() - row.last_attempt_at.getTime() >=
        CONTINUATION_CYCLE_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= CONTINUATION_CYCLE_DELIVERY_RETRY_LIMIT) {
        throw new Error("continuation_cycle_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_continuation_cycle_corrective_live_deliveries
         set status='reserved',attempt_count=attempt_count+1,
             validation_code='reserved',http_status=null,
             consumer_received_at=null,acknowledgement='{}'::jsonb,
             last_attempt_at=now(),updated_at=now()
         where workspace_id=$1 and delivery_id=$2
         returning *,(
           select name from app.workspaces where id=$1
         ) as workspace_name`,
        [input.workspaceId, row.delivery_id]
      );
      return {
        shouldSend: true,
        reason: "retry",
        delivery: deliveryFromRow(retried.rows[0], role)
      };
    }

    const deliveryId = randomUUID();
    const inserted = await client.query<DeliveryRow>(
      `insert into app.workspace_continuation_cycle_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,continuation_cycle_plan_id,
        predecessor_successive_cycle_delivery_id,target,consumer_id,
        continuation_cycle_plan_fingerprint,activation_fingerprint,
        continuation_cycle_package_id,continuation_cycle_replay_key,
        continuation_cycle_package_fingerprint,idempotency_key,status,attempt_count,
        validation_code,created_by,created_at,last_attempt_at,updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$11,'reserved',1,
        'reserved',$13,now(),now(),now()
      )
      returning *,(
        select name from app.workspaces where id=$1
      ) as workspace_name`,
      [
        input.workspaceId,
        deliveryId,
        input.activation.activationId,
        input.plan.continuationCyclePlanId,
        input.plan.predecessorSuccessiveCycleDeliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.continuationCyclePackage.packageId,
        input.continuationCyclePackage.replayKey,
        input.continuationCyclePackage.fingerprint,
        userId
      ]
    );
    return {
      shouldSend: true,
      reason: "initial",
      delivery: deliveryFromRow(inserted.rows[0], role)
    };
  });
}

export async function finalizeIdempotentContinuationCycleCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    deliveryId: string;
    status: "accepted" | "rejected" | "transport-error";
    validationCode: string;
    httpStatus?: number | null;
    consumerReceivedAt?: string | null;
    acknowledgement?: Record<string, unknown>;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const result = await client.query<DeliveryRow>(
      `update app.workspace_continuation_cycle_corrective_live_deliveries
       set status=$3,validation_code=$4,http_status=$5,
           consumer_received_at=$6,acknowledgement=$7::jsonb,updated_at=now()
       where workspace_id=$1 and delivery_id=$2 and status='reserved'
       returning *,(
         select name from app.workspaces where id=$1
       ) as workspace_name`,
      [
        input.workspaceId,
        input.deliveryId,
        input.status,
        input.validationCode.slice(0,96),
        input.httpStatus ?? null,
        input.consumerReceivedAt ?? null,
        JSON.stringify(input.acknowledgement ?? {})
      ]
    );
    if (!result.rows[0]) {
      throw new Error("continuation_cycle_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeContinuationCycleCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_continuation_cycle_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),revocation_note=$4
       where workspace_id=$1 and activation_id=$2 and status='active'`,
      [
        input.workspaceId,
        input.activationId,
        userId,
        (input.note ?? "").trim().slice(0,4000)
      ]
    );
    if (!result.rowCount) {
      throw new Error("continuation_cycle_delivery_activation_not_active");
    }
  });
}
