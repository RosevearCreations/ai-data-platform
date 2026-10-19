import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listNextCycleCorrectiveDeliveryForUser,
  loadApprovedNextCycleCorrectivePlanContext,
  type NextCycleCorrectiveDeliveryModel,
  type NextCycleCorrectiveExecutionContext,
  type NextCycleCorrectiveLiveDelivery
} from "./next-cycle-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface NextCycleCorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  nextCycleReconciliationId: string;
  nextCycleDeliveryId: string;
  activationId: string;
  nextCyclePlanId: string;
  continuationGenerationRetriageId: string;
  continuationGenerationRecurrenceId: string;
  predecessorContinuationGenerationReclosureId: string;
  continuationGenerationReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  nextCyclePlanFingerprint: string;
  sourceContinuationGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceContinuationGenerationReclosureFingerprint: string;
  nextCyclePackageId: string;
  nextCycleReplayKey: string;
  nextCyclePackageFingerprint: string;
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

export interface NextCycleReconciliationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  nextCycleReclosureId: string;
  predecessorContinuationGenerationReclosureId: string;
  continuationGenerationRecurrenceId: string;
  continuationGenerationRetriageId: string;
  nextCyclePlanId: string;
  nextCycleDeliveryId: string;
  nextCycleReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  predecessorContinuationGenerationReclosureFingerprint: string;
  continuationGenerationRecurrenceFingerprint: string;
  nextCyclePlanFingerprint: string;
  nextCyclePackageFingerprint: string;
  verificationFingerprint: string;
  nextCycleReclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface NextCycleCorrectiveClosureModel {
  nextCycle: NextCycleCorrectiveDeliveryModel;
  reconciliations: NextCycleCorrectiveDeliveryReconciliation[];
  reclosures: NextCycleReconciliationExceptionReclosure[];
  totals: {
    acceptedNextCycleDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedNextCycleCorrectiveReconciliationContext {
  delivery: NextCycleCorrectiveLiveDelivery;
  execution: NextCycleCorrectiveExecutionContext;
  package: IntegrationPackageV1;
  predecessorContinuationGenerationReclosureId: string;
  predecessorContinuationGenerationReclosureFingerprint: string;
  continuationGenerationRecurrenceFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  next_cycle_reconciliation_id: string;
  next_cycle_delivery_id: string;
  activation_id: string;
  next_cycle_plan_id: string;
  continuation_generation_retriage_id: string;
  continuation_generation_recurrence_id: string;
  predecessor_continuation_generation_reclosure_id: string;
  continuation_generation_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  next_cycle_plan_fingerprint: string;
  source_continuation_generation_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_continuation_generation_reclosure_fingerprint: string;
  next_cycle_package_id: string;
  next_cycle_replay_key: string;
  next_cycle_package_fingerprint: string;
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
  next_cycle_reclosure_id: string;
  predecessor_continuation_generation_reclosure_id: string;
  continuation_generation_recurrence_id: string;
  continuation_generation_retriage_id: string;
  next_cycle_plan_id: string;
  next_cycle_delivery_id: string;
  next_cycle_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  predecessor_continuation_generation_reclosure_fingerprint: string;
  continuation_generation_recurrence_fingerprint: string;
  next_cycle_plan_fingerprint: string;
  next_cycle_package_fingerprint: string;
  verification_fingerprint: string;
  next_cycle_reclosure_fingerprint: string;
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
    throw new Error("next_cycle_reclosure_manager_required");
  }
  return role;
}

export function nextCycleReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE NEXT-CYCLE " + target.toUpperCase() + " EXCEPTION";
}

