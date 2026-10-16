import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type { IntegrationTarget } from "./integration-delivery";
import type { ReconciliationRecordResult } from "./post-delivery-reconciliation";
import {
  listPostSuccessiveGenerationReclosureForUser,
  type PostSuccessiveGenerationReclosureModel
} from "./post-successive-generation-reclosure-regression";
import {
  buildNextGenerationCorrectivePlanScope
} from "./recurrent-exception-planning";
import type {
  CorrectivePlanScopeItem,
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "./reconciliation-exception-triage";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type SuccessiveGenerationRecurrenceRetriageStatus =
  | "open"
  | "planned"
  | "approved"
  | "dismissed";
export type ContinuationGenerationPlanStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface SuccessiveGenerationRecurrenceRetriage {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successiveGenerationRetriageId: string;
  successiveGenerationRecurrenceId: string;
  successiveGenerationReclosureId: string;
  successiveGenerationReclosureRegressionCheckId: string;
  predecessorSubsequentGenerationRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  status: SuccessiveGenerationRecurrenceRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  successiveGenerationRecurrenceFingerprint: string;
  regressionFingerprint: string;
  successiveGenerationReclosureFingerprint: string;
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

export interface ContinuationGenerationCorrectiveDeliveryPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  continuationGenerationPlanId: string;
  successiveGenerationRetriageId: string;
  successiveGenerationRecurrenceId: string;
  successiveGenerationReclosureId: string;
  successiveGenerationReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: ContinuationGenerationPlanStatus;
  predecessorSuccessiveGenerationPlanId: string;
  predecessorSuccessiveGenerationDeliveryId: string;
  sourceSuccessiveGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessiveGenerationReclosureFingerprint: string;
  sourceSuccessiveGenerationPackageId: string;
  sourceSuccessiveGenerationReplayKey: string;
  sourceSuccessiveGenerationPackageFingerprint: string;
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

export interface SuccessiveGenerationRecurrencePlanningModel {
  recurrence: PostSuccessiveGenerationReclosureModel;
  retriage: SuccessiveGenerationRecurrenceRetriage[];
  plans: ContinuationGenerationCorrectiveDeliveryPlan[];
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
  successive_generation_retriage_id: string;
  successive_generation_recurrence_id: string;
  successive_generation_reclosure_id: string;
  successive_generation_reclosure_regression_check_id: string;
  predecessor_subsequent_generation_recurrence_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: SuccessiveGenerationRecurrenceRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  successive_generation_recurrence_fingerprint: string;
  regression_fingerprint: string;
  successive_generation_reclosure_fingerprint: string;
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
  continuation_generation_plan_id: string;
  successive_generation_retriage_id: string;
  successive_generation_recurrence_id: string;
  successive_generation_reclosure_id: string;
  successive_generation_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: ContinuationGenerationPlanStatus;
  predecessor_successive_generation_plan_id: string;
  predecessor_successive_generation_delivery_id: string;
  source_successive_generation_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_successive_generation_reclosure_fingerprint: string;
  source_successive_generation_package_id: string;
  source_successive_generation_replay_key: string;
  source_successive_generation_package_fingerprint: string;
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
    throw new Error("successive_generation_recurrence_planning_manager_required");
  }
  return role;
}

export function buildContinuationGenerationCorrectivePlanScope(
  predecessorScope: CorrectivePlanScopeItem[],
  recordResults: ReconciliationRecordResult[]
) {
  return buildNextGenerationCorrectivePlanScope(predecessorScope, recordResults);
}

export function continuationGenerationCorrectivePlanFingerprint(input: {
  successiveGenerationRetriageId: string;
  successiveGenerationRecurrenceId: string;
  successiveGenerationReclosureId: string;
  successiveGenerationReclosureRegressionCheckId: string;
  predecessorSuccessiveGenerationPlanId: string;
  predecessorSuccessiveGenerationDeliveryId: string;
  sourceSuccessiveGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSuccessiveGenerationReclosureFingerprint: string;
  sourceSuccessiveGenerationPackageId: string;
  sourceSuccessiveGenerationReplayKey: string;
  sourceSuccessiveGenerationPackageFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("continuation-generation-plan1-", input);
}

function retriageFromRow(row: RetriageRow): SuccessiveGenerationRecurrenceRetriage {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successiveGenerationRetriageId: row.successive_generation_retriage_id,
    successiveGenerationRecurrenceId: row.successive_generation_recurrence_id,
    successiveGenerationReclosureId: row.successive_generation_reclosure_id,
    successiveGenerationReclosureRegressionCheckId:
      row.successive_generation_reclosure_regression_check_id,
    predecessorSubsequentGenerationRecurrenceId: row.predecessor_subsequent_generation_recurrence_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    successiveGenerationRecurrenceFingerprint:
      row.successive_generation_recurrence_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    successiveGenerationReclosureFingerprint:
      row.successive_generation_reclosure_fingerprint,
    affectedRecordCount: Number(row.affected_record_count),
    affectedIntegrationKeys: Array.isArray(row.affected_integration_keys)
      ? row.affected_integration_keys
      : [],
    affectedFields: Array.isArray(row.affected_fields)
      ? row.affected_fields
      : [],
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
    dismissedBy: row.dismissed_by,
    dismissedAt: row.dismissed_at?.toISOString() ?? null,
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function planFromRow(row: PlanRow): ContinuationGenerationCorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    continuationGenerationPlanId: row.continuation_generation_plan_id,
    successiveGenerationRetriageId: row.successive_generation_retriage_id,
    successiveGenerationRecurrenceId: row.successive_generation_recurrence_id,
    successiveGenerationReclosureId: row.successive_generation_reclosure_id,
    successiveGenerationReclosureRegressionCheckId:
      row.successive_generation_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    predecessorSuccessiveGenerationPlanId: row.predecessor_successive_generation_plan_id,
    predecessorSuccessiveGenerationDeliveryId:
      row.predecessor_successive_generation_delivery_id,
    sourceSuccessiveGenerationRecurrenceFingerprint:
      row.source_successive_generation_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSuccessiveGenerationReclosureFingerprint:
      row.source_successive_generation_reclosure_fingerprint,
    sourceSuccessiveGenerationPackageId: row.source_successive_generation_package_id,
    sourceSuccessiveGenerationReplayKey: row.source_successive_generation_replay_key,
    sourceSuccessiveGenerationPackageFingerprint:
      row.source_successive_generation_package_fingerprint,
    correctionScope: Array.isArray(row.correction_scope)
      ? row.correction_scope
      : [],
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

export async function listSuccessiveGenerationRecurrencePlanningForUser(
  userId: string
): Promise<SuccessiveGenerationRecurrencePlanningModel> {
  const recurrence = await listPostSuccessiveGenerationReclosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const retriage = await client.query<RetriageRow>(
      sql(
        "select t.*,w.name as workspace_name,wm.role",
        "from app.workspace_successive_generation_recurrence_triage_cycles t",
        "join app.workspaces w on w.id=t.workspace_id",
        "join app.workspace_members wm on wm.workspace_id=t.workspace_id",
        "and wm.user_id=nullif(current_setting('app.user_id',true),'')",
        "order by t.updated_at desc,t.successive_generation_retriage_id desc",
        "limit 500"
      )
    );
    const plans = await client.query<PlanRow>(
      sql(
        "select p.*,w.name as workspace_name,wm.role",
        "from app.workspace_continuation_generation_corrective_delivery_plans p",
        "join app.workspaces w on w.id=p.workspace_id",
        "join app.workspace_members wm on wm.workspace_id=p.workspace_id",
        "and wm.user_id=nullif(current_setting('app.user_id',true),'')",
        "order by p.created_at desc,p.continuation_generation_plan_id desc",
        "limit 500"
      )
    );
    return { retriage: retriage.rows, plans: plans.rows };
  });

  const retriage = data.retriage.map(retriageFromRow);
  const plans = data.plans.map(planFromRow);
  const retriaged = new Set(
    retriage.map(
      (item) => item.workspaceId + ":" + item.successiveGenerationRecurrenceId
    )
  );

  return {
    recurrence,
    retriage,
    plans,
    totals: {
      recurrencesWithoutRetriage: recurrence.recurrences.filter(
        (item) =>
          !retriaged.has(item.workspaceId + ":" + item.successiveGenerationRecurrenceId)
      ).length,
      activeRetriage: retriage.filter(
        (item) => item.status !== "dismissed"
      ).length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createSuccessiveGenerationRecurrenceRetriage(
  userId: string,
  input: { workspaceId: string; successiveGenerationRecurrenceId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{
      successive_generation_retriage_id: string;
    }>(
      sql(
        "select successive_generation_retriage_id",
        "from app.workspace_successive_generation_recurrence_triage_cycles",
        "where workspace_id=$1 and successive_generation_recurrence_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.successiveGenerationRecurrenceId]
    );
    if (existing.rows[0]) {
      return existing.rows[0].successive_generation_retriage_id;
    }

    const source = await client.query<{
      successive_generation_recurrence_id: string;
      successive_generation_reclosure_id: string;
      successive_generation_reclosure_regression_check_id: string;
      predecessor_subsequent_generation_recurrence_id: string;
      case_id: string;
      target: IntegrationTarget;
      successive_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      successive_generation_reclosure_fingerprint: string;
      regression_status: string;
      record_results: ReconciliationRecordResult[];
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select recurrence2.successive_generation_recurrence_id,",
        "recurrence2.successive_generation_reclosure_id,",
        "recurrence2.successive_generation_reclosure_regression_check_id,",
        "recurrence2.predecessor_subsequent_generation_recurrence_id,recurrence2.case_id,",
        "recurrence2.target,recurrence2.successive_generation_recurrence_fingerprint,",
        "recurrence2.regression_fingerprint,",
        "recurrence2.successive_generation_reclosure_fingerprint,",
        "regression.status as regression_status,regression.record_results,",
        "c.status as case_status,",
        "(select newest.successive_generation_recurrence_id",
        "from app.workspace_reconciliation_successive_generation_recurrences newest",
        "where newest.workspace_id=recurrence2.workspace_id",
        "and newest.case_id=recurrence2.case_id",
        "order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_reconciliation_successive_generation_recurrences recurrence2",
        "join app.workspace_post_successive_generation_reclosure_checks regression",
        "on regression.workspace_id=recurrence2.workspace_id",
        "and regression.successive_generation_reclosure_regression_check_id=",
        "recurrence2.successive_generation_reclosure_regression_check_id",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=recurrence2.workspace_id",
        "and c.case_id=recurrence2.case_id",
        "where recurrence2.workspace_id=$1",
        "and recurrence2.successive_generation_recurrence_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.successiveGenerationRecurrenceId]
    );
    const row = source.rows[0];
    if (!row) {
      throw new Error("successive_generation_recurrence_planning_recurrence_not_found");
    }
    if (row.regression_status !== "recurred") {
      throw new Error("successive_generation_recurrence_planning_recurred_check_required");
    }
    if (row.case_status !== "open") {
      throw new Error("successive_generation_recurrence_planning_open_case_required");
    }
    if (row.latest_recurrence_id !== row.successive_generation_recurrence_id) {
      throw new Error("successive_generation_recurrence_planning_latest_recurrence_required");
    }

    const affected = (row.record_results ?? []).filter(
      (record) =>
        record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) {
      throw new Error("successive_generation_recurrence_planning_no_exception_records");
    }

    const keys = [
      ...new Set(affected.map((record) => record.integrationKey))
    ].sort();
    const fields = [
      ...new Set(affected.flatMap((record) => record.differingFields))
    ];
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

    const successiveGenerationRetriageId = randomUUID();
    await client.query(
      sql(
        "insert into app.workspace_successive_generation_recurrence_triage_cycles (",
        "workspace_id,successive_generation_retriage_id,successive_generation_recurrence_id,",
        "successive_generation_reclosure_id,successive_generation_reclosure_regression_check_id,",
        "predecessor_subsequent_generation_recurrence_id,case_id,target,status,classification,severity,",
        "resolution_intent,summary,investigation_note,",
        "successive_generation_recurrence_fingerprint,regression_fingerprint,",
        "successive_generation_reclosure_fingerprint,affected_record_count,",
        "affected_integration_keys,affected_fields,created_by,updated_by",
        ") values (",
        "$1,$2,$3,$4,$5,$6,$7,$8,'open',$9,'medium','investigate',$10,'',",
        "$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$17)"
      ),
      [
        input.workspaceId,
        successiveGenerationRetriageId,
        row.successive_generation_recurrence_id,
        row.successive_generation_reclosure_id,
        row.successive_generation_reclosure_regression_check_id,
        row.predecessor_subsequent_generation_recurrence_id,
        row.case_id,
        row.target,
        classification,
        "Re-triage successive-generation recurrence from post-successive-generation re-closure check " +
          row.successive_generation_reclosure_regression_check_id +
          ".",
        row.successive_generation_recurrence_fingerprint,
        row.regression_fingerprint,
        row.successive_generation_reclosure_fingerprint,
        affected.length,
        JSON.stringify(keys),
        JSON.stringify([...new Set(fields)].sort()),
        userId
      ]
    );
    return successiveGenerationRetriageId;
  });
}

export async function updateSuccessiveGenerationRecurrenceRetriage(
  userId: string,
  input: {
    workspaceId: string;
    successiveGenerationRetriageId: string;
    status: "open" | "dismissed";
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
    investigationNote: string;
  }
) {
  const summary = input.summary.trim().slice(0, 4000);
  if (!summary) {
    throw new Error("successive_generation_recurrence_planning_summary_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: SuccessiveGenerationRecurrenceRetriageStatus;
      case_status: string;
      successive_generation_recurrence_id: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select triage.status,c.status as case_status,",
        "triage.successive_generation_recurrence_id,",
        "(select newest.successive_generation_recurrence_id",
        "from app.workspace_reconciliation_successive_generation_recurrences newest",
        "where newest.workspace_id=triage.workspace_id",
        "and newest.case_id=triage.case_id",
        "order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_successive_generation_recurrence_triage_cycles triage",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id",
        "where triage.workspace_id=$1",
        "and triage.successive_generation_retriage_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.successiveGenerationRetriageId]
    );
    const row = current.rows[0];
    if (!row) {
      throw new Error("successive_generation_recurrence_planning_retriage_not_found");
    }
    if (row.status === "approved" || row.status === "dismissed") {
      throw new Error("successive_generation_recurrence_planning_retriage_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("successive_generation_recurrence_planning_open_case_required");
    }
    if (row.successive_generation_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("successive_generation_recurrence_planning_latest_recurrence_required");
    }

    await client.query(
      sql(
        "update app.workspace_successive_generation_recurrence_triage_cycles",
        "set status=$3,classification=$4,severity=$5,resolution_intent=$6,",
        "summary=$7,investigation_note=$8,updated_by=$9,updated_at=now(),",
        "dismissed_by=case when $3='dismissed' then $9 else null end,",
        "dismissed_at=case when $3='dismissed' then now() else null end",
        "where workspace_id=$1 and successive_generation_retriage_id=$2"
      ),
      [
        input.workspaceId,
        input.successiveGenerationRetriageId,
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

export async function createContinuationGenerationCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    successiveGenerationRetriageId: string;
    rationale: string;
  }
) {
  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) {
    throw new Error("continuation_generation_plan_rationale_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const source = await client.query<{
      successive_generation_retriage_id: string;
      successive_generation_recurrence_id: string;
      successive_generation_reclosure_id: string;
      successive_generation_reclosure_regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      retriage_status: SuccessiveGenerationRecurrenceRetriageStatus;
      resolution_intent: ExceptionResolutionIntent;
      source_successive_generation_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_successive_generation_reclosure_fingerprint: string;
      record_results: ReconciliationRecordResult[];
      predecessor_successive_generation_plan_id: string;
      correction_scope: CorrectivePlanScopeItem[];
      predecessor_plan_status: string;
      predecessor_successive_generation_delivery_id: string;
      delivery_status: string;
      source_successive_generation_package_id: string;
      source_successive_generation_replay_key: string;
      source_successive_generation_package_fingerprint: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select triage.successive_generation_retriage_id,",
        "triage.successive_generation_recurrence_id,triage.successive_generation_reclosure_id,",
        "triage.successive_generation_reclosure_regression_check_id,",
        "triage.case_id,triage.target,triage.status as retriage_status,",
        "triage.resolution_intent,",
        "recurrence2.successive_generation_recurrence_fingerprint",
        "as source_successive_generation_recurrence_fingerprint,",
        "recurrence2.regression_fingerprint as source_regression_fingerprint,",
        "recurrence2.successive_generation_reclosure_fingerprint",
        "as source_successive_generation_reclosure_fingerprint,",
        "regression.record_results,",
        "predecessor.successive_generation_plan_id",
        "as predecessor_successive_generation_plan_id,",
        "predecessor.correction_scope,",
        "predecessor.status as predecessor_plan_status,",
        "delivery.delivery_id as predecessor_successive_generation_delivery_id,",
        "delivery.status as delivery_status,",
        "delivery.successive_generation_package_id as source_successive_generation_package_id,",
        "delivery.successive_generation_replay_key as source_successive_generation_replay_key,",
        "delivery.successive_generation_package_fingerprint",
        "as source_successive_generation_package_fingerprint,",
        "c.status as case_status,",
        "(select newest.successive_generation_recurrence_id",
        "from app.workspace_reconciliation_successive_generation_recurrences newest",
        "where newest.workspace_id=triage.workspace_id",
        "and newest.case_id=triage.case_id",
        "order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_successive_generation_recurrence_triage_cycles triage",
        "join app.workspace_reconciliation_successive_generation_recurrences recurrence2",
        "on recurrence2.workspace_id=triage.workspace_id",
        "and recurrence2.successive_generation_recurrence_id=triage.successive_generation_recurrence_id",
        "join app.workspace_post_successive_generation_reclosure_checks regression",
        "on regression.workspace_id=triage.workspace_id",
        "and regression.successive_generation_reclosure_regression_check_id=",
        "triage.successive_generation_reclosure_regression_check_id",
        "join app.workspace_reconciliation_successive_generation_reclosures reclosure",
        "on reclosure.workspace_id=triage.workspace_id",
        "and reclosure.successive_generation_reclosure_id=triage.successive_generation_reclosure_id",
        "join app.workspace_successive_generation_corrective_delivery_plans predecessor",
        "on predecessor.workspace_id=triage.workspace_id",
        "and predecessor.successive_generation_plan_id=reclosure.successive_generation_plan_id",
        "join app.workspace_successive_generation_corrective_live_deliveries delivery",
        "on delivery.workspace_id=triage.workspace_id",
        "and delivery.delivery_id=reclosure.successive_generation_delivery_id",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id",
        "where triage.workspace_id=$1",
        "and triage.successive_generation_retriage_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.successiveGenerationRetriageId]
    );
    const row = source.rows[0];
    if (!row) {
      throw new Error("continuation_generation_plan_retriage_not_found");
    }
    if (row.retriage_status === "approved" || row.retriage_status === "dismissed") {
      throw new Error("continuation_generation_plan_retriage_locked");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("continuation_generation_plan_resolution_intent_required");
    }
    if (row.case_status !== "open") {
      throw new Error("continuation_generation_plan_open_case_required");
    }
    if (row.successive_generation_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("continuation_generation_plan_latest_recurrence_required");
    }
    if (
      row.predecessor_plan_status !== "approved" ||
      row.delivery_status !== "accepted"
    ) {
      throw new Error("continuation_generation_plan_approved_predecessor_required");
    }

    const correctionScope = buildContinuationGenerationCorrectivePlanScope(
      row.correction_scope ?? [],
      row.record_results ?? []
    );
    if (!correctionScope.length) {
      throw new Error("continuation_generation_plan_scope_empty");
    }

    const planFingerprint = continuationGenerationCorrectivePlanFingerprint({
      successiveGenerationRetriageId: row.successive_generation_retriage_id,
      successiveGenerationRecurrenceId: row.successive_generation_recurrence_id,
      successiveGenerationReclosureId: row.successive_generation_reclosure_id,
      successiveGenerationReclosureRegressionCheckId:
        row.successive_generation_reclosure_regression_check_id,
      predecessorSuccessiveGenerationPlanId:
        row.predecessor_successive_generation_plan_id,
      predecessorSuccessiveGenerationDeliveryId:
        row.predecessor_successive_generation_delivery_id,
      sourceSuccessiveGenerationRecurrenceFingerprint:
        row.source_successive_generation_recurrence_fingerprint,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceSuccessiveGenerationReclosureFingerprint:
        row.source_successive_generation_reclosure_fingerprint,
      sourceSuccessiveGenerationPackageId:
        row.source_successive_generation_package_id,
      sourceSuccessiveGenerationReplayKey:
        row.source_successive_generation_replay_key,
      sourceSuccessiveGenerationPackageFingerprint:
        row.source_successive_generation_package_fingerprint,
      correctionScope,
      rationale
    });

    const existing = await client.query<{
      continuation_generation_plan_id: string;
    }>(
      sql(
        "select continuation_generation_plan_id",
        "from app.workspace_continuation_generation_corrective_delivery_plans",
        "where workspace_id=$1",
        "and successive_generation_retriage_id=$2",
        "and plan_fingerprint=$3",
        "limit 1"
      ),
      [
        input.workspaceId,
        row.successive_generation_retriage_id,
        planFingerprint
      ]
    );
    if (existing.rows[0]) {
      return existing.rows[0].continuation_generation_plan_id;
    }

    const continuationGenerationPlanId = randomUUID();
    await client.query(
      sql(
        "insert into app.workspace_continuation_generation_corrective_delivery_plans (",
        "workspace_id,continuation_generation_plan_id,",
        "successive_generation_retriage_id,successive_generation_recurrence_id,",
        "successive_generation_reclosure_id,successive_generation_reclosure_regression_check_id,",
        "case_id,target,status,predecessor_successive_generation_plan_id,",
        "predecessor_successive_generation_delivery_id,",
        "source_successive_generation_recurrence_fingerprint,",
        "source_regression_fingerprint,source_successive_generation_reclosure_fingerprint,",
        "source_successive_generation_package_id,source_successive_generation_replay_key,",
        "source_successive_generation_package_fingerprint,correction_scope,",
        "plan_fingerprint,rationale,created_by",
        ") values (",
        "$1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10,$11,$12,$13,$14,$15,$16,",
        "$17::jsonb,$18,$19,$20)"
      ),
      [
        input.workspaceId,
        continuationGenerationPlanId,
        row.successive_generation_retriage_id,
        row.successive_generation_recurrence_id,
        row.successive_generation_reclosure_id,
        row.successive_generation_reclosure_regression_check_id,
        row.case_id,
        row.target,
        row.predecessor_successive_generation_plan_id,
        row.predecessor_successive_generation_delivery_id,
        row.source_successive_generation_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.source_successive_generation_reclosure_fingerprint,
        row.source_successive_generation_package_id,
        row.source_successive_generation_replay_key,
        row.source_successive_generation_package_fingerprint,
        JSON.stringify(correctionScope),
        planFingerprint,
        rationale,
        userId
      ]
    );

    await client.query(
      sql(
        "update app.workspace_successive_generation_recurrence_triage_cycles",
        "set status='planned',updated_by=$3,updated_at=now()",
        "where workspace_id=$1 and successive_generation_retriage_id=$2",
        "and status='open'"
      ),
      [
        input.workspaceId,
        row.successive_generation_retriage_id,
        userId
      ]
    );

    return continuationGenerationPlanId;
  });
}

export async function reviewContinuationGenerationCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    continuationGenerationPlanId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: ContinuationGenerationPlanStatus;
      successive_generation_retriage_id: string;
      successive_generation_recurrence_id: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select plan.status,plan.successive_generation_retriage_id,",
        "plan.successive_generation_recurrence_id,c.status as case_status,",
        "(select newest.successive_generation_recurrence_id",
        "from app.workspace_reconciliation_successive_generation_recurrences newest",
        "where newest.workspace_id=plan.workspace_id",
        "and newest.case_id=plan.case_id",
        "order by newest.recurred_at desc,newest.successive_generation_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_continuation_generation_corrective_delivery_plans plan",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=plan.workspace_id and c.case_id=plan.case_id",
        "where plan.workspace_id=$1",
        "and plan.continuation_generation_plan_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.continuationGenerationPlanId]
    );
    const row = current.rows[0];
    if (!row) {
      throw new Error("continuation_generation_plan_not_found");
    }
    if (row.status !== "proposed") {
      throw new Error("continuation_generation_plan_review_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("continuation_generation_plan_open_case_required");
    }
    if (row.successive_generation_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("continuation_generation_plan_latest_recurrence_required");
    }

    await client.query(
      sql(
        "update app.workspace_continuation_generation_corrective_delivery_plans",
        "set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5",
        "where workspace_id=$1 and continuation_generation_plan_id=$2"
      ),
      [
        input.workspaceId,
        input.continuationGenerationPlanId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );

    await client.query(
      sql(
        "update app.workspace_successive_generation_recurrence_triage_cycles",
        "set status=$3,updated_by=$4,updated_at=now()",
        "where workspace_id=$1 and successive_generation_retriage_id=$2"
      ),
      [
        input.workspaceId,
        row.successive_generation_retriage_id,
        input.decision === "approved" ? "approved" : "open",
        userId
      ]
    );
  });
}
