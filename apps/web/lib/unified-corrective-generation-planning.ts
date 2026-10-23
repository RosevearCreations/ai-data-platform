// Build 110 foundation; Build 113 corrective continuation — Unified Corrective-Generation Recurrence Re-Triage & Planning Engine
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase, type WorkspaceRole } from "./database";
import type { IntegrationTarget } from "./integration-delivery";
import type { ReconciliationRecordResult } from "./post-delivery-reconciliation";
import { buildNextGenerationCorrectivePlanScope } from "./recurrent-exception-planning";
import {
  listCorrectiveGenerationLineageForUser,
  type CorrectiveGenerationLineageModel
} from "./corrective-generation-lineage";
import type {
  CorrectivePlanScopeItem,
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "./reconciliation-exception-triage";

type JsonRecord = Record<string, unknown>;

export type CorrectiveGenerationRetriageStatus =
  | "open"
  | "planned"
  | "approved"
  | "dismissed";

export type UnifiedCorrectiveGenerationPlanStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface CorrectiveGenerationRetriage {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  correctiveGenerationRetriageId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  sourceRecurrenceKind: "following-corrective-generation" | "generic-corrective-generation";
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  predecessorRegistryFingerprint: string;
  successorFingerprint: string;
  status: CorrectiveGenerationRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  affectedRecordCount: number;
  affectedIntegrationKeys: string[];
  affectedFields: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  dismissedBy: string | null;
  dismissedAt: string | null;
  canManage: boolean;
}

export interface UnifiedCorrectiveGenerationPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  correctiveGenerationPlanId: string;
  correctiveGenerationRetriageId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  caseId: string;
  target: IntegrationTarget;
  generationNumber: number;
  status: UnifiedCorrectiveGenerationPlanStatus;
  predecessorPlanId: string;
  predecessorDeliveryId: string;
  predecessorPackageId: string;
  predecessorReplayKey: string;
  predecessorPackageFingerprint: string;
  predecessorReclosureId: string;
  predecessorReclosureFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  planFingerprint: string;
  rationale: string;
  createdBy: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  canManage: boolean;
}

export interface UnifiedCorrectiveGenerationPlanningModel {
  lineage: CorrectiveGenerationLineageModel;
  retriage: CorrectiveGenerationRetriage[];
  plans: UnifiedCorrectiveGenerationPlan[];
  totals: {
    successorsWithoutRetriage: number;
    activeRetriage: number;
    proposedPlans: number;
    approvedPlans: number;
  };
}

type RetriageRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  corrective_generation_retriage_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  source_recurrence_kind: "following-corrective-generation" | "generic-corrective-generation";
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  predecessor_registry_fingerprint: string;
  successor_fingerprint: string;
  status: CorrectiveGenerationRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  affected_record_count: number;
  affected_integration_keys: string[];
  affected_fields: string[];
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
  dismissed_by: string | null;
  dismissed_at: Date | null;
};

type PlanRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  corrective_generation_plan_id: string;
  corrective_generation_retriage_id: string;
  successor_source_id: string;
  predecessor_generation_lineage_id: string;
  case_id: string;
  target: IntegrationTarget;
  generation_number: number;
  status: UnifiedCorrectiveGenerationPlanStatus;
  predecessor_plan_id: string;
  predecessor_delivery_id: string;
  predecessor_package_id: string;
  predecessor_replay_key: string;
  predecessor_package_fingerprint: string;
  predecessor_reclosure_id: string;
  predecessor_reclosure_fingerprint: string;
  source_recurrence_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successor_fingerprint: string;
  correction_scope: CorrectivePlanScopeItem[];
  plan_fingerprint: string;
  rationale: string;
  created_by: string;
  created_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string;
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
  return prefix + createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

function sql(...parts: string[]) {
  return parts.join(" ");
}

async function requireManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    sql(
      "select role from app.workspace_members",
      "where workspace_id=$1",
      "and user_id=nullif(current_setting('app.user_id',true),'')",
      "limit 1"
    ),
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("unified_corrective_generation_planning_manager_required");
  }
  return role;
}

