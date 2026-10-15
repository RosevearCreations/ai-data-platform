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
  listSubsequentGenerationRecurrencePlanningForUser,
  successiveGenerationCorrectivePlanFingerprint,
  type SuccessiveGenerationCorrectiveDeliveryPlan,
  type SubsequentGenerationRecurrencePlanningModel
} from "./subsequent-generation-recurrence-planning";
import {
  loadApprovedSubsequentGenerationCorrectivePlanContext
} from "./subsequent-generation-corrective-delivery-execution";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const SUCCESSIVE_GENERATION_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const SUCCESSIVE_GENERATION_DELIVERY_RETRY_LIMIT = 5;
export const SUCCESSIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface SuccessiveGenerationCorrectiveExecutionContext {
  plan: SuccessiveGenerationCorrectiveDeliveryPlan;
  predecessorSubsequentGenerationPackage: IntegrationPackageV1;
  successiveGenerationPackage: IntegrationPackageV1;
  consumerId: string;
}

export interface SuccessiveGenerationCorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  successiveGenerationPlanId: string;
  subsequentGenerationRetriageId: string;
  subsequentGenerationRecurrenceId: string;
  subsequentGenerationReclosureId: string;
  subsequentGenerationReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  successiveGenerationPlanFingerprint: string;
  sourceSubsequentGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSubsequentGenerationReclosureFingerprint: string;
  predecessorSubsequentGenerationPlanId: string;
  predecessorSubsequentGenerationDeliveryId: string;
  predecessorSubsequentGenerationPackageId: string;
  predecessorSubsequentGenerationReplayKey: string;
  predecessorSubsequentGenerationPackageFingerprint: string;
  successiveGenerationPackageId: string;
  successiveGenerationReplayKey: string;
  successiveGenerationPackageFingerprint: string;
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

export interface SuccessiveGenerationCorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  successiveGenerationPlanId: string;
  predecessorSubsequentGenerationDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  successiveGenerationPlanFingerprint: string;
  activationFingerprint: string;
  successiveGenerationPackageId: string;
  successiveGenerationReplayKey: string;
  successiveGenerationPackageFingerprint: string;
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

export interface SuccessiveGenerationCorrectiveDeliveryModel {
  planning: SubsequentGenerationRecurrencePlanningModel;
  activations: SuccessiveGenerationCorrectiveDeliveryActivation[];
  deliveries: SuccessiveGenerationCorrectiveLiveDelivery[];
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
  successive_generation_plan_id: string;
  subsequent_generation_retriage_id: string;
  subsequent_generation_recurrence_id: string;
  subsequent_generation_reclosure_id: string;
  subsequent_generation_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  successive_generation_plan_fingerprint: string;
  source_subsequent_generation_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_subsequent_generation_reclosure_fingerprint: string;
  predecessor_subsequent_generation_plan_id: string;
  predecessor_subsequent_generation_delivery_id: string;
  predecessor_subsequent_generation_package_id: string;
  predecessor_subsequent_generation_replay_key: string;
  predecessor_subsequent_generation_package_fingerprint: string;
  successive_generation_package_id: string;
  successive_generation_replay_key: string;
  successive_generation_package_fingerprint: string;
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
  successive_generation_plan_id: string;
  predecessor_subsequent_generation_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  successive_generation_plan_fingerprint: string;
  activation_fingerprint: string;
  successive_generation_package_id: string;
  successive_generation_replay_key: string;
  successive_generation_package_fingerprint: string;
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
    throw new Error("successive_generation_delivery_manager_required");
  }
  return role;
}

export function successiveGenerationActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " SUCCESSIVE-GENERATION CORRECTIVE";
}

export function successiveGenerationExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " SUCCESSIVE-GENERATION CORRECTIVE";
}

