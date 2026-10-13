import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import type {
  IntegrationPackageV1,
  IntegrationScalar,
  IntegrationTarget
} from "./integration-delivery";
import {
  listPostDeliveryReconciliationForUser,
  loadAcceptedDeliveryReconciliationContext,
  type PostDeliveryReconciliationModel,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type ExceptionClassification =
  | "consumer-drift"
  | "consumer-missing"
  | "expected-change"
  | "source-superseded"
  | "mixed"
  | "unknown";

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionResolutionIntent =
  | "investigate"
  | "accept-drift"
  | "plan-correction"
  | "no-action";
export type ExceptionCaseStatus =
  | "open"
  | "planned"
  | "approved"
  | "closed"
  | "dismissed";

export interface ReconciliationExceptionCase {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  caseId: string;
  reconciliationId: string;
  deliveryId: string;
  target: IntegrationTarget;
  status: ExceptionCaseStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
  investigationNote: string;
  reconciliationFingerprint: string;
  packageId: string;
  packageFingerprint: string;
  affectedRecordCount: number;
  affectedIntegrationKeys: string[];
  affectedFields: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  canManage: boolean;
}

export type CorrectivePlanAction =
  | "update-existing"
  | "restore-missing"
  | "manual-review";

export interface CorrectivePlanScopeItem {
  integrationKey: string;
  issueStatus: "mismatched" | "missing";
  proposedAction: CorrectivePlanAction;
  desiredValues: Record<string, IntegrationScalar>;
  governedFields: string[];
  expectedFingerprint: string;
  observedFingerprint: string | null;
}

export interface CorrectiveDeliveryPlan {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  planId: string;
  caseId: string;
  reconciliationId: string;
  deliveryId: string;
  target: IntegrationTarget;
  status: "proposed" | "approved" | "rejected" | "withdrawn";
  reconciliationFingerprint: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
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

export interface ReconciliationExceptionTriageModel {
  reconciliation: PostDeliveryReconciliationModel;
  cases: ReconciliationExceptionCase[];
  plans: CorrectiveDeliveryPlan[];
  totals: {
    driftWithoutCase: number;
    openCases: number;
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
  return (
    prefix +
    createHash("sha256")
      .update(JSON.stringify(canonical(value)))
      .digest("hex")
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
    throw new Error("reconciliation_triage_manager_required");
  }
  return role;
}

export function buildCorrectivePlanScope(
  integrationPackage: IntegrationPackageV1,
  recordResults: ReconciliationRecordResult[]
): CorrectivePlanScopeItem[] {
  const byKey = new Map(
    integrationPackage.operations.map((operation) => [
      operation.integrationKey,
      operation
    ])
  );

  return recordResults
    .filter(
      (record): record is ReconciliationRecordResult & {
        status: "mismatched" | "missing";
      } => record.status === "mismatched" || record.status === "missing"
    )
    .map((record) => {
      const operation = byKey.get(record.integrationKey);
      if (!operation) {
        throw new Error("corrective_plan_operation_missing");
      }

      const governedFields =
        record.status === "missing"
          ? Object.keys(operation.values).sort()
          : [...record.differingFields].sort();
      if (!governedFields.length) {
        throw new Error("corrective_plan_scope_empty");
      }

      const desiredValues = Object.fromEntries(
        governedFields.map((field) => {
          if (!Object.prototype.hasOwnProperty.call(operation.values, field)) {
            throw new Error("corrective_plan_field_not_governed");
          }
          return [field, operation.values[field]];
        })
      ) as Record<string, IntegrationScalar>;

      const proposedAction: CorrectivePlanAction =
        record.status === "mismatched"
          ? "update-existing"
          : operation.action === "create"
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
      };
    })
    .sort((left, right) =>
      left.integrationKey.localeCompare(right.integrationKey)
    );
}

export function correctivePlanFingerprint(input: {
  reconciliationFingerprint: string;
  packageId: string;
  replayKey: string;
  packageFingerprint: string;
  correctionScope: CorrectivePlanScopeItem[];
  rationale: string;
}) {
  return fingerprint("plan1-", input);
}

type CaseRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  case_id: string;
  reconciliation_id: string;
  delivery_id: string;
  target: IntegrationTarget;
  status: ExceptionCaseStatus;
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolution_intent: ExceptionResolutionIntent;
  summary: string;
  investigation_note: string;
  reconciliation_fingerprint: string;
  package_id: string;
  package_fingerprint: string;
  affected_record_count: string | number;
  affected_integration_keys: string[];
  affected_fields: string[];
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
  closed_by: string | null;
  closed_at: Date | null;
};

type PlanRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  plan_id: string;
  case_id: string;
  reconciliation_id: string;
  delivery_id: string;
  target: IntegrationTarget;
  status: "proposed" | "approved" | "rejected" | "withdrawn";
  reconciliation_fingerprint: string;
  package_id: string;
  replay_key: string;
  package_fingerprint: string;
  correction_scope: CorrectivePlanScopeItem[];
  plan_fingerprint: string;
  rationale: string;
  created_by: string;
  created_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_note: string;
};

