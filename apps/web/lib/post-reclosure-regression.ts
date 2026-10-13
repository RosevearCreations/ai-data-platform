import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listSuccessorCorrectiveClosureForUser,
  type ReconciliationExceptionReclosure,
  type SuccessorCorrectiveClosureModel
} from "./successor-corrective-delivery-reconciliation";
import {
  loadApprovedSuccessorCorrectivePlanContext,
  type SuccessorCorrectiveExecutionContext,
  type SuccessorCorrectiveLiveDelivery
} from "./successor-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type PostReclosureRegressionStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostReclosureRegressionCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reclosureRegressionCheckId: string;
  reclosureId: string;
  caseId: string;
  successorPlanId: string;
  successorDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  reclosureFingerprint: string;
  successorPlanFingerprint: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
  status: PostReclosureRegressionStatus;
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

export interface ReconciliationExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  recurrenceId: string;
  reclosureId: string;
  reclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  reclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostReclosureRegressionModel {
  closure: SuccessorCorrectiveClosureModel;
  checks: PostReclosureRegressionCheck[];
  recurrences: ReconciliationExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostReclosureRegressionContext {
  reclosure: ReconciliationExceptionReclosure;
  delivery: SuccessorCorrectiveLiveDelivery;
  execution: SuccessorCorrectiveExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  reclosure_regression_check_id: string;
  reclosure_id: string;
  case_id: string;
  successor_plan_id: string;
  successor_delivery_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  reclosure_fingerprint: string;
  successor_plan_fingerprint: string;
  successor_package_id: string;
  successor_replay_key: string;
  successor_package_fingerprint: string;
  status: PostReclosureRegressionStatus;
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
  reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
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
    throw new Error("post_reclosure_manager_required");
  }
  return role;
}