export function buildUnifiedCorrectiveGenerationPlanScope(
  predecessorScope: CorrectivePlanScopeItem[],
  recordResults: ReconciliationRecordResult[]
) {
  return buildNextGenerationCorrectivePlanScope(predecessorScope, recordResults);
}

export function requireUnifiedCorrectiveGenerationSourceEvidence(input: {
  sourceRecurrenceKind: "following-corrective-generation" | "generic-corrective-generation";
  regressionStatus: string | null;
  recordResults: ReconciliationRecordResult[] | null;
}) {
  if (
    !["following-corrective-generation", "generic-corrective-generation"].includes(
      input.sourceRecurrenceKind
    ) ||
    input.regressionStatus !== "recurred" ||
    !input.recordResults?.length
  ) {
    throw new Error("unified_corrective_generation_planning_source_evidence_required");
  }
  return input.recordResults;
}

export function unifiedCorrectiveGenerationPlanFingerprint(input: {
  correctiveGenerationRetriageId: string;
  successorSourceId: string;
  predecessorGenerationLineageId: string;
  generationNumber: number;
  predecessorPlanId: string;
  predecessorDeliveryId: string;
  predecessorPackageId: string;
  predecessorReplayKey: string;
  predecessorPackageFingerprint: string;
  predecessorReclosureId: string;
  predecessorReclosureFingerprint: string;
  sourceRecurrenceId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessorFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("corrective-generation-plan1-", input);
}

function retriageFromRow(row: RetriageRow): CorrectiveGenerationRetriage {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: row.generation_number,
    sourceRecurrenceKind: row.source_recurrence_kind,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    predecessorRegistryFingerprint: row.predecessor_registry_fingerprint,
    successorFingerprint: row.successor_fingerprint,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    affectedRecordCount: row.affected_record_count,
    affectedIntegrationKeys: row.affected_integration_keys ?? [],
    affectedFields: row.affected_fields ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
    dismissedBy: row.dismissed_by,
    dismissedAt: row.dismissed_at?.toISOString() ?? null,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function planFromRow(row: PlanRow): UnifiedCorrectiveGenerationPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    correctiveGenerationPlanId: row.corrective_generation_plan_id,
    correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
    successorSourceId: row.successor_source_id,
    predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
    caseId: row.case_id,
    target: row.target,
    generationNumber: row.generation_number,
    status: row.status,
    predecessorPlanId: row.predecessor_plan_id,
    predecessorDeliveryId: row.predecessor_delivery_id,
    predecessorPackageId: row.predecessor_package_id,
    predecessorReplayKey: row.predecessor_replay_key,
    predecessorPackageFingerprint: row.predecessor_package_fingerprint,
    predecessorReclosureId: row.predecessor_reclosure_id,
    predecessorReclosureFingerprint: row.predecessor_reclosure_fingerprint,
    sourceRecurrenceId: row.source_recurrence_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessorFingerprint: row.source_successor_fingerprint,
    correctionScope: row.correction_scope ?? [],
    planFingerprint: row.plan_fingerprint,
    rationale: row.rationale,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    reviewNote: row.review_note,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listUnifiedCorrectiveGenerationPlanningForUser(
  userId: string
): Promise<UnifiedCorrectiveGenerationPlanningModel> {
  const lineage = await listCorrectiveGenerationLineageForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const retriage = await client.query<RetriageRow>(
      `select t.*,w.name as workspace_name,wm.role
       from app.workspace_corrective_generation_retriage t
       join app.workspaces w on w.id=t.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=t.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by t.updated_at desc,t.corrective_generation_retriage_id desc
       limit 500`
    );
    const plans = await client.query<PlanRow>(
      `select p.*,w.name as workspace_name,wm.role
       from app.workspace_corrective_generation_plans p
       join app.workspaces w on w.id=p.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=p.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by p.created_at desc,p.corrective_generation_plan_id desc
       limit 500`
    );
    return { retriage: retriage.rows, plans: plans.rows };
  });

  const retriage = data.retriage.map(retriageFromRow);
  const plans = data.plans.map(planFromRow);
  const retriaged = new Set(
    retriage.map((item) => item.workspaceId + ":" + item.successorSourceId)
  );

  return {
    lineage,
    retriage,
    plans,
    totals: {
      successorsWithoutRetriage: lineage.successors.filter(
        (item) =>
          item.status === "ready-for-planning" &&
          !retriaged.has(item.workspaceId + ":" + item.successorSourceId)
      ).length,
      activeRetriage: retriage.filter((item) => item.status !== "dismissed").length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createCorrectiveGenerationRetriage(
  userId: string,
  input: { workspaceId: string; successorSourceId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ corrective_generation_retriage_id: string }>(
      `select corrective_generation_retriage_id
       from app.workspace_corrective_generation_retriage
       where workspace_id=$1 and successor_source_id=$2
       limit 1`,
      [input.workspaceId, input.successorSourceId]
    );
    if (existing.rows[0]) return existing.rows[0].corrective_generation_retriage_id;

    const source = await client.query<{
      successor_source_id: string;
      predecessor_generation_lineage_id: string;
      case_id: string;
      target: IntegrationTarget;
      generation_number: number;
      source_recurrence_kind: "following-corrective-generation" | "generic-corrective-generation";
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      successor_fingerprint: string;
      successor_status: string;
      predecessor_registry_fingerprint: string;
      predecessor_generation_state: string;
      case_status: string;
      latest_successor_source_id: string;
      regression_status: string | null;
      record_results: ReconciliationRecordResult[] | null;
    }>(
      `select s.successor_source_id,s.predecessor_generation_lineage_id,s.case_id,s.target,
              s.generation_number,s.source_recurrence_kind,s.source_recurrence_id,
              s.source_recurrence_fingerprint,s.source_regression_fingerprint,s.successor_fingerprint,
              s.status as successor_status,r.registry_fingerprint as predecessor_registry_fingerprint,
              r.generation_state as predecessor_generation_state,c.status as case_status,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=s.workspace_id and newest.case_id=s.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id,
              coalesce(check113.status,check108.status) as regression_status,
              coalesce(check113.record_results,check108.record_results) as record_results
       from app.workspace_corrective_generation_successors s
       join app.workspace_corrective_generation_registry r
         on r.workspace_id=s.workspace_id
        and r.generation_lineage_id=s.predecessor_generation_lineage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=s.workspace_id and c.case_id=s.case_id
       left join app.workspace_reconciliation_following_cg_recurrences recurrence108
         on s.source_recurrence_kind='following-corrective-generation'
        and recurrence108.workspace_id=s.workspace_id
        and recurrence108.following_corrective_generation_recurrence_id=s.source_recurrence_id
       left join app.workspace_post_following_cg_reclosure_checks check108
         on check108.workspace_id=recurrence108.workspace_id
        and check108.following_corrective_generation_reclosure_regression_check_id=
            recurrence108.following_corrective_generation_reclosure_regression_check_id
       left join app.workspace_reconciliation_unified_cg_recurrences recurrence113
         on s.source_recurrence_kind='generic-corrective-generation'
        and recurrence113.workspace_id=s.workspace_id
        and recurrence113.recurrence_id=s.source_recurrence_id
        and recurrence113.recurrence_fingerprint=s.source_recurrence_fingerprint
       left join app.workspace_post_unified_cg_reclosure_checks check113
         on check113.workspace_id=recurrence113.workspace_id
        and check113.regression_check_id=recurrence113.regression_check_id
        and check113.verification_fingerprint=s.source_regression_fingerprint
       where s.workspace_id=$1 and s.successor_source_id=$2
       limit 1`,
      [input.workspaceId, input.successorSourceId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("unified_corrective_generation_planning_successor_not_found");
    if (row.successor_status !== "ready-for-planning") {
      throw new Error("unified_corrective_generation_planning_successor_not_ready");
    }
    if (row.predecessor_generation_state !== "recurred") {
      throw new Error("unified_corrective_generation_planning_recurred_predecessor_required");
    }
    if (row.case_status !== "open") {
      throw new Error("unified_corrective_generation_planning_open_case_required");
    }
    if (row.latest_successor_source_id !== row.successor_source_id) {
      throw new Error("unified_corrective_generation_planning_latest_successor_required");
    }
    const sourceEvidence = requireUnifiedCorrectiveGenerationSourceEvidence({
      sourceRecurrenceKind: row.source_recurrence_kind,
      regressionStatus: row.regression_status,
      recordResults: row.record_results
    });

    const affected = sourceEvidence.filter(
      (record) => record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) {
      throw new Error("unified_corrective_generation_planning_no_exception_records");
    }

    const keys = [...new Set(affected.map((record) => record.integrationKey))].sort();
    const fields = [...new Set(affected.flatMap((record) => record.differingFields))];
    if (affected.some((record) => record.status === "missing")) fields.push("*missing-record*");
    const statuses = new Set(affected.map((record) => record.status));
    const classification: ExceptionClassification =
      statuses.size > 1
        ? "mixed"
        : statuses.has("missing")
          ? "consumer-missing"
          : "consumer-drift";

    const correctiveGenerationRetriageId = randomUUID();
    await client.query(
      `insert into app.workspace_corrective_generation_retriage (
         workspace_id,corrective_generation_retriage_id,successor_source_id,
         predecessor_generation_lineage_id,case_id,target,generation_number,
         source_recurrence_kind,source_recurrence_id,source_recurrence_fingerprint,
         source_regression_fingerprint,predecessor_registry_fingerprint,successor_fingerprint,
         status,classification,severity,resolution_intent,summary,investigation_note,
         affected_record_count,affected_integration_keys,affected_fields,created_by,updated_by
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
         'open',$14,'medium','investigate',$15,'',$16,$17::jsonb,$18::jsonb,$19,$19
       )`,
      [
        input.workspaceId,
        correctiveGenerationRetriageId,
        row.successor_source_id,
        row.predecessor_generation_lineage_id,
        row.case_id,
        row.target,
        row.generation_number,
        row.source_recurrence_kind,
        row.source_recurrence_id,
        row.source_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.predecessor_registry_fingerprint,
        row.successor_fingerprint,
        classification,
        "Re-triage governed corrective-generation successor G" +
          row.generation_number +
          " from recurrence " +
          row.source_recurrence_id +
          ".",
        affected.length,
        JSON.stringify(keys),
        JSON.stringify([...new Set(fields)].sort()),
        userId
      ]
    );

    return correctiveGenerationRetriageId;
  });
}

export async function updateCorrectiveGenerationRetriage(
  userId: string,
  input: {
    workspaceId: string;
    correctiveGenerationRetriageId: string;
    status: "open" | "dismissed";
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
    investigationNote: string;
  }
) {
  const summary = input.summary.trim().slice(0, 4000);
  if (!summary) throw new Error("unified_corrective_generation_planning_summary_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: CorrectiveGenerationRetriageStatus;
      case_status: string;
      successor_source_id: string;
      latest_successor_source_id: string;
    }>(
      `select t.status,c.status as case_status,t.successor_source_id,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=t.workspace_id and newest.case_id=t.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id
       from app.workspace_corrective_generation_retriage t
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=t.workspace_id and c.case_id=t.case_id
       where t.workspace_id=$1 and t.corrective_generation_retriage_id=$2
       limit 1`,
      [input.workspaceId, input.correctiveGenerationRetriageId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("unified_corrective_generation_planning_retriage_not_found");
    if (row.status === "approved" || row.status === "dismissed") {
      throw new Error("unified_corrective_generation_planning_retriage_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("unified_corrective_generation_planning_open_case_required");
    }
    if (row.successor_source_id !== row.latest_successor_source_id) {
      throw new Error("unified_corrective_generation_planning_latest_successor_required");
    }

    await client.query(
      `update app.workspace_corrective_generation_retriage
          set status=$3,classification=$4,severity=$5,resolution_intent=$6,
              summary=$7,investigation_note=$8,updated_by=$9,updated_at=now(),
              dismissed_by=case when $3='dismissed' then $9 else null end,
              dismissed_at=case when $3='dismissed' then now() else null end
        where workspace_id=$1 and corrective_generation_retriage_id=$2`,
      [
        input.workspaceId,
        input.correctiveGenerationRetriageId,
        input.status,
        input.classification,
        input.severity,
        input.resolutionIntent,
        summary,
        input.investigationNote.trim().slice(0, 8000),
        userId
      ]
    );
  });
}

export async function createUnifiedCorrectiveGenerationPlan(
  userId: string,
  input: {
    workspaceId: string;
    correctiveGenerationRetriageId: string;
    rationale: string;
  }
) {
  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) throw new Error("unified_corrective_generation_plan_rationale_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const source = await client.query<{
      corrective_generation_retriage_id: string;
      successor_source_id: string;
      predecessor_generation_lineage_id: string;
      case_id: string;
      target: IntegrationTarget;
      generation_number: number;
      retriage_status: CorrectiveGenerationRetriageStatus;
      resolution_intent: ExceptionResolutionIntent;
      source_recurrence_kind: "following-corrective-generation" | "generic-corrective-generation";
      source_recurrence_id: string;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      successor_fingerprint: string;
      predecessor_plan_id: string;
      predecessor_delivery_id: string;
      predecessor_package_id: string;
      predecessor_replay_key: string;
      predecessor_package_fingerprint: string;
      predecessor_reclosure_id: string;
      predecessor_reclosure_fingerprint: string;
      predecessor_scope: CorrectivePlanScopeItem[] | null;
      record_results: ReconciliationRecordResult[] | null;
      regression_status: string | null;
      case_status: string;
      latest_successor_source_id: string;
    }>(
      `select t.corrective_generation_retriage_id,t.successor_source_id,
              t.predecessor_generation_lineage_id,t.case_id,t.target,t.generation_number,
              t.status as retriage_status,t.resolution_intent,t.source_recurrence_kind,
              t.source_recurrence_id,t.source_recurrence_fingerprint,
              t.source_regression_fingerprint,t.successor_fingerprint,
              r.plan_id as predecessor_plan_id,r.delivery_id as predecessor_delivery_id,
              r.package_id as predecessor_package_id,r.replay_key as predecessor_replay_key,
              r.package_fingerprint as predecessor_package_fingerprint,
              r.reclosure_id as predecessor_reclosure_id,
              r.reclosure_fingerprint as predecessor_reclosure_fingerprint,
              coalesce(nextplan.correction_scope,followplan.correction_scope,genericplan.correction_scope)
                as predecessor_scope,
              coalesce(check113.record_results,check108.record_results) as record_results,
              coalesce(check113.status,check108.status) as regression_status,
              c.status as case_status,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=t.workspace_id and newest.case_id=t.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id
       from app.workspace_corrective_generation_retriage t
       join app.workspace_corrective_generation_successors s
         on s.workspace_id=t.workspace_id and s.successor_source_id=t.successor_source_id
       join app.workspace_corrective_generation_registry r
         on r.workspace_id=t.workspace_id
        and r.generation_lineage_id=t.predecessor_generation_lineage_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=t.workspace_id and c.case_id=t.case_id
       left join app.workspace_next_corrective_generation_plans nextplan
         on r.source_kind='legacy-next'
        and nextplan.workspace_id=r.workspace_id
        and nextplan.next_corrective_generation_plan_id=r.plan_id
       left join app.workspace_following_corrective_generation_plans followplan
         on r.source_kind='legacy-following'
        and followplan.workspace_id=r.workspace_id
        and followplan.following_corrective_generation_plan_id=r.plan_id
       left join app.workspace_corrective_generation_plans genericplan
         on r.source_kind='generic'
        and genericplan.workspace_id=r.workspace_id
        and genericplan.corrective_generation_plan_id=r.plan_id
       left join app.workspace_reconciliation_following_cg_recurrences recurrence108
         on t.source_recurrence_kind='following-corrective-generation'
        and recurrence108.workspace_id=t.workspace_id
        and recurrence108.following_corrective_generation_recurrence_id=t.source_recurrence_id
       left join app.workspace_post_following_cg_reclosure_checks check108
         on check108.workspace_id=recurrence108.workspace_id
        and check108.following_corrective_generation_reclosure_regression_check_id=
            recurrence108.following_corrective_generation_reclosure_regression_check_id
       left join app.workspace_reconciliation_unified_cg_recurrences recurrence113
         on t.source_recurrence_kind='generic-corrective-generation'
        and recurrence113.workspace_id=t.workspace_id
        and recurrence113.recurrence_id=t.source_recurrence_id
        and recurrence113.recurrence_fingerprint=t.source_recurrence_fingerprint
       left join app.workspace_post_unified_cg_reclosure_checks check113
         on check113.workspace_id=recurrence113.workspace_id
        and check113.regression_check_id=recurrence113.regression_check_id
        and check113.verification_fingerprint=t.source_regression_fingerprint
       where t.workspace_id=$1 and t.corrective_generation_retriage_id=$2
       limit 1`,
      [input.workspaceId, input.correctiveGenerationRetriageId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("unified_corrective_generation_plan_retriage_not_found");
    if (row.retriage_status === "approved" || row.retriage_status === "dismissed") {
      throw new Error("unified_corrective_generation_plan_retriage_locked");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("unified_corrective_generation_plan_resolution_intent_required");
    }
    if (row.case_status !== "open") {
      throw new Error("unified_corrective_generation_plan_open_case_required");
    }
    if (row.successor_source_id !== row.latest_successor_source_id) {
      throw new Error("unified_corrective_generation_plan_latest_successor_required");
    }
    if (!row.predecessor_scope?.length) {
      throw new Error("unified_corrective_generation_plan_predecessor_scope_required");
    }
    let sourceEvidence: ReconciliationRecordResult[];
    try {
      sourceEvidence = requireUnifiedCorrectiveGenerationSourceEvidence({
        sourceRecurrenceKind: row.source_recurrence_kind,
        regressionStatus: row.regression_status,
        recordResults: row.record_results
      });
    } catch {
      throw new Error("unified_corrective_generation_plan_source_evidence_required");
    }

    const correctionScope = buildUnifiedCorrectiveGenerationPlanScope(
      row.predecessor_scope,
      sourceEvidence
    );
    if (!correctionScope.length) {
      throw new Error("unified_corrective_generation_plan_scope_empty");
    }

    const planFingerprint = unifiedCorrectiveGenerationPlanFingerprint({
      correctiveGenerationRetriageId: row.corrective_generation_retriage_id,
      successorSourceId: row.successor_source_id,
      predecessorGenerationLineageId: row.predecessor_generation_lineage_id,
      generationNumber: row.generation_number,
      predecessorPlanId: row.predecessor_plan_id,
      predecessorDeliveryId: row.predecessor_delivery_id,
      predecessorPackageId: row.predecessor_package_id,
      predecessorReplayKey: row.predecessor_replay_key,
      predecessorPackageFingerprint: row.predecessor_package_fingerprint,
      predecessorReclosureId: row.predecessor_reclosure_id,
      predecessorReclosureFingerprint: row.predecessor_reclosure_fingerprint,
      sourceRecurrenceId: row.source_recurrence_id,
      sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceSuccessorFingerprint: row.successor_fingerprint,
      correctionScope,
      rationale
    });

    const existing = await client.query<{ corrective_generation_plan_id: string }>(
      `select corrective_generation_plan_id
       from app.workspace_corrective_generation_plans
       where workspace_id=$1 and corrective_generation_retriage_id=$2 and plan_fingerprint=$3
       limit 1`,
      [input.workspaceId, row.corrective_generation_retriage_id, planFingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].corrective_generation_plan_id;

    const correctiveGenerationPlanId = randomUUID();
    await client.query(
      `insert into app.workspace_corrective_generation_plans (
         workspace_id,corrective_generation_plan_id,corrective_generation_retriage_id,
         successor_source_id,predecessor_generation_lineage_id,case_id,target,generation_number,
         status,predecessor_plan_id,predecessor_delivery_id,predecessor_package_id,
         predecessor_replay_key,predecessor_package_fingerprint,predecessor_reclosure_id,
         predecessor_reclosure_fingerprint,source_recurrence_id,source_recurrence_fingerprint,
         source_regression_fingerprint,source_successor_fingerprint,correction_scope,
         plan_fingerprint,rationale,created_by
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
         $20::jsonb,$21,$22,$23
       )`,
      [
        input.workspaceId,
        correctiveGenerationPlanId,
        row.corrective_generation_retriage_id,
        row.successor_source_id,
        row.predecessor_generation_lineage_id,
        row.case_id,
        row.target,
        row.generation_number,
        row.predecessor_plan_id,
        row.predecessor_delivery_id,
        row.predecessor_package_id,
        row.predecessor_replay_key,
        row.predecessor_package_fingerprint,
        row.predecessor_reclosure_id,
        row.predecessor_reclosure_fingerprint,
        row.source_recurrence_id,
        row.source_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.successor_fingerprint,
        JSON.stringify(correctionScope),
        planFingerprint,
        rationale,
        userId
      ]
    );

    await client.query(
      `update app.workspace_corrective_generation_retriage
          set status='planned',updated_by=$3,updated_at=now()
        where workspace_id=$1 and corrective_generation_retriage_id=$2 and status='open'`,
      [input.workspaceId, row.corrective_generation_retriage_id, userId]
    );

    return correctiveGenerationPlanId;
  });
}

export async function reviewUnifiedCorrectiveGenerationPlan(
  userId: string,
  input: {
    workspaceId: string;
    correctiveGenerationPlanId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const current = await client.query<{
      status: UnifiedCorrectiveGenerationPlanStatus;
      corrective_generation_retriage_id: string;
      successor_source_id: string;
      case_status: string;
      latest_successor_source_id: string;
    }>(
      `select p.status,p.corrective_generation_retriage_id,p.successor_source_id,
              c.status as case_status,
              (select newest.successor_source_id
                 from app.workspace_corrective_generation_successors newest
                where newest.workspace_id=p.workspace_id and newest.case_id=p.case_id
                order by newest.generation_number desc,newest.created_at desc,newest.successor_source_id desc
                limit 1) as latest_successor_source_id
       from app.workspace_corrective_generation_plans p
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where p.workspace_id=$1 and p.corrective_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.correctiveGenerationPlanId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("unified_corrective_generation_plan_not_found");
    if (row.status !== "proposed") {
      throw new Error("unified_corrective_generation_plan_review_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("unified_corrective_generation_plan_open_case_required");
    }
    if (row.successor_source_id !== row.latest_successor_source_id) {
      throw new Error("unified_corrective_generation_plan_latest_successor_required");
    }

    await client.query(
      `update app.workspace_corrective_generation_plans
          set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5
        where workspace_id=$1 and corrective_generation_plan_id=$2`,
      [
        input.workspaceId,
        input.correctiveGenerationPlanId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );

    await client.query(
      `update app.workspace_corrective_generation_retriage
          set status=$3,updated_by=$4,updated_at=now()
        where workspace_id=$1 and corrective_generation_retriage_id=$2`,
      [
        input.workspaceId,
        row.corrective_generation_retriage_id,
        input.decision === "approved" ? "approved" : "open",
        userId
      ]
    );
  });
}
