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
  listFollowingCycleRecurrencePlanningForUser,
  subsequentCycleCorrectivePlanFingerprint,
  type SubsequentCycleCorrectiveDeliveryPlan,
  type FollowingCycleRecurrencePlanningModel
} from "./following-cycle-recurrence-planning";
import {
  loadApprovedFollowingCycleCorrectivePlanContext
} from "./following-cycle-corrective-delivery-execution";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const SUBSEQUENT_CYCLE_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const SUBSEQUENT_CYCLE_DELIVERY_RETRY_LIMIT = 5;
export const SUBSEQUENT_CYCLE_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface SubsequentCycleCorrectiveExecutionContext {
  plan: SubsequentCycleCorrectiveDeliveryPlan;
  predecessorFollowingCyclePackage: IntegrationPackageV1;
  subsequentCyclePackage: IntegrationPackageV1;
  consumerId: string;
}

export interface SubsequentCycleCorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  subsequentCyclePlanId: string;
  followingCycleRetriageId: string;
  followingCycleRecurrenceId: string;
  followingCycleReclosureId: string;
  followingCycleReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  subsequentCyclePlanFingerprint: string;
  sourceFollowingCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceFollowingCycleReclosureFingerprint: string;
  predecessorFollowingCyclePlanId: string;
  predecessorFollowingCycleDeliveryId: string;
  predecessorFollowingCyclePackageId: string;
  predecessorFollowingCycleReplayKey: string;
  predecessorFollowingCyclePackageFingerprint: string;
  subsequentCyclePackageId: string;
  subsequentCycleReplayKey: string;
  subsequentCyclePackageFingerprint: string;
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

export interface SubsequentCycleCorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  subsequentCyclePlanId: string;
  predecessorFollowingCycleDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  subsequentCyclePlanFingerprint: string;
  activationFingerprint: string;
  subsequentCyclePackageId: string;
  subsequentCycleReplayKey: string;
  subsequentCyclePackageFingerprint: string;
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

export interface SubsequentCycleCorrectiveDeliveryModel {
  planning: FollowingCycleRecurrencePlanningModel;
  activations: SubsequentCycleCorrectiveDeliveryActivation[];
  deliveries: SubsequentCycleCorrectiveLiveDelivery[];
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
  subsequent_cycle_plan_id: string;
  following_cycle_retriage_id: string;
  following_cycle_recurrence_id: string;
  following_cycle_reclosure_id: string;
  following_cycle_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  subsequent_cycle_plan_fingerprint: string;
  source_following_cycle_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_following_cycle_reclosure_fingerprint: string;
  predecessor_following_cycle_plan_id: string;
  predecessor_following_cycle_delivery_id: string;
  predecessor_following_cycle_package_id: string;
  predecessor_following_cycle_replay_key: string;
  predecessor_following_cycle_package_fingerprint: string;
  subsequent_cycle_package_id: string;
  subsequent_cycle_replay_key: string;
  subsequent_cycle_package_fingerprint: string;
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
  subsequent_cycle_plan_id: string;
  predecessor_following_cycle_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  subsequent_cycle_plan_fingerprint: string;
  activation_fingerprint: string;
  subsequent_cycle_package_id: string;
  subsequent_cycle_replay_key: string;
  subsequent_cycle_package_fingerprint: string;
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
    throw new Error("subsequent_cycle_delivery_manager_required");
  }
  return role;
}

export function subsequentCycleActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " SUBSEQUENT-CYCLE CORRECTIVE";
}

export function subsequentCycleExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " SUBSEQUENT-CYCLE CORRECTIVE";
}

