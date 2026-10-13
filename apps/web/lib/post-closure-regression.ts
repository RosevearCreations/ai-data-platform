import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  buildCorrectiveExecutionPackage,
  type CorrectiveLiveDelivery
} from "./corrective-delivery-execution";
import {
  listCorrectiveClosureForUser,
  type CorrectiveClosureModel,
  type ReconciliationExceptionClosure
} from "./corrective-delivery-reconciliation";
import {
  compareConsumerState,
  loadAcceptedDeliveryReconciliationContext,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";
import type { CorrectiveDeliveryPlan } from "./reconciliation-exception-triage";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type PostClosureRegressionStatus =
  | "stable"
  | "regressed"
  | "rejected"
  | "transport-error";

export interface PostClosureRegressionCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  regressionCheckId: string;
  closureId: string;
  caseId: string;
  planId: string;
  correctiveDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  closureFingerprint: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
  status: PostClosureRegressionStatus;
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

export interface ReconciliationExceptionReopen {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reopenId: string;
  closureId: string;
  regressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  closureFingerprint: string;
  regressionFingerprint: string;
  reopenFingerprint: string;
  reopenReason: string;
  reopenedBy: string;
  reopenedAt: string;
  canManage: boolean;
}

export interface PostClosureRegressionModel {
  closure: CorrectiveClosureModel;
  checks: PostClosureRegressionCheck[];
  reopens: ReconciliationExceptionReopen[];
  totals: {
    closedExceptions: number;
    neverChecked: number;
    stableLatest: number;
    regressedLatest: number;
    checkErrors: number;
    reopened: number;
  };
}

export interface PostClosureRegressionContext {
  closure: ReconciliationExceptionClosure;
  delivery: CorrectiveLiveDelivery;
  plan: CorrectiveDeliveryPlan;
  package: IntegrationPackageV1;
}

type RegressionRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  regression_check_id: string;
  closure_id: string;
  case_id: string;
  plan_id: string;
  corrective_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  closure_fingerprint: string;
  corrective_package_id: string;
  corrective_replay_key: string;
  corrective_package_fingerprint: string;
  status: PostClosureRegressionStatus;
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

type ReopenRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  reopen_id: string;
  closure_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  closure_fingerprint: string;
  regression_fingerprint: string;
  reopen_fingerprint: string;
  reopen_reason: string;
  reopened_by: string;
  reopened_at: Date;
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
    throw new Error("post_closure_regression_manager_required");
  }
  return role;
}

export function postClosureReopenConfirmation(target: IntegrationTarget) {
  return "REOPEN REGRESSED " + target.toUpperCase() + " EXCEPTION";
}

export function postClosureRegressionErrorFingerprint(input: {
  closureId: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-closure-verify1-", input);
}

export function postClosureReopenFingerprint(input: {
  closureId: string;
  regressionCheckId: string;
  caseId: string;
  closureFingerprint: string;
  regressionFingerprint: string;
  reopenReason: string;
}) {
  return fingerprint("exception-reopen1-", input);
}

function regressionFromRow(
  row: RegressionRow,
  role: WorkspaceRole
): PostClosureRegressionCheck {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    regressionCheckId: row.regression_check_id,
    closureId: row.closure_id,
    caseId: row.case_id,
    planId: row.plan_id,
    correctiveDeliveryId: row.corrective_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    closureFingerprint: row.closure_fingerprint,
    correctivePackageId: row.corrective_package_id,
    correctiveReplayKey: row.corrective_replay_key,
    correctivePackageFingerprint: row.corrective_package_fingerprint,
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
    canManage: role === "owner" || role === "admin"
  };
}

function reopenFromRow(
  row: ReopenRow,
  role: WorkspaceRole
): ReconciliationExceptionReopen {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    reopenId: row.reopen_id,
    closureId: row.closure_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    closureFingerprint: row.closure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    reopenFingerprint: row.reopen_fingerprint,
    reopenReason: row.reopen_reason,
    reopenedBy: row.reopened_by,
    reopenedAt: row.reopened_at.toISOString(),
    canManage: role === "owner" || role === "admin"
  };
}

