import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listSuccessorCorrectiveDeliveryForUser,
  loadApprovedSuccessorCorrectivePlanContext,
  type SuccessorCorrectiveDeliveryModel,
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

export interface SuccessorCorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorReconciliationId: string;
  successorDeliveryId: string;
  activationId: string;
  successorPlanId: string;
  retriageId: string;
  reopenId: string;
  regressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  successorPlanFingerprint: string;
  sourceRegressionFingerprint: string;
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
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

export interface ReconciliationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reclosureId: string;
  originalClosureId: string;
  reopenId: string;
  retriageId: string;
  successorPlanId: string;
  successorDeliveryId: string;
  successorReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  originalClosureFingerprint: string;
  reopenFingerprint: string;
  successorPlanFingerprint: string;
  successorPackageFingerprint: string;
  verificationFingerprint: string;
  reclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface SuccessorCorrectiveClosureModel {
  successor: SuccessorCorrectiveDeliveryModel;
  reconciliations: SuccessorCorrectiveDeliveryReconciliation[];
  reclosures: ReconciliationExceptionReclosure[];
  totals: {
    acceptedSuccessorDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedSuccessorCorrectiveReconciliationContext {
  delivery: SuccessorCorrectiveLiveDelivery;
  execution: SuccessorCorrectiveExecutionContext;
  package: IntegrationPackageV1;
  originalClosureId: string;
  originalClosureFingerprint: string;
  reopenFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  successor_reconciliation_id: string;
  successor_delivery_id: string;
  activation_id: string;
  successor_plan_id: string;
  retriage_id: string;
  reopen_id: string;
  regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  successor_plan_fingerprint: string;
  source_regression_fingerprint: string;
  successor_package_id: string;
  successor_replay_key: string;
  successor_package_fingerprint: string;
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
  original_closure_id: string;
  reopen_id: string;
  retriage_id: string;
  successor_plan_id: string;
  successor_delivery_id: string;
  successor_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  original_closure_fingerprint: string;
  reopen_fingerprint: string;
  successor_plan_fingerprint: string;
  successor_package_fingerprint: string;
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
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("successor_reclosure_manager_required");
  }
  return role;
}

export function successorReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE VERIFIED " + target.toUpperCase() + " EXCEPTION";
}

