import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  INTEGRATION_CONTRACTS,
  INTEGRATION_PACKAGE_TTL_MS,
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
  correctivePlanFingerprint,
  listReconciliationExceptionTriageForUser,
  type CorrectiveDeliveryPlan,
  type CorrectivePlanScopeItem,
  type ReconciliationExceptionTriageModel
} from "./reconciliation-exception-triage";
import { loadAcceptedDeliveryReconciliationContext } from "./post-delivery-reconciliation";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const CORRECTIVE_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const CORRECTIVE_DELIVERY_RETRY_LIMIT = 5;
export const CORRECTIVE_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface CorrectivePlanExecutionContext {
  plan: CorrectiveDeliveryPlan;
  sourcePackage: IntegrationPackageV1;
  correctivePackage: IntegrationPackageV1;
  consumerId: string;
  reconciliationCreatedAt: string;
}

export interface CorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  planId: string;
  caseId: string;
  reconciliationId: string;
  sourceDeliveryId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  planFingerprint: string;
  sourcePackageId: string;
  sourceReplayKey: string;
  sourcePackageFingerprint: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
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

export interface CorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  planId: string;
  sourceDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  planFingerprint: string;
  activationFingerprint: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
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

export interface CorrectiveDeliveryModel {
  triage: ReconciliationExceptionTriageModel;
  activations: CorrectiveDeliveryActivation[];
  deliveries: CorrectiveLiveDelivery[];
  totals: {
    approvedPlans: number;
    approvedPlansWithoutActiveActivation: number;
    activeActivations: number;
    acceptedDeliveries: number;
    retryableTransportErrors: number;
  };
}

type ApprovedPlanRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  plan_id: string;
  case_id: string;
  reconciliation_id: string;
  delivery_id: string;
  target: IntegrationTarget;
  plan_status: "approved";
  case_status: string;
  reconciliation_status: string;
  reconciliation_created_at: Date;
  latest_reconciliation_id: string;
  source_delivery_status: string;
  consumer_id: string;
  reconciliation_fingerprint: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  correction_scope: CorrectivePlanScopeItem[];
  plan_fingerprint: string;
  rationale: string;
  created_by: string;
  created_at: Date;
  reviewed_by: string;
  reviewed_at: Date;
  review_note: string;
};

type ActivationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  activation_id: string;
  plan_id: string;
  case_id: string;
  reconciliation_id: string;
  source_delivery_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  plan_fingerprint: string;
  source_package_id: string;
  source_replay_key: string;
  source_package_fingerprint: string;
  corrective_package_id: string;
  corrective_replay_key: string;
  corrective_package_fingerprint: string;
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
  delivery_id: string;
  activation_id: string;
  plan_id: string;
  source_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  plan_fingerprint: string;
  activation_fingerprint: string;
  corrective_package_id: string;
  corrective_replay_key: string;
  corrective_package_fingerprint: string;
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
  return (
    prefix +
    createHash("sha256")
      .update(JSON.stringify(canonical(value)))
      .digest("hex")
  );
}

function isScalar(value: unknown): value is IntegrationScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function equalScalar(left: IntegrationScalar, right: IntegrationScalar) {
  return Object.is(left, right);
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
    throw new Error("corrective_delivery_manager_required");
  }
  return role;
}

export function correctiveActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " CORRECTIVE";
}

export function correctiveExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " CORRECTIVE";
}

