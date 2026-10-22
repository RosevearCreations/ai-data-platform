// Build 111 — Unified Corrective-Generation Activation & Idempotent Delivery Execution
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
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
  listUnifiedCorrectiveGenerationPlanningForUser,
  unifiedCorrectiveGenerationPlanFingerprint,
  type UnifiedCorrectiveGenerationPlan,
  type UnifiedCorrectiveGenerationPlanningModel
} from "./unified-corrective-generation-planning";
import { loadApprovedNextCorrectiveGenerationPlanContext } from "./next-corrective-generation-delivery-execution";
import { loadApprovedFollowingCorrectiveGenerationPlanContext } from "./following-corrective-generation-delivery-execution";

type JsonRecord = Record<string, unknown>;

export const UNIFIED_CORRECTIVE_GENERATION_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;
export const UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RETRY_LIMIT = 5;
export const UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS = 2 * 60 * 1000;
const MAX_PREDECESSOR_DEPTH = 100;

export interface UnifiedCorrectiveGenerationPredecessorRegistry {
  generationLineageId: string;
  generationNumber: number;
  sourceKind: "legacy-next" | "legacy-following" | "generic";
  registryFingerprint: string;
  planId: string;
  deliveryId: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
}

export interface UnifiedCorrectiveGenerationExecutionContext {
  plan: UnifiedCorrectiveGenerationPlan;
  predecessorRegistry: UnifiedCorrectiveGenerationPredecessorRegistry;
  predecessorPackage: IntegrationPackageV1;
  unifiedPackage: IntegrationPackageV1;
  consumerId: string;
}

export interface UnifiedCorrectiveGenerationDeliveryActivation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  activationId: string;
  correctiveGenerationPlanId: string;
  correctiveGenerationRetriageId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  status: "active" | "revoked";
  consumerId: string;
  planFingerprint: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  predecessorRegistryFingerprint: string;
  predecessorPlanId: string;
  predecessorDeliveryId: string;
  predecessorPackageId: string;
  predecessorReplayKey: string;
  predecessorPackageFingerprint: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
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

export interface UnifiedCorrectiveGenerationLiveDelivery {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  deliveryId: string;
  activationId: string;
  correctiveGenerationPlanId: string;
  predecessorDeliveryId: string;
  target: IntegrationTarget;
  generationNumber: number;
  consumerId: string;
  planFingerprint: string;
  activationFingerprint: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
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

export interface UnifiedCorrectiveGenerationDeliveryModel {
  planning: UnifiedCorrectiveGenerationPlanningModel;
  activations: UnifiedCorrectiveGenerationDeliveryActivation[];
  deliveries: UnifiedCorrectiveGenerationLiveDelivery[];
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

type RegistryGateRow = QueryResultRow & {
  corrective_generation_plan_id: string;
  corrective_generation_retriage_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  plan_status: string;
  retriage_status: string;
  case_status: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  plan_fingerprint: string;
  latest_successor_source_id: string;
  generation_lineage_id: string;
  predecessor_generation_number: number;
  source_kind: "legacy-next" | "legacy-following" | "generic";
  registry_fingerprint: string;
  predecessor_plan_id: string;
  predecessor_delivery_id: string;
  predecessor_package_id: string;
  predecessor_replay_key: string;
  predecessor_package_fingerprint: string;
};

type ActivationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role?: WorkspaceRole;
  activation_id: string;
  corrective_generation_plan_id: string;
  corrective_generation_retriage_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  status: "active" | "revoked";
  consumer_id: string;
  plan_fingerprint: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  predecessor_registry_fingerprint: string;
  predecessor_plan_id: string;
  predecessor_delivery_id: string;
  predecessor_package_id: string;
  predecessor_replay_key: string;
  predecessor_package_fingerprint: string;
  unified_package_id: string;
  unified_replay_key: string;
  unified_package_fingerprint: string;
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
  corrective_generation_plan_id: string;
  predecessor_delivery_id: string;
  target: IntegrationTarget;
  generation_number: number;
  consumer_id: string;
  plan_fingerprint: string;
  activation_fingerprint: string;
  unified_package_id: string;
  unified_replay_key: string;
  unified_package_fingerprint: string;
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
    throw new Error("unified_corrective_generation_delivery_manager_required");
  }
  return role;
}

