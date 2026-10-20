import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listSubsequentCycleCorrectiveDeliveryForUser,
  loadApprovedSubsequentCycleCorrectivePlanContext,
  type SubsequentCycleCorrectiveDeliveryModel,
  type SubsequentCycleCorrectiveExecutionContext,
  type SubsequentCycleCorrectiveLiveDelivery
} from "./subsequent-cycle-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface SubsequentCycleCorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  subsequentCycleReconciliationId: string;
  subsequentCycleDeliveryId: string;
  activationId: string;
  subsequentCyclePlanId: string;
  followingCycleRetriageId: string;
  followingCycleRecurrenceId: string;
  predecessorFollowingCycleReclosureId: string;
  followingCycleReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  subsequentCyclePlanFingerprint: string;
  sourceFollowingCycleRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceFollowingCycleReclosureFingerprint: string;
  subsequentCyclePackageId: string;
  subsequentCycleReplayKey: string;
  subsequentCyclePackageFingerprint: string;
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

export interface SubsequentCycleReconciliationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  subsequentCycleReclosureId: string;
  predecessorFollowingCycleReclosureId: string;
  followingCycleRecurrenceId: string;
  followingCycleRetriageId: string;
  subsequentCyclePlanId: string;
  subsequentCycleDeliveryId: string;
  subsequentCycleReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  predecessorFollowingCycleReclosureFingerprint: string;
  followingCycleRecurrenceFingerprint: string;
  subsequentCyclePlanFingerprint: string;
  subsequentCyclePackageFingerprint: string;
  verificationFingerprint: string;
  subsequentCycleReclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface SubsequentCycleCorrectiveClosureModel {
  subsequentCycle: SubsequentCycleCorrectiveDeliveryModel;
  reconciliations: SubsequentCycleCorrectiveDeliveryReconciliation[];
  reclosures: SubsequentCycleReconciliationExceptionReclosure[];
  totals: {
    acceptedSubsequentCycleDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedSubsequentCycleCorrectiveReconciliationContext {
  delivery: SubsequentCycleCorrectiveLiveDelivery;
  execution: SubsequentCycleCorrectiveExecutionContext;
  package: IntegrationPackageV1;
  predecessorFollowingCycleReclosureId: string;
  predecessorFollowingCycleReclosureFingerprint: string;
  followingCycleRecurrenceFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  subsequent_cycle_reconciliation_id: string;
  subsequent_cycle_delivery_id: string;
  activation_id: string;
  subsequent_cycle_plan_id: string;
  following_cycle_retriage_id: string;
  following_cycle_recurrence_id: string;
  predecessor_following_cycle_reclosure_id: string;
  following_cycle_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  subsequent_cycle_plan_fingerprint: string;
  source_following_cycle_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_following_cycle_reclosure_fingerprint: string;
  subsequent_cycle_package_id: string;
  subsequent_cycle_replay_key: string;
  subsequent_cycle_package_fingerprint: string;
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
  subsequent_cycle_reclosure_id: string;
  predecessor_following_cycle_reclosure_id: string;
  following_cycle_recurrence_id: string;
  following_cycle_retriage_id: string;
  subsequent_cycle_plan_id: string;
  subsequent_cycle_delivery_id: string;
  subsequent_cycle_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  predecessor_following_cycle_reclosure_fingerprint: string;
  following_cycle_recurrence_fingerprint: string;
  subsequent_cycle_plan_fingerprint: string;
  subsequent_cycle_package_fingerprint: string;
  verification_fingerprint: string;
  subsequent_cycle_reclosure_fingerprint: string;
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
    throw new Error("subsequent_cycle_reclosure_manager_required");
  }
  return role;
}

export function subsequentCycleReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE SUBSEQUENT-CYCLE " + target.toUpperCase() + " EXCEPTION";
}

