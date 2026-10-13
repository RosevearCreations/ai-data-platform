import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  buildCorrectiveExecutionPackage
} from "./corrective-delivery-execution";
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
import { loadAcceptedDeliveryReconciliationContext } from "./post-delivery-reconciliation";
import {
  listReopenedExceptionPlanningForUser,
  successorCorrectivePlanFingerprint,
  type ReopenedExceptionPlanningModel,
  type SuccessorCorrectiveDeliveryPlan
} from "./reopened-exception-planning";
import type {
  CorrectiveDeliveryPlan,
  CorrectivePlanScopeItem
} from "./reconciliation-exception-triage";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export const SUCCESSOR_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const SUCCESSOR_DELIVERY_RETRY_LIMIT = 5;
export const SUCCESSOR_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;

export interface SuccessorCorrectiveExecutionContext {
  plan: SuccessorCorrectiveDeliveryPlan;
  predecessorPlan: CorrectiveDeliveryPlan;
  predecessorPackage: IntegrationPackageV1;
  successorPackage: IntegrationPackageV1;
  consumerId: string;
}

export interface SuccessorCorrectiveDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  successorPlanId: string;
  retriageId: string;
  reopenId: string;
  regressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumerId: string;
  successorPlanFingerprint: string;
  sourceRegressionFingerprint: string;
  predecessorCorrectiveDeliveryId: string;
  predecessorCorrectivePackageId: string;
  predecessorCorrectiveReplayKey: string;
  predecessorCorrectivePackageFingerprint: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
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

export interface SuccessorCorrectiveLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  successorPlanId: string;
  predecessorCorrectiveDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  successorPlanFingerprint: string;
  activationFingerprint: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
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

export interface SuccessorCorrectiveDeliveryModel {
  planning: ReopenedExceptionPlanningModel;
  activations: SuccessorCorrectiveDeliveryActivation[];
  deliveries: SuccessorCorrectiveLiveDelivery[];
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

type ContextRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  successor_plan_id: string;
  retriage_id: string;
  reopen_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  successor_plan_status: "approved";
  successor_plan_fingerprint: string;
  successor_plan_rationale: string;
  successor_plan_created_by: string;
  successor_plan_created_at: Date;
  successor_plan_reviewed_by: string;
  successor_plan_reviewed_at: Date;
  successor_plan_review_note: string;
  source_regression_fingerprint: string;
  plan_source_corrective_package_id: string;
  plan_source_corrective_replay_key: string;
  plan_source_corrective_package_fingerprint: string;
  correction_scope: CorrectivePlanScopeItem[];
  retriage_status: string;
  case_status: string;
  regression_status: string;
  regression_fingerprint: string;
  predecessor_plan_id: string;
  predecessor_reconciliation_id: string;
  predecessor_source_delivery_id: string;
  predecessor_reconciliation_fingerprint: string;
  predecessor_source_package_id: string;
  predecessor_source_replay_key: string;
  predecessor_source_package_fingerprint: string;
  predecessor_correction_scope: CorrectivePlanScopeItem[];
  predecessor_plan_fingerprint: string;
  predecessor_plan_rationale: string;
  predecessor_plan_created_by: string;
  predecessor_plan_created_at: Date;
  predecessor_plan_reviewed_by: string;
  predecessor_plan_reviewed_at: Date;
  predecessor_plan_review_note: string;
  predecessor_corrective_delivery_id: string;
  predecessor_delivery_status: string;
  consumer_id: string;
  predecessor_corrective_package_id: string;
  predecessor_corrective_replay_key: string;
  predecessor_corrective_package_fingerprint: string;
};

type ActivationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  activation_id: string;
  successor_plan_id: string;
  retriage_id: string;
  reopen_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: "active" | "revoked";
  consumer_id: string;
  successor_plan_fingerprint: string;
  source_regression_fingerprint: string;
  predecessor_corrective_delivery_id: string;
  predecessor_corrective_package_id: string;
  predecessor_corrective_replay_key: string;
  predecessor_corrective_package_fingerprint: string;
  successor_package_id: string;
  successor_replay_key: string;
  successor_package_fingerprint: string;
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
  successor_plan_id: string;
  predecessor_corrective_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  successor_plan_fingerprint: string;
  activation_fingerprint: string;
  successor_package_id: string;
  successor_replay_key: string;
  successor_package_fingerprint: string;
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
    throw new Error("successor_delivery_manager_required");
  }
  return role;
}