export async function listPostClosureRegressionForUser(
  userId: string
): Promise<PostClosureRegressionModel> {
  const closure = await listCorrectiveClosureForUser(userId);
  const roles = new Map(
    closure.corrective.triage.reconciliation.live.bridge.workspaces.map(
      (workspace) => [workspace.id, workspace.role]
    )
  );
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<RegressionRow>(
      `select r.*,w.name as workspace_name
       from app.workspace_post_closure_regression_checks r
       join app.workspaces w on w.id=r.workspace_id
       order by r.created_at desc,r.regression_check_id desc
       limit 500`
    );
    const reopens = await client.query<ReopenRow>(
      `select r.*,w.name as workspace_name
       from app.workspace_reconciliation_exception_reopens r
       join app.workspaces w on w.id=r.workspace_id
       order by r.reopened_at desc,r.reopen_id desc
       limit 500`
    );
    return { checks: checks.rows, reopens: reopens.rows };
  });

  const checks = data.checks.map((row) =>
    regressionFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const reopens = data.reopens.map((row) =>
    reopenFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const latestByClosure = new Map<string, PostClosureRegressionCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.closureId;
    if (!latestByClosure.has(key)) latestByClosure.set(key, item);
  }

  return {
    closure,
    checks,
    reopens,
    totals: {
      closedExceptions: closure.closures.length,
      neverChecked: closure.closures.filter(
        (item) => !latestByClosure.has(item.workspaceId + ":" + item.closureId)
      ).length,
      stableLatest: [...latestByClosure.values()].filter(
        (item) => item.status === "stable"
      ).length,
      regressedLatest: [...latestByClosure.values()].filter(
        (item) => item.status === "regressed"
      ).length,
      checkErrors: [...latestByClosure.values()].filter(
        (item) => item.status === "rejected" || item.status === "transport-error"
      ).length,
      reopened: reopens.length
    }
  };
}

export async function loadPostClosureRegressionContext(
  userId: string,
  input: { workspaceId: string; closureId: string }
): Promise<PostClosureRegressionContext> {
  const model = await listCorrectiveClosureForUser(userId);
  const closure = model.closures.find(
    (item) =>
      item.workspaceId === input.workspaceId && item.closureId === input.closureId
  );
  if (!closure) throw new Error("post_closure_regression_closure_not_found");

  const triage = model.corrective.triage;
  const exceptionCase = triage.cases.find(
    (item) =>
      item.workspaceId === input.workspaceId && item.caseId === closure.caseId
  );
  if (!exceptionCase || exceptionCase.status !== "closed") {
    throw new Error("post_closure_regression_closed_case_required");
  }

  const delivery = model.corrective.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === closure.correctiveDeliveryId
  );
  if (!delivery || delivery.status !== "accepted") {
    throw new Error("post_closure_regression_accepted_delivery_required");
  }

  const plan = triage.plans.find(
    (item) =>
      item.workspaceId === input.workspaceId && item.planId === closure.planId
  );
  if (!plan || plan.status !== "approved") {
    throw new Error("post_closure_regression_approved_plan_required");
  }

  const source = await loadAcceptedDeliveryReconciliationContext(userId, {
    workspaceId: input.workspaceId,
    deliveryId: delivery.sourceDeliveryId
  });
  const integrationPackage = buildCorrectiveExecutionPackage(plan, source.package);
  if (
    integrationPackage.packageId !== delivery.correctivePackageId ||
    integrationPackage.replayKey !== delivery.correctiveReplayKey ||
    integrationPackage.fingerprint !== delivery.correctivePackageFingerprint ||
    closure.planFingerprint !== plan.planFingerprint ||
    closure.correctivePackageFingerprint !== integrationPackage.fingerprint
  ) {
    throw new Error("post_closure_regression_identity_mismatch");
  }

  return { closure, delivery, plan, package: integrationPackage };
}

export function comparePostClosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison = compareConsumerState(integrationPackage, response);
  const status: PostClosureRegressionStatus =
    comparison.status === "matched"
      ? "stable"
      : comparison.status === "drift"
        ? "regressed"
        : comparison.status;
  return { ...comparison, status };
}