export function nextCycleReconciliationErrorFingerprint(input: {
  nextCyclePackageId: string;
  nextCycleReplayKey: string;
  nextCyclePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("next-cycle-verify1-", input);
}

export function nextCycleReclosureFingerprint(input: {
  predecessorContinuationGenerationReclosureId: string;
  continuationGenerationRecurrenceId: string;
  continuationGenerationRetriageId: string;
  nextCyclePlanId: string;
  nextCycleDeliveryId: string;
  nextCycleReconciliationId: string;
  predecessorContinuationGenerationReclosureFingerprint: string;
  continuationGenerationRecurrenceFingerprint: string;
  nextCyclePlanFingerprint: string;
  nextCyclePackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("next-cycle-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): NextCycleCorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    nextCycleReconciliationId: row.next_cycle_reconciliation_id,
    nextCycleDeliveryId: row.next_cycle_delivery_id,
    activationId: row.activation_id,
    nextCyclePlanId: row.next_cycle_plan_id,
    continuationGenerationRetriageId: row.continuation_generation_retriage_id,
    continuationGenerationRecurrenceId: row.continuation_generation_recurrence_id,
    predecessorContinuationGenerationReclosureId: row.predecessor_continuation_generation_reclosure_id,
    continuationGenerationReclosureRegressionCheckId: row.continuation_generation_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    nextCyclePlanFingerprint: row.next_cycle_plan_fingerprint,
    sourceContinuationGenerationRecurrenceFingerprint: row.source_continuation_generation_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceContinuationGenerationReclosureFingerprint: row.source_continuation_generation_reclosure_fingerprint,
    nextCyclePackageId: row.next_cycle_package_id,
    nextCycleReplayKey: row.next_cycle_replay_key,
    nextCyclePackageFingerprint: row.next_cycle_package_fingerprint,
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
): NextCycleReconciliationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    nextCycleReclosureId: row.next_cycle_reclosure_id,
    predecessorContinuationGenerationReclosureId: row.predecessor_continuation_generation_reclosure_id,
    continuationGenerationRecurrenceId: row.continuation_generation_recurrence_id,
    continuationGenerationRetriageId: row.continuation_generation_retriage_id,
    nextCyclePlanId: row.next_cycle_plan_id,
    nextCycleDeliveryId: row.next_cycle_delivery_id,
    nextCycleReconciliationId: row.next_cycle_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    predecessorContinuationGenerationReclosureFingerprint: row.predecessor_continuation_generation_reclosure_fingerprint,
    continuationGenerationRecurrenceFingerprint: row.continuation_generation_recurrence_fingerprint,
    nextCyclePlanFingerprint: row.next_cycle_plan_fingerprint,
    nextCyclePackageFingerprint: row.next_cycle_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    nextCycleReclosureFingerprint: row.next_cycle_reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listNextCycleCorrectiveClosureForUser(
  userId: string
): Promise<NextCycleCorrectiveClosureModel> {
  const nextCycle = await listNextCycleCorrectiveDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_next_cycle_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.next_cycle_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_next_cycle_reclosures r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.closed_at desc,r.next_cycle_reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = nextCycle.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<
    string,
    NextCycleCorrectiveDeliveryReconciliation
  >();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.nextCycleDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    nextCycle,
    reconciliations,
    reclosures,
    totals: {
      acceptedNextCycleDeliveries: accepted.length,
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

export async function loadAcceptedNextCycleCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; nextCycleDeliveryId: string }
): Promise<AcceptedNextCycleCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      next_cycle_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      continuation_generation_recurrence_id: string;
      latest_continuation_generation_recurrence_id: string;
      consumer_id: string;
      activation_id: string;
      next_cycle_package_id: string;
      next_cycle_replay_key: string;
      next_cycle_package_fingerprint: string;
      source_continuation_generation_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_continuation_generation_reclosure_fingerprint: string;
      continuation_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      continuation_generation_reclosure_fingerprint: string;
      predecessor_continuation_generation_reclosure_id: string;
      predecessor_continuation_generation_reclosure_fingerprint: string;
    }>(
      `select d.next_cycle_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              p.continuation_generation_recurrence_id,
              (
                select newest.continuation_generation_recurrence_id
                from app.workspace_reconciliation_continuation_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.continuation_generation_recurrence_id desc
                limit 1
              ) as latest_continuation_generation_recurrence_id,
              d.consumer_id,d.activation_id,d.next_cycle_package_id,
              d.next_cycle_replay_key,d.next_cycle_package_fingerprint,
              p.source_continuation_generation_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_continuation_generation_reclosure_fingerprint,
              recurrence.continuation_generation_recurrence_fingerprint,recurrence.regression_fingerprint,
              recurrence.continuation_generation_reclosure_fingerprint,p.continuation_generation_reclosure_id as predecessor_continuation_generation_reclosure_id,
              predecessor_reclosure.continuation_generation_reclosure_fingerprint as predecessor_continuation_generation_reclosure_fingerprint
       from app.workspace_next_cycle_corrective_live_deliveries d
       join app.workspace_next_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.next_cycle_plan_id=d.next_cycle_plan_id
       join app.workspace_continuation_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.continuation_generation_retriage_id=p.continuation_generation_retriage_id
       join app.workspace_reconciliation_continuation_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.continuation_generation_recurrence_id=p.continuation_generation_recurrence_id
       join app.workspace_reconciliation_continuation_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.continuation_generation_reclosure_id=p.continuation_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.nextCycleDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("next_cycle_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("next_cycle_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("next_cycle_reconciliation_open_approved_cycle_required");
  }
  if (row.continuation_generation_recurrence_id !== row.latest_continuation_generation_recurrence_id) {
    throw new Error("next_cycle_reconciliation_latest_recurrence_required");
  }
  if (
    row.source_continuation_generation_recurrence_fingerprint !== row.continuation_generation_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.regression_fingerprint ||
    row.source_continuation_generation_reclosure_fingerprint !== row.continuation_generation_reclosure_fingerprint ||
    row.source_continuation_generation_reclosure_fingerprint !== row.predecessor_continuation_generation_reclosure_fingerprint
  ) {
    throw new Error("next_cycle_reconciliation_continuation_generation_recurrence_identity_changed");
  }

  const execution = await loadApprovedNextCycleCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      nextCyclePlanId: row.next_cycle_plan_id
    }
  );
  if (
    execution.nextCyclePackage.packageId !== row.next_cycle_package_id ||
    execution.nextCyclePackage.replayKey !== row.next_cycle_replay_key ||
    execution.nextCyclePackage.fingerprint !==
      row.next_cycle_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("next_cycle_reconciliation_package_identity_mismatch");
  }

  const model = await listNextCycleCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.nextCycleDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("next_cycle_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.nextCyclePackage,
    predecessorContinuationGenerationReclosureId: row.predecessor_continuation_generation_reclosure_id,
    predecessorContinuationGenerationReclosureFingerprint: row.predecessor_continuation_generation_reclosure_fingerprint,
    continuationGenerationRecurrenceFingerprint: row.continuation_generation_recurrence_fingerprint
  };
}

export function compareNextCycleCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordNextCycleCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedNextCycleCorrectiveReconciliationContext;
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
      continuation_generation_recurrence_id: string;
      latest_continuation_generation_recurrence_id: string;
      continuation_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      continuation_generation_reclosure_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.continuation_generation_recurrence_id,
              (
                select newest.continuation_generation_recurrence_id
                from app.workspace_reconciliation_continuation_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.continuation_generation_recurrence_id desc
                limit 1
              ) as latest_continuation_generation_recurrence_id,
              recurrence.continuation_generation_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.continuation_generation_reclosure_fingerprint,
              d.consumer_id,d.next_cycle_plan_fingerprint as plan_fingerprint,
              d.next_cycle_package_id as package_id,
              d.next_cycle_replay_key as replay_key,
              d.next_cycle_package_fingerprint as package_fingerprint
       from app.workspace_next_cycle_corrective_live_deliveries d
       join app.workspace_next_cycle_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.next_cycle_plan_id=d.next_cycle_plan_id
       join app.workspace_continuation_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.continuation_generation_retriage_id=p.continuation_generation_retriage_id
       join app.workspace_reconciliation_continuation_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.continuation_generation_recurrence_id=p.continuation_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("next_cycle_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.continuation_generation_recurrence_id !== row.latest_continuation_generation_recurrence_id
    ) {
      throw new Error("next_cycle_reconciliation_open_approved_cycle_required");
    }
    if (
      row.continuation_generation_recurrence_fingerprint !== plan.sourceContinuationGenerationRecurrenceFingerprint ||
      row.regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.continuation_generation_reclosure_fingerprint !== plan.sourceContinuationGenerationReclosureFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("next_cycle_reconciliation_package_identity_mismatch");
    }

    const nextCycleReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_next_cycle_delivery_reconciliations (
        workspace_id,next_cycle_reconciliation_id,next_cycle_delivery_id,
        activation_id,next_cycle_plan_id,continuation_generation_retriage_id,
        continuation_generation_recurrence_id,predecessor_continuation_generation_reclosure_id,continuation_generation_reclosure_regression_check_id,
        case_id,target,consumer_id,next_cycle_plan_fingerprint,
        source_continuation_generation_recurrence_fingerprint,source_regression_fingerprint,
        source_continuation_generation_reclosure_fingerprint,next_cycle_package_id,
        next_cycle_replay_key,next_cycle_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,now()
      )`,
      [
        input.workspaceId,
        nextCycleReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.nextCyclePlanId,
        plan.continuationGenerationRetriageId,
        plan.continuationGenerationRecurrenceId,
        plan.continuationGenerationReclosureId,
        plan.continuationGenerationReclosureRegressionCheckId,
        plan.caseId,
        delivery.target,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceContinuationGenerationRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceContinuationGenerationReclosureFingerprint,
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
    return nextCycleReconciliationId;
  });
}

export async function closeVerifiedNextCycleReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    nextCycleDeliveryId: string;
    nextCycleReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("next_cycle_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const result = await client.query<{
      next_cycle_reconciliation_id: string;
      next_cycle_delivery_id: string;
      next_cycle_plan_id: string;
      continuation_generation_retriage_id: string;
      continuation_generation_recurrence_id: string;
      predecessor_continuation_generation_reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      next_cycle_plan_fingerprint: string;
      next_cycle_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_continuation_generation_recurrence_id: string;
      predecessor_continuation_generation_reclosure_fingerprint: string;
      continuation_generation_recurrence_fingerprint: string;
    }>(
      `select r.next_cycle_reconciliation_id,r.next_cycle_delivery_id,
              r.next_cycle_plan_id,r.continuation_generation_retriage_id,r.continuation_generation_recurrence_id,
              r.predecessor_continuation_generation_reclosure_id,r.case_id,r.target,
              r.next_cycle_plan_fingerprint,
              r.next_cycle_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              t.status as retriage_status,c.status as case_status,
              (
                select newest.next_cycle_reconciliation_id
                from app.workspace_next_cycle_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.next_cycle_delivery_id=r.next_cycle_delivery_id
                order by newest.created_at desc,newest.next_cycle_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_recurrence.continuation_generation_recurrence_id
                from app.workspace_reconciliation_continuation_generation_recurrences newest_recurrence
                where newest_recurrence.workspace_id=r.workspace_id
                  and newest_recurrence.case_id=r.case_id
                order by newest_recurrence.recurred_at desc,newest_recurrence.continuation_generation_recurrence_id desc
                limit 1
              ) as latest_continuation_generation_recurrence_id,
              predecessor_reclosure.continuation_generation_reclosure_fingerprint as predecessor_continuation_generation_reclosure_fingerprint,
              recurrence.continuation_generation_recurrence_fingerprint
       from app.workspace_next_cycle_delivery_reconciliations r
       join app.workspace_next_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id
        and d.delivery_id=r.next_cycle_delivery_id
       join app.workspace_next_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id
        and p.next_cycle_plan_id=r.next_cycle_plan_id
       join app.workspace_continuation_generation_recurrence_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.continuation_generation_retriage_id=p.continuation_generation_retriage_id
       join app.workspace_reconciliation_continuation_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.continuation_generation_recurrence_id=p.continuation_generation_recurrence_id
       join app.workspace_reconciliation_continuation_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.continuation_generation_reclosure_id=p.continuation_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.next_cycle_delivery_id=$3
         and r.next_cycle_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.nextCycleDeliveryId,
        input.nextCycleReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("next_cycle_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("next_cycle_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("next_cycle_reclosure_open_approved_cycle_required");
    }
    if (
      row.latest_reconciliation_id !== row.next_cycle_reconciliation_id
    ) {
      throw new Error("next_cycle_reclosure_latest_verification_required");
    }
    if (row.latest_continuation_generation_recurrence_id !== row.continuation_generation_recurrence_id) {
      throw new Error("next_cycle_reclosure_latest_recurrence_required");
    }

    const existing = await client.query<{ next_cycle_reclosure_id: string }>(
      `select next_cycle_reclosure_id
       from app.workspace_reconciliation_next_cycle_reclosures
       where workspace_id=$1 and continuation_generation_recurrence_id=$2
       limit 1`,
      [input.workspaceId, row.continuation_generation_recurrence_id]
    );
    if (existing.rows[0]) return existing.rows[0].next_cycle_reclosure_id;

    const reclosureFingerprint = nextCycleReclosureFingerprint({
      predecessorContinuationGenerationReclosureId: row.predecessor_continuation_generation_reclosure_id,
      continuationGenerationRecurrenceId: row.continuation_generation_recurrence_id,
      continuationGenerationRetriageId: row.continuation_generation_retriage_id,
      nextCyclePlanId: row.next_cycle_plan_id,
      nextCycleDeliveryId: row.next_cycle_delivery_id,
      nextCycleReconciliationId: row.next_cycle_reconciliation_id,
      predecessorContinuationGenerationReclosureFingerprint: row.predecessor_continuation_generation_reclosure_fingerprint,
      continuationGenerationRecurrenceFingerprint: row.continuation_generation_recurrence_fingerprint,
      nextCyclePlanFingerprint: row.next_cycle_plan_fingerprint,
      nextCyclePackageFingerprint: row.next_cycle_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const nextCycleReclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_next_cycle_reclosures (
        workspace_id,next_cycle_reclosure_id,predecessor_continuation_generation_reclosure_id,
        continuation_generation_recurrence_id,continuation_generation_retriage_id,next_cycle_plan_id,
        next_cycle_delivery_id,next_cycle_reconciliation_id,case_id,
        target,predecessor_continuation_generation_reclosure_fingerprint,continuation_generation_recurrence_fingerprint,
        next_cycle_plan_fingerprint,next_cycle_package_fingerprint,
        verification_fingerprint,next_cycle_reclosure_fingerprint,
        reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        nextCycleReclosureId,
        row.predecessor_continuation_generation_reclosure_id,
        row.continuation_generation_recurrence_id,
        row.continuation_generation_retriage_id,
        row.next_cycle_plan_id,
        row.next_cycle_delivery_id,
        row.next_cycle_reconciliation_id,
        row.case_id,
        row.target,
        row.predecessor_continuation_generation_reclosure_fingerprint,
        row.continuation_generation_recurrence_fingerprint,
        row.next_cycle_plan_fingerprint,
        row.next_cycle_package_fingerprint,
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
      throw new Error("next_cycle_reclosure_open_case_required");
    }

    return nextCycleReclosureId;
  });
}
