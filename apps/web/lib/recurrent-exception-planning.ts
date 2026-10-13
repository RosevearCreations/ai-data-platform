import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type { IntegrationScalar, IntegrationTarget } from "./integration-delivery";
import {
  listPostReclosureRegressionForUser,
  type PostReclosureRegressionModel
} from "./post-reclosure-regression";
import type { ReconciliationRecordResult } from "./post-delivery-reconciliation";
import {
  buildSuccessorCorrectivePlanScope
} from "./reopened-exception-planning";
import type {
  CorrectivePlanScopeItem,
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "./reconciliation-exception-triage";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type RecurrentRetriageStatus = "open" | "planned" | "approved" | "dismissed";
export type NextGenerationPlanStatus = "proposed" | "approved" | "rejected" | "withdrawn";

export interface RecurrentExceptionRetriage {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  recurrenceRetriageId: string;
  recurrenceId: string;
  reclosureId: string;
  reclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: RecurrentRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  recurrenceFingerprint: string;
  regressionFingerprint: string;
  reclosureFingerprint: string;
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

export interface NextGenerationCorrectiveDeliveryPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  nextGenerationPlanId: string;
  recurrenceRetriageId: string;
  recurrenceId: string;
  reclosureId: string;
  reclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: NextGenerationPlanStatus;
  predecessorSuccessorPlanId: string;
  predecessorSuccessorDeliveryId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceReclosureFingerprint: string;
  sourceSuccessorPackageId: string;
  sourceSuccessorReplayKey: string;
  sourceSuccessorPackageFingerprint: string;
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

export interface RecurrentExceptionPlanningModel {
  recurrence: PostReclosureRegressionModel;
  retriage: RecurrentExceptionRetriage[];
  plans: NextGenerationCorrectiveDeliveryPlan[];
  totals: {
    recurrencesWithoutRetriage: number;
    activeRetriage: number;
    proposedPlans: number;
    approvedPlans: number;
  };
}

type RetriageRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  recurrence_retriage_id: string;
  recurrence_id: string;
  reclosure_id: string;
  reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: RecurrentRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  recurrence_fingerprint: string;
  regression_fingerprint: string;
  reclosure_fingerprint: string;
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
  next_generation_plan_id: string;
  recurrence_retriage_id: string;
  recurrence_id: string;
  reclosure_id: string;
  reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: NextGenerationPlanStatus;
  predecessor_successor_plan_id: string;
  predecessor_successor_delivery_id: string;
  source_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_reclosure_fingerprint: string;
  source_successor_package_id: string;
  source_successor_replay_key: string;
  source_successor_package_fingerprint: string;
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
    throw new Error("recurrent_planning_manager_required");
  }
  return role;
}

export function buildNextGenerationCorrectivePlanScope(
  predecessorScope: CorrectivePlanScopeItem[],
  recordResults: ReconciliationRecordResult[]
) {
  return buildSuccessorCorrectivePlanScope(predecessorScope, recordResults);
}

