import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listSuccessiveCycleCorrectiveDeliveryForUser,
  loadApprovedSuccessiveCycleCorrectivePlanContext,
  type SuccessiveCycleCorrectiveDeliveryModel,
  type SuccessiveCycleCorrectiveExecutionContext,
  type SuccessiveCycleCorrectiveLiveDelivery
} from "./successive-cycle-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface SuccessiveCycleCorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successiveCycleReconciliationId: string;
  successiveCycleDeliveryId: string;
  activationId: string;
  successiveCyclePlanId: string;
  subsequentCycleRetriageId: string;
  subsequentCycleRecurrenceId: string;
  predecessorSubsequentCycleReclosureId: string;
  subsequentCycleReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  successiveCyclePlanFingerprint: string;
  sourceSubsequentCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceSubsequentCycleReclosureFingerprint: string;
  successiveCyclePackageId: string;
  successiveCycleReplayKey: string;
  successiveCyclePackageFingerprint: string;
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

export interface SuccessiveCycleReconciliationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successiveCycleReclosureId: string;
  predecessorSubsequentCycleReclosureId: string;
  subsequentCycleRecurrenceId: string;
  subsequentCycleRetriageId: string;
  successiveCyclePlanId: string;
  successiveCycleDeliveryId: string;
  successiveCycleReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  predecessorSubsequentCycleReclosureFingerprint: string;
  subsequentCycleRecurrenceFingerprint: string;
  successiveCyclePlanFingerprint: string;
  successiveCyclePackageFingerprint: string;
  verificationFingerprint: string;
  successiveCycleReclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface SuccessiveCycleCorrectiveClosureModel {
  successiveCycle: SuccessiveCycleCorrectiveDeliveryModel;
  reconciliations: SuccessiveCycleCorrectiveDeliveryReconciliation[];
  reclosures: SuccessiveCycleReconciliationExceptionReclosure[];
  totals: {
    acceptedSuccessiveCycleDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedSuccessiveCycleCorrectiveReconciliationContext {
  delivery: SuccessiveCycleCorrectiveLiveDelivery;
  execution: SuccessiveCycleCorrectiveExecutionContext;
  package: IntegrationPackageV1;
  predecessorSubsequentCycleReclosureId: string;
  predecessorSubsequentCycleReclosureFingerprint: string;
  subsequentCycleRecurrenceFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  successive_cycle_reconciliation_id: string;
  successive_cycle_delivery_id: string;
  activation_id: string;
  successive_cycle_plan_id: string;
  subsequent_cycle_retriage_id: string;
  subsequent_cycle_recurrence_id: string;
  predecessor_subsequent_cycle_reclosure_id: string;
  subsequent_cycle_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  successive_cycle_plan_fingerprint: string;
  source_subsequent_cycle_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_subsequent_cycle_reclosure_fingerprint: string;
  successive_cycle_package_id: string;
  successive_cycle_replay_key: string;
  successive_cycle_package_fingerprint: string;
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
  successive_cycle_reclosure_id: string;
  predecessor_subsequent_cycle_reclosure_id: string;
  subsequent_cycle_recurrence_id: string;
  subsequent_cycle_retriage_id: string;
  successive_cycle_plan_id: string;
  successive_cycle_delivery_id: string;
  successive_cycle_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  predecessor_subsequent_cycle_reclosure_fingerprint: string;
  subsequent_cycle_recurrence_fingerprint: string;
  successive_cycle_plan_fingerprint: string;
  successive_cycle_package_fingerprint: string;
  verification_fingerprint: string;
  successive_cycle_reclosure_fingerprint: string;
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
    throw new Error("successive_cycle_reclosure_manager_required");
  }
  return role;
}

export function successiveCycleReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE SUCCESSIVE-CYCLE " + target.toUpperCase() + " EXCEPTION";
}

