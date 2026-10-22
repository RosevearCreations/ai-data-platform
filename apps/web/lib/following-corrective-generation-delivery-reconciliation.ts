import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listFollowingCorrectiveGenerationDeliveryForUser,
  loadApprovedFollowingCorrectiveGenerationPlanContext,
  type FollowingCorrectiveGenerationDeliveryModel,
  type FollowingCorrectiveGenerationExecutionContext,
  type FollowingCorrectiveGenerationLiveDelivery
} from "./following-corrective-generation-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface FollowingCorrectiveGenerationDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  followingCorrectiveGenerationReconciliationId: string;
  followingCorrectiveGenerationDeliveryId: string;
  activationId: string;
  followingCorrectiveGenerationPlanId: string;
  nextCorrectiveGenerationRetriageId: string;
  nextCorrectiveGenerationRecurrenceId: string;
  predecessorNextCorrectiveGenerationReclosureId: string;
  nextCorrectiveGenerationReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  followingCorrectiveGenerationPlanFingerprint: string;
  sourceNextCorrectiveGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceNextCorrectiveGenerationReclosureFingerprint: string;
  followingCorrectiveGenerationPackageId: string;
  followingCorrectiveGenerationReplayKey: string;
  followingCorrectiveGenerationPackageFingerprint: string;
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

export interface FollowingCorrectiveGenerationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  followingCorrectiveGenerationReclosureId: string;
  predecessorNextCorrectiveGenerationReclosureId: string;
  nextCorrectiveGenerationRecurrenceId: string;
  nextCorrectiveGenerationRetriageId: string;
  followingCorrectiveGenerationPlanId: string;
  followingCorrectiveGenerationDeliveryId: string;
  followingCorrectiveGenerationReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  predecessorNextCorrectiveGenerationReclosureFingerprint: string;
  nextCorrectiveGenerationRecurrenceFingerprint: string;
  followingCorrectiveGenerationPlanFingerprint: string;
  followingCorrectiveGenerationPackageFingerprint: string;
  verificationFingerprint: string;
  followingCorrectiveGenerationReclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface FollowingCorrectiveGenerationClosureModel {
  followingCorrectiveGeneration: FollowingCorrectiveGenerationDeliveryModel;
  reconciliations: FollowingCorrectiveGenerationDeliveryReconciliation[];
  reclosures: FollowingCorrectiveGenerationExceptionReclosure[];
  totals: {
    acceptedFollowingCorrectiveGenerationDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedFollowingCorrectiveGenerationReconciliationContext {
  delivery: FollowingCorrectiveGenerationLiveDelivery;
  execution: FollowingCorrectiveGenerationExecutionContext;
  package: IntegrationPackageV1;
  predecessorNextCorrectiveGenerationReclosureId: string;
  predecessorNextCorrectiveGenerationReclosureFingerprint: string;
  nextCorrectiveGenerationRecurrenceFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  following_corrective_generation_reconciliation_id: string;
  following_corrective_generation_delivery_id: string;
  activation_id: string;
  following_corrective_generation_plan_id: string;
  next_corrective_generation_retriage_id: string;
  next_corrective_generation_recurrence_id: string;
  predecessor_next_corrective_generation_reclosure_id: string;
  next_corrective_generation_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  following_corrective_generation_plan_fingerprint: string;
  source_next_corrective_generation_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_next_corrective_generation_reclosure_fingerprint: string;
  following_corrective_generation_package_id: string;
  following_corrective_generation_replay_key: string;
  following_corrective_generation_package_fingerprint: string;
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
  following_corrective_generation_reclosure_id: string;
  predecessor_next_corrective_generation_reclosure_id: string;
  next_corrective_generation_recurrence_id: string;
  next_corrective_generation_retriage_id: string;
  following_corrective_generation_plan_id: string;
  following_corrective_generation_delivery_id: string;
  following_corrective_generation_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  predecessor_next_corrective_generation_reclosure_fingerprint: string;
  next_corrective_generation_recurrence_fingerprint: string;
  following_corrective_generation_plan_fingerprint: string;
  following_corrective_generation_package_fingerprint: string;
  verification_fingerprint: string;
  following_corrective_generation_reclosure_fingerprint: string;
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
    throw new Error("following_corrective_generation_reclosure_manager_required");
  }
  return role;
}

export function followingCorrectiveGenerationReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE FOLLOWING-CORRECTIVE-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

export function followingCorrectiveGenerationReconciliationErrorFingerprint(input: {
  followingCorrectiveGenerationPackageId: string;
  followingCorrectiveGenerationReplayKey: string;
  followingCorrectiveGenerationPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("following-corrective-generation-verify1-", input);
}

export function followingCorrectiveGenerationReclosureFingerprint(input: {
  predecessorNextCorrectiveGenerationReclosureId: string;
  nextCorrectiveGenerationRecurrenceId: string;
  nextCorrectiveGenerationRetriageId: string;
  followingCorrectiveGenerationPlanId: string;
  followingCorrectiveGenerationDeliveryId: string;
  followingCorrectiveGenerationReconciliationId: string;
  predecessorNextCorrectiveGenerationReclosureFingerprint: string;
  nextCorrectiveGenerationRecurrenceFingerprint: string;
  followingCorrectiveGenerationPlanFingerprint: string;
  followingCorrectiveGenerationPackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("following-corrective-generation-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): FollowingCorrectiveGenerationDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    followingCorrectiveGenerationReconciliationId: row.following_corrective_generation_reconciliation_id,
    followingCorrectiveGenerationDeliveryId: row.following_corrective_generation_delivery_id,
    activationId: row.activation_id,
    followingCorrectiveGenerationPlanId: row.following_corrective_generation_plan_id,
    nextCorrectiveGenerationRetriageId: row.next_corrective_generation_retriage_id,
    nextCorrectiveGenerationRecurrenceId: row.next_corrective_generation_recurrence_id,
    predecessorNextCorrectiveGenerationReclosureId: row.predecessor_next_corrective_generation_reclosure_id,
    nextCorrectiveGenerationReclosureRegressionCheckId: row.next_corrective_generation_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    followingCorrectiveGenerationPlanFingerprint: row.following_corrective_generation_plan_fingerprint,
    sourceNextCorrectiveGenerationRecurrenceFingerprint: row.source_next_corrective_generation_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceNextCorrectiveGenerationReclosureFingerprint: row.source_next_corrective_generation_reclosure_fingerprint,
    followingCorrectiveGenerationPackageId: row.following_corrective_generation_package_id,
    followingCorrectiveGenerationReplayKey: row.following_corrective_generation_replay_key,
    followingCorrectiveGenerationPackageFingerprint: row.following_corrective_generation_package_fingerprint,
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
): FollowingCorrectiveGenerationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    followingCorrectiveGenerationReclosureId: row.following_corrective_generation_reclosure_id,
    predecessorNextCorrectiveGenerationReclosureId: row.predecessor_next_corrective_generation_reclosure_id,
    nextCorrectiveGenerationRecurrenceId: row.next_corrective_generation_recurrence_id,
    nextCorrectiveGenerationRetriageId: row.next_corrective_generation_retriage_id,
    followingCorrectiveGenerationPlanId: row.following_corrective_generation_plan_id,
    followingCorrectiveGenerationDeliveryId: row.following_corrective_generation_delivery_id,
    followingCorrectiveGenerationReconciliationId: row.following_corrective_generation_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    predecessorNextCorrectiveGenerationReclosureFingerprint: row.predecessor_next_corrective_generation_reclosure_fingerprint,
    nextCorrectiveGenerationRecurrenceFingerprint: row.next_corrective_generation_recurrence_fingerprint,
    followingCorrectiveGenerationPlanFingerprint: row.following_corrective_generation_plan_fingerprint,
    followingCorrectiveGenerationPackageFingerprint: row.following_corrective_generation_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    followingCorrectiveGenerationReclosureFingerprint: row.following_corrective_generation_reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listFollowingCorrectiveGenerationClosureForUser(
  userId: string
): Promise<FollowingCorrectiveGenerationClosureModel> {
  const followingCorrectiveGeneration = await listFollowingCorrectiveGenerationDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_following_corrective_generation_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.following_corrective_generation_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_following_corrective_generation_reclosures r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.closed_at desc,r.following_corrective_generation_reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = followingCorrectiveGeneration.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<
    string,
    FollowingCorrectiveGenerationDeliveryReconciliation
  >();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.followingCorrectiveGenerationDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    followingCorrectiveGeneration,
    reconciliations,
    reclosures,
    totals: {
      acceptedFollowingCorrectiveGenerationDeliveries: accepted.length,
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

export async function loadAcceptedFollowingCorrectiveGenerationReconciliationContext(
  userId: string,
  input: { workspaceId: string; followingCorrectiveGenerationDeliveryId: string }
): Promise<AcceptedFollowingCorrectiveGenerationReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      following_corrective_generation_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      next_corrective_generation_recurrence_id: string;
      latest_next_corrective_generation_recurrence_id: string;
      consumer_id: string;
      activation_id: string;
      following_corrective_generation_package_id: string;
      following_corrective_generation_replay_key: string;
      following_corrective_generation_package_fingerprint: string;
      source_next_corrective_generation_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_next_corrective_generation_reclosure_fingerprint: string;
      next_corrective_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      next_corrective_generation_reclosure_fingerprint: string;
      predecessor_next_corrective_generation_reclosure_id: string;
      predecessor_next_corrective_generation_reclosure_fingerprint: string;
    }>(
      `select d.following_corrective_generation_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              p.next_corrective_generation_recurrence_id,
              (
                select newest.next_corrective_generation_recurrence_id
                from app.workspace_reconciliation_next_corrective_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.next_corrective_generation_recurrence_id desc
                limit 1
              ) as latest_next_corrective_generation_recurrence_id,
              d.consumer_id,d.activation_id,d.following_corrective_generation_package_id,
              d.following_corrective_generation_replay_key,d.following_corrective_generation_package_fingerprint,
              p.source_next_corrective_generation_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_next_corrective_generation_reclosure_fingerprint,
              recurrence.next_corrective_generation_recurrence_fingerprint,recurrence.regression_fingerprint,
              recurrence.next_corrective_generation_reclosure_fingerprint,p.next_corrective_generation_reclosure_id as predecessor_next_corrective_generation_reclosure_id,
              predecessor_reclosure.next_corrective_generation_reclosure_fingerprint as predecessor_next_corrective_generation_reclosure_fingerprint
       from app.workspace_following_corrective_generation_live_deliveries d
       join app.workspace_following_corrective_generation_plans p
         on p.workspace_id=d.workspace_id
        and p.following_corrective_generation_plan_id=d.following_corrective_generation_plan_id
       join app.workspace_next_corrective_generation_recurrence_triage t
         on t.workspace_id=p.workspace_id
        and t.next_corrective_generation_retriage_id=p.next_corrective_generation_retriage_id
       join app.workspace_reconciliation_next_corrective_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_corrective_generation_recurrence_id=p.next_corrective_generation_recurrence_id
       join app.workspace_reconciliation_next_corrective_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.next_corrective_generation_reclosure_id=p.next_corrective_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.followingCorrectiveGenerationDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("following_corrective_generation_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("following_corrective_generation_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("following_corrective_generation_reconciliation_open_approved_cycle_required");
  }
  if (row.next_corrective_generation_recurrence_id !== row.latest_next_corrective_generation_recurrence_id) {
    throw new Error("following_corrective_generation_reconciliation_latest_recurrence_required");
  }
  if (
    row.source_next_corrective_generation_recurrence_fingerprint !== row.next_corrective_generation_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.regression_fingerprint ||
    row.source_next_corrective_generation_reclosure_fingerprint !== row.next_corrective_generation_reclosure_fingerprint ||
    row.source_next_corrective_generation_reclosure_fingerprint !== row.predecessor_next_corrective_generation_reclosure_fingerprint
  ) {
    throw new Error("following_corrective_generation_reconciliation_next_corrective_generation_recurrence_identity_changed");
  }

  const execution = await loadApprovedFollowingCorrectiveGenerationPlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      followingCorrectiveGenerationPlanId: row.following_corrective_generation_plan_id
    }
  );
  if (
    execution.followingCorrectiveGenerationPackage.packageId !== row.following_corrective_generation_package_id ||
    execution.followingCorrectiveGenerationPackage.replayKey !== row.following_corrective_generation_replay_key ||
    execution.followingCorrectiveGenerationPackage.fingerprint !==
      row.following_corrective_generation_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("following_corrective_generation_reconciliation_package_identity_mismatch");
  }

  const model = await listFollowingCorrectiveGenerationDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.followingCorrectiveGenerationDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("following_corrective_generation_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.followingCorrectiveGenerationPackage,
    predecessorNextCorrectiveGenerationReclosureId: row.predecessor_next_corrective_generation_reclosure_id,
    predecessorNextCorrectiveGenerationReclosureFingerprint: row.predecessor_next_corrective_generation_reclosure_fingerprint,
    nextCorrectiveGenerationRecurrenceFingerprint: row.next_corrective_generation_recurrence_fingerprint
  };
}

export function compareFollowingCorrectiveGenerationConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordFollowingCorrectiveGenerationDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedFollowingCorrectiveGenerationReconciliationContext;
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
      next_corrective_generation_recurrence_id: string;
      latest_next_corrective_generation_recurrence_id: string;
      next_corrective_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      next_corrective_generation_reclosure_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.next_corrective_generation_recurrence_id,
              (
                select newest.next_corrective_generation_recurrence_id
                from app.workspace_reconciliation_next_corrective_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.next_corrective_generation_recurrence_id desc
                limit 1
              ) as latest_next_corrective_generation_recurrence_id,
              recurrence.next_corrective_generation_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.next_corrective_generation_reclosure_fingerprint,
              d.consumer_id,d.following_corrective_generation_plan_fingerprint as plan_fingerprint,
              d.following_corrective_generation_package_id as package_id,
              d.following_corrective_generation_replay_key as replay_key,
              d.following_corrective_generation_package_fingerprint as package_fingerprint
       from app.workspace_following_corrective_generation_live_deliveries d
       join app.workspace_following_corrective_generation_plans p
         on p.workspace_id=d.workspace_id
        and p.following_corrective_generation_plan_id=d.following_corrective_generation_plan_id
       join app.workspace_next_corrective_generation_recurrence_triage t
         on t.workspace_id=p.workspace_id
        and t.next_corrective_generation_retriage_id=p.next_corrective_generation_retriage_id
       join app.workspace_reconciliation_next_corrective_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_corrective_generation_recurrence_id=p.next_corrective_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("following_corrective_generation_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.next_corrective_generation_recurrence_id !== row.latest_next_corrective_generation_recurrence_id
    ) {
      throw new Error("following_corrective_generation_reconciliation_open_approved_cycle_required");
    }
    if (
      row.next_corrective_generation_recurrence_fingerprint !== plan.sourceNextCorrectiveGenerationRecurrenceFingerprint ||
      row.regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.next_corrective_generation_reclosure_fingerprint !== plan.sourceNextCorrectiveGenerationReclosureFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("following_corrective_generation_reconciliation_package_identity_mismatch");
    }

    const followingCorrectiveGenerationReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_following_corrective_generation_delivery_reconciliations (
        workspace_id,following_corrective_generation_reconciliation_id,following_corrective_generation_delivery_id,
        activation_id,following_corrective_generation_plan_id,next_corrective_generation_retriage_id,
        next_corrective_generation_recurrence_id,predecessor_next_corrective_generation_reclosure_id,next_corrective_generation_reclosure_regression_check_id,
        case_id,target,consumer_id,following_corrective_generation_plan_fingerprint,
        source_next_corrective_generation_recurrence_fingerprint,source_regression_fingerprint,
        source_next_corrective_generation_reclosure_fingerprint,following_corrective_generation_package_id,
        following_corrective_generation_replay_key,following_corrective_generation_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,now()
      )`,
      [
        input.workspaceId,
        followingCorrectiveGenerationReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.followingCorrectiveGenerationPlanId,
        plan.nextCorrectiveGenerationRetriageId,
        plan.nextCorrectiveGenerationRecurrenceId,
        plan.nextCorrectiveGenerationReclosureId,
        plan.nextCorrectiveGenerationReclosureRegressionCheckId,
        plan.caseId,
        delivery.target,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceNextCorrectiveGenerationRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceNextCorrectiveGenerationReclosureFingerprint,
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
    return followingCorrectiveGenerationReconciliationId;
  });
}

export async function closeVerifiedFollowingCorrectiveGenerationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    followingCorrectiveGenerationDeliveryId: string;
    followingCorrectiveGenerationReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("following_corrective_generation_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const result = await client.query<{
      following_corrective_generation_reconciliation_id: string;
      following_corrective_generation_delivery_id: string;
      following_corrective_generation_plan_id: string;
      next_corrective_generation_retriage_id: string;
      next_corrective_generation_recurrence_id: string;
      predecessor_next_corrective_generation_reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      following_corrective_generation_plan_fingerprint: string;
      following_corrective_generation_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_next_corrective_generation_recurrence_id: string;
      predecessor_next_corrective_generation_reclosure_fingerprint: string;
      next_corrective_generation_recurrence_fingerprint: string;
    }>(
      `select r.following_corrective_generation_reconciliation_id,r.following_corrective_generation_delivery_id,
              r.following_corrective_generation_plan_id,r.next_corrective_generation_retriage_id,r.next_corrective_generation_recurrence_id,
              r.predecessor_next_corrective_generation_reclosure_id,r.case_id,r.target,
              r.following_corrective_generation_plan_fingerprint,
              r.following_corrective_generation_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              t.status as retriage_status,c.status as case_status,
              (
                select newest.following_corrective_generation_reconciliation_id
                from app.workspace_following_corrective_generation_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.following_corrective_generation_delivery_id=r.following_corrective_generation_delivery_id
                order by newest.created_at desc,newest.following_corrective_generation_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_recurrence.next_corrective_generation_recurrence_id
                from app.workspace_reconciliation_next_corrective_generation_recurrences newest_recurrence
                where newest_recurrence.workspace_id=r.workspace_id
                  and newest_recurrence.case_id=r.case_id
                order by newest_recurrence.recurred_at desc,newest_recurrence.next_corrective_generation_recurrence_id desc
                limit 1
              ) as latest_next_corrective_generation_recurrence_id,
              predecessor_reclosure.next_corrective_generation_reclosure_fingerprint as predecessor_next_corrective_generation_reclosure_fingerprint,
              recurrence.next_corrective_generation_recurrence_fingerprint
       from app.workspace_following_corrective_generation_delivery_reconciliations r
       join app.workspace_following_corrective_generation_live_deliveries d
         on d.workspace_id=r.workspace_id
        and d.delivery_id=r.following_corrective_generation_delivery_id
       join app.workspace_following_corrective_generation_plans p
         on p.workspace_id=r.workspace_id
        and p.following_corrective_generation_plan_id=r.following_corrective_generation_plan_id
       join app.workspace_next_corrective_generation_recurrence_triage t
         on t.workspace_id=p.workspace_id
        and t.next_corrective_generation_retriage_id=p.next_corrective_generation_retriage_id
       join app.workspace_reconciliation_next_corrective_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_corrective_generation_recurrence_id=p.next_corrective_generation_recurrence_id
       join app.workspace_reconciliation_next_corrective_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.next_corrective_generation_reclosure_id=p.next_corrective_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.following_corrective_generation_delivery_id=$3
         and r.following_corrective_generation_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.followingCorrectiveGenerationDeliveryId,
        input.followingCorrectiveGenerationReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("following_corrective_generation_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("following_corrective_generation_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("following_corrective_generation_reclosure_open_approved_cycle_required");
    }
    if (
      row.latest_reconciliation_id !== row.following_corrective_generation_reconciliation_id
    ) {
      throw new Error("following_corrective_generation_reclosure_latest_verification_required");
    }
    if (row.latest_next_corrective_generation_recurrence_id !== row.next_corrective_generation_recurrence_id) {
      throw new Error("following_corrective_generation_reclosure_latest_recurrence_required");
    }

    const existing = await client.query<{ following_corrective_generation_reclosure_id: string }>(
      `select following_corrective_generation_reclosure_id
       from app.workspace_reconciliation_following_corrective_generation_reclosures
       where workspace_id=$1 and next_corrective_generation_recurrence_id=$2
       limit 1`,
      [input.workspaceId, row.next_corrective_generation_recurrence_id]
    );
    if (existing.rows[0]) return existing.rows[0].following_corrective_generation_reclosure_id;

    const reclosureFingerprint = followingCorrectiveGenerationReclosureFingerprint({
      predecessorNextCorrectiveGenerationReclosureId: row.predecessor_next_corrective_generation_reclosure_id,
      nextCorrectiveGenerationRecurrenceId: row.next_corrective_generation_recurrence_id,
      nextCorrectiveGenerationRetriageId: row.next_corrective_generation_retriage_id,
      followingCorrectiveGenerationPlanId: row.following_corrective_generation_plan_id,
      followingCorrectiveGenerationDeliveryId: row.following_corrective_generation_delivery_id,
      followingCorrectiveGenerationReconciliationId: row.following_corrective_generation_reconciliation_id,
      predecessorNextCorrectiveGenerationReclosureFingerprint: row.predecessor_next_corrective_generation_reclosure_fingerprint,
      nextCorrectiveGenerationRecurrenceFingerprint: row.next_corrective_generation_recurrence_fingerprint,
      followingCorrectiveGenerationPlanFingerprint: row.following_corrective_generation_plan_fingerprint,
      followingCorrectiveGenerationPackageFingerprint: row.following_corrective_generation_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const followingCorrectiveGenerationReclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_following_corrective_generation_reclosures (
        workspace_id,following_corrective_generation_reclosure_id,predecessor_next_corrective_generation_reclosure_id,
        next_corrective_generation_recurrence_id,next_corrective_generation_retriage_id,following_corrective_generation_plan_id,
        following_corrective_generation_delivery_id,following_corrective_generation_reconciliation_id,case_id,
        target,predecessor_next_corrective_generation_reclosure_fingerprint,next_corrective_generation_recurrence_fingerprint,
        following_corrective_generation_plan_fingerprint,following_corrective_generation_package_fingerprint,
        verification_fingerprint,following_corrective_generation_reclosure_fingerprint,
        reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        followingCorrectiveGenerationReclosureId,
        row.predecessor_next_corrective_generation_reclosure_id,
        row.next_corrective_generation_recurrence_id,
        row.next_corrective_generation_retriage_id,
        row.following_corrective_generation_plan_id,
        row.following_corrective_generation_delivery_id,
        row.following_corrective_generation_reconciliation_id,
        row.case_id,
        row.target,
        row.predecessor_next_corrective_generation_reclosure_fingerprint,
        row.next_corrective_generation_recurrence_fingerprint,
        row.following_corrective_generation_plan_fingerprint,
        row.following_corrective_generation_package_fingerprint,
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
      throw new Error("following_corrective_generation_reclosure_open_case_required");
    }

    return followingCorrectiveGenerationReclosureId;
  });
}
