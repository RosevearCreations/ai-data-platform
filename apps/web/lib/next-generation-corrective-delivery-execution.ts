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
  listRecurrentExceptionPlanningForUser,
  nextGenerationCorrectivePlanFingerprint,
  type NextGenerationCorrectiveDeliveryPlan,
  type RecurrentExceptionPlanningModel
} from "./recurrent-exception-planning";
import {
  loadApprovedSuccessorCorrectivePlanContext
} from "./successor-corrective-delivery-execution";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const NEXT_GENERATION_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const NEXT_GENERATION_DELIVERY_RETRY_LIMIT = 5;
export const NEXT_GENERATION_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface NextGenerationCorrectiveExecutionContext {
  plan: NextGenerationCorrectiveDeliveryPlan;
  predecessorSuccessorPackage: IntegrationPackageV1;
  nextGenerationPackage: IntegrationPackageV1;
  consumerId: string;
}

export interface NextGenerationCorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  nextGenerationPlanId: string;
  recurrenceRetriageId: string;
  recurrenceId: string;
  reclosureId: string;
  reclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  nextGenerationPlanFingerprint: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceReclosureFingerprint: string;
  predecessorSuccessorPlanId: string;
  predecessorSuccessorDeliveryId: string;
  predecessorSuccessorPackageId: string;
  predecessorSuccessorReplayKey: string;
  predecessorSuccessorPackageFingerprint: string;
  nextGenerationPackageId: string;
  nextGenerationReplayKey: string;
  nextGenerationPackageFingerprint: string;
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

export interface NextGenerationCorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  nextGenerationPlanId: string;
  predecessorSuccessorDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  nextGenerationPlanFingerprint: string;
  activationFingerprint: string;
  nextGenerationPackageId: string;
  nextGenerationReplayKey: string;
  nextGenerationPackageFingerprint: string;
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

export interface NextGenerationCorrectiveDeliveryModel {
  planning: RecurrentExceptionPlanningModel;
  activations: NextGenerationCorrectiveDeliveryActivation[];
  deliveries: NextGenerationCorrectiveLiveDelivery[];
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
  next_generation_plan_id: string;
  recurrence_retriage_id: string;
  recurrence_id: string;
  reclosure_id: string;
  reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  next_generation_plan_fingerprint: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_reclosure_fingerprint: string;
  predecessor_successor_plan_id: string;
  predecessor_successor_delivery_id: string;
  predecessor_successor_package_id: string;
  predecessor_successor_replay_key: string;
  predecessor_successor_package_fingerprint: string;
  next_generation_package_id: string;
  next_generation_replay_key: string;
  next_generation_package_fingerprint: string;
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
  next_generation_plan_id: string;
  predecessor_successor_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  next_generation_plan_fingerprint: string;
  activation_fingerprint: string;
  next_generation_package_id: string;
  next_generation_replay_key: string;
  next_generation_package_fingerprint: string;
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
    throw new Error("next_generation_delivery_manager_required");
  }
  return role;
}

export function nextGenerationActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " NEXT-GENERATION CORRECTIVE";
}

export function nextGenerationExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " NEXT-GENERATION CORRECTIVE";
}

