import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listUnifiedCorrectiveGenerationDeliveryForUser,
  loadApprovedUnifiedCorrectiveGenerationPlanContext,
  type UnifiedCorrectiveGenerationDeliveryModel,
  type UnifiedCorrectiveGenerationExecutionContext,
  type UnifiedCorrectiveGenerationLiveDelivery
} from "./unified-corrective-generation-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type JsonRecord = Record<string, unknown>;

export interface UnifiedCorrectiveGenerationDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reconciliationId: string;
  deliveryId: string;
  activationId: string;
  correctiveGenerationPlanId: string;
  correctiveGenerationRetriageId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  consumerId: string;
  planFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  predecessorRegistryFingerprint: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
  status: ReconciliationStatus;
  expectedRecordCount: number;
  matchedCount: number;
  mismatchedCount: number;
  missingCount: number;
  validationCode: string;
  httpStatus: number | null;
  consumerVerifiedAt: string | null;
  verificationFingerprint: string;
  recordResults: ReconciliationRecordResult[];
  actorUserId: string;
  createdAt: string;
  canManage: boolean;
}

export interface UnifiedCorrectiveGenerationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reclosureId: string;
  predecessorGenerationLineageId: string;
  successorSourceId: string;
  correctiveGenerationRetriageId: string;
  correctiveGenerationPlanId: string;
  deliveryId: string;
  reconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  predecessorRegistryFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  planFingerprint: string;
  packageFingerprint: string;
  verificationFingerprint: string;
  reclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface UnifiedCorrectiveGenerationClosureModel {
  unifiedCorrectiveGeneration: UnifiedCorrectiveGenerationDeliveryModel;
  reconciliations: UnifiedCorrectiveGenerationDeliveryReconciliation[];
  reclosures: UnifiedCorrectiveGenerationExceptionReclosure[];
  totals: {
    acceptedDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedUnifiedCorrectiveGenerationReconciliationContext {
  delivery: UnifiedCorrectiveGenerationLiveDelivery;
  execution: UnifiedCorrectiveGenerationExecutionContext;
  package: IntegrationPackageV1;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  reconciliation_id: string;
  delivery_id: string;
  activation_id: string;
  corrective_generation_plan_id: string;
  corrective_generation_retriage_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  consumer_id: string;
  plan_fingerprint: string;
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  predecessor_registry_fingerprint: string;
  unified_package_id: string;
  unified_replay_key: string;
  unified_package_fingerprint: string;
  status: ReconciliationStatus;
  expected_record_count: number;
  matched_count: number;
  mismatched_count: number;
  missing_count: number;
  validation_code: string;
  http_status: number | null;
  consumer_verified_at: Date | null;
  verification_fingerprint: string;
  record_results: ReconciliationRecordResult[];
  actor_user_id: string;
  created_at: Date;
};

type ReclosureRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  reclosure_id: string;
  predecessor_generation_lineage_id: string;
  successor_source_id: string;
  corrective_generation_retriage_id: string;
  corrective_generation_plan_id: string;
  delivery_id: string;
  reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  predecessor_registry_fingerprint: string;
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  plan_fingerprint: string;
  package_fingerprint: string;
  verification_fingerprint: string;
  reclosure_fingerprint: string;
  reclosure_note: string;
  closed_by: string;
  closed_at: Date;
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

async function requireManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role from app.workspace_members
      where workspace_id=$1
        and user_id=nullif(current_setting('app.user_id',true),'')
      limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("unified_corrective_generation_reclosure_manager_required");
  }
  return role;
}

export function unifiedCorrectiveGenerationReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE UNIFIED-CORRECTIVE-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