export function subsequentCycleActivationFingerprint(input: {
  subsequentCyclePlanFingerprint: string;
  sourceFollowingCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceFollowingCycleReclosureFingerprint: string;
  consumerId: string;
  subsequentCyclePackageId: string;
  subsequentCycleReplayKey: string;
  subsequentCyclePackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("subsequent-cycle-activation1-", input);
}

export function buildSubsequentCycleCorrectiveExecutionPackage(
  plan: SubsequentCycleCorrectiveDeliveryPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("subsequent_cycle_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = subsequentCycleCorrectivePlanFingerprint({
    followingCycleRetriageId: plan.followingCycleRetriageId,
    followingCycleRecurrenceId: plan.followingCycleRecurrenceId,
    followingCycleReclosureId: plan.followingCycleReclosureId,
    followingCycleReclosureRegressionCheckId: plan.followingCycleReclosureRegressionCheckId,
    predecessorFollowingCyclePlanId: plan.predecessorFollowingCyclePlanId,
    predecessorFollowingCycleDeliveryId: plan.predecessorFollowingCycleDeliveryId,
    sourceFollowingCycleRecurrenceFingerprint: plan.sourceFollowingCycleRecurrenceFingerprint,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceFollowingCycleReclosureFingerprint: plan.sourceFollowingCycleReclosureFingerprint,
    sourceFollowingCyclePackageId: plan.sourceFollowingCyclePackageId,
    sourceFollowingCycleReplayKey: plan.sourceFollowingCycleReplayKey,
    sourceFollowingCyclePackageFingerprint: plan.sourceFollowingCyclePackageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("subsequent_cycle_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.sourceFollowingCyclePackageId ||
    predecessorPackage.replayKey !== plan.sourceFollowingCycleReplayKey ||
    predecessorPackage.fingerprint !== plan.sourceFollowingCyclePackageFingerprint
  ) {
    throw new Error("subsequent_cycle_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("subsequent_cycle_delivery_scope_required");
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
      throw new Error("subsequent_cycle_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("subsequent_cycle_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("subsequent_cycle_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("subsequent_cycle_delivery_scope_field_mismatch");
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
        throw new Error("subsequent_cycle_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("subsequent_cycle_delivery_restore_requires_predecessor_create");
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
  const batchId = "subsequent-cycle-plan:" + plan.subsequentCyclePlanId;
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
    throw new Error("subsequent_cycle_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("subsequent_cycle_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertSubsequentCyclePackageExecutable(
  subsequentCyclePackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(subsequentCyclePackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("subsequent_cycle_delivery_plan_window_expired");
  }
}

export async function loadApprovedSubsequentCycleCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; subsequentCyclePlanId: string; allowClosedCase?: boolean }
): Promise<SubsequentCycleCorrectiveExecutionContext> {
  const planning = await listFollowingCycleRecurrencePlanningForUser(userId);
  const plan = planning.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.subsequentCyclePlanId === input.subsequentCyclePlanId
  );
  if (!plan) throw new Error("subsequent_cycle_delivery_plan_not_found");
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("subsequent_cycle_delivery_approved_plan_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      following_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      following_cycle_reclosure_fingerprint: string;
      latest_following_cycle_recurrence_id: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              recurrence.following_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.following_cycle_reclosure_fingerprint,
              (
                select newest.following_cycle_recurrence_id
                from app.workspace_reconciliation_following_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc
                limit 1
              ) as latest_following_cycle_recurrence_id,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.following_cycle_package_id as predecessor_package_id,
              predecessor_delivery.following_cycle_replay_key as predecessor_replay_key,
              predecessor_delivery.following_cycle_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_subsequent_cycle_corrective_delivery_plans p
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_following_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.following_cycle_recurrence_id=p.following_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_following_cycle_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.following_cycle_plan_id=p.predecessor_following_cycle_plan_id
       join app.workspace_following_cycle_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_following_cycle_delivery_id
       where p.workspace_id=$1 and p.subsequent_cycle_plan_id=$2
       limit 1`,
      [input.workspaceId, input.subsequentCyclePlanId]
    );
    return result.rows[0] ?? null;
  });

  if (!gate) throw new Error("subsequent_cycle_delivery_plan_not_found");
  if (
    gate.plan_status !== "approved" ||
    gate.retriage_status !== "approved" ||
    (!input.allowClosedCase && gate.case_status !== "open") ||
    (input.allowClosedCase && gate.case_status !== "open" && gate.case_status !== "closed")
  ) {
    throw new Error("subsequent_cycle_delivery_execution_gate_closed");
  }
  if (
    plan.followingCycleRecurrenceId !== gate.latest_following_cycle_recurrence_id ||
    plan.sourceFollowingCycleRecurrenceFingerprint !== gate.following_cycle_recurrence_fingerprint ||
    plan.sourceRegressionFingerprint !== gate.regression_fingerprint ||
    plan.sourceFollowingCycleReclosureFingerprint !== gate.following_cycle_reclosure_fingerprint
  ) {
    throw new Error("subsequent_cycle_delivery_following_cycle_recurrence_identity_changed");
  }
  if (
    gate.predecessor_plan_status !== "approved" ||
    gate.predecessor_delivery_status !== "accepted" ||
    plan.sourceFollowingCyclePackageId !== gate.predecessor_package_id ||
    plan.sourceFollowingCycleReplayKey !== gate.predecessor_replay_key ||
    plan.sourceFollowingCyclePackageFingerprint !== gate.predecessor_package_fingerprint
  ) {
    throw new Error("subsequent_cycle_delivery_predecessor_not_accepted");
  }

  const predecessorContext = await loadApprovedFollowingCycleCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      followingCyclePlanId: plan.predecessorFollowingCyclePlanId,
      allowClosedCase: input.allowClosedCase
    }
  );
  if (
    predecessorContext.followingCyclePackage.packageId !== gate.predecessor_package_id ||
    predecessorContext.followingCyclePackage.replayKey !== gate.predecessor_replay_key ||
    predecessorContext.followingCyclePackage.fingerprint !== gate.predecessor_package_fingerprint ||
    predecessorContext.consumerId !== gate.consumer_id
  ) {
    throw new Error("subsequent_cycle_delivery_predecessor_reconstruction_mismatch");
  }

  const subsequentCyclePackage = buildSubsequentCycleCorrectiveExecutionPackage(
    plan,
    predecessorContext.followingCyclePackage
  );

  return {
    plan,
    predecessorFollowingCyclePackage: predecessorContext.followingCyclePackage,
    subsequentCyclePackage,
    consumerId: gate.consumer_id
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): SubsequentCycleCorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    subsequentCyclePlanId: row.subsequent_cycle_plan_id,
    followingCycleRetriageId: row.following_cycle_retriage_id,
    followingCycleRecurrenceId: row.following_cycle_recurrence_id,
    followingCycleReclosureId: row.following_cycle_reclosure_id,
    followingCycleReclosureRegressionCheckId: row.following_cycle_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    subsequentCyclePlanFingerprint: row.subsequent_cycle_plan_fingerprint,
    sourceFollowingCycleRecurrenceFingerprint: row.source_following_cycle_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceFollowingCycleReclosureFingerprint: row.source_following_cycle_reclosure_fingerprint,
    predecessorFollowingCyclePlanId: row.predecessor_following_cycle_plan_id,
    predecessorFollowingCycleDeliveryId: row.predecessor_following_cycle_delivery_id,
    predecessorFollowingCyclePackageId: row.predecessor_following_cycle_package_id,
    predecessorFollowingCycleReplayKey: row.predecessor_following_cycle_replay_key,
    predecessorFollowingCyclePackageFingerprint:
      row.predecessor_following_cycle_package_fingerprint,
    subsequentCyclePackageId: row.subsequent_cycle_package_id,
    subsequentCycleReplayKey: row.subsequent_cycle_replay_key,
    subsequentCyclePackageFingerprint: row.subsequent_cycle_package_fingerprint,
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
): SubsequentCycleCorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    subsequentCyclePlanId: row.subsequent_cycle_plan_id,
    predecessorFollowingCycleDeliveryId: row.predecessor_following_cycle_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    subsequentCyclePlanFingerprint: row.subsequent_cycle_plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    subsequentCyclePackageId: row.subsequent_cycle_package_id,
    subsequentCycleReplayKey: row.subsequent_cycle_replay_key,
    subsequentCyclePackageFingerprint: row.subsequent_cycle_package_fingerprint,
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

export async function listSubsequentCycleCorrectiveDeliveryForUser(
  userId: string
): Promise<SubsequentCycleCorrectiveDeliveryModel> {
  const planning = await listFollowingCycleRecurrencePlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name,wm.role
       from app.workspace_subsequent_cycle_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=a.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by a.activated_at desc,a.activation_id desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name,wm.role
       from app.workspace_subsequent_cycle_corrective_live_deliveries d
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
      .map((item) => item.workspaceId + ":" + item.subsequentCyclePlanId)
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
          !activePlanIds.has(item.workspaceId + ":" + item.subsequentCyclePlanId)
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
          item.attemptCount < SUBSEQUENT_CYCLE_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createSubsequentCycleCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: SubsequentCycleCorrectiveExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertSubsequentCyclePackageExecutable(input.context.subsequentCyclePackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("subsequent_cycle_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.subsequentCyclePackage.target ||
    acknowledgement.packageId !== input.context.subsequentCyclePackage.packageId ||
    acknowledgement.replayKey !== input.context.subsequentCyclePackage.replayKey ||
    acknowledgement.fingerprint !== input.context.subsequentCyclePackage.fingerprint
  ) {
    throw new Error("subsequent_cycle_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("subsequent_cycle_delivery_consumer_identity_changed");
  }

  const activationFingerprint = subsequentCycleActivationFingerprint({
    subsequentCyclePlanFingerprint: input.context.plan.planFingerprint,
    sourceFollowingCycleRecurrenceFingerprint: input.context.plan.sourceFollowingCycleRecurrenceFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    sourceFollowingCycleReclosureFingerprint: input.context.plan.sourceFollowingCycleReclosureFingerprint,
    consumerId: input.consumerId,
    subsequentCyclePackageId: input.context.subsequentCyclePackage.packageId,
    subsequentCycleReplayKey: input.context.subsequentCyclePackage.replayKey,
    subsequentCyclePackageFingerprint: input.context.subsequentCyclePackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const gate = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      following_cycle_recurrence_id: string;
      latest_following_cycle_recurrence_id: string;
      following_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      following_cycle_reclosure_fingerprint: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,p.following_cycle_recurrence_id,
              (
                select newest.following_cycle_recurrence_id
                from app.workspace_reconciliation_following_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc
                limit 1
              ) as latest_following_cycle_recurrence_id,
              recurrence.following_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.following_cycle_reclosure_fingerprint,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.following_cycle_package_id as predecessor_package_id,
              predecessor_delivery.following_cycle_replay_key as predecessor_replay_key,
              predecessor_delivery.following_cycle_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_subsequent_cycle_corrective_delivery_plans p
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_following_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.following_cycle_recurrence_id=p.following_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_following_cycle_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.following_cycle_plan_id=p.predecessor_following_cycle_plan_id
       join app.workspace_following_cycle_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_following_cycle_delivery_id
       where p.workspace_id=$1 and p.subsequent_cycle_plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.subsequentCyclePlanId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("subsequent_cycle_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.retriage_status !== "approved" ||
      current.case_status !== "open" ||
      current.following_cycle_recurrence_id !== current.latest_following_cycle_recurrence_id
    ) {
      throw new Error("subsequent_cycle_delivery_execution_gate_closed");
    }
    if (
      current.following_cycle_recurrence_fingerprint !== input.context.plan.sourceFollowingCycleRecurrenceFingerprint ||
      current.regression_fingerprint !== input.context.plan.sourceRegressionFingerprint ||
      current.following_cycle_reclosure_fingerprint !== input.context.plan.sourceFollowingCycleReclosureFingerprint
    ) {
      throw new Error("subsequent_cycle_delivery_following_cycle_recurrence_identity_changed");
    }
    if (
      current.predecessor_plan_status !== "approved" ||
      current.predecessor_delivery_status !== "accepted" ||
      current.consumer_id !== input.consumerId ||
      current.predecessor_package_id !== input.context.predecessorFollowingCyclePackage.packageId ||
      current.predecessor_replay_key !== input.context.predecessorFollowingCyclePackage.replayKey ||
      current.predecessor_package_fingerprint !== input.context.predecessorFollowingCyclePackage.fingerprint
    ) {
      throw new Error("subsequent_cycle_delivery_predecessor_identity_changed");
    }

    await client.query(
      `update app.workspace_subsequent_cycle_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and subsequent_cycle_plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.subsequentCyclePlanId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_subsequent_cycle_delivery_activations
       where workspace_id=$1 and subsequent_cycle_plan_id=$2
         and status='active' and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.subsequentCyclePlanId]
    );
    if (active.rows[0]) {
      if (active.rows[0].activation_fingerprint === activationFingerprint) {
        return active.rows[0].activation_id;
      }
      throw new Error("subsequent_cycle_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(
      input.context.subsequentCyclePackage.expiresAt
    ).getTime();
    const expiresAt = new Date(
      Math.min(now + SUBSEQUENT_CYCLE_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("subsequent_cycle_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_subsequent_cycle_delivery_activations (
        workspace_id,activation_id,subsequent_cycle_plan_id,following_cycle_retriage_id,
        following_cycle_recurrence_id,following_cycle_reclosure_id,following_cycle_reclosure_regression_check_id,case_id,target,
        status,consumer_id,subsequent_cycle_plan_fingerprint,
        source_following_cycle_recurrence_fingerprint,source_regression_fingerprint,
        source_following_cycle_reclosure_fingerprint,predecessor_following_cycle_plan_id,
        predecessor_following_cycle_delivery_id,predecessor_following_cycle_package_id,
        predecessor_following_cycle_replay_key,predecessor_following_cycle_package_fingerprint,
        subsequent_cycle_package_id,subsequent_cycle_replay_key,
        subsequent_cycle_package_fingerprint,dry_run_validation_code,
        dry_run_http_status,dry_run_consumer_received_at,dry_run_acknowledgement,
        activation_fingerprint,activated_by,activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28,now(),$29
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.subsequentCyclePlanId,
        input.context.plan.followingCycleRetriageId,
        input.context.plan.followingCycleRecurrenceId,
        input.context.plan.followingCycleReclosureId,
        input.context.plan.followingCycleReclosureRegressionCheckId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceFollowingCycleRecurrenceFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.sourceFollowingCycleReclosureFingerprint,
        input.context.plan.predecessorFollowingCyclePlanId,
        input.context.plan.predecessorFollowingCycleDeliveryId,
        input.context.predecessorFollowingCyclePackage.packageId,
        input.context.predecessorFollowingCyclePackage.replayKey,
        input.context.predecessorFollowingCyclePackage.fingerprint,
        input.context.subsequentCyclePackage.packageId,
        input.context.subsequentCyclePackage.replayKey,
        input.context.subsequentCyclePackage.fingerprint,
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

export async function getActiveSubsequentCycleCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    subsequentCyclePlanId: string;
    consumerId: string;
    subsequentCyclePackage: IntegrationPackageV1;
  }
) {
  assertSubsequentCyclePackageExecutable(input.subsequentCyclePackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_subsequent_cycle_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_subsequent_cycle_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id
        and p.subsequent_cycle_plan_id=a.subsequent_cycle_plan_id
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where a.workspace_id=$1 and a.subsequent_cycle_plan_id=$2
         and a.status='active' and a.expires_at>now()
         and p.status='approved' and t.status='approved'
         and c.status='open'
       limit 1`,
      [input.workspaceId, input.subsequentCyclePlanId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("subsequent_cycle_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.subsequent_cycle_package_id !== input.subsequentCyclePackage.packageId ||
      row.subsequent_cycle_replay_key !== input.subsequentCyclePackage.replayKey ||
      row.subsequent_cycle_package_fingerprint !== input.subsequentCyclePackage.fingerprint
    ) {
      throw new Error("subsequent_cycle_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentSubsequentCycleCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: SubsequentCycleCorrectiveDeliveryActivation;
    plan: SubsequentCycleCorrectiveDeliveryPlan;
    consumerId: string;
    subsequentCyclePackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: SubsequentCycleCorrectiveLiveDelivery;
}> {
  assertSubsequentCyclePackageExecutable(input.subsequentCyclePackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      subsequent_cycle_plan_id: string;
      consumer_id: string;
      subsequent_cycle_package_id: string;
      subsequent_cycle_replay_key: string;
      subsequent_cycle_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,subsequent_cycle_plan_id,
              consumer_id,subsequent_cycle_package_id,subsequent_cycle_replay_key,
              subsequent_cycle_package_fingerprint
       from app.workspace_subsequent_cycle_delivery_activations
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
      throw new Error("subsequent_cycle_delivery_activation_required");
    }
    if (
      active.subsequent_cycle_plan_id !== input.plan.subsequentCyclePlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.subsequent_cycle_package_id !== input.subsequentCyclePackage.packageId ||
      active.subsequent_cycle_replay_key !== input.subsequentCyclePackage.replayKey ||
      active.subsequent_cycle_package_fingerprint !== input.subsequentCyclePackage.fingerprint
    ) {
      throw new Error("subsequent_cycle_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_subsequent_cycle_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.subsequent_cycle_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.subsequentCyclePackage.packageId
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
        SUBSEQUENT_CYCLE_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= SUBSEQUENT_CYCLE_DELIVERY_RETRY_LIMIT) {
        throw new Error("subsequent_cycle_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_subsequent_cycle_corrective_live_deliveries
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
      `insert into app.workspace_subsequent_cycle_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,subsequent_cycle_plan_id,
        predecessor_following_cycle_delivery_id,target,consumer_id,
        subsequent_cycle_plan_fingerprint,activation_fingerprint,
        subsequent_cycle_package_id,subsequent_cycle_replay_key,
        subsequent_cycle_package_fingerprint,idempotency_key,status,attempt_count,
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
        input.plan.subsequentCyclePlanId,
        input.plan.predecessorFollowingCycleDeliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.subsequentCyclePackage.packageId,
        input.subsequentCyclePackage.replayKey,
        input.subsequentCyclePackage.fingerprint,
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

export async function finalizeIdempotentSubsequentCycleCorrectiveDelivery(
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
      `update app.workspace_subsequent_cycle_corrective_live_deliveries
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
      throw new Error("subsequent_cycle_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeSubsequentCycleCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_subsequent_cycle_delivery_activations
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
      throw new Error("subsequent_cycle_delivery_activation_not_active");
    }
  });
}
