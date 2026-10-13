import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type { IntegrationScalar, IntegrationTarget } from "./integration-delivery";
import {
  listPostClosureRegressionForUser,
  type PostClosureRegressionModel
} from "./post-closure-regression";
import type { ReconciliationRecordResult } from "./post-delivery-reconciliation";
import type {
  CorrectivePlanScopeItem,
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "./reconciliation-exception-triage";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type ReopenedRetriageStatus = "open" | "planned" | "approved" | "dismissed";
export type SuccessorPlanStatus = "proposed" | "approved" | "rejected" | "withdrawn";

export interface ReopenedExceptionRetriage {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  retriageId: string;
  reopenId: string;
  closureId: string;
  regressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: ReopenedRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  regressionFingerprint: string;
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

export interface SuccessorCorrectiveDeliveryPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorPlanId: string;
  retriageId: string;
  reopenId: string;
  regressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  status: SuccessorPlanStatus;
  predecessorPlanId: string;
  predecessorCorrectiveDeliveryId: string;
  sourceRegressionFingerprint: string;
  sourceCorrectivePackageId: string;
  sourceCorrectiveReplayKey: string;
  sourceCorrectivePackageFingerprint: string;
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

export interface ReopenedExceptionPlanningModel {
  regression: PostClosureRegressionModel;
  retriage: ReopenedExceptionRetriage[];
  plans: SuccessorCorrectiveDeliveryPlan[];
  totals: {
    reopenedWithoutRetriage: number;
    activeRetriage: number;
    proposedPlans: number;
    approvedPlans: number;
  };
}

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
    throw new Error("reopened_planning_manager_required");
  }
  return role;
}

export function buildSuccessorCorrectivePlanScope(
  predecessorScope: CorrectivePlanScopeItem[],
  recordResults: ReconciliationRecordResult[]
): CorrectivePlanScopeItem[] {
  const predecessorByKey = new Map(
    predecessorScope.map((item) => [item.integrationKey, item])
  );

  return recordResults
    .filter(
      (record): record is ReconciliationRecordResult & {
        status: "mismatched" | "missing";
      } => record.status === "mismatched" || record.status === "missing"
    )
    .map((record) => {
      const predecessor = predecessorByKey.get(record.integrationKey);
      if (!predecessor) {
        throw new Error("successor_plan_predecessor_scope_missing");
      }

      const candidateFields =
        record.status === "missing"
          ? Object.keys(predecessor.desiredValues).sort()
          : [...record.differingFields].sort();

      const governedFields = candidateFields.filter((field) =>
        Object.prototype.hasOwnProperty.call(predecessor.desiredValues, field)
      );
      if (!governedFields.length) {
        throw new Error("successor_plan_scope_empty");
      }

      const desiredValues = Object.fromEntries(
        governedFields.map((field) => [
          field,
          predecessor.desiredValues[field]
        ])
      ) as Record<string, IntegrationScalar>;

      const proposedAction =
        record.status === "mismatched"
          ? "update-existing"
          : predecessor.proposedAction === "restore-missing"
            ? "restore-missing"
            : "manual-review";

      return {
        integrationKey: record.integrationKey,
        issueStatus: record.status,
        proposedAction,
        desiredValues,
        governedFields,
        expectedFingerprint: record.expectedFingerprint,
        observedFingerprint: record.observedFingerprint
      } satisfies CorrectivePlanScopeItem;
    })
    .sort((left, right) => left.integrationKey.localeCompare(right.integrationKey));
}

export function successorCorrectivePlanFingerprint(input: {
  retriageId: string;
  reopenId: string;
  regressionCheckId: string;
  predecessorPlanId: string;
  predecessorCorrectiveDeliveryId: string;
  sourceRegressionFingerprint: string;
  sourceCorrectivePackageId: string;
  sourceCorrectiveReplayKey: string;
  sourceCorrectivePackageFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("successor-plan1-", input);
}

type RetriageRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  retriage_id: string;
  reopen_id: string;
  closure_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: ReopenedRetriageStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  regression_fingerprint: string;
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

type SuccessorPlanRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  successor_plan_id: string;
  retriage_id: string;
  reopen_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  status: SuccessorPlanStatus;
  predecessor_plan_id: string;
  predecessor_corrective_delivery_id: string;
  source_regression_fingerprint: string;
  source_corrective_package_id: string;
  source_corrective_replay_key: string;
  source_corrective_package_fingerprint: string;
  correction_scope: CorrectivePlanScopeItem[];
  plan_fingerprint: string;
  rationale: string;
  created_by: string;
  created_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string;
};