export function correctiveActivationFingerprint(input: {
  planFingerprint: string;
  consumerId: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("corrective-activation1-", input);
}

function planFromApprovedRow(row: ApprovedPlanRow): CorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    planId: row.plan_id,
    caseId: row.case_id,
    reconciliationId: row.reconciliation_id,
    deliveryId: row.delivery_id,
    target: row.target,
    status: "approved",
    reconciliationFingerprint: row.reconciliation_fingerprint,
    packageId: row.package_id,
    replayKey: row.replay_key,
    packageFingerprint: row.package_fingerprint,
    correctionScope: Array.isArray(row.correction_scope)
      ? row.correction_scope
      : [],
    planFingerprint: row.plan_fingerprint,
    rationale: row.rationale,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at.toISOString(),
    reviewNote: row.review_note,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export function buildCorrectiveExecutionPackage(
  plan: CorrectiveDeliveryPlan,
  sourcePackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("corrective_delivery_approved_plan_required");
  }
  if (
    sourcePackage.target !== plan.target ||
    sourcePackage.packageId !== plan.packageId ||
    sourcePackage.replayKey !== plan.replayKey ||
    sourcePackage.fingerprint !== plan.packageFingerprint
  ) {
    throw new Error("corrective_delivery_source_package_identity_mismatch");
  }

  const expectedPlanFingerprint = correctivePlanFingerprint({
    reconciliationFingerprint: plan.reconciliationFingerprint,
    packageId: plan.packageId,
    replayKey: plan.replayKey,
    packageFingerprint: plan.packageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("corrective_delivery_plan_fingerprint_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("corrective_delivery_scope_required");
  }

  const sourceByKey = new Map(
    sourcePackage.operations.map((operation) => [
      operation.integrationKey,
      operation
    ])
  );
  const seen = new Set<string>();
  const operations: IntegrationOperation[] = [];

  for (const scope of plan.correctionScope) {
    if (seen.has(scope.integrationKey)) {
      throw new Error("corrective_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const source = sourceByKey.get(scope.integrationKey);
    if (!source) {
      throw new Error("corrective_delivery_scope_source_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("corrective_delivery_manual_review_unresolved");
    }
    const governedFields = [...scope.governedFields].sort();
    if (!governedFields.length) {
      throw new Error("corrective_delivery_scope_fields_required");
    }
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("corrective_delivery_scope_field_mismatch");
    }

    const values: Record<string, IntegrationScalar> = {};
    for (const field of governedFields) {
      const desired = scope.desiredValues[field];
      const sourceValue = source.values[field];
      if (
        !isScalar(desired) ||
        !Object.prototype.hasOwnProperty.call(source.values, field) ||
        !equalScalar(desired, sourceValue)
      ) {
        throw new Error("corrective_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (source.action !== "create") {
        throw new Error("corrective_delivery_restore_requires_original_create");
      }
      action = "create";
    } else {
      action = "update";
    }

    operations.push({
      action,
      integrationKey: scope.integrationKey,
      values,
      sourceEvidence: { ...source.sourceEvidence }
    });
  }

  const approvedAt = plan.reviewedAt;
  const generatedAt = approvedAt;
  const expiresAt = new Date(
    new Date(approvedAt).getTime() + INTEGRATION_PACKAGE_TTL_MS
  ).toISOString();
  const batchId = "corrective-plan:" + plan.planId;
  const contract = INTEGRATION_CONTRACTS[plan.target];
  const packageFingerprint = integrationFingerprint({
    target: plan.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt: sourcePackage.sourceDatasetUpdatedAt,
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
    sourceDatasetUpdatedAt: sourcePackage.sourceDatasetUpdatedAt,
    generatedAt,
    expiresAt,
    fingerprint: packageFingerprint,
    operations
  };

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error(
      "corrective_delivery_package_invalid:" + validation.code
    );
  }
  return result;
}

export function assertCorrectivePackageExecutable(
  correctivePackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(correctivePackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("corrective_delivery_plan_window_expired");
  }
}

export async function loadApprovedCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; planId: string }
): Promise<CorrectivePlanExecutionContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<ApprovedPlanRow>(
      `select p.workspace_id,w.name as workspace_name,wm.role,
              p.plan_id,p.case_id,p.reconciliation_id,p.delivery_id,p.target,
              p.status as plan_status,c.status as case_status,
              r.status as reconciliation_status,r.created_at as reconciliation_created_at,
              (
                select newest.reconciliation_id
                from app.workspace_live_delivery_reconciliations newest
                where newest.workspace_id=p.workspace_id
                  and newest.delivery_id=p.delivery_id
                order by newest.created_at desc,newest.reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              d.status as source_delivery_status,d.consumer_id,
              p.reconciliation_fingerprint,p.package_id,p.replay_key,
              p.package_fingerprint,p.correction_scope,p.plan_fingerprint,
              p.rationale,p.created_by,p.created_at,p.reviewed_by,p.reviewed_at,
              p.review_note
       from app.workspace_corrective_delivery_plans p
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_live_delivery_reconciliations r
         on r.workspace_id=p.workspace_id
        and r.reconciliation_id=p.reconciliation_id
       join app.workspace_publication_live_deliveries d
         on d.workspace_id=p.workspace_id and d.delivery_id=p.delivery_id
       join app.workspaces w on w.id=p.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=p.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       where p.workspace_id=$1 and p.plan_id=$2
       limit 1`,
      [input.workspaceId, input.planId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("corrective_delivery_plan_not_found");
  if (
    row.plan_status !== "approved" ||
    row.case_status !== "approved" ||
    !row.reviewed_by ||
    !row.reviewed_at
  ) {
    throw new Error("corrective_delivery_approved_plan_required");
  }
  if (row.reconciliation_status !== "drift") {
    throw new Error("corrective_delivery_drift_required");
  }
  if (row.latest_reconciliation_id !== row.reconciliation_id) {
    throw new Error("corrective_delivery_reconciliation_superseded");
  }
  if (row.source_delivery_status !== "accepted") {
    throw new Error("corrective_delivery_accepted_source_required");
  }

  const plan = planFromApprovedRow(row);
  const source = await loadAcceptedDeliveryReconciliationContext(userId, {
    workspaceId: input.workspaceId,
    deliveryId: plan.deliveryId
  });
  const correctivePackage = buildCorrectiveExecutionPackage(
    plan,
    source.package
  );
  return {
    plan,
    sourcePackage: source.package,
    correctivePackage,
    consumerId: row.consumer_id,
    reconciliationCreatedAt: row.reconciliation_created_at.toISOString()
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): CorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    planId: row.plan_id,
    caseId: row.case_id,
    reconciliationId: row.reconciliation_id,
    sourceDeliveryId: row.source_delivery_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
    sourcePackageId: row.source_package_id,
    sourceReplayKey: row.source_replay_key,
    sourcePackageFingerprint: row.source_package_fingerprint,
    correctivePackageId: row.corrective_package_id,
    correctiveReplayKey: row.corrective_replay_key,
    correctivePackageFingerprint: row.corrective_package_fingerprint,
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
): CorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    planId: row.plan_id,
    sourceDeliveryId: row.source_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    correctivePackageId: row.corrective_package_id,
    correctiveReplayKey: row.corrective_replay_key,
    correctivePackageFingerprint: row.corrective_package_fingerprint,
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

export async function listCorrectiveDeliveryForUser(
  userId: string
): Promise<CorrectiveDeliveryModel> {
  const triage = await listReconciliationExceptionTriageForUser(userId);
  const roles = new Map(
    triage.reconciliation.live.bridge.workspaces.map((workspace) => [
      workspace.id,
      workspace.role
    ])
  );
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       order by a.activated_at desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       order by d.updated_at desc
       limit 500`
    );
    return { activations: activations.rows, deliveries: deliveries.rows };
  });

  const activations = data.activations.map((row) =>
    activationFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const deliveries = data.deliveries.map((row) =>
    deliveryFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const now = Date.now();
  const activePlanIds = new Set(
    activations
      .filter(
        (activation) =>
          activation.status === "active" &&
          new Date(activation.expiresAt).getTime() > now
      )
      .map((activation) => activation.workspaceId + ":" + activation.planId)
  );
  const approvedPlans = triage.plans.filter((plan) => plan.status === "approved");

  return {
    triage,
    activations,
    deliveries,
    totals: {
      approvedPlans: approvedPlans.length,
      approvedPlansWithoutActiveActivation: approvedPlans.filter(
        (plan) => !activePlanIds.has(plan.workspaceId + ":" + plan.planId)
      ).length,
      activeActivations: activePlanIds.size,
      acceptedDeliveries: deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ).length,
      retryableTransportErrors: deliveries.filter(
        (delivery) =>
          delivery.status === "transport-error" &&
          delivery.attemptCount < CORRECTIVE_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: CorrectivePlanExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertCorrectivePackageExecutable(input.context.correctivePackage);
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("corrective_delivery_live_capability_required");
  }
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.correctivePackage.target ||
    acknowledgement.packageId !== input.context.correctivePackage.packageId ||
    acknowledgement.replayKey !== input.context.correctivePackage.replayKey ||
    acknowledgement.fingerprint !== input.context.correctivePackage.fingerprint
  ) {
    throw new Error("corrective_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("corrective_delivery_consumer_identity_changed");
  }

  const activationFingerprint = correctiveActivationFingerprint({
    planFingerprint: input.context.plan.planFingerprint,
    consumerId: input.consumerId,
    correctivePackageId: input.context.correctivePackage.packageId,
    correctiveReplayKey: input.context.correctivePackage.replayKey,
    correctivePackageFingerprint: input.context.correctivePackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const gate = await client.query<{
      plan_status: string;
      case_status: string;
      reviewed_at: Date | null;
      latest_reconciliation_id: string;
      consumer_id: string;
    }>(
      `select p.status as plan_status,c.status as case_status,p.reviewed_at,
              (
                select newest.reconciliation_id
                from app.workspace_live_delivery_reconciliations newest
                where newest.workspace_id=p.workspace_id
                  and newest.delivery_id=p.delivery_id
                order by newest.created_at desc,newest.reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              d.consumer_id
       from app.workspace_corrective_delivery_plans p
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_publication_live_deliveries d
         on d.workspace_id=p.workspace_id and d.delivery_id=p.delivery_id
       where p.workspace_id=$1 and p.plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.planId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("corrective_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.case_status !== "approved" ||
      !current.reviewed_at
    ) {
      throw new Error("corrective_delivery_approved_plan_required");
    }
    if (
      current.latest_reconciliation_id !==
      input.context.plan.reconciliationId
    ) {
      throw new Error("corrective_delivery_reconciliation_superseded");
    }
    if (current.consumer_id !== input.consumerId) {
      throw new Error("corrective_delivery_consumer_identity_changed");
    }

    await client.query(
      `update app.workspace_corrective_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.planId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_corrective_delivery_activations
       where workspace_id=$1 and plan_id=$2 and status='active'
         and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.planId]
    );
    if (active.rows[0]) {
      if (
        active.rows[0].activation_fingerprint === activationFingerprint
      ) {
        return active.rows[0].activation_id;
      }
      throw new Error("corrective_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(
      input.context.correctivePackage.expiresAt
    ).getTime();
    const expiresAt = new Date(
      Math.min(now + CORRECTIVE_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("corrective_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_corrective_delivery_activations (
        workspace_id,activation_id,plan_id,case_id,reconciliation_id,
        source_delivery_id,target,status,consumer_id,plan_fingerprint,
        source_package_id,source_replay_key,source_package_fingerprint,
        corrective_package_id,corrective_replay_key,
        corrective_package_fingerprint,dry_run_validation_code,
        dry_run_http_status,dry_run_consumer_received_at,
        dry_run_acknowledgement,activation_fingerprint,activated_by,
        activated_at,expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19::jsonb,$20,$21,now(),$22
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.planId,
        input.context.plan.caseId,
        input.context.plan.reconciliationId,
        input.context.plan.deliveryId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.sourcePackage.packageId,
        input.context.sourcePackage.replayKey,
        input.context.sourcePackage.fingerprint,
        input.context.correctivePackage.packageId,
        input.context.correctivePackage.replayKey,
        input.context.correctivePackage.fingerprint,
        acknowledgement.code.slice(0, 96),
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

export async function getActiveCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    planId: string;
    consumerId: string;
    correctivePackage: IntegrationPackageV1;
  }
) {
  assertCorrectivePackageExecutable(input.correctivePackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id and p.plan_id=a.plan_id
       where a.workspace_id=$1 and a.plan_id=$2 and a.status='active'
         and a.expires_at>now() and p.status='approved'
       limit 1`,
      [input.workspaceId, input.planId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("corrective_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.corrective_package_id !== input.correctivePackage.packageId ||
      row.corrective_replay_key !== input.correctivePackage.replayKey ||
      row.corrective_package_fingerprint !== input.correctivePackage.fingerprint
    ) {
      throw new Error("corrective_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: CorrectiveDeliveryActivation;
    plan: CorrectiveDeliveryPlan;
    consumerId: string;
    correctivePackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: CorrectiveLiveDelivery;
}> {
  assertCorrectivePackageExecutable(input.correctivePackage);
  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      plan_id: string;
      consumer_id: string;
      corrective_package_id: string;
      corrective_replay_key: string;
      corrective_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,plan_id,consumer_id,
              corrective_package_id,corrective_replay_key,
              corrective_package_fingerprint
       from app.workspace_corrective_delivery_activations
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
      throw new Error("corrective_delivery_activation_required");
    }
    if (
      active.plan_id !== input.plan.planId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.corrective_package_id !== input.correctivePackage.packageId ||
      active.corrective_replay_key !== input.correctivePackage.replayKey ||
      active.corrective_package_fingerprint !== input.correctivePackage.fingerprint
    ) {
      throw new Error("corrective_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.corrective_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.correctivePackage.packageId
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
        CORRECTIVE_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= CORRECTIVE_DELIVERY_RETRY_LIMIT) {
        throw new Error("corrective_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_corrective_live_deliveries
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
      `insert into app.workspace_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,plan_id,source_delivery_id,
        target,consumer_id,plan_fingerprint,activation_fingerprint,
        corrective_package_id,corrective_replay_key,
        corrective_package_fingerprint,idempotency_key,status,attempt_count,
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
        input.plan.planId,
        input.plan.deliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.correctivePackage.packageId,
        input.correctivePackage.replayKey,
        input.correctivePackage.fingerprint,
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

export async function finalizeIdempotentCorrectiveDelivery(
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
      `update app.workspace_corrective_live_deliveries
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
        input.validationCode.slice(0, 96),
        input.httpStatus ?? null,
        input.consumerReceivedAt ?? null,
        JSON.stringify(input.acknowledgement ?? {})
      ]
    );
    if (!result.rows[0]) {
      throw new Error("corrective_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_corrective_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),revocation_note=$4
       where workspace_id=$1 and activation_id=$2 and status='active'`,
      [
        input.workspaceId,
        input.activationId,
        userId,
        (input.note ?? "").trim().slice(0, 4000)
      ]
    );
    if (!result.rowCount) {
      throw new Error("corrective_delivery_activation_not_active");
    }
  });
}