export function unifiedCorrectiveGenerationActivationConfirmation(target: IntegrationTarget) {
  return "ACTIVATE " + target.toUpperCase() + " UNIFIED-CORRECTIVE-GENERATION CORRECTIVE";
}

export function unifiedCorrectiveGenerationExecutionConfirmation(target: IntegrationTarget) {
  return "EXECUTE " + target.toUpperCase() + " UNIFIED-CORRECTIVE-GENERATION CORRECTIVE";
}

export function unifiedCorrectiveGenerationActivationFingerprint(input: {
  planFingerprint: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  predecessorRegistryFingerprint: string;
  consumerId: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
  dryRunValidationCode: string;
  dryRunConsumerReceivedAt: string;
}) {
  return fingerprint("unified-corrective-generation-activation1-", input);
}

export function buildUnifiedCorrectiveGenerationExecutionPackage(
  plan: UnifiedCorrectiveGenerationPlan,
  predecessorPackage: IntegrationPackageV1
): IntegrationPackageV1 {
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("unified_corrective_generation_delivery_approved_plan_required");
  }

  const expectedPlanFingerprint = unifiedCorrectiveGenerationPlanFingerprint({
    correctiveGenerationRetriageId: plan.correctiveGenerationRetriageId,
    successorSourceId: plan.successorSourceId,
    predecessorGenerationLineageId: plan.predecessorGenerationLineageId,
    generationNumber: plan.generationNumber,
    predecessorPlanId: plan.predecessorPlanId,
    predecessorDeliveryId: plan.predecessorDeliveryId,
    predecessorPackageId: plan.predecessorPackageId,
    predecessorReplayKey: plan.predecessorReplayKey,
    predecessorPackageFingerprint: plan.predecessorPackageFingerprint,
    predecessorReclosureId: plan.predecessorReclosureId,
    predecessorReclosureFingerprint: plan.predecessorReclosureFingerprint,
    sourceRecurrenceId: plan.sourceRecurrenceId,
    sourceRecurrenceFingerprint: plan.sourceRecurrenceFingerprint,
    sourceRegressionFingerprint: plan.sourceRegressionFingerprint,
    sourceSuccessorFingerprint: plan.sourceSuccessorFingerprint,
    correctionScope: plan.correctionScope,
    rationale: plan.rationale
  });
  if (expectedPlanFingerprint !== plan.planFingerprint) {
    throw new Error("unified_corrective_generation_delivery_plan_fingerprint_mismatch");
  }
  if (
    predecessorPackage.target !== plan.target ||
    predecessorPackage.packageId !== plan.predecessorPackageId ||
    predecessorPackage.replayKey !== plan.predecessorReplayKey ||
    predecessorPackage.fingerprint !== plan.predecessorPackageFingerprint
  ) {
    throw new Error("unified_corrective_generation_delivery_predecessor_package_identity_mismatch");
  }
  if (!plan.correctionScope.length) {
    throw new Error("unified_corrective_generation_delivery_scope_required");
  }

  const predecessorByKey = new Map(
    predecessorPackage.operations.map((operation) => [operation.integrationKey, operation])
  );
  const seen = new Set<string>();
  const operations: IntegrationOperation[] = [];

  for (const scope of plan.correctionScope) {
    if (seen.has(scope.integrationKey)) {
      throw new Error("unified_corrective_generation_delivery_scope_duplicate_key");
    }
    seen.add(scope.integrationKey);
    const predecessor = predecessorByKey.get(scope.integrationKey);
    if (!predecessor) {
      throw new Error("unified_corrective_generation_delivery_scope_predecessor_missing");
    }
    if (scope.proposedAction === "manual-review") {
      throw new Error("unified_corrective_generation_delivery_manual_review_unresolved");
    }

    const governedFields = [...scope.governedFields].sort();
    const desiredKeys = Object.keys(scope.desiredValues).sort();
    if (
      !governedFields.length ||
      governedFields.length !== desiredKeys.length ||
      governedFields.some((field, index) => field !== desiredKeys[index])
    ) {
      throw new Error("unified_corrective_generation_delivery_scope_field_mismatch");
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
        throw new Error("unified_corrective_generation_delivery_scope_value_mismatch");
      }
      values[field] = desired;
    }

    let action: "create" | "update";
    if (scope.proposedAction === "restore-missing") {
      if (predecessor.action !== "create") {
        throw new Error("unified_corrective_generation_delivery_restore_requires_predecessor_create");
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
  const batchId =
    "unified-corrective-generation-g" +
    plan.generationNumber +
    "-plan:" +
    plan.correctiveGenerationPlanId;
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
    throw new Error("unified_corrective_generation_delivery_predecessor_identity_reuse");
  }

  const validation = validateIntegrationPackage(result, {
    now: new Date(approvedAt),
    expectedTarget: plan.target
  });
  if (!validation.valid) {
    throw new Error("unified_corrective_generation_delivery_package_invalid:" + validation.code);
  }
  return result;
}