function caseFromRow(row: CaseRow, role: WorkspaceRole) {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    caseId: row.case_id,
    reconciliationId: row.reconciliation_id,
    deliveryId: row.delivery_id,
    target: row.target,
    status: row.status,
    classification: row.classification,
    severity: row.severity,
    resolutionIntent: row.resolution_intent,
    summary: row.summary,
    investigationNote: row.investigation_note,
    reconciliationFingerprint: row.reconciliation_fingerprint,
    packageId: row.package_id,
    packageFingerprint: row.package_fingerprint,
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
    closedBy: row.closed_by,
    closedAt: row.closed_at?.toISOString() ?? null,
    canManage: role === "owner" || role === "admin"
  } satisfies ReconciliationExceptionCase;
}

function planFromRow(row: PlanRow, role: WorkspaceRole) {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    planId: row.plan_id,
    caseId: row.case_id,
    reconciliationId: row.reconciliation_id,
    deliveryId: row.delivery_id,
    target: row.target,
    status: row.status,
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
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    reviewNote: row.review_note,
    canManage: role === "owner" || role === "admin"
  } satisfies CorrectiveDeliveryPlan;
}

export async function listReconciliationExceptionTriageForUser(
  userId: string
): Promise<ReconciliationExceptionTriageModel> {
  const reconciliation = await listPostDeliveryReconciliationForUser(userId);
  const roles = new Map(
    reconciliation.live.bridge.workspaces.map((workspace) => [
      workspace.id,
      workspace.role
    ])
  );

  const data = await withUserDatabase(userId, async (client) => {
    const cases = await client.query<CaseRow>(
      `select c.*,w.name as workspace_name
       from app.workspace_reconciliation_exception_cases c
       join app.workspaces w on w.id=c.workspace_id
       order by c.updated_at desc
       limit 500`
    );
    const plans = await client.query<PlanRow>(
      `select p.*,w.name as workspace_name
       from app.workspace_corrective_delivery_plans p
       join app.workspaces w on w.id=p.workspace_id
       order by p.created_at desc
       limit 500`
    );
    return { cases: cases.rows, plans: plans.rows };
  });

  const cases = data.cases.map((row) =>
    caseFromRow(row, (roles.get(row.workspace_id) ?? "member") as WorkspaceRole)
  );
  const plans = data.plans.map((row) =>
    planFromRow(row, (roles.get(row.workspace_id) ?? "member") as WorkspaceRole)
  );
  const caseKeys = new Set(
    cases.map((item) => item.workspaceId + ":" + item.reconciliationId)
  );

  return {
    reconciliation,
    cases,
    plans,
    totals: {
      driftWithoutCase: reconciliation.reconciliations.filter(
        (item) =>
          item.status === "drift" &&
          !caseKeys.has(item.workspaceId + ":" + item.reconciliationId)
      ).length,
      openCases: cases.filter((item) =>
        ["open", "planned", "approved"].includes(item.status)
      ).length,
      proposedPlans: plans.filter((item) => item.status === "proposed").length,
      approvedPlans: plans.filter((item) => item.status === "approved").length
    }
  };
}

