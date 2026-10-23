import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  correctiveGenerationLineageFingerprint,
  correctiveGenerationSuccessorFingerprint
} from "./corrective-generation-lineage";
import {
  listUnifiedCorrectiveGenerationClosureForUser,
  type UnifiedCorrectiveGenerationExceptionReclosure
} from "./unified-corrective-generation-delivery-reconciliation";
import {
  loadApprovedUnifiedCorrectiveGenerationPlanContext,
  type UnifiedCorrectiveGenerationExecutionContext,
  type UnifiedCorrectiveGenerationLiveDelivery
} from "./unified-corrective-generation-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type JsonRecord = Record<string, unknown>;

export type PostUnifiedCorrectiveGenerationReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostUnifiedCorrectiveGenerationReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  regressionCheckId: string;
  reclosureId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  correctiveGenerationPlanId: string;
  deliveryId: string;
  target: IntegrationTarget;
  generationNumber: number;
  consumerId: string;
  reclosureFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  predecessorRegistryFingerprint: string;
  planFingerprint: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
  status: PostUnifiedCorrectiveGenerationReclosureStatus;
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

export interface UnifiedCorrectiveGenerationExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  recurrenceId: string;
  reclosureId: string;
  regressionCheckId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  reclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostUnifiedCorrectiveGenerationReclosureModel {
  closure: Awaited<ReturnType<typeof listUnifiedCorrectiveGenerationClosureForUser>>;
  checks: PostUnifiedCorrectiveGenerationReclosureCheck[];
  recurrences: UnifiedCorrectiveGenerationExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostUnifiedCorrectiveGenerationReclosureContext {
  reclosure: UnifiedCorrectiveGenerationExceptionReclosure;
  delivery: UnifiedCorrectiveGenerationLiveDelivery;
  execution: UnifiedCorrectiveGenerationExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  regression_check_id: string;
  reclosure_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  corrective_generation_plan_id: string;
  delivery_id: string;
  target: IntegrationTarget;
  generation_number: number;
  consumer_id: string;
  reclosure_fingerprint: string;
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  predecessor_registry_fingerprint: string;
  plan_fingerprint: string;
  unified_package_id: string;
  unified_replay_key: string;
  unified_package_fingerprint: string;
  status: PostUnifiedCorrectiveGenerationReclosureStatus;
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

type RecurrenceRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  recurrence_id: string;
  reclosure_id: string;
  regression_check_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  reclosure_fingerprint: string;
  regression_fingerprint: string;
  recurrence_fingerprint: string;
  recurrence_reason: string;
  recurred_by: string;
  recurred_at: Date;
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
    `select role
       from app.workspace_members
      where workspace_id=$1
        and user_id=nullif(current_setting('app.user_id',true),'')
      limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("post_unified_corrective_generation_recurrence_manager_required");
  }
  return role;
}

export function unifiedCorrectiveGenerationRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN UNIFIED-CORRECTIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postUnifiedCorrectiveGenerationReclosureErrorFingerprint(input: {
  reclosureId: string;
  unifiedPackageId: string;
  unifiedReplayKey: string;
  unifiedPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-unified-corrective-generation-verify1-", input);
}

export function unifiedCorrectiveGenerationRecurrenceFingerprint(input: {
  reclosureId: string;
  regressionCheckId: string;
  caseId: string;
  successorSourceId: string;
  generationNumber: number;
  reclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("unified-corrective-generation-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostUnifiedCorrectiveGenerationReclosureCheck {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    regressionCheckId: row.regression_check_id,
    reclosureId: row.reclosure_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    deliveryId: row.delivery_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    consumerId: row.consumer_id,
    reclosureFingerprint: row.reclosure_fingerprint,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessorFingerprint: row.source_successor_fingerprint,
    predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
    planFingerprint: row.plan_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): UnifiedCorrectiveGenerationExceptionRecurrence {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    recurrenceId: row.recurrence_id,
    reclosureId: row.reclosure_id,
    regressionCheckId: row.regression_check_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: Number(row.generation_number),
    reclosureFingerprint: row.reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    recurrenceFingerprint: row.recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason,
    recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostUnifiedCorrectiveGenerationReclosureForUser(
  userId: string
): Promise<PostUnifiedCorrectiveGenerationReclosureModel> {
  const closure = await listUnifiedCorrectiveGenerationClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
         from app.workspace_post_unified_cg_reclosure_checks x
         join app.workspaces w on w.id=x.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=x.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by x.created_at desc,x.regression_check_id desc
        limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
         from app.workspace_reconciliation_unified_cg_recurrences x
         join app.workspaces w on w.id=x.workspace_id
         join app.workspace_members wm
           on wm.workspace_id=x.workspace_id
          and wm.user_id=nullif(current_setting('app.user_id',true),'')
        order by x.recurred_at desc,x.recurrence_id desc
        limit 500`
    );
    return { checks: checks.rows, recurrences: recurrences.rows };
  });

  const checks = data.checks.map(checkFromRow);
  const recurrences = data.recurrences.map(recurrenceFromRow);
  const latest = new Map<string, PostUnifiedCorrectiveGenerationReclosureCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.reclosureId;
    if (!latest.has(key)) latest.set(key, item);
  }

  return {
    closure,
    checks,
    recurrences,
    totals: {
      verifiedReclosures: closure.reclosures.length,
      neverChecked: closure.reclosures.filter(
        (item) => !latest.has(item.workspaceId + ":" + item.reclosureId)
      ).length,
      stableLatest: [...latest.values()].filter((item) => item.status === "stable").length,
      recurredLatest: [...latest.values()].filter((item) => item.status === "recurred").length,
      verificationErrors: [...latest.values()].filter(
        (item) => item.status === "rejected" || item.status === "transport-error"
      ).length,
      governedRecurrences: recurrences.length
    }
  };
}