function retriageFromRow(row: RetriageRow, role: WorkspaceRole): ReopenedExceptionRetriage {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    retriageId: row.retriage_id,
    reopenId: row.reopen_id,
    closureId: row.closure_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    regressionFingerprint: row.regression_fingerprint,
    affectedRecordCount: Number(row.affected_record_count),
    affectedIntegrationKeys: Array.isArray(row.affected_integration_keys) ? row.affected_integration_keys : [],
    affectedFields: Array.isArray(row.affected_fields) ? row.affected_fields : [],
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at.toISOString(),
    dismissedBy: row.dismissed_by,
    dismissedAt: row.dismissed_at?.toISOString() ?? null,
    canManage: role === "owner" || role === "admin"
  };
}

function planFromRow(row: SuccessorPlanRow, role: WorkspaceRole): SuccessorCorrectiveDeliveryPlan {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    successorPlanId: row.successor_plan_id,
    retriageId: row.retriage_id,
    reopenId: row.reopen_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    status: row.status,
    predecessorPlanId: row.predecessor_plan_id,
    predecessorCorrectiveDeliveryId: row.predecessor_corrective_delivery_id,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceCorrectivePackageId: row.source_corrective_package_id,
    sourceCorrectiveReplayKey: row.source_corrective_replay_key,
    sourceCorrectivePackageFingerprint: row.source_corrective_package_fingerprint,
    correctionScope: Array.isArray(row.correction_scope) ? row.correction_scope : [],
    planFingerprint: row.plan_fingerprint,
    rationale: row.rationale,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    reviewNote: row.review_note,
    canManage: role === "owner" || role === "admin"
  };
}