export function assertUnifiedCorrectiveGenerationPackageExecutable(
  unifiedPackage: IntegrationPackageV1,
  now = new Date()
) {
  if (new Date(unifiedPackage.expiresAt).getTime() <= now.getTime()) {
    throw new Error("unified_corrective_generation_delivery_plan_window_expired");
  }
}

async function loadRegistryGate(
  userId: string,
  workspaceId: string,
  correctiveGenerationPlanId: string
) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<RegistryGateRow>(
      `select
          p.corrective_generation_plan_id,p.corrective_generation_retriage_id,
          p.successor_source_id,p.predecessor_generation_lineage_id,p.case_id,p.target,
          p.generation_number,p.status as plan_status,t.status as retriage_status,
          c.status as case_status,p.source_recurrence_fingerprint,
          p.source_regression_fingerprint,p.source_successor_fingerprint,p.plan_fingerprint,
          (select newest.successor_source_id
             from app.workspace_corrective_generation_successors newest
            where newest.workspace_id=p.workspace_id and newest.case_id=p.case_id
            order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
            limit 1) as latest_successor_source_id,
          r.generation_lineage_id,r.generation_number as predecessor_generation_number,
          r.source_kind,r.registry_fingerprint,r.plan_id as predecessor_plan_id,
          r.delivery_id as predecessor_delivery_id,r.package_id as predecessor_package_id,
          r.replay_key as predecessor_replay_key,
          r.package_fingerprint as predecessor_package_fingerprint
       from app.workspace_corrective_generation_plans p
       join app.workspace_corrective_generation_retriage t
         on t.workspace_id=p.workspace_id
        and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
       join app.workspace_corrective_generation_successors s
         on s.workspace_id=p.workspace_id and s.successor_source_id=p.successor_source_id
       join app.workspace_corrective_generation_registry r
         on r.workspace_id=p.workspace_id
        and r.generation_lineage_id=p.predecessor_generation_lineage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
      where p.workspace_id=$1 and p.corrective_generation_plan_id=$2
      limit 1`,
      [workspaceId, correctiveGenerationPlanId]
    );
    return result.rows[0] ?? null;
  });
}