export function subsequentCycleReconciliationErrorFingerprint(input: {
  subsequentCyclePackageId: string;
  subsequentCycleReplayKey: string;
  subsequentCyclePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("subsequent-cycle-verify1-", input);
}

export function subsequentCycleReclosureFingerprint(input: {
  predecessorFollowingCycleReclosureId: string;
  followingCycleRecurrenceId: string;
  followingCycleRetriageId: string;
  subsequentCyclePlanId: string;
  subsequentCycleDeliveryId: string;
  subsequentCycleReconciliationId: string;
  predecessorFollowingCycleReclosureFingerprint: string;
  followingCycleRecurrenceFingerprint: string;
  subsequentCyclePlanFingerprint: string;
  subsequentCyclePackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("subsequent-cycle-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): SubsequentCycleCorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    subsequentCycleReconciliationId: row.subsequent_cycle_reconciliation_id,
    subsequentCycleDeliveryId: row.subsequent_cycle_delivery_id,
    activationId: row.activation_id,
    subsequentCyclePlanId: row.subsequent_cycle_plan_id,
    followingCycleRetriageId: row.following_cycle_retriage_id,
    followingCycleRecurrenceId: row.following_cycle_recurrence_id,
    predecessorFollowingCycleReclosureId: row.predecessor_following_cycle_reclosure_id,
    followingCycleReclosureRegressionCheckId: row.following_cycle_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    subsequentCyclePlanFingerprint: row.subsequent_cycle_plan_fingerprint,
    sourceFollowingCycleRecurrenceFingerprint: row.source_following_cycle_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceFollowingCycleReclosureFingerprint: row.source_following_cycle_reclosure_fingerprint,
    subsequentCyclePackageId: row.subsequent_cycle_package_id,
    subsequentCycleReplayKey: row.subsequent_cycle_replay_key,
    subsequentCyclePackageFingerprint: row.subsequent_cycle_package_fingerprint,
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
): SubsequentCycleReconciliationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    subsequentCycleReclosureId: row.subsequent_cycle_reclosure_id,
    predecessorFollowingCycleReclosureId: row.predecessor_following_cycle_reclosure_id,
    followingCycleRecurrenceId: row.following_cycle_recurrence_id,
    followingCycleRetriageId: row.following_cycle_retriage_id,
    subsequentCyclePlanId: row.subsequent_cycle_plan_id,
    subsequentCycleDeliveryId: row.subsequent_cycle_delivery_id,
    subsequentCycleReconciliationId: row.subsequent_cycle_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    predecessorFollowingCycleReclosureFingerprint: row.predecessor_following_cycle_reclosure_fingerprint,
    followingCycleRecurrenceFingerprint: row.following_cycle_recurrence_fingerprint,
    subsequentCyclePlanFingerprint: row.subsequent_cycle_plan_fingerprint,
    subsequentCyclePackageFingerprint: row.subsequent_cycle_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    subsequentCycleReclosureFingerprint: row.subsequent_cycle_reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listSubsequentCycleCorrectiveClosureForUser(
  userId: string
): Promise<SubsequentCycleCorrectiveClosureModel> {
  const subsequentCycle = await listSubsequentCycleCorrectiveDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_subsequent_cycle_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.subsequent_cycle_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_subsequent_cycle_reclosures r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.closed_at desc,r.subsequent_cycle_reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = subsequentCycle.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<
    string,
    SubsequentCycleCorrectiveDeliveryReconciliation
  >();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.subsequentCycleDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    subsequentCycle,
    reconciliations,
    reclosures,
    totals: {
      acceptedSubsequentCycleDeliveries: accepted.length,
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

export async function loadAcceptedSubsequentCycleCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; subsequentCycleDeliveryId: string }
): Promise<AcceptedSubsequentCycleCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      subsequent_cycle_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      following_cycle_recurrence_id: string;
      latest_following_cycle_recurrence_id: string;
      consumer_id: string;
      activation_id: string;
      subsequent_cycle_package_id: string;
      subsequent_cycle_replay_key: string;
      subsequent_cycle_package_fingerprint: string;
      source_following_cycle_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_following_cycle_reclosure_fingerprint: string;
      following_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      following_cycle_reclosure_fingerprint: string;
      predecessor_following_cycle_reclosure_id: string;
      predecessor_following_cycle_reclosure_fingerprint: string;
    }>(
      `select d.subsequent_cycle_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              p.following_cycle_recurrence_id,
              (
                select newest.following_cycle_recurrence_id
                from app.workspace_reconciliation_following_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc
                limit 1
              ) as latest_following_cycle_recurrence_id,
              d.consumer_id,d.activation_id,d.subsequent_cycle_package_id,
              d.subsequent_cycle_replay_key,d.subsequent_cycle_package_fingerprint,
              p.source_following_cycle_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_following_cycle_reclosure_fingerprint,
              recurrence.following_cycle_recurrence_fingerprint,recurrence.regression_fingerprint,
              recurrence.following_cycle_reclosure_fingerprint,p.following_cycle_reclosure_id as predecessor_following_cycle_reclosure_id,
              predecessor_reclosure.following_cycle_reclosure_fingerprint as predecessor_following_cycle_reclosure_fingerprint
       from app.workspace_subsequent_cycle_corrective_live_deliveries d
       join app.workspace_subsequent_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.subsequent_cycle_plan_id=d.subsequent_cycle_plan_id
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_following_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.following_cycle_recurrence_id=p.following_cycle_recurrence_id
       join app.workspace_reconciliation_following_cycle_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.following_cycle_reclosure_id=p.following_cycle_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.subsequentCycleDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("subsequent_cycle_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("subsequent_cycle_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("subsequent_cycle_reconciliation_open_approved_cycle_required");
  }
  if (row.following_cycle_recurrence_id !== row.latest_following_cycle_recurrence_id) {
    throw new Error("subsequent_cycle_reconciliation_latest_recurrence_required");
  }
  if (
    row.source_following_cycle_recurrence_fingerprint !== row.following_cycle_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.regression_fingerprint ||
    row.source_following_cycle_reclosure_fingerprint !== row.following_cycle_reclosure_fingerprint ||
    row.source_following_cycle_reclosure_fingerprint !== row.predecessor_following_cycle_reclosure_fingerprint
  ) {
    throw new Error("subsequent_cycle_reconciliation_following_cycle_recurrence_identity_changed");
  }

  const execution = await loadApprovedSubsequentCycleCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      subsequentCyclePlanId: row.subsequent_cycle_plan_id
    }
  );
  if (
    execution.subsequentCyclePackage.packageId !== row.subsequent_cycle_package_id ||
    execution.subsequentCyclePackage.replayKey !== row.subsequent_cycle_replay_key ||
    execution.subsequentCyclePackage.fingerprint !==
      row.subsequent_cycle_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("subsequent_cycle_reconciliation_package_identity_mismatch");
  }

  const model = await listSubsequentCycleCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.subsequentCycleDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("subsequent_cycle_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.subsequentCyclePackage,
    predecessorFollowingCycleReclosureId: row.predecessor_following_cycle_reclosure_id,
    predecessorFollowingCycleReclosureFingerprint: row.predecessor_following_cycle_reclosure_fingerprint,
    followingCycleRecurrenceFingerprint: row.following_cycle_recurrence_fingerprint
  };
}

export function compareSubsequentCycleCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordSubsequentCycleCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedSubsequentCycleCorrectiveReconciliationContext;
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
      following_cycle_recurrence_id: string;
      latest_following_cycle_recurrence_id: string;
      following_cycle_recurrence_fingerprint: string;
      regression_fingerprint: string;
      following_cycle_reclosure_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.following_cycle_recurrence_id,
              (
                select newest.following_cycle_recurrence_id
                from app.workspace_reconciliation_following_cycle_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.following_cycle_recurrence_id desc
                limit 1
              ) as latest_following_cycle_recurrence_id,
              recurrence.following_cycle_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.following_cycle_reclosure_fingerprint,
              d.consumer_id,d.subsequent_cycle_plan_fingerprint as plan_fingerprint,
              d.subsequent_cycle_package_id as package_id,
              d.subsequent_cycle_replay_key as replay_key,
              d.subsequent_cycle_package_fingerprint as package_fingerprint
       from app.workspace_subsequent_cycle_corrective_live_deliveries d
       join app.workspace_subsequent_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.subsequent_cycle_plan_id=d.subsequent_cycle_plan_id
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_following_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.following_cycle_recurrence_id=p.following_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("subsequent_cycle_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.following_cycle_recurrence_id !== row.latest_following_cycle_recurrence_id
    ) {
      throw new Error("subsequent_cycle_reconciliation_open_approved_cycle_required");
    }
    if (
      row.following_cycle_recurrence_fingerprint !== plan.sourceFollowingCycleRecurrenceFingerprint ||
      row.regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.following_cycle_reclosure_fingerprint !== plan.sourceFollowingCycleReclosureFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("subsequent_cycle_reconciliation_package_identity_mismatch");
    }

    const subsequentCycleReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_subsequent_cycle_delivery_reconciliations (
        workspace_id,subsequent_cycle_reconciliation_id,subsequent_cycle_delivery_id,
        activation_id,subsequent_cycle_plan_id,following_cycle_retriage_id,
        following_cycle_recurrence_id,predecessor_following_cycle_reclosure_id,following_cycle_reclosure_regression_check_id,
        case_id,target,consumer_id,subsequent_cycle_plan_fingerprint,
        source_following_cycle_recurrence_fingerprint,source_regression_fingerprint,
        source_following_cycle_reclosure_fingerprint,subsequent_cycle_package_id,
        subsequent_cycle_replay_key,subsequent_cycle_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,now()
      )`,
      [
        input.workspaceId,
        subsequentCycleReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.subsequentCyclePlanId,
        plan.followingCycleRetriageId,
        plan.followingCycleRecurrenceId,
        plan.followingCycleReclosureId,
        plan.followingCycleReclosureRegressionCheckId,
        plan.caseId,
        delivery.target,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceFollowingCycleRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceFollowingCycleReclosureFingerprint,
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
    return subsequentCycleReconciliationId;
  });
}

export async function closeVerifiedSubsequentCycleReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    subsequentCycleDeliveryId: string;
    subsequentCycleReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("subsequent_cycle_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const result = await client.query<{
      subsequent_cycle_reconciliation_id: string;
      subsequent_cycle_delivery_id: string;
      subsequent_cycle_plan_id: string;
      following_cycle_retriage_id: string;
      following_cycle_recurrence_id: string;
      predecessor_following_cycle_reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      subsequent_cycle_plan_fingerprint: string;
      subsequent_cycle_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_following_cycle_recurrence_id: string;
      predecessor_following_cycle_reclosure_fingerprint: string;
      following_cycle_recurrence_fingerprint: string;
    }>(
      `select r.subsequent_cycle_reconciliation_id,r.subsequent_cycle_delivery_id,
              r.subsequent_cycle_plan_id,r.following_cycle_retriage_id,r.following_cycle_recurrence_id,
              r.predecessor_following_cycle_reclosure_id,r.case_id,r.target,
              r.subsequent_cycle_plan_fingerprint,
              r.subsequent_cycle_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              t.status as retriage_status,c.status as case_status,
              (
                select newest.subsequent_cycle_reconciliation_id
                from app.workspace_subsequent_cycle_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.subsequent_cycle_delivery_id=r.subsequent_cycle_delivery_id
                order by newest.created_at desc,newest.subsequent_cycle_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_recurrence.following_cycle_recurrence_id
                from app.workspace_reconciliation_following_cycle_recurrences newest_recurrence
                where newest_recurrence.workspace_id=r.workspace_id
                  and newest_recurrence.case_id=r.case_id
                order by newest_recurrence.recurred_at desc,newest_recurrence.following_cycle_recurrence_id desc
                limit 1
              ) as latest_following_cycle_recurrence_id,
              predecessor_reclosure.following_cycle_reclosure_fingerprint as predecessor_following_cycle_reclosure_fingerprint,
              recurrence.following_cycle_recurrence_fingerprint
       from app.workspace_subsequent_cycle_delivery_reconciliations r
       join app.workspace_subsequent_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id
        and d.delivery_id=r.subsequent_cycle_delivery_id
       join app.workspace_subsequent_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id
        and p.subsequent_cycle_plan_id=r.subsequent_cycle_plan_id
       join app.workspace_following_cycle_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.following_cycle_retriage_id=p.following_cycle_retriage_id
       join app.workspace_reconciliation_following_cycle_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.following_cycle_recurrence_id=p.following_cycle_recurrence_id
       join app.workspace_reconciliation_following_cycle_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.following_cycle_reclosure_id=p.following_cycle_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.subsequent_cycle_delivery_id=$3
         and r.subsequent_cycle_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.subsequentCycleDeliveryId,
        input.subsequentCycleReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("subsequent_cycle_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("subsequent_cycle_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("subsequent_cycle_reclosure_open_approved_cycle_required");
    }
    if (
      row.latest_reconciliation_id !== row.subsequent_cycle_reconciliation_id
    ) {
      throw new Error("subsequent_cycle_reclosure_latest_verification_required");
    }
    if (row.latest_following_cycle_recurrence_id !== row.following_cycle_recurrence_id) {
      throw new Error("subsequent_cycle_reclosure_latest_recurrence_required");
    }

    const existing = await client.query<{ subsequent_cycle_reclosure_id: string }>(
      `select subsequent_cycle_reclosure_id
       from app.workspace_reconciliation_subsequent_cycle_reclosures
       where workspace_id=$1 and following_cycle_recurrence_id=$2
       limit 1`,
      [input.workspaceId, row.following_cycle_recurrence_id]
    );
    if (existing.rows[0]) return existing.rows[0].subsequent_cycle_reclosure_id;

    const reclosureFingerprint = subsequentCycleReclosureFingerprint({
      predecessorFollowingCycleReclosureId: row.predecessor_following_cycle_reclosure_id,
      followingCycleRecurrenceId: row.following_cycle_recurrence_id,
      followingCycleRetriageId: row.following_cycle_retriage_id,
      subsequentCyclePlanId: row.subsequent_cycle_plan_id,
      subsequentCycleDeliveryId: row.subsequent_cycle_delivery_id,
      subsequentCycleReconciliationId: row.subsequent_cycle_reconciliation_id,
      predecessorFollowingCycleReclosureFingerprint: row.predecessor_following_cycle_reclosure_fingerprint,
      followingCycleRecurrenceFingerprint: row.following_cycle_recurrence_fingerprint,
      subsequentCyclePlanFingerprint: row.subsequent_cycle_plan_fingerprint,
      subsequentCyclePackageFingerprint: row.subsequent_cycle_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const subsequentCycleReclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_subsequent_cycle_reclosures (
        workspace_id,subsequent_cycle_reclosure_id,predecessor_following_cycle_reclosure_id,
        following_cycle_recurrence_id,following_cycle_retriage_id,subsequent_cycle_plan_id,
        subsequent_cycle_delivery_id,subsequent_cycle_reconciliation_id,case_id,
        target,predecessor_following_cycle_reclosure_fingerprint,following_cycle_recurrence_fingerprint,
        subsequent_cycle_plan_fingerprint,subsequent_cycle_package_fingerprint,
        verification_fingerprint,subsequent_cycle_reclosure_fingerprint,
        reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        subsequentCycleReclosureId,
        row.predecessor_following_cycle_reclosure_id,
        row.following_cycle_recurrence_id,
        row.following_cycle_retriage_id,
        row.subsequent_cycle_plan_id,
        row.subsequent_cycle_delivery_id,
        row.subsequent_cycle_reconciliation_id,
        row.case_id,
        row.target,
        row.predecessor_following_cycle_reclosure_fingerprint,
        row.following_cycle_recurrence_fingerprint,
        row.subsequent_cycle_plan_fingerprint,
        row.subsequent_cycle_package_fingerprint,
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
      throw new Error("subsequent_cycle_reclosure_open_case_required");
    }

    return subsequentCycleReclosureId;
  });
}