export async function listReopenedExceptionPlanningForUser(
  userId: string
): Promise<ReopenedExceptionPlanningModel> {
  const regression = await listPostClosureRegressionForUser(userId);
  const roles = new Map(
    regression.closure.corrective.triage.reconciliation.live.bridge.workspaces.map(
      (workspace) => [workspace.id, workspace.role]
    )
  );
  const data = await withUserDatabase(userId, async (client) => {
    const retriage = await client.query<RetriageRow>(
      `select t.*,w.name as workspace_name
       from app.workspace_reopened_exception_triage_cycles t
       join app.workspaces w on w.id=t.workspace_id
       order by t.updated_at desc,t.retriage_id desc
       limit 500`
    );
    const plans = await client.query<SuccessorPlanRow>(
      `select p.*,w.name as workspace_name
       from app.workspace_successor_corrective_delivery_plans p
       join app.workspaces w on w.id=p.workspace_id
       order by p.created_at desc,p.successor_plan_id desc
       limit 500`
    );
    return { retriage: retriage.rows, plans: plans.rows };
  });

  const retriage = data.retriage.map((row) =>
    retriageFromRow(row, (roles.get(row.workspace_id) ?? "member") as WorkspaceRole)
  );
  const plans = data.plans.map((row) =>
    planFromRow(row, (roles.get(row.workspace_id) ?? "member") as WorkspaceRole)
  );
  const retriaged = new Set(retriage.map((item) => item.workspaceId + ":" + item.reopenId));

  return {
    regression,
    retriage,
    plans,
    totals: {
      reopenedWithoutRetriage: regression.reopens.filter(
        (item) => !retriaged.has(item.workspaceId + ":" + item.reopenId)
      ).length,
      activeRetriage: retriage.filter((item) => item.status !== "dismissed").length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createReopenedExceptionRetriage(
  userId: string,
  input: { workspaceId: string; reopenId: string }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ retriage_id: string }>(
      `select retriage_id
       from app.workspace_reopened_exception_triage_cycles
       where workspace_id=$1 and reopen_id=$2
       limit 1`,
      [input.workspaceId, input.reopenId]
    );
    if (existing.rows[0]) return existing.rows[0].retriage_id;

    const source = await client.query<{
      reopen_id: string;
      closure_id: string;
      regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      regression_fingerprint: string;
      regression_status: string;
      record_results: ReconciliationRecordResult[];
      case_status: string;
    }>(
      `select reopen.reopen_id,reopen.closure_id,reopen.regression_check_id,
              reopen.case_id,reopen.target,reopen.regression_fingerprint,
              regression.status as regression_status,regression.record_results,
              c.status as case_status
       from app.workspace_reconciliation_exception_reopens reopen
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=reopen.workspace_id
        and regression.regression_check_id=reopen.regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=reopen.workspace_id and c.case_id=reopen.case_id
       where reopen.workspace_id=$1 and reopen.reopen_id=$2
       limit 1`,
      [input.workspaceId, input.reopenId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("reopened_planning_reopen_not_found");
    if (row.regression_status !== "regressed") {
      throw new Error("reopened_planning_regression_required");
    }
    if (row.case_status !== "open") {
      throw new Error("reopened_planning_open_case_required");
    }

    const affected = (row.record_results ?? []).filter(
      (record) => record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) throw new Error("reopened_planning_no_exception_records");

    const keys = [...new Set(affected.map((record) => record.integrationKey))].sort();
    const fields = [...new Set(affected.flatMap((record) => record.differingFields))].sort();
    if (affected.some((record) => record.status === "missing")) fields.push("*missing-record*");

    const statuses = new Set(affected.map((record) => record.status));
    const classification: ExceptionClassification =
      statuses.size > 1
        ? "mixed"
        : statuses.has("missing")
          ? "consumer-missing"
          : "consumer-drift";

    const retriageId = randomUUID();
    await client.query(
      `insert into app.workspace_reopened_exception_triage_cycles (
        workspace_id,retriage_id,reopen_id,closure_id,regression_check_id,
        case_id,target,status,classification,severity,resolution_intent,
        summary,investigation_note,regression_fingerprint,affected_record_count,
        affected_integration_keys,affected_fields,created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,'open',$8,'medium','investigate',$9,'',$10,$11,
        $12::jsonb,$13::jsonb,$14,$14
      )`,
      [
        input.workspaceId,
        retriageId,
        row.reopen_id,
        row.closure_id,
        row.regression_check_id,
        row.case_id,
        row.target,
        classification,
        "Re-triage reopened exception from regression check " + row.regression_check_id + ".",
        row.regression_fingerprint,
        affected.length,
        JSON.stringify(keys),
        JSON.stringify([...new Set(fields)].sort()),
        userId
      ]
    );
    return retriageId;
  });
}

export async function updateReopenedExceptionRetriage(
  userId: string,
  input: {
    workspaceId: string;
    retriageId: string;
    status: "open" | "dismissed";
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
    investigationNote: string;
  }
) {
  const summary = input.summary.trim().slice(0, 4000);
  if (!summary) throw new Error("reopened_planning_summary_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{ status: ReopenedRetriageStatus }>(
      `select status
       from app.workspace_reopened_exception_triage_cycles
       where workspace_id=$1 and retriage_id=$2
       limit 1`,
      [input.workspaceId, input.retriageId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("reopened_planning_retriage_not_found");
    if (row.status === "approved") throw new Error("reopened_planning_retriage_approved");

    await client.query(
      `update app.workspace_reopened_exception_triage_cycles
       set status=$3,classification=$4,severity=$5,resolution_intent=$6,
           summary=$7,investigation_note=$8,updated_by=$9,updated_at=now(),
           dismissed_by=case when $3='dismissed' then $9 else null end,
           dismissed_at=case when $3='dismissed' then now() else null end
       where workspace_id=$1 and retriage_id=$2`,
      [
        input.workspaceId,
        input.retriageId,
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

export async function createSuccessorCorrectiveDeliveryPlan(
  userId: string,
  input: { workspaceId: string; retriageId: string; rationale: string }
) {
  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) throw new Error("successor_plan_rationale_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const source = await client.query<{
      retriage_id: string;
      reopen_id: string;
      regression_check_id: string;
      case_id: string;
      target: IntegrationTarget;
      retriage_status: ReopenedRetriageStatus;
      resolution_intent: ExceptionResolutionIntent;
      source_regression_fingerprint: string;
      record_results: ReconciliationRecordResult[];
      predecessor_plan_id: string;
      correction_scope: CorrectivePlanScopeItem[];
      predecessor_plan_status: string;
      predecessor_corrective_delivery_id: string;
      delivery_status: string;
      source_corrective_package_id: string;
      source_corrective_replay_key: string;
      source_corrective_package_fingerprint: string;
      case_status: string;
    }>(
      `select triage.retriage_id,triage.reopen_id,triage.regression_check_id,
              triage.case_id,triage.target,triage.status as retriage_status,
              triage.resolution_intent,
              regression.verification_fingerprint as source_regression_fingerprint,
              regression.record_results,
              predecessor.plan_id as predecessor_plan_id,
              predecessor.correction_scope,
              predecessor.status as predecessor_plan_status,
              delivery.delivery_id as predecessor_corrective_delivery_id,
              delivery.status as delivery_status,
              delivery.corrective_package_id as source_corrective_package_id,
              delivery.corrective_replay_key as source_corrective_replay_key,
              delivery.corrective_package_fingerprint as source_corrective_package_fingerprint,
              c.status as case_status
       from app.workspace_reopened_exception_triage_cycles triage
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=triage.workspace_id
        and regression.regression_check_id=triage.regression_check_id
       join app.workspace_corrective_delivery_plans predecessor
         on predecessor.workspace_id=triage.workspace_id
        and predecessor.plan_id=regression.plan_id
       join app.workspace_corrective_live_deliveries delivery
         on delivery.workspace_id=triage.workspace_id
        and delivery.delivery_id=regression.corrective_delivery_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=triage.workspace_id and c.case_id=triage.case_id
       where triage.workspace_id=$1 and triage.retriage_id=$2
       limit 1`,
      [input.workspaceId, input.retriageId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("successor_plan_retriage_not_found");
    if (row.case_status !== "open") throw new Error("successor_plan_open_case_required");
    if (!["open","planned"].includes(row.retriage_status)) {
      throw new Error("successor_plan_retriage_unavailable");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("successor_plan_intent_required");
    }
    if (row.predecessor_plan_status !== "approved" || row.delivery_status !== "accepted") {
      throw new Error("successor_plan_predecessor_not_accepted");
    }

    const scope = buildSuccessorCorrectivePlanScope(
      Array.isArray(row.correction_scope) ? row.correction_scope : [],
      Array.isArray(row.record_results) ? row.record_results : []
    );
    if (!scope.length) throw new Error("successor_plan_scope_empty");

    const planFingerprint = successorCorrectivePlanFingerprint({
      retriageId: row.retriage_id,
      reopenId: row.reopen_id,
      regressionCheckId: row.regression_check_id,
      predecessorPlanId: row.predecessor_plan_id,
      predecessorCorrectiveDeliveryId: row.predecessor_corrective_delivery_id,
      sourceRegressionFingerprint: row.source_regression_fingerprint,
      sourceCorrectivePackageId: row.source_corrective_package_id,
      sourceCorrectiveReplayKey: row.source_corrective_replay_key,
      sourceCorrectivePackageFingerprint: row.source_corrective_package_fingerprint,
      correctionScope: scope,
      rationale
    });

    const existing = await client.query<{ successor_plan_id: string }>(
      `select successor_plan_id
       from app.workspace_successor_corrective_delivery_plans
       where workspace_id=$1 and retriage_id=$2 and plan_fingerprint=$3
       limit 1`,
      [input.workspaceId, input.retriageId, planFingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].successor_plan_id;

    const successorPlanId = randomUUID();
    await client.query(
      `insert into app.workspace_successor_corrective_delivery_plans (
        workspace_id,successor_plan_id,retriage_id,reopen_id,regression_check_id,
        case_id,target,status,predecessor_plan_id,predecessor_corrective_delivery_id,
        source_regression_fingerprint,source_corrective_package_id,
        source_corrective_replay_key,source_corrective_package_fingerprint,
        correction_scope,plan_fingerprint,rationale,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,'proposed',$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17
      )`,
      [
        input.workspaceId,
        successorPlanId,
        row.retriage_id,
        row.reopen_id,
        row.regression_check_id,
        row.case_id,
        row.target,
        row.predecessor_plan_id,
        row.predecessor_corrective_delivery_id,
        row.source_regression_fingerprint,
        row.source_corrective_package_id,
        row.source_corrective_replay_key,
        row.source_corrective_package_fingerprint,
        JSON.stringify(scope),
        planFingerprint,
        rationale,
        userId
      ]
    );
    await client.query(
      `update app.workspace_reopened_exception_triage_cycles
       set status='planned',updated_by=$3,updated_at=now()
       where workspace_id=$1 and retriage_id=$2 and status='open'`,
      [input.workspaceId, input.retriageId, userId]
    );
    return successorPlanId;
  });
}

export async function reviewSuccessorCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    successorPlanId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const current = await client.query<{ retriage_id: string; status: SuccessorPlanStatus }>(
      `select retriage_id,status
       from app.workspace_successor_corrective_delivery_plans
       where workspace_id=$1 and successor_plan_id=$2
       limit 1`,
      [input.workspaceId, input.successorPlanId]
    );
    const row = current.rows[0];
    if (!row) throw new Error("successor_plan_not_found");
    if (row.status !== "proposed") throw new Error("successor_plan_not_proposed");

    await client.query(
      `update app.workspace_successor_corrective_delivery_plans
       set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5
       where workspace_id=$1 and successor_plan_id=$2 and status='proposed'`,
      [
        input.workspaceId,
        input.successorPlanId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );
    await client.query(
      `update app.workspace_reopened_exception_triage_cycles
       set status=$3,updated_by=$4,updated_at=now()
       where workspace_id=$1 and retriage_id=$2 and status<>'dismissed'`,
      [
        input.workspaceId,
        row.retriage_id,
        input.decision === "approved" ? "approved" : "open",
        userId
      ]
    );
  });
}