export function successorReconciliationErrorFingerprint(input: {
  successorPackageId: string;
  successorReplayKey: string;
  successorPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("successor-verify1-", input);
}

export function successorReclosureFingerprint(input: {
  originalClosureId: string;
  reopenId: string;
  successorPlanId: string;
  successorDeliveryId: string;
  successorReconciliationId: string;
  originalClosureFingerprint: string;
  reopenFingerprint: string;
  successorPlanFingerprint: string;
  successorPackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("successor-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): SuccessorCorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successorReconciliationId: row.successor_reconciliation_id,
    successorDeliveryId: row.successor_delivery_id,
    activationId: row.activation_id,
    successorPlanId: row.successor_plan_id,
    retriageId: row.retriage_id,
    reopenId: row.reopen_id,
    regressionCheckId: row.regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    successorPlanFingerprint: row.successor_plan_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
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

function reclosureFromRow(row: ReclosureRow): ReconciliationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    reclosureId: row.reclosure_id,
    originalClosureId: row.original_closure_id,
    reopenId: row.reopen_id,
    retriageId: row.retriage_id,
    successorPlanId: row.successor_plan_id,
    successorDeliveryId: row.successor_delivery_id,
    successorReconciliationId: row.successor_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    originalClosureFingerprint: row.original_closure_fingerprint,
    reopenFingerprint: row.reopen_fingerprint,
    successorPlanFingerprint: row.successor_plan_fingerprint,
    successorPackageFingerprint: row.successor_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    reclosureFingerprint: row.reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listSuccessorCorrectiveClosureForUser(
  userId: string
): Promise<SuccessorCorrectiveClosureModel> {
  const successor = await listSuccessorCorrectiveDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_successor_corrective_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.successor_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select c.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_exception_reclosures c
       join app.workspaces w on w.id=c.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=c.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by c.closed_at desc,c.reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = successor.deliveries.filter((delivery) => delivery.status === "accepted");
  const latestByDelivery = new Map<string, SuccessorCorrectiveDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.successorDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    successor,
    reconciliations,
    reclosures,
    totals: {
      acceptedSuccessorDeliveries: accepted.length,
      neverVerified: accepted.filter(
        (delivery) =>
          !latestByDelivery.has(delivery.workspaceId + ":" + delivery.deliveryId)
      ).length,
      matchedLatest: [...latestByDelivery.values()].filter(
        (item) => item.status === "matched"
      ).length,
      driftLatest: [...latestByDelivery.values()].filter(
        (item) => item.status === "drift"
      ).length,
      verificationErrors: [...latestByDelivery.values()].filter(
        (item) => item.status === "rejected" || item.status === "transport-error"
      ).length,
      verifiedReclosures: reclosures.length
    }
  };
}

export async function loadAcceptedSuccessorCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; successorDeliveryId: string }
): Promise<AcceptedSuccessorCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      successor_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      regression_status: string;
      consumer_id: string;
      activation_id: string;
      successor_package_id: string;
      successor_replay_key: string;
      successor_package_fingerprint: string;
      source_regression_fingerprint: string;
      current_regression_fingerprint: string;
      original_closure_id: string;
      original_closure_fingerprint: string;
      reopen_fingerprint: string;
    }>(
      `select d.successor_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              regression.status as regression_status,d.consumer_id,
              d.activation_id,d.successor_package_id,d.successor_replay_key,
              d.successor_package_fingerprint,p.source_regression_fingerprint,
              regression.verification_fingerprint as current_regression_fingerprint,
              original.closure_id as original_closure_id,
              original.closure_fingerprint as original_closure_fingerprint,
              reopen.reopen_fingerprint
       from app.workspace_successor_corrective_live_deliveries d
       join app.workspace_successor_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id and p.successor_plan_id=d.successor_plan_id
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_reconciliation_exception_reopens reopen
         on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=p.workspace_id
        and regression.regression_check_id=p.regression_check_id
       join app.workspace_reconciliation_exception_closures original
         on original.workspace_id=reopen.workspace_id and original.closure_id=reopen.closure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.successorDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("successor_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("successor_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("successor_reconciliation_open_approved_cycle_required");
  }
  if (
    row.regression_status !== "regressed" ||
    row.source_regression_fingerprint !== row.current_regression_fingerprint
  ) {
    throw new Error("successor_reconciliation_regression_identity_changed");
  }

  const execution = await loadApprovedSuccessorCorrectivePlanContext(userId, {
    workspaceId: input.workspaceId,
    successorPlanId: row.successor_plan_id
  });
  if (
    execution.successorPackage.packageId !== row.successor_package_id ||
    execution.successorPackage.replayKey !== row.successor_replay_key ||
    execution.successorPackage.fingerprint !== row.successor_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("successor_reconciliation_package_identity_mismatch");
  }

  const model = await listSuccessorCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.successorDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("successor_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.successorPackage,
    originalClosureId: row.original_closure_id,
    originalClosureFingerprint: row.original_closure_fingerprint,
    reopenFingerprint: row.reopen_fingerprint
  };
}

export function compareSuccessorCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordSuccessorCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedSuccessorCorrectiveReconciliationContext;
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

    const current = await client.query<{
      delivery_status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      regression_status: string;
      current_regression_fingerprint: string;
      successor_plan_fingerprint: string;
      consumer_id: string;
      successor_package_id: string;
      successor_replay_key: string;
      successor_package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              regression.status as regression_status,
              regression.verification_fingerprint as current_regression_fingerprint,
              d.successor_plan_fingerprint,d.consumer_id,
              d.successor_package_id,d.successor_replay_key,
              d.successor_package_fingerprint
       from app.workspace_successor_corrective_live_deliveries d
       join app.workspace_successor_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id and p.successor_plan_id=d.successor_plan_id
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_post_closure_regression_checks regression
         on regression.workspace_id=p.workspace_id
        and regression.regression_check_id=p.regression_check_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("successor_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.regression_status !== "regressed"
    ) {
      throw new Error("successor_reconciliation_open_approved_cycle_required");
    }
    if (
      row.current_regression_fingerprint !== execution.plan.sourceRegressionFingerprint ||
      row.successor_plan_fingerprint !== execution.plan.planFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.successor_package_id !== input.context.package.packageId ||
      row.successor_replay_key !== input.context.package.replayKey ||
      row.successor_package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("successor_reconciliation_package_identity_mismatch");
    }

    const successorReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_successor_corrective_delivery_reconciliations (
        workspace_id,successor_reconciliation_id,successor_delivery_id,
        activation_id,successor_plan_id,retriage_id,reopen_id,
        regression_check_id,case_id,target,consumer_id,
        successor_plan_fingerprint,source_regression_fingerprint,
        successor_package_id,successor_replay_key,
        successor_package_fingerprint,status,expected_record_count,
        matched_count,mismatched_count,missing_count,validation_code,
        http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,
        successorReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        execution.plan.successorPlanId,
        execution.plan.retriageId,
        execution.plan.reopenId,
        execution.plan.regressionCheckId,
        execution.plan.caseId,
        delivery.target,
        delivery.consumerId,
        execution.plan.planFingerprint,
        execution.plan.sourceRegressionFingerprint,
        input.context.package.packageId,
        input.context.package.replayKey,
        input.context.package.fingerprint,
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
    return successorReconciliationId;
  });
}

export async function closeVerifiedSuccessorReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    successorDeliveryId: string;
    successorReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0, 8000);
  if (!reclosureNote) throw new Error("successor_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ reclosure_id: string }>(
      `select reclosure_id
       from app.workspace_reconciliation_exception_reclosures
       where workspace_id=$1 and case_id=$2
       order by closed_at desc,reclosure_id desc
       limit 1`,
      [input.workspaceId, input.caseId]
    );
    if (existing.rows[0]) return existing.rows[0].reclosure_id;

    const result = await client.query<{
      successor_reconciliation_id: string;
      successor_delivery_id: string;
      successor_plan_id: string;
      retriage_id: string;
      reopen_id: string;
      case_id: string;
      target: IntegrationTarget;
      successor_plan_fingerprint: string;
      successor_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_reopen_id: string;
      original_closure_id: string;
      original_closure_fingerprint: string;
      reopen_fingerprint: string;
    }>(
      `select r.successor_reconciliation_id,r.successor_delivery_id,
              r.successor_plan_id,r.retriage_id,r.reopen_id,r.case_id,r.target,
              r.successor_plan_fingerprint,r.successor_package_fingerprint,
              r.verification_fingerprint,r.status,d.status as delivery_status,
              p.status as plan_status,t.status as retriage_status,
              c.status as case_status,
              (
                select newest.successor_reconciliation_id
                from app.workspace_successor_corrective_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.successor_delivery_id=r.successor_delivery_id
                order by newest.created_at desc,newest.successor_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_reopen.reopen_id
                from app.workspace_reconciliation_exception_reopens newest_reopen
                where newest_reopen.workspace_id=r.workspace_id
                  and newest_reopen.case_id=r.case_id
                order by newest_reopen.reopened_at desc,newest_reopen.reopen_id desc
                limit 1
              ) as latest_reopen_id,
              original.closure_id as original_closure_id,
              original.closure_fingerprint as original_closure_fingerprint,
              reopen.reopen_fingerprint
       from app.workspace_successor_corrective_delivery_reconciliations r
       join app.workspace_successor_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.successor_delivery_id
       join app.workspace_successor_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.successor_plan_id=r.successor_plan_id
       join app.workspace_reopened_exception_triage_cycles t
         on t.workspace_id=p.workspace_id and t.retriage_id=p.retriage_id
       join app.workspace_reconciliation_exception_reopens reopen
         on reopen.workspace_id=p.workspace_id and reopen.reopen_id=p.reopen_id
       join app.workspace_reconciliation_exception_closures original
         on original.workspace_id=reopen.workspace_id and original.closure_id=reopen.closure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.successor_delivery_id=$3
         and r.successor_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.successorDeliveryId,
        input.successorReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("successor_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("successor_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("successor_reclosure_open_approved_cycle_required");
    }
    if (row.latest_reconciliation_id !== row.successor_reconciliation_id) {
      throw new Error("successor_reclosure_latest_verification_required");
    }
    if (row.latest_reopen_id !== row.reopen_id) {
      throw new Error("successor_reclosure_latest_reopen_required");
    }

    const reclosureFingerprint = successorReclosureFingerprint({
      originalClosureId: row.original_closure_id,
      reopenId: row.reopen_id,
      successorPlanId: row.successor_plan_id,
      successorDeliveryId: row.successor_delivery_id,
      successorReconciliationId: row.successor_reconciliation_id,
      originalClosureFingerprint: row.original_closure_fingerprint,
      reopenFingerprint: row.reopen_fingerprint,
      successorPlanFingerprint: row.successor_plan_fingerprint,
      successorPackageFingerprint: row.successor_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const reclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_exception_reclosures (
        workspace_id,reclosure_id,original_closure_id,reopen_id,retriage_id,
        successor_plan_id,successor_delivery_id,successor_reconciliation_id,
        case_id,target,original_closure_fingerprint,reopen_fingerprint,
        successor_plan_fingerprint,successor_package_fingerprint,
        verification_fingerprint,reclosure_fingerprint,reclosure_note,
        closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        reclosureId,
        row.original_closure_id,
        row.reopen_id,
        row.retriage_id,
        row.successor_plan_id,
        row.successor_delivery_id,
        row.successor_reconciliation_id,
        row.case_id,
        row.target,
        row.original_closure_fingerprint,
        row.reopen_fingerprint,
        row.successor_plan_fingerprint,
        row.successor_package_fingerprint,
        row.verification_fingerprint,
        reclosureFingerprint,
        reclosureNote,
        userId
      ]
    );

    const updated = await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='closed',closed_by=$3,closed_at=now(),
           updated_by=$3,updated_at=now()
       where workspace_id=$1 and case_id=$2 and status='open'`,
      [input.workspaceId, input.caseId, userId]
    );
    if (!updated.rowCount) {
      throw new Error("successor_reclosure_open_case_required");
    }

    return reclosureId;
  });
}