export async function loadPostUnifiedCorrectiveGenerationReclosureContext(
  userId: string,
  input: { workspaceId: string; reclosureId: string }
): Promise<PostUnifiedCorrectiveGenerationReclosureContext> {
  const model = await listUnifiedCorrectiveGenerationClosureForUser(userId);
  const reclosure = model.reclosures.find(
    (item) => item.workspaceId === input.workspaceId && item.reclosureId === input.reclosureId
  );
  if (!reclosure) throw new Error("post_unified_corrective_generation_reclosure_not_found");

  const delivery = model.unifiedCorrectiveGeneration.deliveries.find(
    (item) => item.workspaceId === input.workspaceId && item.deliveryId === reclosure.deliveryId
  );
  if (!delivery || delivery.status !== "accepted") {
    throw new Error("post_unified_corrective_generation_reclosure_accepted_delivery_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      case_status: string;
      delivery_status: string;
      plan_status: string;
      reclosure_fingerprint: string;
      latest_reclosure_id: string;
      recurrence_id: string | null;
      latest_successor_source_id: string;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              rc.reclosure_fingerprint,
              (select newest.reclosure_id
                 from app.workspace_reconciliation_unified_cg_reclosures newest
                where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
                order by newest.closed_at desc,newest.reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence.recurrence_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1
              ) as latest_successor_source_id
         from app.workspace_reconciliation_unified_cg_reclosures rc
         join app.workspace_unified_cg_live_deliveries d
           on d.workspace_id=rc.workspace_id and d.delivery_id=rc.delivery_id
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=rc.workspace_id
          and p.corrective_generation_plan_id=rc.corrective_generation_plan_id
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=rc.workspace_id and c.case_id=rc.case_id
         left join app.workspace_reconciliation_unified_cg_recurrences recurrence
           on recurrence.workspace_id=rc.workspace_id and recurrence.reclosure_id=rc.reclosure_id
        where rc.workspace_id=$1 and rc.reclosure_id=$2
        limit 1`,
      [input.workspaceId, input.reclosureId]
    );
    return result.rows[0] ?? null;
  });

  if (!gate) throw new Error("post_unified_corrective_generation_reclosure_not_found");
  if (gate.case_status !== "closed") {
    throw new Error("post_unified_corrective_generation_reclosure_closed_case_required");
  }
  if (gate.delivery_status !== "accepted" || gate.plan_status !== "approved") {
    throw new Error("post_unified_corrective_generation_reclosure_context_stale");
  }
  if (
    gate.reclosure_fingerprint !== reclosure.reclosureFingerprint ||
    gate.latest_reclosure_id !== reclosure.reclosureId ||
    gate.latest_successor_source_id !== reclosure.successorSourceId
  ) {
    throw new Error("post_unified_corrective_generation_reclosure_identity_mismatch");
  }
  if (gate.recurrence_id) {
    throw new Error("post_unified_corrective_generation_reclosure_already_recurred");
  }

  const execution = await loadApprovedUnifiedCorrectiveGenerationPlanContext(userId, {
    workspaceId: input.workspaceId,
    correctiveGenerationPlanId: reclosure.correctiveGenerationPlanId,
    allowClosedCase: true
  });
  if (
    execution.plan.planFingerprint !== reclosure.planFingerprint ||
    execution.plan.successorSourceId !== reclosure.successorSourceId ||
    execution.predecessorRegistry.registryFingerprint !==
      reclosure.predecessorRegistryFingerprint ||
    execution.unifiedPackage.fingerprint !== reclosure.packageFingerprint ||
    execution.unifiedPackage.packageId !== delivery.unifiedPackageId ||
    execution.unifiedPackage.replayKey !== delivery.unifiedReplayKey ||
    execution.unifiedPackage.fingerprint !== delivery.unifiedPackageFingerprint ||
    execution.consumerId !== delivery.consumerId
  ) {
    throw new Error("post_unified_corrective_generation_reclosure_package_identity_mismatch");
  }

  return { reclosure, delivery, execution, package: execution.unifiedPackage };
}

export function comparePostUnifiedCorrectiveGenerationReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison = compareConsumerState(integrationPackage, response);
  const status: PostUnifiedCorrectiveGenerationReclosureStatus =
    comparison.status === "matched"
      ? "stable"
      : comparison.status === "drift"
        ? "recurred"
        : comparison.status;
  return { ...comparison, status };
}

export async function recordPostUnifiedCorrectiveGenerationReclosureCheck(
  userId: string,
  input: {
    workspaceId: string;
    context: PostUnifiedCorrectiveGenerationReclosureContext;
    status: PostUnifiedCorrectiveGenerationReclosureStatus;
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
    const { reclosure, delivery, execution } = input.context;

    const current = await client.query<{
      case_status: string;
      delivery_status: string;
      plan_status: string;
      reclosure_fingerprint: string;
      latest_reclosure_id: string;
      recurrence_id: string | null;
      latest_successor_source_id: string;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              rc.reclosure_fingerprint,
              (select newest.reclosure_id
                 from app.workspace_reconciliation_unified_cg_reclosures newest
                where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
                order by newest.closed_at desc,newest.reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence.recurrence_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=rc.workspace_id and newest.case_id=rc.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1
              ) as latest_successor_source_id
         from app.workspace_reconciliation_unified_cg_reclosures rc
         join app.workspace_unified_cg_live_deliveries d
           on d.workspace_id=rc.workspace_id and d.delivery_id=rc.delivery_id
         join app.workspace_corrective_generation_plans p
           on p.workspace_id=rc.workspace_id
          and p.corrective_generation_plan_id=rc.corrective_generation_plan_id
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=rc.workspace_id and c.case_id=rc.case_id
         left join app.workspace_reconciliation_unified_cg_recurrences recurrence
           on recurrence.workspace_id=rc.workspace_id and recurrence.reclosure_id=rc.reclosure_id
        where rc.workspace_id=$1 and rc.reclosure_id=$2
        limit 1`,
      [input.workspaceId, reclosure.reclosureId]
    );
    const row = current.rows[0];
    if (!row || row.case_status !== "closed") {
      throw new Error("post_unified_corrective_generation_reclosure_closed_case_required");
    }
    if (row.delivery_status !== "accepted" || row.plan_status !== "approved") {
      throw new Error("post_unified_corrective_generation_reclosure_context_stale");
    }
    if (
      row.reclosure_fingerprint !== reclosure.reclosureFingerprint ||
      row.latest_reclosure_id !== reclosure.reclosureId ||
      row.latest_successor_source_id !== reclosure.successorSourceId ||
      execution.plan.planFingerprint !== reclosure.planFingerprint ||
      execution.plan.successorSourceId !== reclosure.successorSourceId ||
      input.context.package.packageId !== delivery.unifiedPackageId ||
      input.context.package.replayKey !== delivery.unifiedReplayKey ||
      input.context.package.fingerprint !== delivery.unifiedPackageFingerprint
    ) {
      throw new Error("post_unified_corrective_generation_reclosure_identity_mismatch");
    }
    if (row.recurrence_id) {
      throw new Error("post_unified_corrective_generation_reclosure_already_recurred");
    }

    const regressionCheckId = randomUUID();
    await client.query(
      `insert into app.workspace_post_unified_cg_reclosure_checks (
        workspace_id,regression_check_id,reclosure_id,successor_source_id,
        predecessor_generation_lineage_id,case_id,corrective_generation_plan_id,delivery_id,
        target,generation_number,consumer_id,reclosure_fingerprint,source_recurrence_id,
        source_recurrence_fingerprint,source_regression_fingerprint,source_successor_fingerprint,
        predecessor_registry_fingerprint,plan_fingerprint,unified_package_id,unified_replay_key,
        unified_package_fingerprint,status,expected_record_count,matched_count,mismatched_count,
        missing_count,validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31::jsonb,$32,now()
      )`,
      [
        input.workspaceId,
        regressionCheckId,
        reclosure.reclosureId,
        reclosure.successorSourceId,
        reclosure.predecessorGenerationLineageId,
        reclosure.caseId,
        reclosure.correctiveGenerationPlanId,
        reclosure.deliveryId,
        reclosure.target,
        reclosure.generationNumber,
        delivery.consumerId,
        reclosure.reclosureFingerprint,
        reclosure.sourceRecurrenceId,
        reclosure.sourceRecurrenceFingerprint,
        reclosure.sourceRegressionFingerprint,
        reclosure.sourceSuccessorFingerprint,
        reclosure.predecessorRegistryFingerprint,
        reclosure.planFingerprint,
        delivery.unifiedPackageId,
        delivery.unifiedReplayKey,
        delivery.unifiedPackageFingerprint,
        input.status,
        input.expectedRecordCount,
        input.matchedCount,
        input.mismatchedCount,
        input.missingCount,
        input.validationCode.slice(0, 96),
        input.httpStatus ?? null,
        input.consumerVerifiedAt ?? null,
        input.verificationFingerprint,
        JSON.stringify(input.recordResults),
        userId
      ]
    );

    return regressionCheckId;
  });
}