export function successiveGenerationActivationFingerprint(input: {
  successiveGenerationPlanFingerprint: string;
  sourceSubsequentGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSubsequentGenerationReclosureFingerprint: string;
  consumerId: string;
  successiveGenerationPackageId: string;
  successiveGenerationReplayKey: string;
  successiveGenerationPackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("successive-generation-activation1-", input);
}

export function buildSuccessiveGenerationCorrectiveExecutionPackage(
  plan: SuccessiveGenerationCorrectiveDeliveryPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("successive_generation_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = successiveGenerationCorrectivePlanFingerprint({
    subsequentGenerationRetriageId: plan.subsequentGenerationRetriageId,
    subsequentGenerationRecurrenceId: plan.subsequentGenerationRecurrenceId,
    subsequentGenerationReclosureId: plan.subsequentGenerationReclosureId,
    subsequentGenerationReclosureRegressionCheckId: plan.subsequentGenerationReclosureRegressionCheckId,
    predecessorSubsequentGenerationPlanId: plan.predecessorSubsequentGenerationPlanId,
    predecessorSubsequentGenerationDeliveryId: plan.predecessorSubsequentGenerationDeliveryId,
    sourceSubsequentGenerationRecurrenceFingerprint: plan.sourceSubsequentGenerationRecurrenceFingerprint,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceSubsequentGenerationReclosureFingerprint: plan.sourceSubsequentGenerationReclosureFingerprint,
    sourceSubsequentGenerationPackageId: plan.sourceSubsequentGenerationPackageId,
    sourceSubsequentGenerationReplayKey: plan.sourceSubsequentGenerationReplayKey,
    sourceSubsequentGenerationPackageFingerprint: plan.sourceSubsequentGenerationPackageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("successive_generation_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.sourceSubsequentGenerationPackageId ||
    predecessorPackage.replayKey !== plan.sourceSubsequentGenerationReplayKey ||
    predecessorPackage.fingerprint !== plan.sourceSubsequentGenerationPackageFingerprint
  ) {
    throw new Error("successive_generation_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("successive_generation_delivery_scope_required");
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
      throw new Error("successive_generation_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("successive_generation_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("successive_generation_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("successive_generation_delivery_scope_field_mismatch");
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
        throw new Error("successive_generation_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("successive_generation_delivery_restore_requires_predecessor_create");
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
  const batchId = "successive-generation-plan:" + plan.successiveGenerationPlanId;
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
    throw new Error("successive_generation_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("successive_generation_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertSuccessiveGenerationPackageExecutable(
  successiveGenerationPackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(successiveGenerationPackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("successive_generation_delivery_plan_window_expired");
  }
}

export async function loadApprovedSuccessiveGenerationCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; successiveGenerationPlanId: string; allowClosedCase?: boolean }
): Promise<SuccessiveGenerationCorrectiveExecutionContext> {
  const planning = await listSubsequentGenerationRecurrencePlanningForUser(userId);
  const plan = planning.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.successiveGenerationPlanId === input.successiveGenerationPlanId
  );
  if (!plan) throw new Error("successive_generation_delivery_plan_not_found");
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("successive_generation_delivery_approved_plan_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      subsequent_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      subsequent_generation_reclosure_fingerprint: string;
      latest_subsequent_generation_recurrence_id: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              recurrence.subsequent_generation_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.subsequent_generation_reclosure_fingerprint,
              (
                select newest.subsequent_generation_recurrence_id
                from app.workspace_reconciliation_subsequent_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.subsequent_generation_recurrence_id desc
                limit 1
              ) as latest_subsequent_generation_recurrence_id,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.subsequent_generation_package_id as predecessor_package_id,
              predecessor_delivery.subsequent_generation_replay_key as predecessor_replay_key,
              predecessor_delivery.subsequent_generation_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_successive_generation_corrective_delivery_plans p
       join app.workspace_subsequent_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_generation_retriage_id=p.subsequent_generation_retriage_id
       join app.workspace_reconciliation_subsequent_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.subsequent_generation_recurrence_id=p.subsequent_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_subsequent_generation_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.subsequent_generation_plan_id=p.predecessor_subsequent_generation_plan_id
       join app.workspace_subsequent_generation_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_subsequent_generation_delivery_id
       where p.workspace_id=$1 and p.successive_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.successiveGenerationPlanId]
    );
    return result.rows[0] ?? null;
  });

  if (!gate) throw new Error("successive_generation_delivery_plan_not_found");
  if (
    gate.plan_status !== "approved" ||
    gate.retriage_status !== "approved" ||
    (!input.allowClosedCase && gate.case_status !== "open") ||
    (input.allowClosedCase && gate.case_status !== "open" && gate.case_status !== "closed")
  ) {
    throw new Error("successive_generation_delivery_execution_gate_closed");
  }
  if (
    plan.subsequentGenerationRecurrenceId !== gate.latest_subsequent_generation_recurrence_id ||
    plan.sourceSubsequentGenerationRecurrenceFingerprint !== gate.subsequent_generation_recurrence_fingerprint ||
    plan.sourceRegressionFingerprint !== gate.regression_fingerprint ||
    plan.sourceSubsequentGenerationReclosureFingerprint !== gate.subsequent_generation_reclosure_fingerprint
  ) {
    throw new Error("successive_generation_delivery_subsequent_generation_recurrence_identity_changed");
  }
  if (
    gate.predecessor_plan_status !== "approved" ||
    gate.predecessor_delivery_status !== "accepted" ||
    plan.sourceSubsequentGenerationPackageId !== gate.predecessor_package_id ||
    plan.sourceSubsequentGenerationReplayKey !== gate.predecessor_replay_key ||
    plan.sourceSubsequentGenerationPackageFingerprint !== gate.predecessor_package_fingerprint
  ) {
    throw new Error("successive_generation_delivery_predecessor_not_accepted");
  }

  const predecessorContext = await loadApprovedSubsequentGenerationCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      subsequentGenerationPlanId: plan.predecessorSubsequentGenerationPlanId,
      allowClosedCase: input.allowClosedCase
    }
  );
  if (
    predecessorContext.subsequentGenerationPackage.packageId !== gate.predecessor_package_id ||
    predecessorContext.subsequentGenerationPackage.replayKey !== gate.predecessor_replay_key ||
    predecessorContext.subsequentGenerationPackage.fingerprint !== gate.predecessor_package_fingerprint ||
    predecessorContext.consumerId !== gate.consumer_id
  ) {
    throw new Error("successive_generation_delivery_predecessor_reconstruction_mismatch");
  }

  const successiveGenerationPackage = buildSuccessiveGenerationCorrectiveExecutionPackage(
    plan,
    predecessorContext.subsequentGenerationPackage
  );

  return {
    plan,
    predecessorSubsequentGenerationPackage: predecessorContext.subsequentGenerationPackage,
    successiveGenerationPackage,
    consumerId: gate.consumer_id
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): SuccessiveGenerationCorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    successiveGenerationPlanId: row.successive_generation_plan_id,
    subsequentGenerationRetriageId: row.subsequent_generation_retriage_id,
    subsequentGenerationRecurrenceId: row.subsequent_generation_recurrence_id,
    subsequentGenerationReclosureId: row.subsequent_generation_reclosure_id,
    subsequentGenerationReclosureRegressionCheckId: row.subsequent_generation_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    successiveGenerationPlanFingerprint: row.successive_generation_plan_fingerprint,
    sourceSubsequentGenerationRecurrenceFingerprint: row.source_subsequent_generation_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSubsequentGenerationReclosureFingerprint: row.source_subsequent_generation_reclosure_fingerprint,
    predecessorSubsequentGenerationPlanId: row.predecessor_subsequent_generation_plan_id,
    predecessorSubsequentGenerationDeliveryId: row.predecessor_subsequent_generation_delivery_id,
    predecessorSubsequentGenerationPackageId: row.predecessor_subsequent_generation_package_id,
    predecessorSubsequentGenerationReplayKey: row.predecessor_subsequent_generation_replay_key,
    predecessorSubsequentGenerationPackageFingerprint:
      row.predecessor_subsequent_generation_package_fingerprint,
    successiveGenerationPackageId: row.successive_generation_package_id,
    successiveGenerationReplayKey: row.successive_generation_replay_key,
    successiveGenerationPackageFingerprint: row.successive_generation_package_fingerprint,
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
): SuccessiveGenerationCorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    successiveGenerationPlanId: row.successive_generation_plan_id,
    predecessorSubsequentGenerationDeliveryId: row.predecessor_subsequent_generation_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    successiveGenerationPlanFingerprint: row.successive_generation_plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    successiveGenerationPackageId: row.successive_generation_package_id,
    successiveGenerationReplayKey: row.successive_generation_replay_key,
    successiveGenerationPackageFingerprint: row.successive_generation_package_fingerprint,
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

export async function listSuccessiveGenerationCorrectiveDeliveryForUser(
  userId: string
): Promise<SuccessiveGenerationCorrectiveDeliveryModel> {
  const planning = await listSubsequentGenerationRecurrencePlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name,wm.role
       from app.workspace_successive_generation_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=a.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by a.activated_at desc,a.activation_id desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name,wm.role
       from app.workspace_successive_generation_corrective_live_deliveries d
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
      .map((item) => item.workspaceId + ":" + item.successiveGenerationPlanId)
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
          !activePlanIds.has(item.workspaceId + ":" + item.successiveGenerationPlanId)
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
          item.attemptCount < SUCCESSIVE_GENERATION_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createSuccessiveGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: SuccessiveGenerationCorrectiveExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertSuccessiveGenerationPackageExecutable(input.context.successiveGenerationPackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("successive_generation_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.successiveGenerationPackage.target ||
    acknowledgement.packageId !== input.context.successiveGenerationPackage.packageId ||
    acknowledgement.replayKey !== input.context.successiveGenerationPackage.replayKey ||
    acknowledgement.fingerprint !== input.context.successiveGenerationPackage.fingerprint
  ) {
    throw new Error("successive_generation_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("successive_generation_delivery_consumer_identity_changed");
  }

  const activationFingerprint = successiveGenerationActivationFingerprint({
    successiveGenerationPlanFingerprint: input.context.plan.planFingerprint,
    sourceSubsequentGenerationRecurrenceFingerprint: input.context.plan.sourceSubsequentGenerationRecurrenceFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    sourceSubsequentGenerationReclosureFingerprint: input.context.plan.sourceSubsequentGenerationReclosureFingerprint,
    consumerId: input.consumerId,
    successiveGenerationPackageId: input.context.successiveGenerationPackage.packageId,
    successiveGenerationReplayKey: input.context.successiveGenerationPackage.replayKey,
    successiveGenerationPackageFingerprint: input.context.successiveGenerationPackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const gate = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      subsequent_generation_recurrence_id: string;
      latest_subsequent_generation_recurrence_id: string;
      subsequent_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      subsequent_generation_reclosure_fingerprint: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,p.subsequent_generation_recurrence_id,
              (
                select newest.subsequent_generation_recurrence_id
                from app.workspace_reconciliation_subsequent_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.subsequent_generation_recurrence_id desc
                limit 1
              ) as latest_subsequent_generation_recurrence_id,
              recurrence.subsequent_generation_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.subsequent_generation_reclosure_fingerprint,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.subsequent_generation_package_id as predecessor_package_id,
              predecessor_delivery.subsequent_generation_replay_key as predecessor_replay_key,
              predecessor_delivery.subsequent_generation_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_successive_generation_corrective_delivery_plans p
       join app.workspace_subsequent_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_generation_retriage_id=p.subsequent_generation_retriage_id
       join app.workspace_reconciliation_subsequent_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.subsequent_generation_recurrence_id=p.subsequent_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_subsequent_generation_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.subsequent_generation_plan_id=p.predecessor_subsequent_generation_plan_id
       join app.workspace_subsequent_generation_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_subsequent_generation_delivery_id
       where p.workspace_id=$1 and p.successive_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.successiveGenerationPlanId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("successive_generation_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.retriage_status !== "approved" ||
      current.case_status !== "open" ||
      current.subsequent_generation_recurrence_id !== current.latest_subsequent_generation_recurrence_id
    ) {
      throw new Error("successive_generation_delivery_execution_gate_closed");
    }
    if (
      current.subsequent_generation_recurrence_fingerprint !== input.context.plan.sourceSubsequentGenerationRecurrenceFingerprint ||
      current.regression_fingerprint !== input.context.plan.sourceRegressionFingerprint ||
      current.subsequent_generation_reclosure_fingerprint !== input.context.plan.sourceSubsequentGenerationReclosureFingerprint
    ) {
      throw new Error("successive_generation_delivery_subsequent_generation_recurrence_identity_changed");
    }
    if (
      current.predecessor_plan_status !== "approved" ||
      current.predecessor_delivery_status !== "accepted" ||
      current.consumer_id !== input.consumerId ||
      current.predecessor_package_id !== input.context.predecessorSubsequentGenerationPackage.packageId ||
      current.predecessor_replay_key !== input.context.predecessorSubsequentGenerationPackage.replayKey ||
      current.predecessor_package_fingerprint !== input.context.predecessorSubsequentGenerationPackage.fingerprint
    ) {
      throw new Error("successive_generation_delivery_predecessor_identity_changed");
    }

    await client.query(
      `update app.workspace_successive_generation_corrective_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and successive_generation_plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.successiveGenerationPlanId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_successive_generation_corrective_delivery_activations
       where workspace_id=$1 and successive_generation_plan_id=$2
         and status='active' and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.successiveGenerationPlanId]
    );
    if (active.rows[0]) {
      if (active.rows[0].activation_fingerprint === activationFingerprint) {
        return active.rows[0].activation_id;
      }
      throw new Error("successive_generation_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(
      input.context.successiveGenerationPackage.expiresAt
    ).getTime();
    const expiresAt = new Date(
      Math.min(now + SUCCESSIVE_GENERATION_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("successive_generation_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_successive_generation_corrective_delivery_activations (
        workspace_id,activation_id,successive_generation_plan_id,subsequent_generation_retriage_id,
        subsequent_generation_recurrence_id,subsequent_generation_reclosure_id,subsequent_generation_reclosure_regression_check_id,case_id,target,
        status,consumer_id,successive_generation_plan_fingerprint,
        source_subsequent_generation_recurrence_fingerprint,source_regression_fingerprint,
        source_subsequent_generation_reclosure_fingerprint,predecessor_subsequent_generation_plan_id,
        predecessor_subsequent_generation_delivery_id,predecessor_subsequent_generation_package_id,
        predecessor_subsequent_generation_replay_key,predecessor_subsequent_generation_package_fingerprint,
        successive_generation_package_id,successive_generation_replay_key,
        successive_generation_package_fingerprint,dry_run_validation_code,
        dry_run_http_status,dry_run_consumer_received_at,dry_run_acknowledgement,
        activation_fingerprint,activated_by,activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28,now(),$29
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.successiveGenerationPlanId,
        input.context.plan.subsequentGenerationRetriageId,
        input.context.plan.subsequentGenerationRecurrenceId,
        input.context.plan.subsequentGenerationReclosureId,
        input.context.plan.subsequentGenerationReclosureRegressionCheckId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceSubsequentGenerationRecurrenceFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.sourceSubsequentGenerationReclosureFingerprint,
        input.context.plan.predecessorSubsequentGenerationPlanId,
        input.context.plan.predecessorSubsequentGenerationDeliveryId,
        input.context.predecessorSubsequentGenerationPackage.packageId,
        input.context.predecessorSubsequentGenerationPackage.replayKey,
        input.context.predecessorSubsequentGenerationPackage.fingerprint,
        input.context.successiveGenerationPackage.packageId,
        input.context.successiveGenerationPackage.replayKey,
        input.context.successiveGenerationPackage.fingerprint,
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

export async function getActiveSuccessiveGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    successiveGenerationPlanId: string;
    consumerId: string;
    successiveGenerationPackage: IntegrationPackageV1;
  }
) {
  assertSuccessiveGenerationPackageExecutable(input.successiveGenerationPackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_successive_generation_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_successive_generation_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id
        and p.successive_generation_plan_id=a.successive_generation_plan_id
       join app.workspace_subsequent_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_generation_retriage_id=p.subsequent_generation_retriage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where a.workspace_id=$1 and a.successive_generation_plan_id=$2
         and a.status='active' and a.expires_at>now()
         and p.status='approved' and t.status='approved'
         and c.status='open'
       limit 1`,
      [input.workspaceId, input.successiveGenerationPlanId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("successive_generation_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.successive_generation_package_id !== input.successiveGenerationPackage.packageId ||
      row.successive_generation_replay_key !== input.successiveGenerationPackage.replayKey ||
      row.successive_generation_package_fingerprint !== input.successiveGenerationPackage.fingerprint
    ) {
      throw new Error("successive_generation_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentSuccessiveGenerationCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: SuccessiveGenerationCorrectiveDeliveryActivation;
    plan: SuccessiveGenerationCorrectiveDeliveryPlan;
    consumerId: string;
    successiveGenerationPackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: SuccessiveGenerationCorrectiveLiveDelivery;
}> {
  assertSuccessiveGenerationPackageExecutable(input.successiveGenerationPackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      successive_generation_plan_id: string;
      consumer_id: string;
      successive_generation_package_id: string;
      successive_generation_replay_key: string;
      successive_generation_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,successive_generation_plan_id,
              consumer_id,successive_generation_package_id,successive_generation_replay_key,
              successive_generation_package_fingerprint
       from app.workspace_successive_generation_corrective_delivery_activations
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
      throw new Error("successive_generation_delivery_activation_required");
    }
    if (
      active.successive_generation_plan_id !== input.plan.successiveGenerationPlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.successive_generation_package_id !== input.successiveGenerationPackage.packageId ||
      active.successive_generation_replay_key !== input.successiveGenerationPackage.replayKey ||
      active.successive_generation_package_fingerprint !== input.successiveGenerationPackage.fingerprint
    ) {
      throw new Error("successive_generation_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_successive_generation_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.successive_generation_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.successiveGenerationPackage.packageId
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
        SUCCESSIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= SUCCESSIVE_GENERATION_DELIVERY_RETRY_LIMIT) {
        throw new Error("successive_generation_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_successive_generation_corrective_live_deliveries
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
      `insert into app.workspace_successive_generation_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,successive_generation_plan_id,
        predecessor_subsequent_generation_delivery_id,target,consumer_id,
        successive_generation_plan_fingerprint,activation_fingerprint,
        successive_generation_package_id,successive_generation_replay_key,
        successive_generation_package_fingerprint,idempotency_key,status,attempt_count,
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
        input.plan.successiveGenerationPlanId,
        input.plan.predecessorSubsequentGenerationDeliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.successiveGenerationPackage.packageId,
        input.successiveGenerationPackage.replayKey,
        input.successiveGenerationPackage.fingerprint,
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

export async function finalizeIdempotentSuccessiveGenerationCorrectiveDelivery(
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
      `update app.workspace_successive_generation_corrective_live_deliveries
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
      throw new Error("successive_generation_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeSuccessiveGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_successive_generation_corrective_delivery_activations
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
      throw new Error("successive_generation_delivery_activation_not_active");
    }
  });
}