async function loadRegistryPredecessorPackage(
  userId: string,
  workspaceId: string,
  registry: UnifiedCorrectiveGenerationPredecessorRegistry,
  depth: number
): Promise<{ package: IntegrationPackageV1; consumerId: string }> {
  if (depth > MAX_PREDECESSOR_DEPTH) {
    throw new Error("unified_corrective_generation_delivery_predecessor_depth_exceeded");
  }

  if (registry.sourceKind === "legacy-next") {
    const context = await loadApprovedNextCorrectiveGenerationPlanContext(userId, {
      workspaceId,
      nextCorrectiveGenerationPlanId: registry.planId,
      allowClosedCase: true
    });
    const candidate = context.nextCorrectiveGenerationPackage;
    if (
      candidate.packageId !== registry.packageId ||
      candidate.replayKey !== registry.replayKey ||
      candidate.fingerprint !== registry.packageFingerprint
    ) {
      throw new Error("unified_corrective_generation_delivery_legacy_next_reconstruction_mismatch");
    }
    return { package: candidate, consumerId: context.consumerId };
  }

  if (registry.sourceKind === "legacy-following") {
    const context = await loadApprovedFollowingCorrectiveGenerationPlanContext(userId, {
      workspaceId,
      followingCorrectiveGenerationPlanId: registry.planId,
      allowClosedCase: true
    });
    const candidate = context.followingCorrectiveGenerationPackage;
    if (
      candidate.packageId !== registry.packageId ||
      candidate.replayKey !== registry.replayKey ||
      candidate.fingerprint !== registry.packageFingerprint
    ) {
      throw new Error("unified_corrective_generation_delivery_legacy_following_reconstruction_mismatch");
    }
    return { package: candidate, consumerId: context.consumerId };
  }

  const accepted = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      delivery_id: string;
      corrective_generation_plan_id: string;
      consumer_id: string;
      unified_package_id: string;
      unified_replay_key: string;
      unified_package_fingerprint: string;
      status: string;
    }>(
      `select delivery_id,corrective_generation_plan_id,consumer_id,
              unified_package_id,unified_replay_key,unified_package_fingerprint,status
         from app.workspace_unified_cg_live_deliveries
        where workspace_id=$1 and delivery_id=$2
        limit 1`,
      [workspaceId, registry.deliveryId]
    );
    return result.rows[0] ?? null;
  });
  if (
    !accepted ||
    accepted.status !== "accepted" ||
    accepted.corrective_generation_plan_id !== registry.planId ||
    accepted.unified_package_id !== registry.packageId ||
    accepted.unified_replay_key !== registry.replayKey ||
    accepted.unified_package_fingerprint !== registry.packageFingerprint
  ) {
    throw new Error("unified_corrective_generation_delivery_generic_predecessor_not_accepted");
  }

  const context = await loadApprovedUnifiedCorrectiveGenerationPlanContext(
    userId,
    {
      workspaceId,
      correctiveGenerationPlanId: registry.planId,
      allowClosedCase: true,
      depth: depth + 1
    }
  );
  if (
    context.unifiedPackage.packageId !== registry.packageId ||
    context.unifiedPackage.replayKey !== registry.replayKey ||
    context.unifiedPackage.fingerprint !== registry.packageFingerprint ||
    context.consumerId !== accepted.consumer_id
  ) {
    throw new Error("unified_corrective_generation_delivery_generic_reconstruction_mismatch");
  }
  return { package: context.unifiedPackage, consumerId: accepted.consumer_id };
}