export async function recurUnifiedCorrectiveGenerationReclosedException(
  userId: string,
  input: {
    workspaceId: string;
    reclosureId: string;
    regressionCheckId: string;
    recurrenceReason: string;
  }
) {
  const reason = input.recurrenceReason.trim().slice(0, 8000);
  if (!reason) {
    throw new Error("post_unified_corrective_generation_recurrence_reason_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ recurrence_id: string }>(
      `select recurrence_id
         from app.workspace_reconciliation_unified_cg_recurrences
        where workspace_id=$1 and reclosure_id=$2
        limit 1`,
      [input.workspaceId, input.reclosureId]
    );
    if (existing.rows[0]) return existing.rows[0].recurrence_id;

    const result = await client.query<{
      regression_check_id: string;
      reclosure_id: string;
      successor_source_id: string;
      predecessor_generation_lineage_id: string;
      corrective_generation_plan_id: string;
      delivery_id: string;
      case_id: string;
      target: IntegrationTarget;
      generation_number: number;
      status: PostUnifiedCorrectiveGenerationReclosureStatus;
      reclosure_fingerprint: string;
      verification_fingerprint: string;
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      plan_fingerprint: string;
      unified_package_fingerprint: string;
      case_status: string;
      latest_check_id: string;
      latest_reclosure_id: string;
      latest_successor_source_id: string;
    }>(
      `select x.regression_check_id,x.reclosure_id,x.successor_source_id,
              x.predecessor_generation_lineage_id,x.corrective_generation_plan_id,x.delivery_id,
              x.case_id,x.target,x.generation_number,x.status,x.reclosure_fingerprint,
              x.verification_fingerprint,x.source_recurrence_id,x.source_recurrence_fingerprint,
              x.plan_fingerprint,x.unified_package_fingerprint,c.status as case_status,
              (select newest.regression_check_id
                 from app.workspace_post_unified_cg_reclosure_checks newest
                where newest.workspace_id=x.workspace_id and newest.reclosure_id=x.reclosure_id
                order by newest.created_at desc,newest.regression_check_id desc limit 1
              ) as latest_check_id,
              (select newest.reclosure_id
                 from app.workspace_reconciliation_unified_cg_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.reclosure_id desc limit 1
              ) as latest_reclosure_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1
              ) as latest_successor_source_id
         from app.workspace_post_unified_cg_reclosure_checks x
         join app.workspace_reconciliation_exception_cases c
           on c.workspace_id=x.workspace_id and c.case_id=x.case_id
        where x.workspace_id=$1 and x.reclosure_id=$2 and x.regression_check_id=$3
        limit 1`,
      [input.workspaceId, input.reclosureId, input.regressionCheckId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("post_unified_corrective_generation_recurrence_check_not_found");
    if (row.status !== "recurred" || row.case_status !== "closed") {
      throw new Error("post_unified_corrective_generation_recurrence_recurred_closed_required");
    }
    if (row.latest_check_id !== row.regression_check_id) {
      throw new Error("post_unified_corrective_generation_recurrence_latest_check_required");
    }
    if (row.latest_reclosure_id !== row.reclosure_id) {
      throw new Error("post_unified_corrective_generation_recurrence_latest_reclosure_required");
    }
    if (row.latest_successor_source_id !== row.successor_source_id) {
      throw new Error("post_unified_corrective_generation_recurrence_latest_successor_required");
    }
    if (Number(row.generation_number) >= 9999) {
      throw new Error("post_unified_corrective_generation_recurrence_generation_limit");
    }

    const recurrenceId = randomUUID();
    const recurrenceFingerprint = unifiedCorrectiveGenerationRecurrenceFingerprint({
      reclosureId: row.reclosure_id,
      regressionCheckId: row.regression_check_id,
      caseId: row.case_id,
      successorSourceId: row.successor_source_id,
      generationNumber: Number(row.generation_number),
      reclosureFingerprint: row.reclosure_fingerprint,
      regressionFingerprint: row.verification_fingerprint,
      recurrenceReason: reason
    });

    await client.query(
      `insert into app.workspace_reconciliation_unified_cg_recurrences (
        workspace_id,recurrence_id,reclosure_id,regression_check_id,successor_source_id,
        predecessor_generation_lineage_id,case_id,target,generation_number,reclosure_fingerprint,
        regression_fingerprint,recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
      [
        input.workspaceId,
        recurrenceId,
        row.reclosure_id,
        row.regression_check_id,
        row.successor_source_id,
        row.predecessor_generation_lineage_id,
        row.case_id,
        row.target,
        row.generation_number,
        row.reclosure_fingerprint,
        row.verification_fingerprint,
        recurrenceFingerprint,
        reason,
        userId
      ]
    );

    const predecessor = await client.query<{ registry_fingerprint: string }>(
      `select registry_fingerprint
         from app.workspace_corrective_generation_registry
        where workspace_id=$1 and generation_lineage_id=$2
        limit 1`,
      [input.workspaceId, row.predecessor_generation_lineage_id]
    );
    const predecessorRegistryFingerprint = predecessor.rows[0]?.registry_fingerprint;
    if (!predecessorRegistryFingerprint) {
      throw new Error("post_unified_corrective_generation_recurrence_predecessor_registry_required");
    }

    const registryFingerprint = correctiveGenerationLineageFingerprint({
      generationNumber: Number(row.generation_number),
      predecessorRegistryFingerprint,
      sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
      planFingerprint: row.plan_fingerprint,
      packageFingerprint: row.unified_package_fingerprint,
      reclosureFingerprint: row.reclosure_fingerprint,
      terminalRecurrenceFingerprint: recurrenceFingerprint
    });
    const successorFingerprint = correctiveGenerationSuccessorFingerprint({
      generationNumber: Number(row.generation_number) + 1,
      predecessorRegistryFingerprint: registryFingerprint,
      sourceRecurrenceFingerprint: recurrenceFingerprint,
      sourceRegressionFingerprint: row.verification_fingerprint
    });

    await client.query(
      `select * from app.register_unified_cg_recurrence_lineage($1,$2,$3,$4)`,
      [input.workspaceId, recurrenceId, registryFingerprint, successorFingerprint]
    );

    const updated = await client.query(
      `update app.workspace_reconciliation_exception_cases
          set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
              investigation_note=left(
                case when investigation_note='' then $4
                  else investigation_note || E'\n\nBuild 113 governed unified corrective-generation recurrence: ' || $4 end,
                8000
              )
        where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId, row.case_id, userId, reason]
    );
    if (!updated.rowCount) {
      throw new Error("post_unified_corrective_generation_recurrence_closed_case_required");
    }

    return recurrenceId;
  });
}