export async function createReconciliationExceptionCase(
  userId: string,
  input: {
    workspaceId: string;
    reconciliationId: string;
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query<{
      reconciliation_id: string;
      delivery_id: string;
      target: IntegrationTarget;
      status: string;
      verification_fingerprint: string;
      package_id: string;
      package_fingerprint: string;
      record_results: ReconciliationRecordResult[];
    }>(
      `select reconciliation_id,delivery_id,target,status,verification_fingerprint,
              package_id,package_fingerprint,record_results
       from app.workspace_live_delivery_reconciliations
       where workspace_id=$1 and reconciliation_id=$2
       limit 1`,
      [input.workspaceId, input.reconciliationId]
    );
    const reconciliation = result.rows[0];
    if (!reconciliation) {
      throw new Error("reconciliation_triage_reconciliation_not_found");
    }
    if (reconciliation.status !== "drift") {
      throw new Error("reconciliation_triage_drift_required");
    }

    const affected = (reconciliation.record_results ?? []).filter(
      (record) => record.status === "mismatched" || record.status === "missing"
    );
    if (!affected.length) {
      throw new Error("reconciliation_triage_no_exception_records");
    }
    const keys = [...new Set(affected.map((record) => record.integrationKey))].sort();
    const fields = [
      ...new Set(affected.flatMap((record) => record.differingFields))
    ].sort();
    if (!fields.length && affected.some((record) => record.status === "missing")) {
      fields.push("*missing-record*");
    }

    const existing = await client.query<{ case_id: string }>(
      `select case_id
       from app.workspace_reconciliation_exception_cases
       where workspace_id=$1 and reconciliation_id=$2
       limit 1`,
      [input.workspaceId, input.reconciliationId]
    );
    if (existing.rows[0]) return existing.rows[0].case_id;

    const caseId = randomUUID();
    await client.query(
      `insert into app.workspace_reconciliation_exception_cases (
        workspace_id,case_id,reconciliation_id,delivery_id,target,status,
        classification,severity,resolution_intent,summary,investigation_note,
        reconciliation_fingerprint,package_id,package_fingerprint,
        affected_record_count,affected_integration_keys,affected_fields,
        created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,'open',$6,$7,$8,$9,'',$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$16
      )`,
      [
        input.workspaceId,
        caseId,
        input.reconciliationId,
        reconciliation.delivery_id,
        reconciliation.target,
        input.classification,
        input.severity,
        input.resolutionIntent,
        input.summary.trim().slice(0, 4000),
        reconciliation.verification_fingerprint,
        reconciliation.package_id,
        reconciliation.package_fingerprint,
        keys.length,
        JSON.stringify(keys),
        JSON.stringify(fields),
        userId
      ]
    );
    return caseId;
  });
}

