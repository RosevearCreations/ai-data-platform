import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type { IntegrationTarget } from "./integration-delivery";
import type { ReconciliationRecordResult } from "./post-delivery-reconciliation";
import {
  listPostFollowingCycleReclosureForUser,
  type PostFollowingCycleReclosureModel
} from "./post-following-cycle-reclosure-regression";
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

export type FollowingCycleRecurrenceRetriageStatus =
  | "open"
  | "planned"
  | "approved"
  | "dismissed";
export type SubsequentCyclePlanStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface FollowingCycleRecurrenceRetriage {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  followingCycleRetriageId: string;
  followingCycleRecurrenceId: string;
  followingCycleReclosureId: string;
  followingCycleReclosureRegressionCheckId: string;
  predecessorNextCycleRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  status: FollowingCycleRecurrenceRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  followingCycleRecurrenceFingerprint: string;
  regressionFingerprint: string;
  followingCycleReclosureFingerprint: string;
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

export interface SubsequentCycleCorrectiveDeliveryPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  subsequentCyclePlanId: string;
  followingCycleRetriageId: string;
  followingCycleRecurrenceId: string;
  followingCycleReclosureId: string;
  followingCycleReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: SubsequentCyclePlanStatus;
  predecessorFollowingCyclePlanId: string;
  predecessorFollowingCycleDeliveryId: string;
  sourceFollowingCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceFollowingCycleReclosureFingerprint: string;
  sourceFollowingCyclePackageId: string;
  sourceFollowingCycleReplayKey: string;
  sourceFollowingCyclePackageFingerprint: string;
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

export interface FollowingCycleRecurrencePlanningModel {
  recurrence: PostFollowingCycleReclosureModel;
  retriage: FollowingCycleRecurrenceRetriage[];
  plans: SubsequentCycleCorrectiveDeliveryPlan[];
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
  following_cycle_retriage_id: string;
  following_cycle_recurrence_id: string;
  following_cycle_reclosure_id: string;
  following_cycle_reclosure_regression_check_id: string;
  predecessor_next_cycle_recurrence_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: FollowingCycleRecurrenceRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  following_cycle_recurrence_fingerprint: string;
  regression_fingerprint: string;
  following_cycle_reclosure_fingerprint: string;
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
  subsequent_cycle_plan_id: string;
  following_cycle_retriage_id: string;
  following_cycle_recurrence_id: string;
  following_cycle_reclosure_id: string;
  following_cycle_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: SubsequentCyclePlanStatus;
  predecessor_following_cycle_plan_id: string;
  predecessor_following_cycle_delivery_id: string;
  source_following_cycle_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_following_cycle_reclosure_fingerprint: string;
  source_following_cycle_package_id: string;
  source_following_cycle_replay_key: string;
  source_following_cycle_package_fingerprint: string;
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
    throw new Error("following_cycle_recurrence_planning_manager_required");
  }
  return role;
}

export function buildSubsequentCycleCorrectivePlanScope(
  predecessorScope: CorrectivePlanScopeItem[],
  recordResults: ReconciliationRecordResult[]
) {
  return buildNextGenerationCorrectivePlanScope(predecessorScope, recordResults);
}