export function recurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postReclosureErrorFingerprint(input: {
  reclosureId: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-reclosure1-", input);
}

export function recurrenceFingerprint(input: {
  reclosureId: string;
  reclosureRegressionCheckId: string;
  caseId: string;
  reclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostReclosureRegressionCheck {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    reclosureRegressionCheckId: row.reclosure_regression_check_id,
    reclosureId: row.reclosure_id,
    caseId: row.case_id,
    successorPlanId: row.successor_plan_id,
    successorDeliveryId: row.successor_delivery_id,
    target: row.target,
    consumerId: row.consumer_id,
    reclosureFingerprint: row.reclosure_fingerprint,
    successorPlanFingerprint: row.successor_plan_fingerprint,
    successorPackageId: row.successor_package_id,
    successorReplayKey: row.successor_replay_key,
    successorPackageFingerprint: row.successor_package_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): ReconciliationExceptionRecurrence {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    recurrenceId: row.recurrence_id,
    reclosureId: row.reclosure_id,
    reclosureRegressionCheckId: row.reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    reclosureFingerprint: row.reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    recurrenceFingerprint: row.recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason,
    recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostReclosureRegressionForUser(
  userId: string
): Promise<PostReclosureRegressionModel> {
  const closure = await listSuccessorCorrectiveClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_post_reclosure_regression_checks r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.reclosure_regression_check_id desc
       limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select recurrence.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_exception_recurrences recurrence
       join app.workspaces w on w.id=recurrence.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=recurrence.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by recurrence.recurred_at desc,recurrence.recurrence_id desc
       limit 500`
    );
    return { checks: checks.rows, recurrences: recurrences.rows };
  });

  const checks = data.checks.map(checkFromRow);
  const recurrences = data.recurrences.map(recurrenceFromRow);
  const latestByReclosure = new Map<string, PostReclosureRegressionCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.reclosureId;
    if (!latestByReclosure.has(key)) latestByReclosure.set(key, item);
  }

  return {
    closure,
    checks,
    recurrences,
    totals: {
      verifiedReclosures: closure.reclosures.length,
      neverChecked: closure.reclosures.filter(
        (item) => !latestByReclosure.has(item.workspaceId + ":" + item.reclosureId)
      ).length,
      stableLatest: [...latestByReclosure.values()].filter(
        (item) => item.status === "stable"
      ).length,
      recurredLatest: [...latestByReclosure.values()].filter(
        (item) => item.status === "recurred"
      ).length,
      verificationErrors: [...latestByReclosure.values()].filter(
        (item) => item.status === "rejected" || item.status === "transport-error"
      ).length,
      governedRecurrences: recurrences.length
    }
  };
}

export async function loadPostReclosureRegressionContext(
  userId: string,
  input: { workspaceId: string; reclosureId: string }
): Promise<PostReclosureRegressionContext> {
  const model = await listSuccessorCorrectiveClosureForUser(userId);
  const reclosure = model.reclosures.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.reclosureId === input.reclosureId
  );
  if (!reclosure) throw new Error("post_reclosure_reclosure_not_found");

  const delivery = model.successor.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === reclosure.successorDeliveryId
  );
  if (!delivery || delivery.status !== "accepted") {
    throw new Error("post_reclosure_accepted_delivery_required");
  }

  const gate = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      case_status: string;
      delivery_status: string;
      plan_status: string;
      reclosure_fingerprint: string;
      latest_reclosure_id: string;
      recurrence_id: string | null;
    }>(
      `select c.status as case_status,delivery.status as delivery_status,
              plan.status as plan_status,reclosure.reclosure_fingerprint,
              (
                select latest.reclosure_id
                from app.workspace_reconciliation_exception_reclosures latest
                where latest.workspace_id=reclosure.workspace_id
                  and latest.case_id=reclosure.case_id
                order by latest.closed_at desc,latest.reclosure_id desc
                limit 1
              ) as latest_reclosure_id,
              recurrence.recurrence_id
       from app.workspace_reconciliation_exception_reclosures reclosure
       join app.workspace_successor_corrective_live_deliveries delivery
         on delivery.workspace_id=reclosure.workspace_id
        and delivery.delivery_id=reclosure.successor_delivery_id
       join app.workspace_successor_corrective_delivery_plans plan
         on plan.workspace_id=reclosure.workspace_id
        and plan.successor_plan_id=reclosure.successor_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=reclosure.workspace_id and c.case_id=reclosure.case_id
       left join app.workspace_reconciliation_exception_recurrences recurrence
         on recurrence.workspace_id=reclosure.workspace_id
        and recurrence.reclosure_id=reclosure.reclosure_id
       where reclosure.workspace_id=$1 and reclosure.reclosure_id=$2
       limit 1`,
      [input.workspaceId, input.reclosureId]
    );
    return result.rows[0] ?? null;
  });
  if (!gate) throw new Error("post_reclosure_reclosure_not_found");
  if (gate.case_status !== "closed") {
    throw new Error("post_reclosure_closed_case_required");
  }
  if (gate.delivery_status !== "accepted" || gate.plan_status !== "approved") {
    throw new Error("post_reclosure_context_stale");
  }
  if (
    gate.reclosure_fingerprint !== reclosure.reclosureFingerprint ||
    gate.latest_reclosure_id !== reclosure.reclosureId
  ) {
    throw new Error("post_reclosure_identity_mismatch");
  }
  if (gate.recurrence_id) {
    throw new Error("post_reclosure_already_recurred");
  }

  const execution = await loadApprovedSuccessorCorrectivePlanContext(userId, {
    workspaceId: input.workspaceId,
    successorPlanId: reclosure.successorPlanId,
    allowClosedCase: true
  });
  if (
    execution.plan.planFingerprint !== reclosure.successorPlanFingerprint ||
    execution.successorPackage.fingerprint !== reclosure.successorPackageFingerprint ||
    execution.successorPackage.packageId !== delivery.successorPackageId ||
    execution.successorPackage.replayKey !== delivery.successorReplayKey ||
    execution.successorPackage.fingerprint !== delivery.successorPackageFingerprint ||
    execution.consumerId !== delivery.consumerId
  ) {
    throw new Error("post_reclosure_package_identity_mismatch");
  }

  return {
    reclosure,
    delivery,
    execution,
    package: execution.successorPackage
  };
}

export function comparePostReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison = compareConsumerState(integrationPackage, response);
  const status: PostReclosureRegressionStatus =
    comparison.status === "matched"
      ? "stable"
      : comparison.status === "drift"
        ? "recurred"
        : comparison.status;
  return { ...comparison, status };
}

export async function recordPostReclosureRegressionCheck(
  userId: string,
  input: {
    workspaceId: string;
    context: PostReclosureRegressionContext;
    status: PostReclosureRegressionStatus;
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
    }>(
      `select c.status as case_status,delivery.status as delivery_status,
              plan.status as plan_status,reclosure.reclosure_fingerprint,
              (
                select latest.reclosure_id
                from app.workspace_reconciliation_exception_reclosures latest
                where latest.workspace_id=reclosure.workspace_id
                  and latest.case_id=reclosure.case_id
                order by latest.closed_at desc,latest.reclosure_id desc
                limit 1
              ) as latest_reclosure_id,
              recurrence.recurrence_id
       from app.workspace_reconciliation_exception_reclosures reclosure
       join app.workspace_successor_corrective_live_deliveries delivery
         on delivery.workspace_id=reclosure.workspace_id
        and delivery.delivery_id=reclosure.successor_delivery_id
       join app.workspace_successor_corrective_delivery_plans plan
         on plan.workspace_id=reclosure.workspace_id
        and plan.successor_plan_id=reclosure.successor_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=reclosure.workspace_id and c.case_id=reclosure.case_id
       left join app.workspace_reconciliation_exception_recurrences recurrence
         on recurrence.workspace_id=reclosure.workspace_id
        and recurrence.reclosure_id=reclosure.reclosure_id
       where reclosure.workspace_id=$1 and reclosure.reclosure_id=$2
       limit 1`,
      [input.workspaceId, reclosure.reclosureId]
    );
    const row = current.rows[0];
    if (!row || row.case_status !== "closed") {
      throw new Error("post_reclosure_closed_case_required");
    }
    if (row.delivery_status !== "accepted" || row.plan_status !== "approved") {
      throw new Error("post_reclosure_context_stale");
    }
    if (
      row.reclosure_fingerprint !== reclosure.reclosureFingerprint ||
      row.latest_reclosure_id !== reclosure.reclosureId ||
      execution.plan.planFingerprint !== reclosure.successorPlanFingerprint ||
      input.context.package.packageId !== delivery.successorPackageId ||
      input.context.package.replayKey !== delivery.successorReplayKey ||
      input.context.package.fingerprint !== delivery.successorPackageFingerprint
    ) {
      throw new Error("post_reclosure_identity_mismatch");
    }
    if (row.recurrence_id) {
      throw new Error("post_reclosure_already_recurred");
    }

    const reclosureRegressionCheckId = randomUUID();
    await client.query(
      `insert into app.workspace_post_reclosure_regression_checks (
        workspace_id,reclosure_regression_check_id,reclosure_id,case_id,
        successor_plan_id,successor_delivery_id,target,consumer_id,
        reclosure_fingerprint,successor_plan_fingerprint,
        successor_package_id,successor_replay_key,successor_package_fingerprint,
        status,expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23::jsonb,$24,now()
      )`,
      [
        input.workspaceId,
        reclosureRegressionCheckId,
        reclosure.reclosureId,
        reclosure.caseId,
        reclosure.successorPlanId,
        reclosure.successorDeliveryId,
        reclosure.target,
        delivery.consumerId,
        reclosure.reclosureFingerprint,
        reclosure.successorPlanFingerprint,
        delivery.successorPackageId,
        delivery.successorReplayKey,
        delivery.successorPackageFingerprint,
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
    return reclosureRegressionCheckId;
  });
}

export async function recurVerifiedReclosedException(
  userId: string,
  input: {
    workspaceId: string;
    reclosureId: string;
    reclosureRegressionCheckId: string;
    recurrenceReason: string;
  }
) {
  const recurrenceReason = input.recurrenceReason.trim().slice(0, 8000);
  if (!recurrenceReason) throw new Error("post_reclosure_recurrence_reason_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ recurrence_id: string }>(
      `select recurrence_id
       from app.workspace_reconciliation_exception_recurrences
       where workspace_id=$1 and reclosure_id=$2
       limit 1`,
      [input.workspaceId, input.reclosureId]
    );
    if (existing.rows[0]) return existing.rows[0].recurrence_id;

    const result = await client.query<{
      reclosure_regression_check_id: string;
      reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      status: PostReclosureRegressionStatus;
      reclosure_fingerprint: string;
      verification_fingerprint: string;
      case_status: string;
      latest_check_id: string;
      latest_reclosure_id: string;
    }>(
      `select regression.reclosure_regression_check_id,regression.reclosure_id,
              regression.case_id,regression.target,regression.status,
              regression.reclosure_fingerprint,regression.verification_fingerprint,
              c.status as case_status,
              (
                select newest.reclosure_regression_check_id
                from app.workspace_post_reclosure_regression_checks newest
                where newest.workspace_id=regression.workspace_id
                  and newest.reclosure_id=regression.reclosure_id
                order by newest.created_at desc,newest.reclosure_regression_check_id desc
                limit 1
              ) as latest_check_id,
              (
                select latest_reclosure.reclosure_id
                from app.workspace_reconciliation_exception_reclosures latest_reclosure
                where latest_reclosure.workspace_id=regression.workspace_id
                  and latest_reclosure.case_id=regression.case_id
                order by latest_reclosure.closed_at desc,latest_reclosure.reclosure_id desc
                limit 1
              ) as latest_reclosure_id
       from app.workspace_post_reclosure_regression_checks regression
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=regression.workspace_id and c.case_id=regression.case_id
       where regression.workspace_id=$1
         and regression.reclosure_id=$2
         and regression.reclosure_regression_check_id=$3
       limit 1`,
      [
        input.workspaceId,
        input.reclosureId,
        input.reclosureRegressionCheckId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("post_reclosure_recurrence_check_not_found");
    if (row.status !== "recurred" || row.case_status !== "closed") {
      throw new Error("post_reclosure_recurrence_recurred_closed_required");
    }
    if (row.latest_check_id !== row.reclosure_regression_check_id) {
      throw new Error("post_reclosure_recurrence_latest_check_required");
    }
    if (row.latest_reclosure_id !== row.reclosure_id) {
      throw new Error("post_reclosure_recurrence_latest_reclosure_required");
    }

    const recurrenceId = randomUUID();
    const governedFingerprint = recurrenceFingerprint({
      reclosureId: row.reclosure_id,
      reclosureRegressionCheckId: row.reclosure_regression_check_id,
      caseId: row.case_id,
      reclosureFingerprint: row.reclosure_fingerprint,
      regressionFingerprint: row.verification_fingerprint,
      recurrenceReason
    });

    await client.query(
      `insert into app.workspace_reconciliation_exception_recurrences (
        workspace_id,recurrence_id,reclosure_id,reclosure_regression_check_id,
        case_id,target,reclosure_fingerprint,regression_fingerprint,
        recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())`,
      [
        input.workspaceId,
        recurrenceId,
        row.reclosure_id,
        row.reclosure_regression_check_id,
        row.case_id,
        row.target,
        row.reclosure_fingerprint,
        row.verification_fingerprint,
        governedFingerprint,
        recurrenceReason,
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
               else investigation_note || E'\\n\\nBuild 060 governed recurrence: ' || $4
             end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId, row.case_id, userId, recurrenceReason]
    );
    if (!updated.rowCount) {
      throw new Error("post_reclosure_recurrence_closed_case_required");
    }

    return recurrenceId;
  });
}