export function nextGenerationActivationFingerprint(input: {
  nextGenerationPlanFingerprint: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceReclosureFingerprint: string;
  consumerId: string;
  nextGenerationPackageId: string;
  nextGenerationReplayKey: string;
  nextGenerationPackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("next-generation-activation1-", input);
}

export function buildNextGenerationCorrectiveExecutionPackage(
  plan: NextGenerationCorrectiveDeliveryPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("next_generation_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = nextGenerationCorrectivePlanFingerprint({
    recurrenceRetriageId: plan.recurrenceRetriageId,
    recurrenceId: plan.recurrenceId,
    reclosureId: plan.reclosureId,
    reclosureRegressionCheckId: plan.reclosureRegressionCheckId,
    predecessorSuccessorPlanId: plan.predecessorSuccessorPlanId,
    predecessorSuccessorDeliveryId: plan.predecessorSuccessorDeliveryId,
    sourceRecurrenceFingerprint: plan.sourceRecurrenceFingerprint,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceReclosureFingerprint: plan.sourceReclosureFingerprint,
    sourceSuccessorPackageId: plan.sourceSuccessorPackageId,
    sourceSuccessorReplayKey: plan.sourceSuccessorReplayKey,
    sourceSuccessorPackageFingerprint: plan.sourceSuccessorPackageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("next_generation_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.sourceSuccessorPackageId ||
    predecessorPackage.replayKey !== plan.sourceSuccessorReplayKey ||
    predecessorPackage.fingerprint !== plan.sourceSuccessorPackageFingerprint
  ) {
    throw new Error("next_generation_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("next_generation_delivery_scope_required");
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
      throw new Error("next_generation_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("next_generation_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("next_generation_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("next_generation_delivery_scope_field_mismatch");
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
        throw new Error("next_generation_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("next_generation_delivery_restore_requires_predecessor_create");
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
  const batchId = "next-generation-plan:" + plan.nextGenerationPlanId;
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
    throw new Error("next_generation_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("next_generation_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertNextGenerationPackageExecutable(
  nextGenerationPackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(nextGenerationPackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("next_generation_delivery_plan_window_expired");
  }
}

export async function loadApprovedNextGenerationCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; nextGenerationPlanId: string }
): Promise<NextGenerationCorrectiveExecutionContext> {
  const planning = await listRecurrentExceptionPlanningForUser(userId);
  const plan = planning.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.nextGenerationPlanId === input.nextGenerationPlanId
  );
  if (!plan) throw new Error("next_generation_delivery_plan_not_found");
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("next_generation_delivery_approved_plan_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      recurrence_fingerprint: string;
      regression_fingerprint: string;
      reclosure_fingerprint: string;
      latest_recurrence_id: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              recurrence.recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.reclosure_fingerprint,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.successor_package_id as predecessor_package_id,
              predecessor_delivery.successor_replay_key as predecessor_replay_key,
              predecessor_delivery.successor_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_next_generation_corrective_delivery_plans p
       join app.workspace_recurrent_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.recurrence_retriage_id=p.recurrence_retriage_id
       join app.workspace_reconciliation_exception_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.recurrence_id=p.recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_successor_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.successor_plan_id=p.predecessor_successor_plan_id
       join app.workspace_successor_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_successor_delivery_id
       where p.workspace_id=$1 and p.next_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.nextGenerationPlanId]
    );
    return result.rows[0] ?? null;
  });

  if (!gate) throw new Error("next_generation_delivery_plan_not_found");
  if (
    gate.plan_status !== "approved" ||
    gate.retriage_status !== "approved" ||
    gate.case_status !== "open"
  ) {
    throw new Error("next_generation_delivery_execution_gate_closed");
  }
  if (
    plan.recurrenceId !== gate.latest_recurrence_id ||
    plan.sourceRecurrenceFingerprint !== gate.recurrence_fingerprint ||
    plan.sourceRegressionFingerprint !== gate.regression_fingerprint ||
    plan.sourceReclosureFingerprint !== gate.reclosure_fingerprint
  ) {
    throw new Error("next_generation_delivery_recurrence_identity_changed");
  }
  if (
    gate.predecessor_plan_status !== "approved" ||
    gate.predecessor_delivery_status !== "accepted" ||
    plan.sourceSuccessorPackageId !== gate.predecessor_package_id ||
    plan.sourceSuccessorReplayKey !== gate.predecessor_replay_key ||
    plan.sourceSuccessorPackageFingerprint !== gate.predecessor_package_fingerprint
  ) {
    throw new Error("next_generation_delivery_predecessor_not_accepted");
  }

  const predecessorContext = await loadApprovedSuccessorCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      successorPlanId: plan.predecessorSuccessorPlanId
    }
  );
  if (
    predecessorContext.successorPackage.packageId !== gate.predecessor_package_id ||
    predecessorContext.successorPackage.replayKey !== gate.predecessor_replay_key ||
    predecessorContext.successorPackage.fingerprint !== gate.predecessor_package_fingerprint ||
    predecessorContext.consumerId !== gate.consumer_id
  ) {
    throw new Error("next_generation_delivery_predecessor_reconstruction_mismatch");
  }

  const nextGenerationPackage = buildNextGenerationCorrectiveExecutionPackage(
    plan,
    predecessorContext.successorPackage
  );

  return {
    plan,
    predecessorSuccessorPackage: predecessorContext.successorPackage,
    nextGenerationPackage,
    consumerId: gate.consumer_id
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): NextGenerationCorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    nextGenerationPlanId: row.next_generation_plan_id,
    recurrenceRetriageId: row.recurrence_retriage_id,
    recurrenceId: row.recurrence_id,
    reclosureId: row.reclosure_id,
    reclosureRegressionCheckId: row.reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    nextGenerationPlanFingerprint: row.next_generation_plan_fingerprint,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceReclosureFingerprint: row.source_reclosure_fingerprint,
    predecessorSuccessorPlanId: row.predecessor_successor_plan_id,
    predecessorSuccessorDeliveryId: row.predecessor_successor_delivery_id,
    predecessorSuccessorPackageId: row.predecessor_successor_package_id,
    predecessorSuccessorReplayKey: row.predecessor_successor_replay_key,
    predecessorSuccessorPackageFingerprint:
      row.predecessor_successor_package_fingerprint,
    nextGenerationPackageId: row.next_generation_package_id,
    nextGenerationReplayKey: row.next_generation_replay_key,
    nextGenerationPackageFingerprint: row.next_generation_package_fingerprint,
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
): NextGenerationCorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    nextGenerationPlanId: row.next_generation_plan_id,
    predecessorSuccessorDeliveryId: row.predecessor_successor_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    nextGenerationPlanFingerprint: row.next_generation_plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    nextGenerationPackageId: row.next_generation_package_id,
    nextGenerationReplayKey: row.next_generation_replay_key,
    nextGenerationPackageFingerprint: row.next_generation_package_fingerprint,
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

export async function listNextGenerationCorrectiveDeliveryForUser(
  userId: string
): Promise<NextGenerationCorrectiveDeliveryModel> {
  const planning = await listRecurrentExceptionPlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name,wm.role
       from app.workspace_next_generation_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=a.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by a.activated_at desc,a.activation_id desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name,wm.role
       from app.workspace_next_generation_corrective_live_deliveries d
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
      .map((item) => item.workspaceId + ":" + item.nextGenerationPlanId)
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
          !activePlanIds.has(item.workspaceId + ":" + item.nextGenerationPlanId)
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
          item.attemptCount < NEXT_GENERATION_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createNextGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: NextGenerationCorrectiveExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertNextGenerationPackageExecutable(input.context.nextGenerationPackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("next_generation_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.nextGenerationPackage.target ||
    acknowledgement.packageId !== input.context.nextGenerationPackage.packageId ||
    acknowledgement.replayKey !== input.context.nextGenerationPackage.replayKey ||
    acknowledgement.fingerprint !== input.context.nextGenerationPackage.fingerprint
  ) {
    throw new Error("next_generation_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("next_generation_delivery_consumer_identity_changed");
  }

  const activationFingerprint = nextGenerationActivationFingerprint({
    nextGenerationPlanFingerprint: input.context.plan.planFingerprint,
    sourceRecurrenceFingerprint: input.context.plan.sourceRecurrenceFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    sourceReclosureFingerprint: input.context.plan.sourceReclosureFingerprint,
    consumerId: input.consumerId,
    nextGenerationPackageId: input.context.nextGenerationPackage.packageId,
    nextGenerationReplayKey: input.context.nextGenerationPackage.replayKey,
    nextGenerationPackageFingerprint: input.context.nextGenerationPackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const gate = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      recurrence_id: string;
      latest_recurrence_id: string;
      recurrence_fingerprint: string;
      regression_fingerprint: string;
      reclosure_fingerprint: string;
      predecessor_plan_status: string;
      predecessor_delivery_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,p.recurrence_id,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id,
              recurrence.recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.reclosure_fingerprint,
              predecessor_plan.status as predecessor_plan_status,
              predecessor_delivery.status as predecessor_delivery_status,
              predecessor_delivery.consumer_id,
              predecessor_delivery.successor_package_id as predecessor_package_id,
              predecessor_delivery.successor_replay_key as predecessor_replay_key,
              predecessor_delivery.successor_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_next_generation_corrective_delivery_plans p
       join app.workspace_recurrent_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.recurrence_retriage_id=p.recurrence_retriage_id
       join app.workspace_reconciliation_exception_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.recurrence_id=p.recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_successor_corrective_delivery_plans predecessor_plan
         on predecessor_plan.workspace_id=p.workspace_id
        and predecessor_plan.successor_plan_id=p.predecessor_successor_plan_id
       join app.workspace_successor_corrective_live_deliveries predecessor_delivery
         on predecessor_delivery.workspace_id=p.workspace_id
        and predecessor_delivery.delivery_id=p.predecessor_successor_delivery_id
       where p.workspace_id=$1 and p.next_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.nextGenerationPlanId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("next_generation_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.retriage_status !== "approved" ||
      current.case_status !== "open" ||
      current.recurrence_id !== current.latest_recurrence_id
    ) {
      throw new Error("next_generation_delivery_execution_gate_closed");
    }
    if (
      current.recurrence_fingerprint !== input.context.plan.sourceRecurrenceFingerprint ||
      current.regression_fingerprint !== input.context.plan.sourceRegressionFingerprint ||
      current.reclosure_fingerprint !== input.context.plan.sourceReclosureFingerprint
    ) {
      throw new Error("next_generation_delivery_recurrence_identity_changed");
    }
    if (
      current.predecessor_plan_status !== "approved" ||
      current.predecessor_delivery_status !== "accepted" ||
      current.consumer_id !== input.consumerId ||
      current.predecessor_package_id !== input.context.predecessorSuccessorPackage.packageId ||
      current.predecessor_replay_key !== input.context.predecessorSuccessorPackage.replayKey ||
      current.predecessor_package_fingerprint !== input.context.predecessorSuccessorPackage.fingerprint
    ) {
      throw new Error("next_generation_delivery_predecessor_identity_changed");
    }

    await client.query(
      `update app.workspace_next_generation_corrective_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and next_generation_plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.nextGenerationPlanId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_next_generation_corrective_delivery_activations
       where workspace_id=$1 and next_generation_plan_id=$2
         and status='active' and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.nextGenerationPlanId]
    );
    if (active.rows[0]) {
      if (active.rows[0].activation_fingerprint === activationFingerprint) {
        return active.rows[0].activation_id;
      }
      throw new Error("next_generation_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(
      input.context.nextGenerationPackage.expiresAt
    ).getTime();
    const expiresAt = new Date(
      Math.min(now + NEXT_GENERATION_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("next_generation_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_next_generation_corrective_delivery_activations (
        workspace_id,activation_id,next_generation_plan_id,recurrence_retriage_id,
        recurrence_id,reclosure_id,reclosure_regression_check_id,case_id,target,
        status,consumer_id,next_generation_plan_fingerprint,
        source_recurrence_fingerprint,source_regression_fingerprint,
        source_reclosure_fingerprint,predecessor_successor_plan_id,
        predecessor_successor_delivery_id,predecessor_successor_package_id,
        predecessor_successor_replay_key,predecessor_successor_package_fingerprint,
        next_generation_package_id,next_generation_replay_key,
        next_generation_package_fingerprint,dry_run_validation_code,
        dry_run_http_status,dry_run_consumer_received_at,dry_run_acknowledgement,
        activation_fingerprint,activated_by,activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,$28,now(),$29
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.nextGenerationPlanId,
        input.context.plan.recurrenceRetriageId,
        input.context.plan.recurrenceId,
        input.context.plan.reclosureId,
        input.context.plan.reclosureRegressionCheckId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceRecurrenceFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.sourceReclosureFingerprint,
        input.context.plan.predecessorSuccessorPlanId,
        input.context.plan.predecessorSuccessorDeliveryId,
        input.context.predecessorSuccessorPackage.packageId,
        input.context.predecessorSuccessorPackage.replayKey,
        input.context.predecessorSuccessorPackage.fingerprint,
        input.context.nextGenerationPackage.packageId,
        input.context.nextGenerationPackage.replayKey,
        input.context.nextGenerationPackage.fingerprint,
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

export async function getActiveNextGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    nextGenerationPlanId: string;
    consumerId: string;
    nextGenerationPackage: IntegrationPackageV1;
  }
) {
  assertNextGenerationPackageExecutable(input.nextGenerationPackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_next_generation_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_next_generation_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id
        and p.next_generation_plan_id=a.next_generation_plan_id
       join app.workspace_recurrent_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.recurrence_retriage_id=p.recurrence_retriage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where a.workspace_id=$1 and a.next_generation_plan_id=$2
         and a.status='active' and a.expires_at>now()
         and p.status='approved' and t.status='approved'
         and c.status='open'
       limit 1`,
      [input.workspaceId, input.nextGenerationPlanId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("next_generation_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.next_generation_package_id !== input.nextGenerationPackage.packageId ||
      row.next_generation_replay_key !== input.nextGenerationPackage.replayKey ||
      row.next_generation_package_fingerprint !== input.nextGenerationPackage.fingerprint
    ) {
      throw new Error("next_generation_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentNextGenerationCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: NextGenerationCorrectiveDeliveryActivation;
    plan: NextGenerationCorrectiveDeliveryPlan;
    consumerId: string;
    nextGenerationPackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: NextGenerationCorrectiveLiveDelivery;
}> {
  assertNextGenerationPackageExecutable(input.nextGenerationPackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      next_generation_plan_id: string;
      consumer_id: string;
      next_generation_package_id: string;
      next_generation_replay_key: string;
      next_generation_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,next_generation_plan_id,
              consumer_id,next_generation_package_id,next_generation_replay_key,
              next_generation_package_fingerprint
       from app.workspace_next_generation_corrective_delivery_activations
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
      throw new Error("next_generation_delivery_activation_required");
    }
    if (
      active.next_generation_plan_id !== input.plan.nextGenerationPlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.next_generation_package_id !== input.nextGenerationPackage.packageId ||
      active.next_generation_replay_key !== input.nextGenerationPackage.replayKey ||
      active.next_generation_package_fingerprint !== input.nextGenerationPackage.fingerprint
    ) {
      throw new Error("next_generation_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_next_generation_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.next_generation_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.nextGenerationPackage.packageId
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
        NEXT_GENERATION_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= NEXT_GENERATION_DELIVERY_RETRY_LIMIT) {
        throw new Error("next_generation_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_next_generation_corrective_live_deliveries
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
      `insert into app.workspace_next_generation_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,next_generation_plan_id,
        predecessor_successor_delivery_id,target,consumer_id,
        next_generation_plan_fingerprint,activation_fingerprint,
        next_generation_package_id,next_generation_replay_key,
        next_generation_package_fingerprint,idempotency_key,status,attempt_count,
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
        input.plan.nextGenerationPlanId,
        input.plan.predecessorSuccessorDeliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.nextGenerationPackage.packageId,
        input.nextGenerationPackage.replayKey,
        input.nextGenerationPackage.fingerprint,
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

export async function finalizeIdempotentNextGenerationCorrectiveDelivery(
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
      `update app.workspace_next_generation_corrective_live_deliveries
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
      throw new Error("next_generation_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeNextGenerationCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_next_generation_corrective_delivery_activations
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
      throw new Error("next_generation_delivery_activation_not_active");
    }
  });
}