export function successorActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " SUCCESSOR CORRECTIVE";
}

export function successorExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " SUCCESSOR CORRECTIVE";
}

export function successorActivationFingerprint(input: {
  successorPlanFingerprint: string;
  sourceRegressionFingerprint: string;
  consumerId: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("successor-activation1-", input);
}

export function buildSuccessorCorrectiveExecutionPackage(
  plan: SuccessorCorrectiveDeliveryPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("successor_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = successorCorrectivePlanFingerprint({
    retriageId: plan.retriageId,
    reopenId: plan.reopenId,
    regressionCheckId: plan.regressionCheckId,
    predecessorPlanId: plan.predecessorPlanId,
    predecessorCorrectiveDeliveryId: plan.predecessorCorrectiveDeliveryId,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceCorrectivePackageId: plan.sourceCorrectivePackageId,
    sourceCorrectiveReplayKey: plan.sourceCorrectiveReplayKey,
    sourceCorrectivePackageFingerprint: plan.sourceCorrectivePackageFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("successor_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.sourceCorrectivePackageId ||
    predecessorPackage.replayKey !== plan.sourceCorrectiveReplayKey ||
    predecessorPackage.fingerprint !== plan.sourceCorrectivePackageFingerprint
  ) {
    throw new Error("successor_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("successor_delivery_scope_required");
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
      throw new Error("successor_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);

    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("successor_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("successor_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("successor_delivery_scope_field_mismatch");
    }

    const values: Record<string, IntegrationScalar> = {};
    for (const field of governedFields) {
      const desired = scope.desiredValues[field];
      const predecessorValue = predecessor.values[field];
      if (
        !isScalar(desired) ||
        !Object.prototype.hasOwnProperty.call(predecessor.values, field) ||
        !equalScalar(desired, predecessorValue)
      ) {
        throw new Error("successor_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("successor_delivery_restore_requires_predecessor_create");
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
  const batchId = "successor-plan:" + plan.successorPlanId;
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
    throw new Error("successor_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("successor_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertSuccessorPackageExecutable(
  successorPackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(successorPackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("successor_delivery_plan_window_expired");
  }
}

function predecessorPlanFromRow(row: ContextRow): CorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    planId: row.predecessor_plan_id,
    caseId: row.case_id,
    reconciliationId: row.predecessor_reconciliation_id,
    deliveryId: row.predecessor_source_delivery_id,
    target: row.target,
    status: "approved",
    reconciliationFingerprint: row.predecessor_reconciliation_fingerprint,
    packageId: row.predecessor_source_package_id,
    replayKey: row.predecessor_source_replay_key,
    packageFingerprint: row.predecessor_source_package_fingerprint,
    correctionScope: Array.isArray(row.predecessor_correction_scope)
      ? row.predecessor_correction_scope
      : [],
    planFingerprint: row.predecessor_plan_fingerprint,
    rationale: row.predecessor_plan_rationale,
    createdBy: row.predecessor_plan_created_by,
    createdAt: row.predecessor_plan_created_at.toISOString(),
    reviewedBy: row.predecessor_plan_reviewed_by,
    reviewedAt: row.predecessor_plan_reviewed_at.toISOString(),
    reviewNote: row.predecessor_plan_review_note,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function successorPlanFromRow(row: ContextRow): SuccessorCorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successorPlanId: row.successor_plan_id,
    retriageId: row.retriage_id,
    reopenId: row.reopen_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: "approved",
    predecessorPlanId: row.predecessor_plan_id,
    predecessorCorrectiveDeliveryId: row.predecessor_corrective_delivery_id,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceCorrectivePackageId: row.plan_source_corrective_package_id,
    sourceCorrectiveReplayKey: row.plan_source_corrective_replay_key,
    sourceCorrectivePackageFingerprint: row.plan_source_corrective_package_fingerprint,
    correctionScope: Array.isArray(row.correction_scope) ? row.correction_scope : [],
    planFingerprint: row.successor_plan_fingerprint,
    rationale: row.successor_plan_rationale,
    createdBy: row.successor_plan_created_by,
    createdAt: row.successor_plan_created_at.toISOString(),
    reviewedBy: row.successor_plan_reviewed_by,
    reviewedAt: row.successor_plan_reviewed_at.toISOString(),
    reviewNote: row.successor_plan_review_note,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function loadApprovedSuccessorCorrectivePlanContext(
  userId: string,
  input: { workspaceId: string; successorPlanId: string }
): Promise<SuccessorCorrectiveExecutionContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<ContextRow>(
      `select p.workspace_id,w.name as workspace_name,wm.role,
              p.successor_plan_id,p.retriage_id,p.reopen_id,p.regression_check_id,
              p.case_id,p.target,p.status as successor_plan_status,
              p.plan_fingerprint as successor_plan_fingerprint,
              p.rationale as successor_plan_rationale,
              p.created_by as successor_plan_created_by,
              p.created_at as successor_plan_created_at,
              p.reviewed_by as successor_plan_reviewed_by,
              p.reviewed_at as successor_plan_reviewed_at,
              p.review_note as successor_plan_review_note,
              p.source_regression_fingerprint,
              p.source_corrective_package_id as plan_source_corrective_package_id,
              p.source_corrective_replay_key as plan_source_corrective_replay_key,
              p.source_corrective_package_fingerprint as plan_source_corrective_package_fingerprint,
              p.correction_scope,
              t.status as retriage_status,c.status as case_status,
              regression.status as regression_status,
              regression.verification_fingerprint as regression_fingerprint,
              predecessor.plan_id as predecessor_plan_id,
              predecessor.reconciliation_id as predecessor_reconciliation_id,
              predecessor.delivery_id as predecessor_source_delivery_id,
              predecessor.reconciliation_fingerprint as predecessor_reconciliation_fingerprint,
              predecessor.package_id as predecessor_source_package_id,
              predecessor.replay_key as predecessor_source_replay_key,
              predecessor.package_fingerprint as predecessor_source_package_fingerprint,
              predecessor.correction_scope as predecessor_correction_scope,
              predecessor.plan_fingerprint as predecessor_plan_fingerprint,
              predecessor.rationale as predecessor_plan_rationale,
              predecessor.created_by as predecessor_plan_created_by,
              predecessor.created_at as predecessor_plan_created_at,
              predecessor.reviewed_by as predecessor_plan_reviewed_by,
              predecessor.reviewed_at as predecessor_plan_reviewed_at,
              predecessor.review_note as predecessor_plan_review_note,
              delivery.delivery_id as predecessor_corrective_delivery_id,
              delivery.status as predecessor_delivery_status,
              delivery.consumer_id,
              delivery.corrective_package_id as predecessor_corrective_package_id,
              delivery.corrective_replay_key as predecessor_corrective_replay_key,
              delivery.corrective_package_fingerprint as predecessor_corrective_package_fingerprint
       from app.workspace_successor_corrective_delivery_plans p
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_reconciliation_exception_reopens reopen
         on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=p.workspace_id
        and regression.regression_check_id=p.regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_corrective_delivery_plans predecessor
         on predecessor.workspace_id=p.workspace_id
        and predecessor.plan_id=p.predecessor_plan_id
       join app.workspace_corrective_live_deliveries delivery
         on delivery.workspace_id=p.workspace_id
        and delivery.delivery_id=p.predecessor_corrective_delivery_id
       join app.workspaces w on w.id=p.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=p.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       where p.workspace_id=$1 and p.successor_plan_id=$2
       limit 1`,
      [input.workspaceId, input.successorPlanId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("successor_delivery_plan_not_found");
  if (
    row.successor_plan_status !== "approved" ||
    !row.successor_plan_reviewed_by ||
    !row.successor_plan_reviewed_at
  ) {
    throw new Error("successor_delivery_approved_plan_required");
  }
  if (row.retriage_status !== "approved") {
    throw new Error("successor_delivery_approved_retriage_required");
  }
  if (row.case_status !== "open") {
    throw new Error("successor_delivery_open_case_required");
  }
  if (
    row.regression_status !== "regressed" ||
    row.regression_fingerprint !== row.source_regression_fingerprint
  ) {
    throw new Error("successor_delivery_regression_identity_changed");
  }
  if (
    row.predecessor_delivery_status !== "accepted" ||
    row.plan_source_corrective_package_id !== row.predecessor_corrective_package_id ||
    row.plan_source_corrective_replay_key !== row.predecessor_corrective_replay_key ||
    row.plan_source_corrective_package_fingerprint !== row.predecessor_corrective_package_fingerprint
  ) {
    throw new Error("successor_delivery_predecessor_not_accepted");
  }

  const predecessorPlan = predecessorPlanFromRow(row);
  const originalSource = await loadAcceptedDeliveryReconciliationContext(userId, {
    workspaceId: input.workspaceId,
    deliveryId: predecessorPlan.deliveryId
  });
  const predecessorPackage = buildCorrectiveExecutionPackage(
    predecessorPlan,
    originalSource.package
  );
  if (
    predecessorPackage.packageId !== row.predecessor_corrective_package_id ||
    predecessorPackage.replayKey !== row.predecessor_corrective_replay_key ||
    predecessorPackage.fingerprint !== row.predecessor_corrective_package_fingerprint
  ) {
    throw new Error("successor_delivery_predecessor_package_reconstruction_mismatch");
  }

  const plan = successorPlanFromRow(row);
  const successorPackage = buildSuccessorCorrectiveExecutionPackage(
    plan,
    predecessorPackage
  );

  return {
    plan,
    predecessorPlan,
    predecessorPackage,
    successorPackage,
    consumerId: row.consumer_id
  };
}

function activationFromRow(
  row: ActivationRow,
  role: WorkspaceRole
): SuccessorCorrectiveDeliveryActivation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    successorPlanId: row.successor_plan_id,
    retriageId: row.retriage_id,
    reopenId: row.reopen_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    consumerId: row.consumer_id,
    successorPlanFingerprint: row.successor_plan_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    predecessorCorrectiveDeliveryId: row.predecessor_corrective_delivery_id,
    predecessorCorrectivePackageId: row.predecessor_corrective_package_id,
    predecessorCorrectiveReplayKey: row.predecessor_corrective_replay_key,
    predecessorCorrectivePackageFingerprint: row.predecessor_corrective_package_fingerprint,
    successorPackageId: row.successor_package_id,
    successorReplayKey: row.successor_replay_key,
    successorPackageFingerprint: row.successor_package_fingerprint,
    dryRunValidationCode: row.dry_run_validation_code,
    dryRunHttpStatus: row.dry_run_http_status,
    dryRunConsumerReceivedAt: row.dry_run_consumer_received_at.toISOString(),
    dryRunAcknowledgement:
      row.dry_run_acknowledgement && typeof row.dry_run_acknowledgement === "object"
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
): SuccessorCorrectiveLiveDelivery {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    successorPlanId: row.successor_plan_id,
    predecessorCorrectiveDeliveryId: row.predecessor_corrective_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    successorPlanFingerprint: row.successor_plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    successorPackageId: row.successor_package_id,
    successorReplayKey: row.successor_replay_key,
    successorPackageFingerprint: row.successor_package_fingerprint,
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

export async function listSuccessorCorrectiveDeliveryForUser(
  userId: string
): Promise<SuccessorCorrectiveDeliveryModel> {
  const planning = await listReopenedExceptionPlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow & { role: WorkspaceRole }>(
      `select a.*,w.name as workspace_name,wm.role
       from app.workspace_successor_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=a.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by a.activated_at desc,a.activation_id desc
       limit 500`
    );
    const deliveries = await client.query<DeliveryRow & { role: WorkspaceRole }>(
      `select d.*,w.name as workspace_name,wm.role
       from app.workspace_successor_corrective_live_deliveries d
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
    activationFromRow(row, row.role)
  );
  const deliveries = data.deliveries.map((row) =>
    deliveryFromRow(row, row.role)
  );
  const activePlanIds = new Set(
    activations
      .filter(
        (item) =>
          item.status === "active" &&
          new Date(item.expiresAt).getTime() > Date.now()
      )
      .map((item) => item.workspaceId + ":" + item.successorPlanId)
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
          !activePlanIds.has(item.workspaceId + ":" + item.successorPlanId)
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
          item.attemptCount < SUCCESSOR_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createSuccessorCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: SuccessorCorrectiveExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertSuccessorPackageExecutable(input.context.successorPackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("successor_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.successorPackage.target ||
    acknowledgement.packageId !== input.context.successorPackage.packageId ||
    acknowledgement.replayKey !== input.context.successorPackage.replayKey ||
    acknowledgement.fingerprint !== input.context.successorPackage.fingerprint
  ) {
    throw new Error("successor_delivery_dry_run_acceptance_required");
  }
  if (input.consumerId !== input.context.consumerId) {
    throw new Error("successor_delivery_consumer_identity_changed");
  }

  const activationFingerprint = successorActivationFingerprint({
    successorPlanFingerprint: input.context.plan.planFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    consumerId: input.consumerId,
    successorPackageId: input.context.successorPackage.packageId,
    successorReplayKey: input.context.successorPackage.replayKey,
    successorPackageFingerprint: input.context.successorPackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const gate = await client.query<{
      plan_status: string;
      retriage_status: string;
      case_status: string;
      regression_status: string;
      source_regression_fingerprint: string;
      current_regression_fingerprint: string;
      predecessor_status: string;
      consumer_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
    }>(
      `select p.status as plan_status,t.status as retriage_status,
              c.status as case_status,regression.status as regression_status,
              p.source_regression_fingerprint,
              regression.verification_fingerprint as current_regression_fingerprint,
              predecessor.status as predecessor_status,predecessor.consumer_id,
              predecessor.corrective_package_id as predecessor_package_id,
              predecessor.corrective_replay_key as predecessor_replay_key,
              predecessor.corrective_package_fingerprint as predecessor_package_fingerprint
       from app.workspace_successor_corrective_delivery_plans p
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=p.workspace_id
        and regression.regression_check_id=p.regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       join app.workspace_corrective_live_deliveries predecessor
         on predecessor.workspace_id=p.workspace_id
        and predecessor.delivery_id=p.predecessor_corrective_delivery_id
       where p.workspace_id=$1 and p.successor_plan_id=$2
       limit 1`,
      [input.workspaceId, input.context.plan.successorPlanId]
    );
    const current = gate.rows[0];
    if (!current) throw new Error("successor_delivery_plan_not_found");
    if (
      current.plan_status !== "approved" ||
      current.retriage_status !== "approved" ||
      current.case_status !== "open" ||
      current.regression_status !== "regressed"
    ) {
      throw new Error("successor_delivery_execution_gate_closed");
    }
    if (
      current.source_regression_fingerprint !== current.current_regression_fingerprint ||
      current.source_regression_fingerprint !== input.context.plan.sourceRegressionFingerprint
    ) {
      throw new Error("successor_delivery_regression_identity_changed");
    }
    if (
      current.predecessor_status !== "accepted" ||
      current.consumer_id !== input.consumerId ||
      current.predecessor_package_id !== input.context.predecessorPackage.packageId ||
      current.predecessor_replay_key !== input.context.predecessorPackage.replayKey ||
      current.predecessor_package_fingerprint !== input.context.predecessorPackage.fingerprint
    ) {
      throw new Error("successor_delivery_predecessor_identity_changed");
    }

    await client.query(
      `update app.workspace_successor_corrective_delivery_activations
       set status='revoked',revoked_by=$3,revoked_at=now(),
           revocation_note='expired before replacement'
       where workspace_id=$1 and successor_plan_id=$2
         and status='active' and expires_at<=now()`,
      [input.workspaceId, input.context.plan.successorPlanId, userId]
    );

    const active = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
    }>(
      `select activation_id,activation_fingerprint
       from app.workspace_successor_corrective_delivery_activations
       where workspace_id=$1 and successor_plan_id=$2
         and status='active' and expires_at>now()
       limit 1`,
      [input.workspaceId, input.context.plan.successorPlanId]
    );
    if (active.rows[0]) {
      if (active.rows[0].activation_fingerprint === activationFingerprint) {
        return active.rows[0].activation_id;
      }
      throw new Error("successor_delivery_activation_already_active");
    }

    const now = Date.now();
    const packageExpiry = new Date(input.context.successorPackage.expiresAt).getTime();
    const expiresAt = new Date(
      Math.min(now + SUCCESSOR_ACTIVATION_WINDOW_MS, packageExpiry)
    );
    if (expiresAt.getTime() <= now) {
      throw new Error("successor_delivery_plan_window_expired");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_successor_corrective_delivery_activations (
        workspace_id,activation_id,successor_plan_id,retriage_id,reopen_id,
        regression_check_id,case_id,target,status,consumer_id,
        successor_plan_fingerprint,source_regression_fingerprint,
        predecessor_corrective_delivery_id,predecessor_corrective_package_id,
        predecessor_corrective_replay_key,predecessor_corrective_package_fingerprint,
        successor_package_id,successor_replay_key,successor_package_fingerprint,
        dry_run_validation_code,dry_run_http_status,dry_run_consumer_received_at,
        dry_run_acknowledgement,activation_fingerprint,activated_by,activated_at,
        expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22::jsonb,$23,$24,now(),$25
      )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.successorPlanId,
        input.context.plan.retriageId,
        input.context.plan.reopenId,
        input.context.plan.regressionCheckId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.predecessorCorrectiveDeliveryId,
        input.context.predecessorPackage.packageId,
        input.context.predecessorPackage.replayKey,
        input.context.predecessorPackage.fingerprint,
        input.context.successorPackage.packageId,
        input.context.successorPackage.replayKey,
        input.context.successorPackage.fingerprint,
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

export async function getActiveSuccessorCorrectiveDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    successorPlanId: string;
    consumerId: string;
    successorPackage: IntegrationPackageV1;
  }
) {
  assertSuccessorPackageExecutable(input.successorPackage);
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
       from app.workspace_successor_corrective_delivery_activations a
       join app.workspaces w on w.id=a.workspace_id
       join app.workspace_successor_corrective_delivery_plans p
         on p.workspace_id=a.workspace_id and p.successor_plan_id=a.successor_plan_id
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=p.workspace_id
        and regression.regression_check_id=p.regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where a.workspace_id=$1 and a.successor_plan_id=$2
         and a.status='active' and a.expires_at>now()
         and p.status='approved' and t.status='approved'
         and regression.status='regressed' and c.status='open'
       limit 1`,
      [input.workspaceId, input.successorPlanId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("successor_delivery_activation_required");
    if (
      row.consumer_id !== input.consumerId ||
      row.successor_package_id !== input.successorPackage.packageId ||
      row.successor_replay_key !== input.successorPackage.replayKey ||
      row.successor_package_fingerprint !== input.successorPackage.fingerprint
    ) {
      throw new Error("successor_delivery_activation_identity_conflict");
    }
    return activationFromRow(row, "admin");
  });
}

export async function reserveIdempotentSuccessorCorrectiveDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: SuccessorCorrectiveDeliveryActivation;
    plan: SuccessorCorrectiveDeliveryPlan;
    consumerId: string;
    successorPackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: SuccessorCorrectiveLiveDelivery;
}> {
  assertSuccessorPackageExecutable(input.successorPackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activationResult = await client.query<{
      status: string;
      expires_at: Date;
      activation_fingerprint: string;
      successor_plan_id: string;
      consumer_id: string;
      successor_package_id: string;
      successor_replay_key: string;
      successor_package_fingerprint: string;
    }>(
      `select status,expires_at,activation_fingerprint,successor_plan_id,
              consumer_id,successor_package_id,successor_replay_key,
              successor_package_fingerprint
       from app.workspace_successor_corrective_delivery_activations
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
      throw new Error("successor_delivery_activation_required");
    }
    if (
      active.successor_plan_id !== input.plan.successorPlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.successor_package_id !== input.successorPackage.packageId ||
      active.successor_replay_key !== input.successorPackage.replayKey ||
      active.successor_package_fingerprint !== input.successorPackage.fingerprint
    ) {
      throw new Error("successor_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
       from app.workspace_successor_corrective_live_deliveries d
       join app.workspaces w on w.id=d.workspace_id
       where d.workspace_id=$1 and d.consumer_id=$2
         and d.successor_package_id=$3
       limit 1
       for update of d`,
      [
        input.workspaceId,
        input.consumerId,
        input.successorPackage.packageId
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
        SUCCESSOR_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= SUCCESSOR_DELIVERY_RETRY_LIMIT) {
        throw new Error("successor_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_successor_corrective_live_deliveries
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
      `insert into app.workspace_successor_corrective_live_deliveries (
        workspace_id,delivery_id,activation_id,successor_plan_id,
        predecessor_corrective_delivery_id,target,consumer_id,
        successor_plan_fingerprint,activation_fingerprint,
        successor_package_id,successor_replay_key,successor_package_fingerprint,
        idempotency_key,status,attempt_count,validation_code,created_by,
        created_at,last_attempt_at,updated_at
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
        input.plan.successorPlanId,
        input.plan.predecessorCorrectiveDeliveryId,
        input.plan.target,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.successorPackage.packageId,
        input.successorPackage.replayKey,
        input.successorPackage.fingerprint,
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

export async function finalizeIdempotentSuccessorCorrectiveDelivery(
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
      `update app.workspace_successor_corrective_live_deliveries
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
      throw new Error("successor_delivery_not_reserved");
    }
    return deliveryFromRow(result.rows[0], role);
  });
}

export async function revokeSuccessorCorrectiveDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_successor_corrective_delivery_activations
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
      throw new Error("successor_delivery_activation_not_active");
    }
  });
}