export async function recordPostClosureRegressionCheck(
  userId: string,
  input: {
    workspaceId: string;
    context: PostClosureRegressionContext;
    status: PostClosureRegressionStatus;
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
    const { closure, delivery, plan } = input.context;
    const current = await client.query<{
      case_status: string;
      delivery_status: string;
      plan_status: string;
      closure_fingerprint: string;
    }>(
      `select c.status as case_status,d.status as delivery_status,
              p.status as plan_status,closure.closure_fingerprint
       from app.workspace_reconciliation_exception_closures closure
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=closure.workspace_id and c.case_id=closure.case_id
       join app.workspace_corrective_live_deliveries d
         on d.workspace_id=closure.workspace_id
        and d.delivery_id=closure.corrective_delivery_id
       join app.workspace_corrective_delivery_plans p
         on p.workspace_id=closure.workspace_id and p.plan_id=closure.plan_id
       where closure.workspace_id=$1 and closure.closure_id=$2
       limit 1`,
      [input.workspaceId, closure.closureId]
    );
    const row = current.rows[0];
    if (!row || row.case_status !== "closed") {
      throw new Error("post_closure_regression_closed_case_required");
    }
    if (row.delivery_status !== "accepted" || row.plan_status !== "approved") {
      throw new Error("post_closure_regression_context_stale");
    }
    if (row.closure_fingerprint !== closure.closureFingerprint) {
      throw new Error("post_closure_regression_identity_mismatch");
    }

    const regressionCheckId = randomUUID();
    await client.query(
      `insert into app.workspace_post_closure_regression_checks (
        workspace_id,regression_check_id,closure_id,case_id,plan_id,
        corrective_delivery_id,target,consumer_id,closure_fingerprint,
        corrective_package_id,corrective_replay_key,
        corrective_package_fingerprint,status,expected_record_count,
        matched_count,mismatched_count,missing_count,validation_code,
        http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22::jsonb,$23,now()
      )`,
      [
        input.workspaceId,
        regressionCheckId,
        closure.closureId,
        closure.caseId,
        closure.planId,
        delivery.deliveryId,
        delivery.target,
        delivery.consumerId,
        closure.closureFingerprint,
        delivery.correctivePackageId,
        delivery.correctiveReplayKey,
        delivery.correctivePackageFingerprint,
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

export async function reopenRegressedException(
  userId: string,
  input: {
    workspaceId: string;
    closureId: string;
    regressionCheckId: string;
    reopenReason: string;
  }
) {
  const reopenReason = input.reopenReason.trim().slice(0, 8000);
  if (!reopenReason) throw new Error("post_closure_reopen_reason_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ reopen_id: string }>(
      `select reopen_id
       from app.workspace_reconciliation_exception_reopens
       where workspace_id=$1 and closure_id=$2
       limit 1`,
      [input.workspaceId, input.closureId]
    );
    if (existing.rows[0]) return existing.rows[0].reopen_id;

    const result = await client.query<{
      regression_check_id: string;
      closure_id: string;
      case_id: string;
      target: IntegrationTarget;
      status: PostClosureRegressionStatus;
      closure_fingerprint: string;
      verification_fingerprint: string;
      case_status: string;
      latest_regression_check_id: string;
    }>(
      `select regression.regression_check_id,regression.closure_id,
              regression.case_id,regression.target,regression.status,
              regression.closure_fingerprint,regression.verification_fingerprint,
              c.status as case_status,
              (
                select newest.regression_check_id
                from app.workspace_post_closure_regression_checks newest
                where newest.workspace_id=regression.workspace_id
                  and newest.closure_id=regression.closure_id
                order by newest.created_at desc,newest.regression_check_id desc
                limit 1
              ) as latest_regression_check_id
       from app.workspace_post_closure_regression_checks regression
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=regression.workspace_id
        and c.case_id=regression.case_id
       where regression.workspace_id=$1
         and regression.closure_id=$2
         and regression.regression_check_id=$3
       limit 1`,
      [input.workspaceId, input.closureId, input.regressionCheckId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("post_closure_reopen_regression_not_found");
    if (row.status !== "regressed" || row.case_status !== "closed") {
      throw new Error("post_closure_reopen_regressed_closed_required");
    }
    if (row.latest_regression_check_id !== row.regression_check_id) {
      throw new Error("post_closure_reopen_latest_regression_required");
    }

    const reopenFingerprint = postClosureReopenFingerprint({
      closureId: row.closure_id,
      regressionCheckId: row.regression_check_id,
      caseId: row.case_id,
      closureFingerprint: row.closure_fingerprint,
      regressionFingerprint: row.verification_fingerprint,
      reopenReason
    });
    const reopenId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_exception_reopens (
        workspace_id,reopen_id,closure_id,regression_check_id,case_id,target,
        closure_fingerprint,regression_fingerprint,reopen_fingerprint,
        reopen_reason,reopened_by,reopened_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())`,
      [
        input.workspaceId,
        reopenId,
        row.closure_id,
        row.regression_check_id,
        row.case_id,
        row.target,
        row.closure_fingerprint,
        row.verification_fingerprint,
        reopenFingerprint,
        reopenReason,
        userId
      ]
    );

    const updated = await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',
           closed_by=null,
           closed_at=null,
           updated_by=$3,
           updated_at=now(),
           investigation_note=left(
             case
               when investigation_note='' then $4
               else investigation_note || E'\\n\\nBuild 056 governed reopen: ' || $4
             end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId, row.case_id, userId, reopenReason]
    );
    if (!updated.rowCount) {
      throw new Error("post_closure_reopen_closed_case_required");
    }

    return reopenId;
  });
}