export async function updateReconciliationExceptionCase(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    status: ExceptionCaseStatus;
    classification: ExceptionClassification;
    severity: ExceptionSeverity;
    resolutionIntent: ExceptionResolutionIntent;
    summary: string;
    investigationNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const closing = input.status === "closed" || input.status === "dismissed";
    const result = await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status=$3,
           classification=$4,
           severity=$5,
           resolution_intent=$6,
           summary=$7,
           investigation_note=$8,
           updated_by=$9,
           updated_at=now(),
           closed_by=case when $10 then $9 else null end,
           closed_at=case when $10 then now() else null end
       where workspace_id=$1 and case_id=$2`,
      [
        input.workspaceId,
        input.caseId,
        input.status,
        input.classification,
        input.severity,
        input.resolutionIntent,
        input.summary.trim().slice(0, 4000),
        input.investigationNote.trim().slice(0, 8000),
        userId,
        closing
      ]
    );
    if (!result.rowCount) {
      throw new Error("reconciliation_triage_case_not_found");
    }
  });
}

export async function createCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    rationale: string;
  }
) {
  const caseData = await withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const result = await client.query<{
      case_id: string;
      reconciliation_id: string;
      delivery_id: string;
      target: IntegrationTarget;
      status: ExceptionCaseStatus;
      resolution_intent: ExceptionResolutionIntent;
      reconciliation_fingerprint: string;
      record_results: ReconciliationRecordResult[];
      reconciliation_status: string;
    }>(
      `select c.case_id,c.reconciliation_id,c.delivery_id,c.target,c.status,
              c.resolution_intent,c.reconciliation_fingerprint,
              r.record_results,r.status as reconciliation_status
       from app.workspace_reconciliation_exception_cases c
       join app.workspace_live_delivery_reconciliations r
         on r.workspace_id=c.workspace_id
        and r.reconciliation_id=c.reconciliation_id
       where c.workspace_id=$1 and c.case_id=$2
       limit 1`,
      [input.workspaceId, input.caseId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("corrective_plan_case_not_found");
    if (row.reconciliation_status !== "drift") {
      throw new Error("corrective_plan_drift_required");
    }
    if (row.resolution_intent !== "plan-correction") {
      throw new Error("corrective_plan_intent_required");
    }
    if (row.status === "closed" || row.status === "dismissed") {
      throw new Error("corrective_plan_case_closed");
    }
    return row;
  });

  const context = await loadAcceptedDeliveryReconciliationContext(userId, {
    workspaceId: input.workspaceId,
    deliveryId: caseData.delivery_id
  });
  const scope = buildCorrectivePlanScope(
    context.package,
    caseData.record_results ?? []
  );
  if (!scope.length) throw new Error("corrective_plan_scope_empty");

  const rationale = input.rationale.trim().slice(0, 8000);
  if (!rationale) throw new Error("corrective_plan_rationale_required");
  const planFingerprint = correctivePlanFingerprint({
    reconciliationFingerprint: caseData.reconciliation_fingerprint,
    packageId: context.package.packageId,
    replayKey: context.package.replayKey,
    packageFingerprint: context.package.fingerprint,
    correctionScope: scope,
    rationale
  });

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const existing = await client.query<{ plan_id: string }>(
      `select plan_id
       from app.workspace_corrective_delivery_plans
       where workspace_id=$1 and case_id=$2 and plan_fingerprint=$3
       limit 1`,
      [input.workspaceId, input.caseId, planFingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].plan_id;

    const planId = randomUUID();
    await client.query(
      `insert into app.workspace_corrective_delivery_plans (
        workspace_id,plan_id,case_id,reconciliation_id,delivery_id,target,status,
        reconciliation_fingerprint,package_id,replay_key,package_fingerprint,
        correction_scope,plan_fingerprint,rationale,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,'proposed',$7,$8,$9,$10,$11::jsonb,$12,$13,$14
      )`,
      [
        input.workspaceId,
        planId,
        input.caseId,
        caseData.reconciliation_id,
        caseData.delivery_id,
        caseData.target,
        caseData.reconciliation_fingerprint,
        context.package.packageId,
        context.package.replayKey,
        context.package.fingerprint,
        JSON.stringify(scope),
        planFingerprint,
        rationale,
        userId
      ]
    );
    await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='planned',updated_by=$3,updated_at=now()
       where workspace_id=$1 and case_id=$2
         and status not in ('closed','dismissed')`,
      [input.workspaceId, input.caseId, userId]
    );
    return planId;
  });
}

export async function reviewCorrectiveDeliveryPlan(
  userId: string,
  input: {
    workspaceId: string;
    planId: string;
    decision: "approved" | "rejected" | "withdrawn";
    reviewNote: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);
    const plan = await client.query<{ case_id: string; status: string }>(
      `select case_id,status
       from app.workspace_corrective_delivery_plans
       where workspace_id=$1 and plan_id=$2
       limit 1`,
      [input.workspaceId, input.planId]
    );
    const row = plan.rows[0];
    if (!row) throw new Error("corrective_plan_not_found");
    if (row.status !== "proposed") {
      throw new Error("corrective_plan_not_proposed");
    }

    await client.query(
      `update app.workspace_corrective_delivery_plans
       set status=$3,reviewed_by=$4,reviewed_at=now(),review_note=$5
       where workspace_id=$1 and plan_id=$2 and status='proposed'`,
      [
        input.workspaceId,
        input.planId,
        input.decision,
        userId,
        input.reviewNote.trim().slice(0, 8000)
      ]
    );

    const caseStatus = input.decision === "approved" ? "approved" : "open";
    await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status=$3,updated_by=$4,updated_at=now()
       where workspace_id=$1 and case_id=$2
         and status not in ('closed','dismissed')`,
      [input.workspaceId, row.case_id, caseStatus, userId]
    );
  });
}