export function subsequentCycleCorrectivePlanFingerprint(input: {
  followingCycleRetriageId: string;
  followingCycleRecurrenceId: string;
  followingCycleReclosureId: string;
  followingCycleReclosureRegressionCheckId: string;
  predecessorFollowingCyclePlanId: string;
  predecessorFollowingCycleDeliveryId: string;
  sourceFollowingCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceFollowingCycleReclosureFingerprint: string;
  sourceFollowingCyclePackageId: string;
  sourceFollowingCycleReplayKey: string;
  sourceFollowingCyclePackageFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("subsequent-cycle-plan1-", input);
}

function retriageFromRow(row: RetriageRow): FollowingCycleRecurrenceRetriage {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    followingCycleRetriageId: row.following_cycle_retriage_id,
    followingCycleRecurrenceId: row.following_cycle_recurrence_id,
    followingCycleReclosureId: row.following_cycle_reclosure_id,
    followingCycleReclosureRegressionCheckId:
      row.following_cycle_reclosure_regression_check_id,
    predecessorNextCycleRecurrenceId: row.predecessor_next_cycle_recurrence_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    followingCycleRecurrenceFingerprint:
      row.following_cycle_recurrence_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    followingCycleReclosureFingerprint:
      row.following_cycle_reclosure_fingerprint,
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

function planFromRow(row: PlanRow): SubsequentCycleCorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    subsequentCyclePlanId: row.subsequent_cycle_plan_id,
    followingCycleRetriageId: row.following_cycle_retriage_id,
    followingCycleRecurrenceId: row.following_cycle_recurrence_id,
    followingCycleReclosureId: row.following_cycle_reclosure_id,
    followingCycleReclosureRegressionCheckId:
      row.following_cycle_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    predecessorFollowingCyclePlanId: row.predecessor_following_cycle_plan_id,
    predecessorFollowingCycleDeliveryId:
      row.predecessor_following_cycle_delivery_id,
    sourceFollowingCycleRecurrenceFingerprint:
      row.source_following_cycle_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceFollowingCycleReclosureFingerprint:
      row.source_following_cycle_reclosure_fingerprint,
    sourceFollowingCyclePackageId: row.source_following_cycle_package_id,
    sourceFollowingCycleReplayKey: row.source_following_cycle_replay_key,
    sourceFollowingCyclePackageFingerprint:
      row.source_following_cycle_package_fingerprint,
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

export async function listFollowingCycleRecurrencePlanningForUser(
  userId: string
): Promise<FollowingCycleRecurrencePlanningModel> {
  const recurrence = await listPostFollowingCycleReclosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const retriage = await client.query<RetriageRow>(
      sql(
        "select t.*,w.name as workspace_name,wm.role",
        "from app.workspace_following_cycle_recurrence_triage_cycles t",
        "join app.workspaces w on w.id=t.workspace_id",
        "join app.workspace_members wm on wm.workspace_id=t.workspace_id",
        "and wm.user_id=nullif(current_setting('app.user_id',true),'')",
        "order by t.updated_at desc,t.following_cycle_retriage_id desc",
        "limit 500"
      )
    );
    const plans = await client.query<PlanRow>(
      sql(
        "select p.*,w.name as workspace_name,wm.role",
        "from app.workspace_subsequent_cycle_corrective_delivery_plans p",
        "join app.workspaces w on w.id=p.workspace_id",
        "join app.workspace_members wm on wm.workspace_id=p.workspace_id",
        "and wm.user_id=nullif(current_setting('app.user_id',true),'')",
        "order by p.created_at desc,p.subsequent_cycle_plan_id desc",
        "limit 500"
      )
    );
    return { retriage: retriage.rows, plans: plans.rows };
  });

  const retriage = data.retriage.map(retriageFromRow);
  const plans = data.plans.map(planFromRow);
  const retriaged = new Set(
    retriage.map(
      (item) => item.workspaceId + ":" + item.followingCycleRecurrenceId
    )
  );

  return {
    recurrence,
    retriage,
    plans,
    totals: {
      recurrencesWithoutRetriage: recurrence.recurrences.filter(
        (item) =>
          !retriaged.has(item.workspaceId + ":" + item.followingCycleRecurrenceId)
      ).length,
      activeRetriage: retriage.filter(
        (item) => item.status !== "dismissed"
      ).length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createFollowingCycleRecurrenceRetriage(
  userId: string,
  input: { workspaceId: string; followingCycleRecurrenceId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{
      following_cycle_retriage_id: string;
    }>(
      sql(
        "select following_cycle_retriage_id",
        "from app.workspace_following_cycle_recurrence_triage_cycles",
        "where workspace_id=$1 and following_cycle_recurrence_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.followingCycleRecurrenceId]
    );
    if (existing.rows[0]) {
      return existing.rows[0].following_cycle_retriage_id;
    }

    const source = await client.query<{
      following_cycle_recurrence_id: string;
      following_cycle_reclosure_id: string;
      following_cycle_reclosure_regression_check_id: string;
      predecessor_next_cycle_recurrence_id: string;
      case_id: string;
      target: IntegrationTarget;
      following_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      following_cycle_reclosure_fingerprint: string;
      regression_status: string;
      record_results: ReconciliationRecordResult[];
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select recurrence2.following_cycle_recurrence_id,",
        "recurrence2.following_cycle_reclosure_id,",
        "recurrence2.following_cycle_reclosure_regression_check_id,",
        "recurrence2.predecessor_next_cycle_recurrence_id,recurrence2.case_id,",
        "recurrence2.target,recurrence2.following_cycle_recurrence_fingerprint,",
        "recurrence2.regression_fingerprint,",
        "recurrence2.following_cycle_reclosure_fingerprint,",
        "regression.status as regression_status,regression.record_results,",
        "c.status as case_status,",
        "(select newest.following_cycle_recurrence_id",
        "from app.workspace_reconciliation_following_cycle_recurrences newest",
        "where newest.workspace_id=recurrence2.workspace_id",
        "and newest.case_id=recurrence2.case_id",
        "order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_reconciliation_following_cycle_recurrences recurrence2",
        "join app.workspace_post_following_cycle_reclosure_checks regression",
        "on regression.workspace_id=recurrence2.workspace_id",
        "and regression.following_cycle_reclosure_regression_check_id=",
        "recurrence2.following_cycle_reclosure_regression_check_id",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=recurrence2.workspace_id",
        "and c.case_id=recurrence2.case_id",
        "where recurrence2.workspace_id=$1",
        "and recurrence2.following_cycle_recurrence_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.followingCycleRecurrenceId]
    );
    const row = source.rows[0];
    if (!row) {
      throw new Error("following_cycle_recurrence_planning_recurrence_not_found");
    }
    if (row.regression_status !== "recurred") {
      throw new Error("following_cycle_recurrence_planning_recurred_check_required");
    }
    if (row.case_status !== "open") {
      throw new Error("following_cycle_recurrence_planning_open_case_required");
    }
    if (row.latest_recurrence_id !== row.following_cycle_recurrence_id) {
      throw new Error("following_cycle_recurrence_planning_latest_recurrence_required");
    }

    const affected = (row.record_results ?? []).filter(
      (record) =>
        record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) {
      throw new Error("following_cycle_recurrence_planning_no_exception_records");
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

    const followingCycleRetriageId = randomUUID();
    await client.query(
      sql(
        "insert into app.workspace_following_cycle_recurrence_triage_cycles (",
        "workspace_id,following_cycle_retriage_id,following_cycle_recurrence_id,",
        "following_cycle_reclosure_id,following_cycle_reclosure_regression_check_id,",
        "predecessor_next_cycle_recurrence_id,case_id,target,status,classification,severity,",
        "resolution_intent,summary,investigation_note,",
        "following_cycle_recurrence_fingerprint,regression_fingerprint,",
        "following_cycle_reclosure_fingerprint,affected_record_count,",
        "affected_integration_keys,affected_fields,created_by,updated_by",
        ") values (",
        "$1,$2,$3,$4,$5,$6,$7,$8,'open',$9,'medium','investigate',$10,'',",
        "$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$17)"
      ),
      [
        input.workspaceId,
        followingCycleRetriageId,
        row.following_cycle_recurrence_id,
        row.following_cycle_reclosure_id,
        row.following_cycle_reclosure_regression_check_id,
        row.predecessor_next_cycle_recurrence_id,
        row.case_id,
        row.target,
        classification,
        "Re-triage following-cycle recurrence from post-following-cycle re-closure check " +
          row.following_cycle_reclosure_regression_check_id +
          ".",
        row.following_cycle_recurrence_fingerprint,
        row.regression_fingerprint,
        row.following_cycle_reclosure_fingerprint,
        affected.length,
        JSON.stringify(keys),
        JSON.stringify([...new Set(fields)].sort()),
        userId
      ]
    );
    return followingCycleRetriageId;
  });
}

export async function updateFollowingCycleRecurrenceRetriage(
  userId: string,
  input: {
    workspaceId: string;
    followingCycleRetriageId: string;
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
    throw new Error("following_cycle_recurrence_planning_summary_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: FollowingCycleRecurrenceRetriageStatus;
      case_status: string;
      following_cycle_recurrence_id: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select triage.status,c.status as case_status,",
        "triage.following_cycle_recurrence_id,",
        "(select newest.following_cycle_recurrence_id",
        "from app.workspace_reconciliation_following_cycle_recurrences newest",
        "where newest.workspace_id=triage.workspace_id",
        "and newest.case_id=triage.case_id",
        "order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_following_cycle_recurrence_triage_cycles triage",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id",
        "where triage.workspace_id=$1",
        "and triage.following_cycle_retriage_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.followingCycleRetriageId]
    );
    const row = current.rows[0];
    if (!row) {
      throw new Error("following_cycle_recurrence_planning_retriage_not_found");
    }
    if (row.status === "approved" || row.status === "dismissed") {
      throw new Error("following_cycle_recurrence_planning_retriage_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("following_cycle_recurrence_planning_open_case_required");
    }
    if (row.following_cycle_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("following_cycle_recurrence_planning_latest_recurrence_required");
    }

    await client.query(
      sql(
        "update app.workspace_following_cycle_recurrence_triage_cycles",
        "set status=$3,classification=$4,severity=$5,resolution_intent=$6,",
        "summary=$7,investigation_note=$8,updated_by=$9,updated_at=now(),",
        "dismissed_by=case when $3='dismissed' then $9 else null end,",
        "dismissed_at=case when $3='dismissed' then now() else null end",
        "where workspace_id=$1 and following_cycle_retriage_id=$2"
      ),
      [
        input.workspaceId,
        input.followingCycleRetriageId,
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

export async function createSubsequentCycleCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    followingCycleRetriageId: string;
    rationale: string;
  }
) {
  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) {
    throw new Error("subsequent_cycle_plan_rationale_required");
  }

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const source = await client.query<{
      following_cycle_retriage_id: string;
      following_cycle_recurrence_id: string;
      following_cycle_reclosure_id: string;
      following_cycle_reclosure_regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      retriage_status: FollowingCycleRecurrenceRetriageStatus;
      resolution_intent: ExceptionResolutionIntent;
      source_following_cycle_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_following_cycle_reclosure_fingerprint: string;
      record_results: ReconciliationRecordResult[];
      predecessor_following_cycle_plan_id: string;
      correction_scope: CorrectivePlanScopeItem[];
      predecessor_plan_status: string;
      predecessor_following_cycle_delivery_id: string;
      delivery_status: string;
      source_following_cycle_package_id: string;
      source_following_cycle_replay_key: string;
      source_following_cycle_package_fingerprint: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select triage.following_cycle_retriage_id,",
        "triage.following_cycle_recurrence_id,triage.following_cycle_reclosure_id,",
        "triage.following_cycle_reclosure_regression_check_id,",
        "triage.case_id,triage.target,triage.status as retriage_status,",
        "triage.resolution_intent,",
        "recurrence2.following_cycle_recurrence_fingerprint",
        "as source_following_cycle_recurrence_fingerprint,",
        "recurrence2.regression_fingerprint as source_regression_fingerprint,",
        "recurrence2.following_cycle_reclosure_fingerprint",
        "as source_following_cycle_reclosure_fingerprint,",
        "regression.record_results,",
        "predecessor.following_cycle_plan_id",
        "as predecessor_following_cycle_plan_id,",
        "predecessor.correction_scope,",
        "predecessor.status as predecessor_plan_status,",
        "delivery.delivery_id as predecessor_following_cycle_delivery_id,",
        "delivery.status as delivery_status,",
        "delivery.following_cycle_package_id as source_following_cycle_package_id,",
        "delivery.following_cycle_replay_key as source_following_cycle_replay_key,",
        "delivery.following_cycle_package_fingerprint",
        "as source_following_cycle_package_fingerprint,",
        "c.status as case_status,",
        "(select newest.following_cycle_recurrence_id",
        "from app.workspace_reconciliation_following_cycle_recurrences newest",
        "where newest.workspace_id=triage.workspace_id",
        "and newest.case_id=triage.case_id",
        "order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_following_cycle_recurrence_triage_cycles triage",
        "join app.workspace_reconciliation_following_cycle_recurrences recurrence2",
        "on recurrence2.workspace_id=triage.workspace_id",
        "and recurrence2.following_cycle_recurrence_id=triage.following_cycle_recurrence_id",
        "join app.workspace_post_following_cycle_reclosure_checks regression",
        "on regression.workspace_id=triage.workspace_id",
        "and regression.following_cycle_reclosure_regression_check_id=",
        "triage.following_cycle_reclosure_regression_check_id",
        "join app.workspace_reconciliation_following_cycle_reclosures reclosure",
        "on reclosure.workspace_id=triage.workspace_id",
        "and reclosure.following_cycle_reclosure_id=triage.following_cycle_reclosure_id",
        "join app.workspace_following_cycle_corrective_delivery_plans predecessor",
        "on predecessor.workspace_id=triage.workspace_id",
        "and predecessor.following_cycle_plan_id=reclosure.following_cycle_plan_id",
        "join app.workspace_following_cycle_corrective_live_deliveries delivery",
        "on delivery.workspace_id=triage.workspace_id",
        "and delivery.delivery_id=reclosure.following_cycle_delivery_id",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id",
        "where triage.workspace_id=$1",
        "and triage.following_cycle_retriage_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.followingCycleRetriageId]
    );
    const row = source.rows[0];
    if (!row) {
      throw new Error("subsequent_cycle_plan_retriage_not_found");
    }
    if (row.retriage_status === "approved" || row.retriage_status === "dismissed") {
      throw new Error("subsequent_cycle_plan_retriage_locked");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("subsequent_cycle_plan_resolution_intent_required");
    }
    if (row.case_status !== "open") {
      throw new Error("subsequent_cycle_plan_open_case_required");
    }
    if (row.following_cycle_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("subsequent_cycle_plan_latest_recurrence_required");
    }
    if (
      row.predecessor_plan_status !== "approved" ||
      row.delivery_status !== "accepted"
    ) {
      throw new Error("subsequent_cycle_plan_approved_predecessor_required");
    }

    const correctionScope = buildSubsequentCycleCorrectivePlanScope(
      row.correction_scope ?? [],
      row.record_results ?? []
    );
    if (!correctionScope.length) {
      throw new Error("subsequent_cycle_plan_scope_empty");
    }

    const planFingerprint = subsequentCycleCorrectivePlanFingerprint({
      followingCycleRetriageId: row.following_cycle_retriage_id,
      followingCycleRecurrenceId: row.following_cycle_recurrence_id,
      followingCycleReclosureId: row.following_cycle_reclosure_id,
      followingCycleReclosureRegressionCheckId:
        row.following_cycle_reclosure_regression_check_id,
      predecessorFollowingCyclePlanId:
        row.predecessor_following_cycle_plan_id,
      predecessorFollowingCycleDeliveryId:
        row.predecessor_following_cycle_delivery_id,
      sourceFollowingCycleRecurrenceFingerprint:
        row.source_following_cycle_recurrence_fingerprint,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceFollowingCycleReclosureFingerprint:
        row.source_following_cycle_reclosure_fingerprint,
      sourceFollowingCyclePackageId:
        row.source_following_cycle_package_id,
      sourceFollowingCycleReplayKey:
        row.source_following_cycle_replay_key,
      sourceFollowingCyclePackageFingerprint:
        row.source_following_cycle_package_fingerprint,
      correctionScope,
      rationale
    });

    const existing = await client.query<{
      subsequent_cycle_plan_id: string;
    }>(
      sql(
        "select subsequent_cycle_plan_id",
        "from app.workspace_subsequent_cycle_corrective_delivery_plans",
        "where workspace_id=$1",
        "and following_cycle_retriage_id=$2",
        "and plan_fingerprint=$3",
        "limit 1"
      ),
      [
        input.workspaceId,
        row.following_cycle_retriage_id,
        planFingerprint
      ]
    );
    if (existing.rows[0]) {
      return existing.rows[0].subsequent_cycle_plan_id;
    }

    const subsequentCyclePlanId = randomUUID();
    await client.query(
      sql(
        "insert into app.workspace_subsequent_cycle_corrective_delivery_plans (",
        "workspace_id,subsequent_cycle_plan_id,",
        "following_cycle_retriage_id,following_cycle_recurrence_id,",
        "following_cycle_reclosure_id,following_cycle_reclosure_regression_check_id,",
        "case_id,target,status,predecessor_following_cycle_plan_id,",
        "predecessor_following_cycle_delivery_id,",
        "source_following_cycle_recurrence_fingerprint,",
        "source_regression_fingerprint,source_following_cycle_reclosure_fingerprint,",
        "source_following_cycle_package_id,source_following_cycle_replay_key,",
        "source_following_cycle_package_fingerprint,correction_scope,",
        "plan_fingerprint,rationale,created_by",
        ") values (",
        "$1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10,$11,$12,$13,$14,$15,$16,",
        "$17::jsonb,$18,$19,$20)"
      ),
      [
        input.workspaceId,
        subsequentCyclePlanId,
        row.following_cycle_retriage_id,
        row.following_cycle_recurrence_id,
        row.following_cycle_reclosure_id,
        row.following_cycle_reclosure_regression_check_id,
        row.case_id,
        row.target,
        row.predecessor_following_cycle_plan_id,
        row.predecessor_following_cycle_delivery_id,
        row.source_following_cycle_recurrence_fingerprint,
        row.source_regression_fingerprint,
        row.source_following_cycle_reclosure_fingerprint,
        row.source_following_cycle_package_id,
        row.source_following_cycle_replay_key,
        row.source_following_cycle_package_fingerprint,
        JSON.stringify(correctionScope),
        planFingerprint,
        rationale,
        userId
      ]
    );

    await client.query(
      sql(
        "update app.workspace_following_cycle_recurrence_triage_cycles",
        "set status='planned',updated_by=$3,updated_at=now()",
        "where workspace_id=$1 and following_cycle_retriage_id=$2",
        "and status='open'"
      ),
      [
        input.workspaceId,
        row.following_cycle_retriage_id,
        userId
      ]
    );

    return subsequentCyclePlanId;
  });
}

export async function reviewSubsequentCycleCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    subsequentCyclePlanId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{
      status: SubsequentCyclePlanStatus;
      following_cycle_retriage_id: string;
      following_cycle_recurrence_id: string;
      case_status: string;
      latest_recurrence_id: string;
    }>(
      sql(
        "select plan.status,plan.following_cycle_retriage_id,",
        "plan.following_cycle_recurrence_id,c.status as case_status,",
        "(select newest.following_cycle_recurrence_id",
        "from app.workspace_reconciliation_following_cycle_recurrences newest",
        "where newest.workspace_id=plan.workspace_id",
        "and newest.case_id=plan.case_id",
        "order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc",
        "limit 1) as latest_recurrence_id",
        "from app.workspace_subsequent_cycle_corrective_delivery_plans plan",
        "join app.workspace_reconciliation_exception_cases c",
        "on c.workspace_id=plan.workspace_id and c.case_id=plan.case_id",
        "where plan.workspace_id=$1",
        "and plan.subsequent_cycle_plan_id=$2",
        "limit 1"
      ),
      [input.workspaceId, input.subsequentCyclePlanId]
    );
    const row = current.rows[0];
    if (!row) {
      throw new Error("subsequent_cycle_plan_not_found");
    }
    if (row.status !== "proposed") {
      throw new Error("subsequent_cycle_plan_review_locked");
    }
    if (row.case_status !== "open") {
      throw new Error("subsequent_cycle_plan_open_case_required");
    }
    if (row.following_cycle_recurrence_id !== row.latest_recurrence_id) {
      throw new Error("subsequent_cycle_plan_latest_recurrence_required");
    }

    await client.query(
      sql(
        "update app.workspace_subsequent_cycle_corrective_delivery_plans",
        "set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5",
        "where workspace_id=$1 and subsequent_cycle_plan_id=$2"
      ),
      [
        input.workspaceId,
        input.subsequentCyclePlanId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );

    await client.query(
      sql(
        "update app.workspace_following_cycle_recurrence_triage_cycles",
        "set status=$3,updated_by=$4,updated_at=now()",
        "where workspace_id=$1 and following_cycle_retriage_id=$2"
      ),
      [
        input.workspaceId,
        row.following_cycle_retriage_id,
        input.decision === "approved" ? "approved" : "open",
        userId
      ]
    );
  });
}