export function successiveCycleReconciliationErrorFingerprint(input: {
  successiveCyclePackageId: string;
  successiveCycleReplayKey: string;
  successiveCyclePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("successive-cycle-verify1-", input);
}

export function successiveCycleReclosureFingerprint(input: {
  predecessorSubsequentCycleReclosureId: string;
  subsequentCycleRecurrenceId: string;
  subsequentCycleRetriageId: string;
  successiveCyclePlanId: string;
  successiveCycleDeliveryId: string;
  successiveCycleReconciliationId: string;
  predecessorSubsequentCycleReclosureFingerprint: string;
  subsequentCycleRecurrenceFingerprint: string;
  successiveCyclePlanFingerprint: string;
  successiveCyclePackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("successive-cycle-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): SuccessiveCycleCorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successiveCycleReconciliationId: row.successive_cycle_reconciliation_id,
    successiveCycleDeliveryId: row.successive_cycle_delivery_id,
    activationId: row.activation_id,
    successiveCyclePlanId: row.successive_cycle_plan_id,
    subsequentCycleRetriageId: row.subsequent_cycle_retriage_id,
    subsequentCycleRecurrenceId: row.subsequent_cycle_recurrence_id,
    predecessorSubsequentCycleReclosureId: row.predecessor_subsequent_cycle_reclosure_id,
    subsequentCycleReclosureRegressionCheckId: row.subsequent_cycle_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    successiveCyclePlanFingerprint: row.successive_cycle_plan_fingerprint,
    sourceSubsequentCycleRecurrenceFingerprint: row.source_subsequent_cycle_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceSubsequentCycleReclosureFingerprint: row.source_subsequent_cycle_reclosure_fingerprint,
    successiveCyclePackageId: row.successive_cycle_package_id,
    successiveCycleReplayKey: row.successive_cycle_replay_key,
    successiveCyclePackageFingerprint: row.successive_cycle_package_fingerprint,
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

function reclosureFromRow(
  row: ReclosureRow
): SuccessiveCycleReconciliationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successiveCycleReclosureId: row.successive_cycle_reclosure_id,
    predecessorSubsequentCycleReclosureId: row.predecessor_subsequent_cycle_reclosure_id,
    subsequentCycleRecurrenceId: row.subsequent_cycle_recurrence_id,
    subsequentCycleRetriageId: row.subsequent_cycle_retriage_id,
    successiveCyclePlanId: row.successive_cycle_plan_id,
    successiveCycleDeliveryId: row.successive_cycle_delivery_id,
    successiveCycleReconciliationId: row.successive_cycle_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    predecessorSubsequentCycleReclosureFingerprint: row.predecessor_subsequent_cycle_reclosure_fingerprint,
    subsequentCycleRecurrenceFingerprint: row.subsequent_cycle_recurrence_fingerprint,
    successiveCyclePlanFingerprint: row.successive_cycle_plan_fingerprint,
    successiveCyclePackageFingerprint: row.successive_cycle_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    successiveCycleReclosureFingerprint: row.successive_cycle_reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listSuccessiveCycleCorrectiveClosureForUser(
  userId: string
): Promise<SuccessiveCycleCorrectiveClosureModel> {
  const successiveCycle = await listSuccessiveCycleCorrectiveDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_successive_cycle_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.successive_cycle_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_successive_cycle_reclosures r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.closed_at desc,r.successive_cycle_reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = successiveCycle.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<
    string,
    SuccessiveCycleCorrectiveDeliveryReconciliation
  >();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.successiveCycleDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    successiveCycle,
    reconciliations,
    reclosures,
    totals: {
      acceptedSuccessiveCycleDeliveries: accepted.length,
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

export async function loadAcceptedSuccessiveCycleCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; successiveCycleDeliveryId: string }
): Promise<AcceptedSuccessiveCycleCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      successive_cycle_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      subsequent_cycle_recurrence_id: string;
      latest_subsequent_cycle_recurrence_id: string;
      consumer_id: string;
      activation_id: string;
      successive_cycle_package_id: string;
      successive_cycle_replay_key: string;
      successive_cycle_package_fingerprint: string;
      source_subsequent_cycle_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_subsequent_cycle_reclosure_fingerprint: string;
      subsequent_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      subsequent_cycle_reclosure_fingerprint: string;
      predecessor_subsequent_cycle_reclosure_id: string;
      predecessor_subsequent_cycle_reclosure_fingerprint: string;
    }>(
      `select d.successive_cycle_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              p.subsequent_cycle_recurrence_id,
              (
                select newest.subsequent_cycle_recurrence_id
                from app.workspace_reconciliation_subsequent_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.subsequent_cycle_recurrence_id desc
                limit 1
              ) as latest_subsequent_cycle_recurrence_id,
              d.consumer_id,d.activation_id,d.successive_cycle_package_id,
              d.successive_cycle_replay_key,d.successive_cycle_package_fingerprint,
              p.source_subsequent_cycle_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_subsequent_cycle_reclosure_fingerprint,
              recurrence.subsequent_cycle_recurrence_fingerprint,recurrence.regression_fingerprint,
              recurrence.subsequent_cycle_reclosure_fingerprint,p.subsequent_cycle_reclosure_id as predecessor_subsequent_cycle_reclosure_id,
              predecessor_reclosure.subsequent_cycle_reclosure_fingerprint as predecessor_subsequent_cycle_reclosure_fingerprint
       from app.workspace_successive_cycle_corrective_live_deliveries d
       join app.workspace_successive_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.successive_cycle_plan_id=d.successive_cycle_plan_id
       join app.workspace_subsequent_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_cycle_retriage_id=p.subsequent_cycle_retriage_id
       join app.workspace_reconciliation_subsequent_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.subsequent_cycle_recurrence_id=p.subsequent_cycle_recurrence_id
       join app.workspace_reconciliation_subsequent_cycle_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.subsequent_cycle_reclosure_id=p.subsequent_cycle_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.successiveCycleDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("successive_cycle_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("successive_cycle_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("successive_cycle_reconciliation_open_approved_cycle_required");
  }
  if (row.subsequent_cycle_recurrence_id !== row.latest_subsequent_cycle_recurrence_id) {
    throw new Error("successive_cycle_reconciliation_latest_recurrence_required");
  }
  if (
    row.source_subsequent_cycle_recurrence_fingerprint !== row.subsequent_cycle_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.regression_fingerprint ||
    row.source_subsequent_cycle_reclosure_fingerprint !== row.subsequent_cycle_reclosure_fingerprint ||
    row.source_subsequent_cycle_reclosure_fingerprint !== row.predecessor_subsequent_cycle_reclosure_fingerprint
  ) {
    throw new Error("successive_cycle_reconciliation_subsequent_cycle_recurrence_identity_changed");
  }

  const execution = await loadApprovedSuccessiveCycleCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      successiveCyclePlanId: row.successive_cycle_plan_id
    }
  );
  if (
    execution.successiveCyclePackage.packageId !== row.successive_cycle_package_id ||
    execution.successiveCyclePackage.replayKey !== row.successive_cycle_replay_key ||
    execution.successiveCyclePackage.fingerprint !==
      row.successive_cycle_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("successive_cycle_reconciliation_package_identity_mismatch");
  }

  const model = await listSuccessiveCycleCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.successiveCycleDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("successive_cycle_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.successiveCyclePackage,
    predecessorSubsequentCycleReclosureId: row.predecessor_subsequent_cycle_reclosure_id,
    predecessorSubsequentCycleReclosureFingerprint: row.predecessor_subsequent_cycle_reclosure_fingerprint,
    subsequentCycleRecurrenceFingerprint: row.subsequent_cycle_recurrence_fingerprint
  };
}

export function compareSuccessiveCycleCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordSuccessiveCycleCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedSuccessiveCycleCorrectiveReconciliationContext;
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
    const plan = execution.plan;

    const current = await client.query<{
      delivery_status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      subsequent_cycle_recurrence_id: string;
      latest_subsequent_cycle_recurrence_id: string;
      subsequent_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      subsequent_cycle_reclosure_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.subsequent_cycle_recurrence_id,
              (
                select newest.subsequent_cycle_recurrence_id
                from app.workspace_reconciliation_subsequent_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.subsequent_cycle_recurrence_id desc
                limit 1
              ) as latest_subsequent_cycle_recurrence_id,
              recurrence.subsequent_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.subsequent_cycle_reclosure_fingerprint,
              d.consumer_id,d.successive_cycle_plan_fingerprint as plan_fingerprint,
              d.successive_cycle_package_id as package_id,
              d.successive_cycle_replay_key as replay_key,
              d.successive_cycle_package_fingerprint as package_fingerprint
       from app.workspace_successive_cycle_corrective_live_deliveries d
       join app.workspace_successive_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.successive_cycle_plan_id=d.successive_cycle_plan_id
       join app.workspace_subsequent_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_cycle_retriage_id=p.subsequent_cycle_retriage_id
       join app.workspace_reconciliation_subsequent_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.subsequent_cycle_recurrence_id=p.subsequent_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("successive_cycle_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.subsequent_cycle_recurrence_id !== row.latest_subsequent_cycle_recurrence_id
    ) {
      throw new Error("successive_cycle_reconciliation_open_approved_cycle_required");
    }
    if (
      row.subsequent_cycle_recurrence_fingerprint !== plan.sourceSubsequentCycleRecurrenceFingerprint ||
      row.regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.subsequent_cycle_reclosure_fingerprint !== plan.sourceSubsequentCycleReclosureFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("successive_cycle_reconciliation_package_identity_mismatch");
    }

    const successiveCycleReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_successive_cycle_delivery_reconciliations (
        workspace_id,successive_cycle_reconciliation_id,successive_cycle_delivery_id,
        activation_id,successive_cycle_plan_id,subsequent_cycle_retriage_id,
        subsequent_cycle_recurrence_id,predecessor_subsequent_cycle_reclosure_id,subsequent_cycle_reclosure_regression_check_id,
        case_id,target,consumer_id,successive_cycle_plan_fingerprint,
        source_subsequent_cycle_recurrence_fingerprint,source_regression_fingerprint,
        source_subsequent_cycle_reclosure_fingerprint,successive_cycle_package_id,
        successive_cycle_replay_key,successive_cycle_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,now()
      )`,
      [
        input.workspaceId,
        successiveCycleReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.successiveCyclePlanId,
        plan.subsequentCycleRetriageId,
        plan.subsequentCycleRecurrenceId,
        plan.subsequentCycleReclosureId,
        plan.subsequentCycleReclosureRegressionCheckId,
        plan.caseId,
        delivery.target,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceSubsequentCycleRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceSubsequentCycleReclosureFingerprint,
        input.context.package.packageId,
        input.context.package.replayKey,
        input.context.package.fingerprint,
        input.status,
        input.expectedRecordCount,
        input.matchedCount,
        input.mismatchedCount,
        input.missingCount,
        input.validationCode.slice(0,96),
        input.httpStatus ?? null,
        input.consumerVerifiedAt ?? null,
        input.verificationFingerprint,
        JSON.stringify(input.recordResults),
        userId
      ]
    );
    return successiveCycleReconciliationId;
  });
}

export async function closeVerifiedSuccessiveCycleReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    successiveCycleDeliveryId: string;
    successiveCycleReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("successive_cycle_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const result = await client.query<{
      successive_cycle_reconciliation_id: string;
      successive_cycle_delivery_id: string;
      successive_cycle_plan_id: string;
      subsequent_cycle_retriage_id: string;
      subsequent_cycle_recurrence_id: string;
      predecessor_subsequent_cycle_reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      successive_cycle_plan_fingerprint: string;
      successive_cycle_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_subsequent_cycle_recurrence_id: string;
      predecessor_subsequent_cycle_reclosure_fingerprint: string;
      subsequent_cycle_recurrence_fingerprint: string;
    }>(
      `select r.successive_cycle_reconciliation_id,r.successive_cycle_delivery_id,
              r.successive_cycle_plan_id,r.subsequent_cycle_retriage_id,r.subsequent_cycle_recurrence_id,
              r.predecessor_subsequent_cycle_reclosure_id,r.case_id,r.target,
              r.successive_cycle_plan_fingerprint,
              r.successive_cycle_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              t.status as retriage_status,c.status as case_status,
              (
                select newest.successive_cycle_reconciliation_id
                from app.workspace_successive_cycle_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.successive_cycle_delivery_id=r.successive_cycle_delivery_id
                order by newest.created_at desc,newest.successive_cycle_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_recurrence.subsequent_cycle_recurrence_id
                from app.workspace_reconciliation_subsequent_cycle_recurrences newest_recurrence
                where newest_recurrence.workspace_id=r.workspace_id
                  and newest_recurrence.case_id=r.case_id
                order by newest_recurrence.recurred_at desc,newest_recurrence.subsequent_cycle_recurrence_id desc
                limit 1
              ) as latest_subsequent_cycle_recurrence_id,
              predecessor_reclosure.subsequent_cycle_reclosure_fingerprint as predecessor_subsequent_cycle_reclosure_fingerprint,
              recurrence.subsequent_cycle_recurrence_fingerprint
       from app.workspace_successive_cycle_delivery_reconciliations r
       join app.workspace_successive_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id
        and d.delivery_id=r.successive_cycle_delivery_id
       join app.workspace_successive_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id
        and p.successive_cycle_plan_id=r.successive_cycle_plan_id
       join app.workspace_subsequent_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.subsequent_cycle_retriage_id=p.subsequent_cycle_retriage_id
       join app.workspace_reconciliation_subsequent_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.subsequent_cycle_recurrence_id=p.subsequent_cycle_recurrence_id
       join app.workspace_reconciliation_subsequent_cycle_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.subsequent_cycle_reclosure_id=p.subsequent_cycle_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.successive_cycle_delivery_id=$3
         and r.successive_cycle_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.successiveCycleDeliveryId,
        input.successiveCycleReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("successive_cycle_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("successive_cycle_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("successive_cycle_reclosure_open_approved_cycle_required");
    }
    if (
      row.latest_reconciliation_id !== row.successive_cycle_reconciliation_id
    ) {
      throw new Error("successive_cycle_reclosure_latest_verification_required");
    }
    if (row.latest_subsequent_cycle_recurrence_id !== row.subsequent_cycle_recurrence_id) {
      throw new Error("successive_cycle_reclosure_latest_recurrence_required");
    }

    const existing = await client.query<{ successive_cycle_reclosure_id: string }>(
      `select successive_cycle_reclosure_id
       from app.workspace_reconciliation_successive_cycle_reclosures
       where workspace_id=$1 and subsequent_cycle_recurrence_id=$2
       limit 1`,
      [input.workspaceId, row.subsequent_cycle_recurrence_id]
    );
    if (existing.rows[0]) return existing.rows[0].successive_cycle_reclosure_id;

    const reclosureFingerprint = successiveCycleReclosureFingerprint({
      predecessorSubsequentCycleReclosureId: row.predecessor_subsequent_cycle_reclosure_id,
      subsequentCycleRecurrenceId: row.subsequent_cycle_recurrence_id,
      subsequentCycleRetriageId: row.subsequent_cycle_retriage_id,
      successiveCyclePlanId: row.successive_cycle_plan_id,
      successiveCycleDeliveryId: row.successive_cycle_delivery_id,
      successiveCycleReconciliationId: row.successive_cycle_reconciliation_id,
      predecessorSubsequentCycleReclosureFingerprint: row.predecessor_subsequent_cycle_reclosure_fingerprint,
      subsequentCycleRecurrenceFingerprint: row.subsequent_cycle_recurrence_fingerprint,
      successiveCyclePlanFingerprint: row.successive_cycle_plan_fingerprint,
      successiveCyclePackageFingerprint: row.successive_cycle_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const successiveCycleReclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_successive_cycle_reclosures (
        workspace_id,successive_cycle_reclosure_id,predecessor_subsequent_cycle_reclosure_id,
        subsequent_cycle_recurrence_id,subsequent_cycle_retriage_id,successive_cycle_plan_id,
        successive_cycle_delivery_id,successive_cycle_reconciliation_id,case_id,
        target,predecessor_subsequent_cycle_reclosure_fingerprint,subsequent_cycle_recurrence_fingerprint,
        successive_cycle_plan_fingerprint,successive_cycle_package_fingerprint,
        verification_fingerprint,successive_cycle_reclosure_fingerprint,
        reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        successiveCycleReclosureId,
        row.predecessor_subsequent_cycle_reclosure_id,
        row.subsequent_cycle_recurrence_id,
        row.subsequent_cycle_retriage_id,
        row.successive_cycle_plan_id,
        row.successive_cycle_delivery_id,
        row.successive_cycle_reconciliation_id,
        row.case_id,
        row.target,
        row.predecessor_subsequent_cycle_reclosure_fingerprint,
        row.subsequent_cycle_recurrence_fingerprint,
        row.successive_cycle_plan_fingerprint,
        row.successive_cycle_package_fingerprint,
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
      throw new Error("successive_cycle_reclosure_open_case_required");
    }

    return successiveCycleReclosureId;
  });
}