export function unifiedCorrectiveGenerationReconciliationErrorFingerprint(input: {
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("unified-corrective-generation-verify1-", input);
}

export function unifiedCorrectiveGenerationReclosureFingerprint(input: {
  predecessorGenerationLineageId: string;
  successorSourceId: string;
  correctiveGenerationRetriageId: string;
  correctiveGenerationPlanId: string;
  deliveryId: string;
  reconciliationId: string;
  generationNumber: number;
  predecessorRegistryFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  planFingerprint: string;
  packageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("unified-corrective-generation-reclosure1-", input);
}

function reconciliationFromRow(row: ReconciliationRow): UnifiedCorrectiveGenerationDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    reconciliationId: row.reconciliation_id,
    deliveryId: row.delivery_id,
    activationId: row.activation_id,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessorFingerprint: row.source_successor_fingerprint,
    predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
    unifiedPackageId: row.unified_package_id,
    unifiedReplayKey: row.unified_replay_key,
    unifiedPackageFingerprint: row.unified_package_fingerprint,
    status: row.status,
    expectedRecordCount: Number(row.expected_record_count),
    matchedCount: Number(row.matched_count),
    mismatchedCount: Number(row.mismatched_count),
    missingCount: Number(row.missing_count),
    validationCode: row.validation_code,
    httpStatus: row.http_status,
    consumerVerifiedAt: row.consumer_verified_at?.toISOString() ?? null,
    verificationFingerprint: row.verification_fingerprint,
    recordResults: Array.isArray(row.record_results) ? row.record_results : [],
    actorUserId: row.actor_user_id,
    createdAt: row.created_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function reclosureFromRow(row: ReclosureRow): UnifiedCorrectiveGenerationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    reclosureId: row.reclosure_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    successorSourceId: row.successor_source_id,
    correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    deliveryId: row.delivery_id,
    reconciliationId: row.reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessorFingerprint: row.source_successor_fingerprint,
    planFingerprint: row.plan_fingerprint,
    packageFingerprint: row.package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    reclosureFingerprint: row.reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listUnifiedCorrectiveGenerationClosureForUser(
  userId: string
): Promise<UnifiedCorrectiveGenerationClosureModel> {
  const unifiedCorrectiveGeneration =
    await listUnifiedCorrectiveGenerationDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
         from app.workspace_unified_cg_delivery_reconciliations r
         join app.workspaces w on w.id=r.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=r.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by r.created_at desc,r.reconciliation_id desc
        limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
         from app.workspace_reconciliation_unified_cg_reclosures r
         join app.workspaces w on w.id=r.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=r.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by r.closed_at desc,r.reclosure_id desc
        limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = unifiedCorrectiveGeneration.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<string, UnifiedCorrectiveGenerationDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.deliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    unifiedCorrectiveGeneration,
    reconciliations,
    reclosures,
    totals: {
      acceptedDeliveries: accepted.length,
      neverVerified: accepted.filter(
        (delivery) => !latestByDelivery.has(delivery.workspaceId + ":" + delivery.deliveryId)
      ).length,
      matchedLatest: [...latestByDelivery.values()].filter((item) => item.status === "matched").length,
      driftLatest: [...latestByDelivery.values()].filter((item) => item.status === "drift").length,
      verificationErrors: [...latestByDelivery.values()].filter(
        (item) => item.status === "rejected" || item.status === "transport-error"
      ).length,
      verifiedReclosures: reclosures.length
    }
  };
}

export async function loadAcceptedUnifiedCorrectiveGenerationReconciliationContext(
  userId: string,
  input: { workspaceId: string; deliveryId: string }
): Promise<AcceptedUnifiedCorrectiveGenerationReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      corrective_generation_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      successor_source_id: string;
      latest_successor_source_id: string;
      consumer_id: string;
      activation_id: string;
      generation_number: number;
      plan_fingerprint: string;
      unified_package_id: string;
      unified_replay_key: string;
      unified_package_fingerprint: string;
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_successor_fingerprint: string;
      predecessor_generation_lineage_id: string;
      predecessor_registry_fingerprint: string;
      successor_source_recurrence_id: string;
      successor_source_recurrence_fingerprint: string;
      successor_source_regression_fingerprint: string;
      successor_fingerprint: string;
      registry_fingerprint: string;
    }>(
      `select d.corrective_generation_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.successor_source_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=p.workspace_id and newest.case_id=p.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id,
              d.consumer_id,d.activation_id,d.generation_number,d.plan_fingerprint,
              d.unified_package_id,d.unified_replay_key,d.unified_package_fingerprint,
              p.source_recurrence_id,p.source_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_successor_fingerprint,p.predecessor_generation_lineage_id,
              t.predecessor_registry_fingerprint,
              s.source_recurrence_id as successor_source_recurrence_id,
              s.source_recurrence_fingerprint as successor_source_recurrence_fingerprint,
              s.source_regression_fingerprint as successor_source_regression_fingerprint,
              s.successor_fingerprint,r.registry_fingerprint
         from app.workspace_unified_cg_live_deliveries d
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=d.workspace_id
          and p.corrective_generation_plan_id=d.corrective_generation_plan_id
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
        where d.workspace_id=$1 and d.delivery_id=$2
        limit 1`,
      [input.workspaceId, input.deliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("unified_corrective_generation_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("unified_corrective_generation_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("unified_corrective_generation_reconciliation_open_approved_cycle_required");
  }
  if (row.successor_source_id !== row.latest_successor_source_id) {
    throw new Error("unified_corrective_generation_reconciliation_latest_successor_required");
  }
  if (
    row.source_recurrence_id !== row.successor_source_recurrence_id ||
    row.source_recurrence_fingerprint !== row.successor_source_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.successor_source_regression_fingerprint ||
    row.source_successor_fingerprint !== row.successor_fingerprint ||
    row.predecessor_registry_fingerprint !== row.registry_fingerprint
  ) {
    throw new Error("unified_corrective_generation_reconciliation_successor_identity_changed");
  }

  const execution = await loadApprovedUnifiedCorrectiveGenerationPlanContext(userId, {
    workspaceId: input.workspaceId,
    correctiveGenerationPlanId: row.corrective_generation_plan_id
  });
  if (
    execution.unifiedPackage.packageId !== row.unified_package_id ||
    execution.unifiedPackage.replayKey !== row.unified_replay_key ||
    execution.unifiedPackage.fingerprint !== row.unified_package_fingerprint ||
    execution.consumerId !== row.consumer_id ||
    execution.plan.planFingerprint !== row.plan_fingerprint ||
    execution.plan.generationNumber !== Number(row.generation_number)
  ) {
    throw new Error("unified_corrective_generation_reconciliation_package_identity_mismatch");
  }

  const model = await listUnifiedCorrectiveGenerationDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) => item.workspaceId === input.workspaceId && item.deliveryId === input.deliveryId
  );
  if (!delivery || delivery.status !== "accepted" || delivery.activationId !== row.activation_id) {
    throw new Error("unified_corrective_generation_reconciliation_delivery_not_found");
  }

  return { delivery, execution, package: execution.unifiedPackage };
}

export function compareUnifiedCorrectiveGenerationConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordUnifiedCorrectiveGenerationDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedUnifiedCorrectiveGenerationReconciliationContext;
    status: ReconciliationStatus;
    expectedRecordCount: number;
    matchedCount: number;
    mismatchedCount: number;
    missingCount: number;
    validationCode: string;
    httpStatus?: number | null;
    consumerVerifiedAt?: string | null;
    verificationFingerprint: string;
    recordResults: ReconciliationRecordResult[];
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const { delivery, execution } = input.context;
    const plan = execution.plan;

    const current = await client.query<{
      delivery_status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      successor_source_id: string;
      latest_successor_source_id: string;
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_successor_fingerprint: string;
      predecessor_registry_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,p.status as plan_status,
              t.status as retriage_status,p.successor_source_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=p.workspace_id and newest.case_id=p.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id,
              s.source_recurrence_id,s.source_recurrence_fingerprint,
              s.source_regression_fingerprint,s.successor_fingerprint as source_successor_fingerprint,
              t.predecessor_registry_fingerprint,d.consumer_id,d.plan_fingerprint,
              d.unified_package_id as package_id,d.unified_replay_key as replay_key,
              d.unified_package_fingerprint as package_fingerprint
         from app.workspace_unified_cg_live_deliveries d
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=d.workspace_id
          and p.corrective_generation_plan_id=d.corrective_generation_plan_id
         join app.workspace_corrective_generation_retriage t
           on t.workspace_id=p.workspace_id
          and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
         join app.workspace_corrective_generation_successors s
           on s.workspace_id=p.workspace_id and s.successor_source_id=p.successor_source_id
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=p.workspace_id and c.case_id=p.case_id
        where d.workspace_id=$1 and d.delivery_id=$2
        limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("unified_corrective_generation_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.successor_source_id !== row.latest_successor_source_id
    ) {
      throw new Error("unified_corrective_generation_reconciliation_open_approved_cycle_required");
    }
    if (
      row.source_recurrence_id !== plan.sourceRecurrenceId ||
      row.source_recurrence_fingerprint !== plan.sourceRecurrenceFingerprint ||
      row.source_regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.source_successor_fingerprint !== plan.sourceSuccessorFingerprint ||
      row.predecessor_registry_fingerprint !== execution.predecessorRegistry.registryFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("unified_corrective_generation_reconciliation_package_identity_mismatch");
    }

    const reconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_unified_cg_delivery_reconciliations (
        workspace_id,reconciliation_id,delivery_id,activation_id,corrective_generation_plan_id,
        corrective_generation_retriage_id,successor_source_id,predecessor_generation_lineage_id,
        case_id,target,generation_number,consumer_id,plan_fingerprint,source_recurrence_id,
        source_recurrence_fingerprint,source_regression_fingerprint,source_successor_fingerprint,
        predecessor_registry_fingerprint,unified_package_id,unified_replay_key,unified_package_fingerprint,
        status,expected_record_count,matched_count,mismatched_count,missing_count,validation_code,
        http_status,consumer_verified_at,verification_fingerprint,record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31::jsonb,$32,now()
      )`,
      [
        input.workspaceId,
        reconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.correctiveGenerationPlanId,
        plan.correctiveGenerationRetriageId,
        plan.successorSourceId,
        plan.predecessorGenerationLineageId,
        plan.caseId,
        delivery.target,
        plan.generationNumber,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceRecurrenceId,
        plan.sourceRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceSuccessorFingerprint,
        execution.predecessorRegistry.registryFingerprint,
        input.context.package.packageId,
        input.context.package.replayKey,
        input.context.package.fingerprint,
        input.status,
        input.expectedRecordCount,
        input.matchedCount,
        input.mismatchedCount,
        input.missingCount,
        input.validationCode.slice(0,96),
        input.httpStatus ?? null,
        input.consumerVerifiedAt ?? null,
        input.verificationFingerprint,
        JSON.stringify(input.recordResults),
        userId
      ]
    );
    return reconciliationId;
  });
}

export async function closeVerifiedUnifiedCorrectiveGenerationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    deliveryId: string;
    reconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("unified_corrective_generation_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query<{
      reconciliation_id: string;
      delivery_id: string;
      corrective_generation_plan_id: string;
      corrective_generation_retriage_id: string;
      successor_source_id: string;
      predecessor_generation_lineage_id: string;
      case_id: string;
      target: IntegrationTarget;
      generation_number: number;
      predecessor_registry_fingerprint: string;
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_successor_fingerprint: string;
      plan_fingerprint: string;
      unified_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_successor_source_id: string;
    }>(
      `select vr.reconciliation_id,vr.delivery_id,vr.corrective_generation_plan_id,
              vr.corrective_generation_retriage_id,vr.successor_source_id,
              vr.predecessor_generation_lineage_id,vr.case_id,vr.target,vr.generation_number,
              vr.predecessor_registry_fingerprint,vr.source_recurrence_id,
              vr.source_recurrence_fingerprint,vr.source_regression_fingerprint,
              vr.source_successor_fingerprint,vr.plan_fingerprint,
              vr.unified_package_fingerprint,vr.verification_fingerprint,vr.status,
              d.status as delivery_status,p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              (select newest.reconciliation_id
                 from app.workspace_unified_cg_delivery_reconciliations newest
                where newest.workspace_id=vr.workspace_id and newest.delivery_id=vr.delivery_id
                order by newest.created_at desc,newest.reconciliation_id desc limit 1
              ) as latest_reconciliation_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=vr.workspace_id and newest.case_id=vr.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc limit 1
              ) as latest_successor_source_id
         from app.workspace_unified_cg_delivery_reconciliations vr
         join app.workspace_unified_cg_live_deliveries d
           on d.workspace_id=vr.workspace_id and d.delivery_id=vr.delivery_id
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=vr.workspace_id
          and p.corrective_generation_plan_id=vr.corrective_generation_plan_id
         join app.workspace_corrective_generation_retriage t
           on t.workspace_id=p.workspace_id
          and t.corrective_generation_retriage_id=p.corrective_generation_retriage_id
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=p.workspace_id and c.case_id=p.case_id
        where vr.workspace_id=$1 and vr.case_id=$2 and vr.delivery_id=$3 and vr.reconciliation_id=$4
        limit 1`,
      [input.workspaceId, input.caseId, input.deliveryId, input.reconciliationId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("unified_corrective_generation_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("unified_corrective_generation_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("unified_corrective_generation_reclosure_open_approved_cycle_required");
    }
    if (row.latest_reconciliation_id !== row.reconciliation_id) {
      throw new Error("unified_corrective_generation_reclosure_latest_verification_required");
    }
    if (row.latest_successor_source_id !== row.successor_source_id) {
      throw new Error("unified_corrective_generation_reclosure_latest_successor_required");
    }

    const existing = await client.query<{ reclosure_id: string }>(
      `select reclosure_id
         from app.workspace_reconciliation_unified_cg_reclosures
        where workspace_id=$1 and successor_source_id=$2
        limit 1`,
      [input.workspaceId, row.successor_source_id]
    );
    if (existing.rows[0]) return existing.rows[0].reclosure_id;

    const reclosureFingerprint = unifiedCorrectiveGenerationReclosureFingerprint({
      predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
      successorSourceId: row.successor_source_id,
      correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
      correctiveGenerationPlanId: row.corrective_generation_plan_id,
      deliveryId: row.delivery_id,
      reconciliationId: row.reconciliation_id,
      generationNumber: Number(row.generation_number),
      predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
      sourceRecurrenceId: row.source_recurrence_id,
      sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceSuccessorFingerprint: row.source_successor_fingerprint,
      planFingerprint: row.plan_fingerprint,
      packageFingerprint: row.unified_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const reclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_unified_cg_reclosures (
        workspace_id,reclosure_id,predecessor_generation_lineage_id,successor_source_id,
        corrective_generation_retriage_id,corrective_generation_plan_id,delivery_id,
        reconciliation_id,case_id,target,generation_number,predecessor_registry_fingerprint,
        source_recurrence_id,source_recurrence_fingerprint,source_regression_fingerprint,
        source_successor_fingerprint,plan_fingerprint,package_fingerprint,
        verification_fingerprint,reclosure_fingerprint,reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,now()
      )`,
      [
        input.workspaceId,
        reclosureId,
        row.predecessor_generation_lineage_id,
        row.successor_source_id,
        row.corrective_generation_retriage_id,
        row.corrective_generation_plan_id,
        row.delivery_id,
        row.reconciliation_id,
        row.case_id,
        row.target,
        row.generation_number,
        row.predecessor_registry_fingerprint,
        row.source_recurrence_id,
        row.source_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.source_successor_fingerprint,
        row.plan_fingerprint,
        row.unified_package_fingerprint,
        row.verification_fingerprint,
        reclosureFingerprint,
        reclosureNote,
        userId
      ]
    );

    const updated = await client.query(
      `update app.workspace_reconciliation_exception_cases
          set status='closed',closed_by=$3,closed_at=now(),updated_by=$3,updated_at=now()
        where workspace_id=$1 and case_id=$2 and status='open'`,
      [input.workspaceId, input.caseId, userId]
    );
    if (!updated.rowCount) {
      throw new Error("unified_corrective_generation_reclosure_open_case_required");
    }

    return reclosureId;
  });
}