export async function loadApprovedUnifiedCorrectiveGenerationPlanContext(
  userId: string,
  input: {
    workspaceId: string;
    correctiveGenerationPlanId: string;
    allowClosedCase?: boolean;
    depth?: number;
  }
): Promise<UnifiedCorrectiveGenerationExecutionContext> {
  const depth = input.depth ?? 0;
  if (depth > MAX_PREDECESSOR_DEPTH) {
    throw new Error("unified_corrective_generation_delivery_predecessor_depth_exceeded");
  }

  const planning = await listUnifiedCorrectiveGenerationPlanningForUser(userId);
  const plan = planning.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.correctiveGenerationPlanId === input.correctiveGenerationPlanId
  );
  if (!plan) throw new Error("unified_corrective_generation_delivery_plan_not_found");
  if (plan.status !== "approved" || !plan.reviewedAt) {
    throw new Error("unified_corrective_generation_delivery_approved_plan_required");
  }

  const gate = await loadRegistryGate(
    userId,
    input.workspaceId,
    input.correctiveGenerationPlanId
  );
  if (!gate) throw new Error("unified_corrective_generation_delivery_plan_not_found");
  if (gate.plan_status !== "approved" || gate.retriage_status !== "approved") {
    throw new Error("unified_corrective_generation_delivery_approved_plan_required");
  }
  if (!input.allowClosedCase && gate.case_status !== "open") {
    throw new Error("unified_corrective_generation_delivery_open_case_required");
  }
  if (
    gate.latest_successor_source_id !== plan.successorSourceId &&
    !input.allowClosedCase
  ) {
    throw new Error("unified_corrective_generation_delivery_latest_successor_required");
  }
  if (
    gate.corrective_generation_retriage_id !== plan.correctiveGenerationRetriageId ||
    gate.successor_source_id !== plan.successorSourceId ||
    gate.predecessor_generation_lineage_id !== plan.predecessorGenerationLineageId ||
    gate.case_id !== plan.caseId ||
    gate.target !== plan.target ||
    Number(gate.generation_number) !== plan.generationNumber ||
    gate.plan_fingerprint !== plan.planFingerprint ||
    gate.source_recurrence_fingerprint !== plan.sourceRecurrenceFingerprint ||
    gate.source_regression_fingerprint !== plan.sourceRegressionFingerprint ||
    gate.source_successor_fingerprint !== plan.sourceSuccessorFingerprint ||
    gate.predecessor_plan_id !== plan.predecessorPlanId ||
    gate.predecessor_delivery_id !== plan.predecessorDeliveryId ||
    gate.predecessor_package_id !== plan.predecessorPackageId ||
    gate.predecessor_replay_key !== plan.predecessorReplayKey ||
    gate.predecessor_package_fingerprint !== plan.predecessorPackageFingerprint ||
    Number(gate.predecessor_generation_number) + 1 !== plan.generationNumber
  ) {
    throw new Error("unified_corrective_generation_delivery_lineage_identity_changed");
  }

  const predecessorRegistry: UnifiedCorrectiveGenerationPredecessorRegistry = {
    generationLineageId: gate.generation_lineage_id,
    generationNumber: Number(gate.predecessor_generation_number),
    sourceKind: gate.source_kind,
    registryFingerprint: gate.registry_fingerprint,
    planId: gate.predecessor_plan_id,
    deliveryId: gate.predecessor_delivery_id,
    packageId: gate.predecessor_package_id,
    replayKey: gate.predecessor_replay_key,
    packageFingerprint: gate.predecessor_package_fingerprint
  };
  const predecessor = await loadRegistryPredecessorPackage(
    userId,
    input.workspaceId,
    predecessorRegistry,
    depth
  );
  const unifiedPackage = buildUnifiedCorrectiveGenerationExecutionPackage(
    plan,
    predecessor.package
  );

  return {
    plan,
    predecessorRegistry,
    predecessorPackage: predecessor.package,
    unifiedPackage,
    consumerId: predecessor.consumerId
  };
}

function activationFromRow(row: ActivationRow): UnifiedCorrectiveGenerationDeliveryActivation {
  const role = row.role ?? "member";
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    activationId: row.activation_id,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    status: row.status,
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessorFingerprint: row.source_successor_fingerprint,
    predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
    predecessorPlanId: row.predecessor_plan_id,
    predecessorDeliveryId: row.predecessor_delivery_id,
    predecessorPackageId: row.predecessor_package_id,
    predecessorReplayKey: row.predecessor_replay_key,
    predecessorPackageFingerprint: row.predecessor_package_fingerprint,
    unifiedPackageId: row.unified_package_id,
    unifiedReplayKey: row.unified_replay_key,
    unifiedPackageFingerprint: row.unified_package_fingerprint,
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

function deliveryFromRow(row: DeliveryRow): UnifiedCorrectiveGenerationLiveDelivery {
  const role = row.role ?? "member";
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    predecessorDeliveryId: row.predecessor_delivery_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
    activationFingerprint: row.activation_fingerprint,
    unifiedPackageId: row.unified_package_id,
    unifiedReplayKey: row.unified_replay_key,
    unifiedPackageFingerprint: row.unified_package_fingerprint,
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

export async function listUnifiedCorrectiveGenerationDeliveryForUser(
  userId: string
): Promise<UnifiedCorrectiveGenerationDeliveryModel> {
  const planning = await listUnifiedCorrectiveGenerationPlanningForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const activations = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name,wm.role
         from app.workspace_unified_cg_delivery_activations a
         join app.workspaces w on w.id=a.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=a.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by a.activated_at desc,a.activation_id desc
        limit 500`
    );
    const deliveries = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name,wm.role
         from app.workspace_unified_cg_live_deliveries d
         join app.workspaces w on w.id=d.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=d.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by d.updated_at desc,d.delivery_id desc
        limit 500`
    );
    return { activations: activations.rows, deliveries: deliveries.rows };
  });

  const activations = data.activations.map(activationFromRow);
  const deliveries = data.deliveries.map(deliveryFromRow);
  const activePlanIds = new Set(
    activations
      .filter(
        (item) =>
          item.status === "active" &&
          new Date(item.expiresAt).getTime() > Date.now()
      )
      .map((item) => item.workspaceId + ":" + item.correctiveGenerationPlanId)
  );
  const targets = ["rosie-dazzlers", "devil-n-dove"] as const;
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
          !activePlanIds.has(item.workspaceId + ":" + item.correctiveGenerationPlanId)
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
          item.attemptCount < UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RETRY_LIMIT
      ).length
    }
  };
}

export async function createUnifiedCorrectiveGenerationDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    context: UnifiedCorrectiveGenerationExecutionContext;
    consumerId: string;
    handshake: LiveConsumerHandshake;
    dryRunAcknowledgement: ConsumerAcknowledgement;
    dryRunHttpStatus: number | null;
  }
) {
  assertUnifiedCorrectiveGenerationPackageExecutable(input.context.unifiedPackage);
  const acknowledgement = input.dryRunAcknowledgement;
  if (
    input.handshake.target !== input.context.plan.target ||
    input.handshake.authentication !== "bearer" ||
    input.handshake.dryRunSupported !== true ||
    input.handshake.liveMutationEnabled !== true ||
    input.handshake.idempotency.keySource !== "replayKey" ||
    input.handshake.idempotency.duplicateBehavior !== "return-original-ack"
  ) {
    throw new Error("unified_corrective_generation_delivery_consumer_capability_required");
  }
  if (
    acknowledgement.status !== "accepted" ||
    acknowledgement.dryRun !== true ||
    acknowledgement.target !== input.context.unifiedPackage.target ||
    acknowledgement.packageId !== input.context.unifiedPackage.packageId ||
    acknowledgement.replayKey !== input.context.unifiedPackage.replayKey ||
    acknowledgement.fingerprint !== input.context.unifiedPackage.fingerprint
  ) {
    throw new Error("unified_corrective_generation_delivery_dry_run_acceptance_required");
  }

  const activationFingerprint = unifiedCorrectiveGenerationActivationFingerprint({
    planFingerprint: input.context.plan.planFingerprint,
    sourceRecurrenceFingerprint: input.context.plan.sourceRecurrenceFingerprint,
    sourceRegressionFingerprint: input.context.plan.sourceRegressionFingerprint,
    sourceSuccessorFingerprint: input.context.plan.sourceSuccessorFingerprint,
    predecessorRegistryFingerprint: input.context.predecessorRegistry.registryFingerprint,
    consumerId: input.consumerId,
    unifiedPackageId: input.context.unifiedPackage.packageId,
    unifiedReplayKey: input.context.unifiedPackage.replayKey,
    unifiedPackageFingerprint: input.context.unifiedPackage.fingerprint,
    dryRunValidationCode: acknowledgement.code,
    dryRunConsumerReceivedAt: acknowledgement.receivedAt
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const existing = await client.query<{
      activation_id: string;
      activation_fingerprint: string;
      consumer_id: string;
      unified_package_id: string;
      status: string;
      expires_at: Date;
    }>(
      `select activation_id,activation_fingerprint,consumer_id,unified_package_id,status,expires_at
         from app.workspace_unified_cg_delivery_activations
        where workspace_id=$1 and corrective_generation_plan_id=$2 and status='active'
        limit 1
        for update`,
      [input.workspaceId, input.context.plan.correctiveGenerationPlanId]
    );
    const active = existing.rows[0];
    if (active) {
      if (
        active.activation_fingerprint === activationFingerprint &&
        active.consumer_id === input.consumerId &&
        active.unified_package_id === input.context.unifiedPackage.packageId &&
        active.expires_at.getTime() > Date.now()
      ) {
        return active.activation_id;
      }
      throw new Error("unified_corrective_generation_delivery_already_active");
    }

    const activationId = randomUUID();
    await client.query(
      `insert into app.workspace_unified_cg_delivery_activations (
         workspace_id,activation_id,corrective_generation_plan_id,
         corrective_generation_retriage_id,successor_source_id,
         predecessor_generation_lineage_id,case_id,target,generation_number,status,
         consumer_id,plan_fingerprint,source_recurrence_fingerprint,
         source_regression_fingerprint,source_successor_fingerprint,
         predecessor_registry_fingerprint,predecessor_plan_id,predecessor_delivery_id,
         predecessor_package_id,predecessor_replay_key,predecessor_package_fingerprint,
         unified_package_id,unified_replay_key,unified_package_fingerprint,
         dry_run_validation_code,dry_run_http_status,dry_run_consumer_received_at,
         dry_run_acknowledgement,activation_fingerprint,activated_by,expires_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,$22,$23,$24,$25,$26,$27::jsonb,$28,$29,$30
       )`,
      [
        input.workspaceId,
        activationId,
        input.context.plan.correctiveGenerationPlanId,
        input.context.plan.correctiveGenerationRetriageId,
        input.context.plan.successorSourceId,
        input.context.plan.predecessorGenerationLineageId,
        input.context.plan.caseId,
        input.context.plan.target,
        input.context.plan.generationNumber,
        input.consumerId,
        input.context.plan.planFingerprint,
        input.context.plan.sourceRecurrenceFingerprint,
        input.context.plan.sourceRegressionFingerprint,
        input.context.plan.sourceSuccessorFingerprint,
        input.context.predecessorRegistry.registryFingerprint,
        input.context.plan.predecessorPlanId,
        input.context.plan.predecessorDeliveryId,
        input.context.plan.predecessorPackageId,
        input.context.plan.predecessorReplayKey,
        input.context.plan.predecessorPackageFingerprint,
        input.context.unifiedPackage.packageId,
        input.context.unifiedPackage.replayKey,
        input.context.unifiedPackage.fingerprint,
        acknowledgement.code.slice(0, 96),
        input.dryRunHttpStatus,
        acknowledgement.receivedAt,
        JSON.stringify(acknowledgement),
        activationFingerprint,
        userId,
        new Date(Date.now() + UNIFIED_CORRECTIVE_GENERATION_ACTIVATION_WINDOW_MS)
      ]
    );
    return activationId;
  });
}