export function nextGenerationCorrectivePlanFingerprint(input: {
  recurrenceRetriageId: string;
  recurrenceId: string;
  reclosureId: string;
  reclosureRegressionCheckId: string;
  predecessorSuccessorPlanId: string;
  predecessorSuccessorDeliveryId: string;
  sourceRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceReclosureFingerprint: string;
  sourceSuccessorPackageId: string;
  sourceSuccessorReplayKey: string;
  sourceSuccessorPackageFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("next-generation-plan1-", input);
}

function retriageFromRow(row: RetriageRow): RecurrentExceptionRetriage {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    recurrenceRetriageId: row.recurrence_retriage_id,
    recurrenceId: row.recurrence_id,
    reclosureId: row.reclosure_id,
    reclosureRegressionCheckId: row.reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    recurrenceFingerprint: row.recurrence_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    reclosureFingerprint: row.reclosure_fingerprint,
    affectedRecordCount: Number(row.affected_record_count),
    affectedIntegrationKeys: Array.isArray(row.affected_integration_keys) ? row.affected_integration_keys : [],
    affectedFields: Array.isArray(row.affected_fields) ? row.affected_fields : [],
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
    dismissedBy: row.dismissed_by,
    dismissedAt: row.dismissed_at?.toISOString() ?? null,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function planFromRow(row: PlanRow): NextGenerationCorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    nextGenerationPlanId: row.next_generation_plan_id,
    recurrenceRetriageId: row.recurrence_retriage_id,
    recurrenceId: row.recurrence_id,
    reclosureId: row.reclosure_id,
    reclosureRegressionCheckId: row.reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    predecessorSuccessorPlanId: row.predecessor_successor_plan_id,
    predecessorSuccessorDeliveryId: row.predecessor_successor_delivery_id,
    sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceReclosureFingerprint: row.source_reclosure_fingerprint,
    sourceSuccessorPackageId: row.source_successor_package_id,
    sourceSuccessorReplayKey: row.source_successor_replay_key,
    sourceSuccessorPackageFingerprint: row.source_successor_package_fingerprint,
    correctionScope: Array.isArray(row.correction_scope) ? row.correction_scope : [],
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

export async function listRecurrentExceptionPlanningForUser(
  userId: string
): Promise<RecurrentExceptionPlanningModel> {
  const recurrence = await listPostReclosureRegressionForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const retriage = await client.query<RetriageRow>(
      `select t.*,w.name as workspace_name,wm.role
       from app.workspace_recurrent_exception_triage_cycles t
       join app.workspaces w on w.id=t.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=t.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by t.updated_at desc,t.recurrence_retriage_id desc
       limit 500`
    );
    const plans = await client.query<PlanRow>(
      `select p.*,w.name as workspace_name,wm.role
       from app.workspace_next_generation_corrective_delivery_plans p
       join app.workspaces w on w.id=p.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=p.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by p.created_at desc,p.next_generation_plan_id desc
       limit 500`
    );
    return { retriage: retriage.rows, plans: plans.rows };
  });

  const retriage = data.retriage.map(retriageFromRow);
  const plans = data.plans.map(planFromRow);
  const retriaged = new Set(
    retriage.map((item) => item.workspaceId + ":" + item.recurrenceId)
  );

  return {
    recurrence,
    retriage,
    plans,
    totals: {
      recurrencesWithoutRetriage: recurrence.recurrences.filter(
        (item) => !retriaged.has(item.workspaceId + ":" + item.recurrenceId)
      ).length,
      activeRetriage: retriage.filter((item) => item.status !== "dismissed").length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createRecurrentExceptionRetriage(
  userId: string,
  input: { workspaceId: string; recurrenceId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ recurrence_retriage_id: string }>(
      `select recurrence_retriage_id
       from app.workspace_recurrent_exception_triage_cycles
       where workspace_id=$1 and recurrence_id=$2
       limit 1`,
      [input.workspaceId, input.recurrenceId]
    );
    if (existing.rows[0]) return existing.rows[0].recurrence_retriage_id;

    const source = await client.query<{
      recurrence_id: string;
      reclosure_id: string;
      reclosure_regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      recurrence_fingerprint: string;
      regression_fingerprint: string;
      reclosure_fingerprint: string;
      regression_status: string;
      record_results: ReconciliationRecordResult[];
      case_status: string;
      latest_recurrence_id: string;
    }>(
      `select recurrence.recurrence_id,recurrence.reclosure_id,
              recurrence.reclosure_regression_check_id,recurrence.case_id,
              recurrence.target,recurrence.recurrence_fingerprint,
              recurrence.regression_fingerprint,recurrence.reclosure_fingerprint,
              regression.status as regression_status,regression.record_results,
              c.status as case_status,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=recurrence.workspace_id
                  and newest.case_id=recurrence.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id
       from app.workspace_reconciliation_exception_recurrences recurrence
       join app.workspace_post_reclosure_regression_checks regression
         on regression.workspace_id=recurrence.workspace_id
        and regression.reclosure_regression_check_id=recurrence.reclosure_regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=recurrence.workspace_id and c.case_id=recurrence.case_id
       where recurrence.workspace_id=$1 and recurrence.recurrence_id=$2
       limit 1`,
      [input.workspaceId, input.recurrenceId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("recurrent_planning_recurrence_not_found");
    if (row.regression_status !== "recurred") {
      throw new Error("recurrent_planning_recurred_check_required");
    }
    if (row.case_status !== "open") {
      throw new Error("recurrent_planning_open_case_required");
    }
    if (row.latest_recurrence_id !== row.recurrence_id) {
      throw new Error("recurrent_planning_latest_recurrence_required");
    }

    const affected = (row.record_results ?? []).filter(
      (record) => record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) throw new Error("recurrent_planning_no_exception_records");

    const keys = [...new Set(affected.map((record) => record.integrationKey))].sort();
    const fields = [...new Set(affected.flatMap((record) => record.differingFields))];
    if (affected.some((record) => record.status === "missing")) {
      fields.push("*missing-record*");
    }
    const statuses = new Set(affected.map((record) => record.status));
    const classification: ExceptionClassification =
      statuses.size > 1
        ? "mixed"
        : statuses.has("missing")
          ? "consumer-missing"
          : "consumer-drift";

    const recurrenceRetriageId = randomUUID();
    await client.query(
      `insert into app.workspace_recurrent_exception_triage_cycles (
        workspace_id,recurrence_retriage_id,recurrence_id,reclosure_id,
        reclosure_regression_check_id,case_id,target,status,classification,
        severity,resolution_intent,summary,investigation_note,
        recurrence_fingerprint,regression_fingerprint,reclosure_fingerprint,
        affected_record_count,affected_integration_keys,affected_fields,
        created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,'open',$8,'medium','investigate',$9,'',
        $10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$16
      )`,
      [
        input.workspaceId,
        recurrenceRetriageId,
        row.recurrence_id,
        row.reclosure_id,
        row.reclosure_regression_check_id,
        row.case_id,
        row.target,
        classification,
        "Re-triage recurrent exception from post-re-closure check " +
          row.reclosure_regression_check_id +
          ".",
        row.recurrence_fingerprint,
        row.regression_fingerprint,
        row.reclosure_fingerprint,
        affected.length,
        JSON.stringify(keys),
        JSON.stringify([...new Set(fields)].sort()),
        userId
      ]
    );
    return recurrenceRetriageId;
  });
}

export async function updateRecurrentExceptionRetriage(
  userId: string,
  input: {
    workspaceId: string;
    recurrenceRetriageId: string;
    status: "open" | "dismissed";
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
    investigationNote: string;
  }
) {
  const summary = input.summary.trim().slice(0, 4000);
  if (!summary) throw new Error("recurrent_planning_summary_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: RecurrentRetriageStatus;
      case_status: string;
      recurrence_id: string;
      latest_recurrence_id: string;
    }>(
      `select triage.status,c.status as case_status,triage.recurrence_id,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=triage.workspace_id
                  and newest.case_id=triage.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id
       from app.workspace_recurrent_exception_triage_cycles triage
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
       where triage.workspace_id=$1 and triage.recurrence_retriage_id=$2
       limit 1`,
      [input.workspaceId, input.recurrenceRetriageId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("recurrent_planning_retriage_not_found");
    if (row.status === "approved" || row.status === "dismissed") {
      throw new Error("recurrent_planning_retriage_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("recurrent_planning_open_case_required");
    }
    if (row.recurrence_id !== row.latest_recurrence_id) {
      throw new Error("recurrent_planning_latest_recurrence_required");
    }

    await client.query(
      `update app.workspace_recurrent_exception_triage_cycles
       set status=$3,classification=$4,severity=$5,resolution_intent=$6,
           summary=$7,investigation_note=$8,updated_by=$9,updated_at=now(),
           dismissed_by=case when $3='dismissed' then $9 else null end,
           dismissed_at=case when $3='dismissed' then now() else null end
       where workspace_id=$1 and recurrence_retriage_id=$2`,
      [
        input.workspaceId,
        input.recurrenceRetriageId,
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

export async function createNextGenerationCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    recurrenceRetriageId: string;
    rationale: string;
  }
) {
  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) throw new Error("next_generation_plan_rationale_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const source = await client.query<{
      recurrence_retriage_id: string;
      recurrence_id: string;
      reclosure_id: string;
      reclosure_regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      retriage_status: RecurrentRetriageStatus;
      resolution_intent: ExceptionResolutionIntent;
      source_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_reclosure_fingerprint: string;
      record_results: ReconciliationRecordResult[];
      predecessor_successor_plan_id: string;
      correction_scope: CorrectivePlanScopeItem[];
      predecessor_plan_status: string;
      predecessor_successor_delivery_id: string;
      delivery_status: string;
      source_successor_package_id: string;
      source_successor_replay_key: string;
      source_successor_package_fingerprint: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      `select triage.recurrence_retriage_id,triage.recurrence_id,
              triage.reclosure_id,triage.reclosure_regression_check_id,
              triage.case_id,triage.target,triage.status as retriage_status,
              triage.resolution_intent,
              recurrence.recurrence_fingerprint as source_recurrence_fingerprint,
              recurrence.regression_fingerprint as source_regression_fingerprint,
              recurrence.reclosure_fingerprint as source_reclosure_fingerprint,
              regression.record_results,
              predecessor.successor_plan_id as predecessor_successor_plan_id,
              predecessor.correction_scope,
              predecessor.status as predecessor_plan_status,
              delivery.delivery_id as predecessor_successor_delivery_id,
              delivery.status as delivery_status,
              delivery.successor_package_id as source_successor_package_id,
              delivery.successor_replay_key as source_successor_replay_key,
              delivery.successor_package_fingerprint as source_successor_package_fingerprint,
              c.status as case_status,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=triage.workspace_id
                  and newest.case_id=triage.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id
       from app.workspace_recurrent_exception_triage_cycles triage
       join app.workspace_reconciliation_exception_recurrences recurrence
         on recurrence.workspace_id=triage.workspace_id
        and recurrence.recurrence_id=triage.recurrence_id
       join app.workspace_post_reclosure_regression_checks regression
         on regression.workspace_id=triage.workspace_id
        and regression.reclosure_regression_check_id=triage.reclosure_regression_check_id
       join app.workspace_reconciliation_exception_reclosures reclosure
         on reclosure.workspace_id=triage.workspace_id
        and reclosure.reclosure_id=triage.reclosure_id
       join app.workspace_successor_corrective_delivery_plans predecessor
         on predecessor.workspace_id=triage.workspace_id
        and predecessor.successor_plan_id=reclosure.successor_plan_id
       join app.workspace_successor_corrective_live_deliveries delivery
         on delivery.workspace_id=triage.workspace_id
        and delivery.delivery_id=reclosure.successor_delivery_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
       where triage.workspace_id=$1 and triage.recurrence_retriage_id=$2
       limit 1`,
      [input.workspaceId, input.recurrenceRetriageId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("next_generation_plan_retriage_not_found");
    if (row.retriage_status === "approved" || row.retriage_status === "dismissed") {
      throw new Error("next_generation_plan_retriage_locked");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("next_generation_plan_resolution_intent_required");
    }
    if (row.case_status !== "open") {
      throw new Error("next_generation_plan_open_case_required");
    }
    if (row.recurrence_id !== row.latest_recurrence_id) {
      throw new Error("next_generation_plan_latest_recurrence_required");
    }
    if (row.predecessor_plan_status !== "approved" || row.delivery_status !== "accepted") {
      throw new Error("next_generation_plan_approved_predecessor_required");
    }

    const correctionScope = buildNextGenerationCorrectivePlanScope(
      row.correction_scope ?? [],
      row.record_results ?? []
    );
    if (!correctionScope.length) throw new Error("next_generation_plan_scope_empty");

    const planFingerprint = nextGenerationCorrectivePlanFingerprint({
      recurrenceRetriageId: row.recurrence_retriage_id,
      recurrenceId: row.recurrence_id,
      reclosureId: row.reclosure_id,
      reclosureRegressionCheckId: row.reclosure_regression_check_id,
      predecessorSuccessorPlanId: row.predecessor_successor_plan_id,
      predecessorSuccessorDeliveryId: row.predecessor_successor_delivery_id,
      sourceRecurrenceFingerprint: row.source_recurrence_fingerprint,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceReclosureFingerprint: row.source_reclosure_fingerprint,
      sourceSuccessorPackageId: row.source_successor_package_id,
      sourceSuccessorReplayKey: row.source_successor_replay_key,
      sourceSuccessorPackageFingerprint: row.source_successor_package_fingerprint,
      correctionScope,
      rationale
    });

    const existing = await client.query<{ next_generation_plan_id: string }>(
      `select next_generation_plan_id
       from app.workspace_next_generation_corrective_delivery_plans
       where workspace_id=$1
         and recurrence_retriage_id=$2
         and plan_fingerprint=$3
       limit 1`,
      [input.workspaceId, row.recurrence_retriage_id, planFingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].next_generation_plan_id;

    const nextGenerationPlanId = randomUUID();
    await client.query(
      `insert into app.workspace_next_generation_corrective_delivery_plans (
        workspace_id,next_generation_plan_id,recurrence_retriage_id,
        recurrence_id,reclosure_id,reclosure_regression_check_id,case_id,target,
        status,predecessor_successor_plan_id,predecessor_successor_delivery_id,
        source_recurrence_fingerprint,source_regression_fingerprint,
        source_reclosure_fingerprint,source_successor_package_id,
        source_successor_replay_key,source_successor_package_fingerprint,
        correction_scope,plan_fingerprint,rationale,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10,$11,$12,$13,$14,$15,$16,
        $17::jsonb,$18,$19,$20
      )`,
      [
        input.workspaceId,
        nextGenerationPlanId,
        row.recurrence_retriage_id,
        row.recurrence_id,
        row.reclosure_id,
        row.reclosure_regression_check_id,
        row.case_id,
        row.target,
        row.predecessor_successor_plan_id,
        row.predecessor_successor_delivery_id,
        row.source_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.source_reclosure_fingerprint,
        row.source_successor_package_id,
        row.source_successor_replay_key,
        row.source_successor_package_fingerprint,
        JSON.stringify(correctionScope),
        planFingerprint,
        rationale,
        userId
      ]
    );

    await client.query(
      `update app.workspace_recurrent_exception_triage_cycles
       set status='planned',updated_by=$3,updated_at=now()
       where workspace_id=$1 and recurrence_retriage_id=$2
         and status='open'`,
      [input.workspaceId, row.recurrence_retriage_id, userId]
    );

    return nextGenerationPlanId;
  });
}

export async function reviewNextGenerationCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    nextGenerationPlanId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: NextGenerationPlanStatus;
      recurrence_retriage_id: string;
      recurrence_id: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      `select plan.status,plan.recurrence_retriage_id,plan.recurrence_id,
              c.status as case_status,
              (
                select newest.recurrence_id
                from app.workspace_reconciliation_exception_recurrences newest
                where newest.workspace_id=plan.workspace_id
                  and newest.case_id=plan.case_id
                order by newest.recurred_at desc,newest.recurrence_id desc
                limit 1
              ) as latest_recurrence_id
       from app.workspace_next_generation_corrective_delivery_plans plan
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=plan.workspace_id and c.case_id=plan.case_id
       where plan.workspace_id=$1 and plan.next_generation_plan_id=$2
       limit 1`,
      [input.workspaceId, input.nextGenerationPlanId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("next_generation_plan_not_found");
    if (row.status !== "proposed") {
      throw new Error("next_generation_plan_review_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("next_generation_plan_open_case_required");
    }
    if (row.recurrence_id !== row.latest_recurrence_id) {
      throw new Error("next_generation_plan_latest_recurrence_required");
    }

    await client.query(
      `update app.workspace_next_generation_corrective_delivery_plans
       set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5
       where workspace_id=$1 and next_generation_plan_id=$2`,
      [
        input.workspaceId,
        input.nextGenerationPlanId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );

    await client.query(
      `update app.workspace_recurrent_exception_triage_cycles
       set status=$3,updated_by=$4,updated_at=now()
       where workspace_id=$1 and recurrence_retriage_id=$2`,
      [
        input.workspaceId,
        row.recurrence_retriage_id,
        input.decision === "approved" ? "approved" : "open",
        userId
      ]
    );
  });
}