export async function getActiveUnifiedCorrectiveGenerationDeliveryActivation(
  userId: string,
  input: {
    workspaceId: string;
    correctiveGenerationPlanId: string;
    consumerId: string;
    unifiedPackage: IntegrationPackageV1;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
         from app.workspace_unified_cg_delivery_activations a
         join app.workspaces w on w.id=a.workspace_id
        where a.workspace_id=$1
          and a.corrective_generation_plan_id=$2
          and a.status='active'
        limit 1`,
      [input.workspaceId, input.correctiveGenerationPlanId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("unified_corrective_generation_delivery_activation_required");
    }
    if (row.expires_at.getTime() <= Date.now()) {
      throw new Error("unified_corrective_generation_delivery_activation_expired");
    }
    if (
      row.consumer_id !== input.consumerId ||
      row.unified_package_id !== input.unifiedPackage.packageId ||
      row.unified_replay_key !== input.unifiedPackage.replayKey ||
      row.unified_package_fingerprint !== input.unifiedPackage.fingerprint
    ) {
      throw new Error("unified_corrective_generation_delivery_activation_identity_conflict");
    }
    return activationFromRow({ ...row, role: "owner" });
  });
}

export async function reserveIdempotentUnifiedCorrectiveGenerationDelivery(
  userId: string,
  input: {
    workspaceId: string;
    activation: UnifiedCorrectiveGenerationDeliveryActivation;
    plan: UnifiedCorrectiveGenerationPlan;
    consumerId: string;
    unifiedPackage: IntegrationPackageV1;
  }
): Promise<{
  shouldSend: boolean;
  reason: "initial" | "retry" | "accepted" | "rejected" | "in-progress";
  delivery: UnifiedCorrectiveGenerationLiveDelivery;
}> {
  assertUnifiedCorrectiveGenerationPackageExecutable(input.unifiedPackage);

  return withUserDatabase(userId, async (client) => {
    const role = await requireManager(client, input.workspaceId);
    const activeResult = await client.query<ActivationRow>(
      `select a.*,w.name as workspace_name
         from app.workspace_unified_cg_delivery_activations a
         join app.workspaces w on w.id=a.workspace_id
        where a.workspace_id=$1 and a.activation_id=$2
        limit 1
        for update of a`,
      [input.workspaceId, input.activation.activationId]
    );
    const active = activeResult.rows[0];
    if (
      !active ||
      active.status !== "active" ||
      active.expires_at.getTime() <= Date.now()
    ) {
      throw new Error("unified_corrective_generation_delivery_activation_not_active");
    }
    if (
      active.corrective_generation_plan_id !== input.plan.correctiveGenerationPlanId ||
      active.consumer_id !== input.consumerId ||
      active.activation_fingerprint !== input.activation.activationFingerprint ||
      active.unified_package_id !== input.unifiedPackage.packageId ||
      active.unified_replay_key !== input.unifiedPackage.replayKey ||
      active.unified_package_fingerprint !== input.unifiedPackage.fingerprint
    ) {
      throw new Error("unified_corrective_generation_delivery_activation_identity_conflict");
    }

    const existing = await client.query<DeliveryRow>(
      `select d.*,w.name as workspace_name
         from app.workspace_unified_cg_live_deliveries d
         join app.workspaces w on w.id=d.workspace_id
        where d.workspace_id=$1 and d.consumer_id=$2 and d.unified_package_id=$3
        limit 1
        for update of d`,
      [input.workspaceId, input.consumerId, input.unifiedPackage.packageId]
    );
    const row = existing.rows[0];
    if (row) {
      const delivery = deliveryFromRow({ ...row, role });
      if (row.status === "accepted") {
        return { shouldSend: false, reason: "accepted", delivery };
      }
      if (row.status === "rejected") {
        return { shouldSend: false, reason: "rejected", delivery };
      }
      const stale =
        Date.now() - row.last_attempt_at.getTime() >=
        UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RESERVATION_STALE_MS;
      if (row.status === "reserved" && !stale) {
        return { shouldSend: false, reason: "in-progress", delivery };
      }
      if (row.attempt_count >= UNIFIED_CORRECTIVE_GENERATION_DELIVERY_RETRY_LIMIT) {
        throw new Error("unified_corrective_generation_delivery_retry_limit");
      }

      const retried = await client.query<DeliveryRow>(
        `update app.workspace_unified_cg_live_deliveries
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
        delivery: deliveryFromRow({ ...retried.rows[0], role })
      };
    }

    const deliveryId = randomUUID();
    const inserted = await client.query<DeliveryRow>(
      `insert into app.workspace_unified_cg_live_deliveries (
         workspace_id,delivery_id,activation_id,corrective_generation_plan_id,
         predecessor_delivery_id,target,generation_number,consumer_id,
         plan_fingerprint,activation_fingerprint,unified_package_id,
         unified_replay_key,unified_package_fingerprint,idempotency_key,status,
         attempt_count,validation_code,created_by,created_at,last_attempt_at,updated_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$12,'reserved',1,
         'reserved',$14,now(),now(),now()
       )
       returning *,(
         select name from app.workspaces where id=$1
       ) as workspace_name`,
      [
        input.workspaceId,
        deliveryId,
        input.activation.activationId,
        input.plan.correctiveGenerationPlanId,
        input.plan.predecessorDeliveryId,
        input.plan.target,
        input.plan.generationNumber,
        input.consumerId,
        input.plan.planFingerprint,
        input.activation.activationFingerprint,
        input.unifiedPackage.packageId,
        input.unifiedPackage.replayKey,
        input.unifiedPackage.fingerprint,
        userId
      ]
    );
    return {
      shouldSend: true,
      reason: "initial",
      delivery: deliveryFromRow({ ...inserted.rows[0], role })
    };
  });
}

export async function finalizeIdempotentUnifiedCorrectiveGenerationDelivery(
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
      `update app.workspace_unified_cg_live_deliveries
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
      throw new Error("unified_corrective_generation_delivery_not_reserved");
    }
    return deliveryFromRow({ ...result.rows[0], role });
  });
}

export async function revokeUnifiedCorrectiveGenerationDeliveryActivation(
  userId: string,
  input: { workspaceId: string; activationId: string; note?: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query(
      `update app.workspace_unified_cg_delivery_activations
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
      throw new Error("unified_corrective_generation_delivery_activation_not_active");
    }
  });
}
