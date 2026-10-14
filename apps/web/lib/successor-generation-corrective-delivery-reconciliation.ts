import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listSuccessorGenerationCorrectiveDeliveryForUser,
  loadApprovedSuccessorGenerationCorrectivePlanContext,
  type SuccessorGenerationCorrectiveDeliveryModel,
  type SuccessorGenerationCorrectiveExecutionContext,
  type SuccessorGenerationCorrectiveLiveDelivery
} from "./successor-generation-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface SuccessorGenerationCorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorGenerationReconciliationId: string;
  successorGenerationDeliveryId: string;
  activationId: string;
  successorGenerationPlanId: string;
  secondRecurrenceRetriageId: string;
  nextGenerationRecurrenceId: string;
  predecessorNextGenerationReclosureId: string;
  nextGenerationReclosureRegressionCheckId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  successorGenerationPlanFingerprint: string;
  sourceNextGenerationRecurrenceFingerprint: string;
  sourceRegressionFingerprint: string;
  sourceNextGenerationReclosureFingerprint: string;
  successorGenerationPackageId: string;
  successorGenerationReplayKey: string;
  successorGenerationPackageFingerprint: string;
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

export interface SuccessorGenerationReconciliationExceptionReclosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorGenerationReclosureId: string;
  predecessorNextGenerationReclosureId: string;
  nextGenerationRecurrenceId: string;
  secondRecurrenceRetriageId: string;
  successorGenerationPlanId: string;
  successorGenerationDeliveryId: string;
  successorGenerationReconciliationId: string;
  caseId: string;
  target: IntegrationTarget;
  predecessorNextGenerationReclosureFingerprint: string;
  nextGenerationRecurrenceFingerprint: string;
  successorGenerationPlanFingerprint: string;
  successorGenerationPackageFingerprint: string;
  verificationFingerprint: string;
  successorGenerationReclosureFingerprint: string;
  reclosureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface SuccessorGenerationCorrectiveClosureModel {
  successorGeneration: SuccessorGenerationCorrectiveDeliveryModel;
  reconciliations: SuccessorGenerationCorrectiveDeliveryReconciliation[];
  reclosures: SuccessorGenerationReconciliationExceptionReclosure[];
  totals: {
    acceptedSuccessorGenerationDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedReclosures: number;
  };
}

export interface AcceptedSuccessorGenerationCorrectiveReconciliationContext {
  delivery: SuccessorGenerationCorrectiveLiveDelivery;
  execution: SuccessorGenerationCorrectiveExecutionContext;
  package: IntegrationPackageV1;
  predecessorNextGenerationReclosureId: string;
  predecessorNextGenerationReclosureFingerprint: string;
  nextGenerationRecurrenceFingerprint: string;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
  successor_generation_reconciliation_id: string;
  successor_generation_delivery_id: string;
  activation_id: string;
  successor_generation_plan_id: string;
  second_recurrence_retriage_id: string;
  next_generation_recurrence_id: string;
  predecessor_next_generation_reclosure_id: string;
  next_generation_reclosure_regression_check_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  successor_generation_plan_fingerprint: string;
  source_next_generation_recurrence_fingerprint: string;
  source_regression_fingerprint: string;
  source_next_generation_reclosure_fingerprint: string;
  successor_generation_package_id: string;
  successor_generation_replay_key: string;
  successor_generation_package_fingerprint: string;
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
  successor_generation_reclosure_id: string;
  predecessor_next_generation_reclosure_id: string;
  next_generation_recurrence_id: string;
  second_recurrence_retriage_id: string;
  successor_generation_plan_id: string;
  successor_generation_delivery_id: string;
  successor_generation_reconciliation_id: string;
  case_id: string;
  target: IntegrationTarget;
  predecessor_next_generation_reclosure_fingerprint: string;
  next_generation_recurrence_fingerprint: string;
  successor_generation_plan_fingerprint: string;
  successor_generation_package_fingerprint: string;
  verification_fingerprint: string;
  successor_generation_reclosure_fingerprint: string;
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
    throw new Error("successor_generation_reclosure_manager_required");
  }
  return role;
}

export function successorGenerationReclosureConfirmation(target: IntegrationTarget) {
  return "RE-CLOSE SUCCESSOR-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

export function successorGenerationReconciliationErrorFingerprint(input: {
  successorGenerationPackageId: string;
  successorGenerationReplayKey: string;
  successorGenerationPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("successor-generation-verify1-", input);
}

export function successorGenerationReclosureFingerprint(input: {
  predecessorNextGenerationReclosureId: string;
  nextGenerationRecurrenceId: string;
  secondRecurrenceRetriageId: string;
  successorGenerationPlanId: string;
  successorGenerationDeliveryId: string;
  successorGenerationReconciliationId: string;
  predecessorNextGenerationReclosureFingerprint: string;
  nextGenerationRecurrenceFingerprint: string;
  successorGenerationPlanFingerprint: string;
  successorGenerationPackageFingerprint: string;
  verificationFingerprint: string;
  reclosureNote: string;
}) {
  return fingerprint("successor-generation-reclosure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow
): SuccessorGenerationCorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successorGenerationReconciliationId: row.successor_generation_reconciliation_id,
    successorGenerationDeliveryId: row.successor_generation_delivery_id,
    activationId: row.activation_id,
    successorGenerationPlanId: row.successor_generation_plan_id,
    secondRecurrenceRetriageId: row.second_recurrence_retriage_id,
    nextGenerationRecurrenceId: row.next_generation_recurrence_id,
    predecessorNextGenerationReclosureId: row.predecessor_next_generation_reclosure_id,
    nextGenerationReclosureRegressionCheckId: row.next_generation_reclosure_regression_check_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    successorGenerationPlanFingerprint: row.successor_generation_plan_fingerprint,
    sourceNextGenerationRecurrenceFingerprint: row.source_next_generation_recurrence_fingerprint,
    sourceRegressionFingerprint: row.source_regression_fingerprint,
    sourceNextGenerationReclosureFingerprint: row.source_next_generation_reclosure_fingerprint,
    successorGenerationPackageId: row.successor_generation_package_id,
    successorGenerationReplayKey: row.successor_generation_replay_key,
    successorGenerationPackageFingerprint: row.successor_generation_package_fingerprint,
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
): SuccessorGenerationReconciliationExceptionReclosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role: row.role,
    successorGenerationReclosureId: row.successor_generation_reclosure_id,
    predecessorNextGenerationReclosureId: row.predecessor_next_generation_reclosure_id,
    nextGenerationRecurrenceId: row.next_generation_recurrence_id,
    secondRecurrenceRetriageId: row.second_recurrence_retriage_id,
    successorGenerationPlanId: row.successor_generation_plan_id,
    successorGenerationDeliveryId: row.successor_generation_delivery_id,
    successorGenerationReconciliationId: row.successor_generation_reconciliation_id,
    caseId: row.case_id,
    target: row.target,
    predecessorNextGenerationReclosureFingerprint: row.predecessor_next_generation_reclosure_fingerprint,
    nextGenerationRecurrenceFingerprint: row.next_generation_recurrence_fingerprint,
    successorGenerationPlanFingerprint: row.successor_generation_plan_fingerprint,
    successorGenerationPackageFingerprint: row.successor_generation_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    successorGenerationReclosureFingerprint: row.successor_generation_reclosure_fingerprint,
    reclosureNote: row.reclosure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listSuccessorGenerationCorrectiveClosureForUser(
  userId: string
): Promise<SuccessorGenerationCorrectiveClosureModel> {
  const successorGeneration = await listSuccessorGenerationCorrectiveDeliveryForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_successor_generation_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.created_at desc,r.successor_generation_reconciliation_id desc
       limit 500`
    );
    const reclosures = await client.query<ReclosureRow>(
      `select r.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_successor_generation_reclosures r
       join app.workspaces w on w.id=r.workspace_id
       join app.workspace_members wm
         on wm.workspace_id=r.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by r.closed_at desc,r.successor_generation_reclosure_id desc
       limit 500`
    );
    return { reconciliations: reconciliations.rows, reclosures: reclosures.rows };
  });

  const reconciliations = data.reconciliations.map(reconciliationFromRow);
  const reclosures = data.reclosures.map(reclosureFromRow);
  const accepted = successorGeneration.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<
    string,
    SuccessorGenerationCorrectiveDeliveryReconciliation
  >();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.successorGenerationDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    successorGeneration,
    reconciliations,
    reclosures,
    totals: {
      acceptedSuccessorGenerationDeliveries: accepted.length,
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

export async function loadAcceptedSuccessorGenerationCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; successorGenerationDeliveryId: string }
): Promise<AcceptedSuccessorGenerationCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      successor_generation_plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      retriage_status: string;
      next_generation_recurrence_id: string;
      latest_next_generation_recurrence_id: string;
      consumer_id: string;
      activation_id: string;
      successor_generation_package_id: string;
      successor_generation_replay_key: string;
      successor_generation_package_fingerprint: string;
      source_next_generation_recurrence_fingerprint: string;
      source_regression_fingerprint: string;
      source_next_generation_reclosure_fingerprint: string;
      next_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      next_generation_reclosure_fingerprint: string;
      predecessor_next_generation_reclosure_id: string;
      predecessor_next_generation_reclosure_fingerprint: string;
    }>(
      `select d.successor_generation_plan_id,d.status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,
              p.next_generation_recurrence_id,
              (
                select newest.next_generation_recurrence_id
                from app.workspace_reconciliation_exception_next_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.next_generation_recurrence_id desc
                limit 1
              ) as latest_next_generation_recurrence_id,
              d.consumer_id,d.activation_id,d.successor_generation_package_id,
              d.successor_generation_replay_key,d.successor_generation_package_fingerprint,
              p.source_next_generation_recurrence_fingerprint,p.source_regression_fingerprint,
              p.source_next_generation_reclosure_fingerprint,
              recurrence.next_generation_recurrence_fingerprint,recurrence.regression_fingerprint,
              recurrence.next_generation_reclosure_fingerprint,p.next_generation_reclosure_id as predecessor_next_generation_reclosure_id,
              predecessor_reclosure.next_generation_reclosure_fingerprint as predecessor_next_generation_reclosure_fingerprint
       from app.workspace_successor_generation_corrective_live_deliveries d
       join app.workspace_successor_generation_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.successor_generation_plan_id=d.successor_generation_plan_id
       join app.workspace_second_recurrence_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.second_recurrence_retriage_id=p.second_recurrence_retriage_id
       join app.workspace_reconciliation_exception_next_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_generation_recurrence_id=p.next_generation_recurrence_id
       join app.workspace_reconciliation_exception_next_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.next_generation_reclosure_id=p.next_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.successorGenerationDeliveryId]
    );
    return result.rows[0] ?? null;
  });

  if (!row) throw new Error("successor_generation_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("successor_generation_reconciliation_accepted_delivery_required");
  }
  if (
    row.plan_status !== "approved" ||
    row.retriage_status !== "approved" ||
    row.case_status !== "open"
  ) {
    throw new Error("successor_generation_reconciliation_open_approved_cycle_required");
  }
  if (row.next_generation_recurrence_id !== row.latest_next_generation_recurrence_id) {
    throw new Error("successor_generation_reconciliation_latest_recurrence_required");
  }
  if (
    row.source_next_generation_recurrence_fingerprint !== row.next_generation_recurrence_fingerprint ||
    row.source_regression_fingerprint !== row.regression_fingerprint ||
    row.source_next_generation_reclosure_fingerprint !== row.next_generation_reclosure_fingerprint ||
    row.source_next_generation_reclosure_fingerprint !== row.predecessor_next_generation_reclosure_fingerprint
  ) {
    throw new Error("successor_generation_reconciliation_next_generation_recurrence_identity_changed");
  }

  const execution = await loadApprovedSuccessorGenerationCorrectivePlanContext(
    userId,
    {
      workspaceId: input.workspaceId,
      successorGenerationPlanId: row.successor_generation_plan_id
    }
  );
  if (
    execution.successorGenerationPackage.packageId !== row.successor_generation_package_id ||
    execution.successorGenerationPackage.replayKey !== row.successor_generation_replay_key ||
    execution.successorGenerationPackage.fingerprint !==
      row.successor_generation_package_fingerprint ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("successor_generation_reconciliation_package_identity_mismatch");
  }

  const model = await listSuccessorGenerationCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.successorGenerationDeliveryId
  );
  if (
    !delivery ||
    delivery.status !== "accepted" ||
    delivery.activationId !== row.activation_id
  ) {
    throw new Error("successor_generation_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.successorGenerationPackage,
    predecessorNextGenerationReclosureId: row.predecessor_next_generation_reclosure_id,
    predecessorNextGenerationReclosureFingerprint: row.predecessor_next_generation_reclosure_fingerprint,
    nextGenerationRecurrenceFingerprint: row.next_generation_recurrence_fingerprint
  };
}

export function compareSuccessorGenerationCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordSuccessorGenerationCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedSuccessorGenerationCorrectiveReconciliationContext;
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
      next_generation_recurrence_id: string;
      latest_next_generation_recurrence_id: string;
      next_generation_recurrence_fingerprint: string;
      regression_fingerprint: string;
      next_generation_reclosure_fingerprint: string;
      consumer_id: string;
      plan_fingerprint: string;
      package_id: string;
      replay_key: string;
      package_fingerprint: string;
    }>(
      `select d.status as delivery_status,c.status as case_status,
              p.status as plan_status,t.status as retriage_status,p.next_generation_recurrence_id,
              (
                select newest.next_generation_recurrence_id
                from app.workspace_reconciliation_exception_next_generation_recurrences newest
                where newest.workspace_id=p.workspace_id
                  and newest.case_id=p.case_id
                order by newest.recurred_at desc,newest.next_generation_recurrence_id desc
                limit 1
              ) as latest_next_generation_recurrence_id,
              recurrence.next_generation_recurrence_fingerprint,
              recurrence.regression_fingerprint,
              recurrence.next_generation_reclosure_fingerprint,
              d.consumer_id,d.successor_generation_plan_fingerprint as plan_fingerprint,
              d.successor_generation_package_id as package_id,
              d.successor_generation_replay_key as replay_key,
              d.successor_generation_package_fingerprint as package_fingerprint
       from app.workspace_successor_generation_corrective_live_deliveries d
       join app.workspace_successor_generation_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id
        and p.successor_generation_plan_id=d.successor_generation_plan_id
       join app.workspace_second_recurrence_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.second_recurrence_retriage_id=p.second_recurrence_retriage_id
       join app.workspace_reconciliation_exception_next_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_generation_recurrence_id=p.next_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.delivery_status !== "accepted") {
      throw new Error("successor_generation_reconciliation_accepted_delivery_required");
    }
    if (
      row.case_status !== "open" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.next_generation_recurrence_id !== row.latest_next_generation_recurrence_id
    ) {
      throw new Error("successor_generation_reconciliation_open_approved_cycle_required");
    }
    if (
      row.next_generation_recurrence_fingerprint !== plan.sourceNextGenerationRecurrenceFingerprint ||
      row.regression_fingerprint !== plan.sourceRegressionFingerprint ||
      row.next_generation_reclosure_fingerprint !== plan.sourceNextGenerationReclosureFingerprint ||
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== plan.planFingerprint ||
      row.package_id !== input.context.package.packageId ||
      row.replay_key !== input.context.package.replayKey ||
      row.package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("successor_generation_reconciliation_package_identity_mismatch");
    }

    const successorGenerationReconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_successor_generation_delivery_reconciliations (
        workspace_id,successor_generation_reconciliation_id,successor_generation_delivery_id,
        activation_id,successor_generation_plan_id,second_recurrence_retriage_id,
        next_generation_recurrence_id,predecessor_next_generation_reclosure_id,next_generation_reclosure_regression_check_id,
        case_id,target,consumer_id,successor_generation_plan_fingerprint,
        source_next_generation_recurrence_fingerprint,source_regression_fingerprint,
        source_next_generation_reclosure_fingerprint,successor_generation_package_id,
        successor_generation_replay_key,successor_generation_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb,$30,now()
      )`,
      [
        input.workspaceId,
        successorGenerationReconciliationId,
        delivery.deliveryId,
        delivery.activationId,
        plan.successorGenerationPlanId,
        plan.secondRecurrenceRetriageId,
        plan.nextGenerationRecurrenceId,
        plan.nextGenerationReclosureId,
        plan.nextGenerationReclosureRegressionCheckId,
        plan.caseId,
        delivery.target,
        delivery.consumerId,
        plan.planFingerprint,
        plan.sourceNextGenerationRecurrenceFingerprint,
        plan.sourceRegressionFingerprint,
        plan.sourceNextGenerationReclosureFingerprint,
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
    return successorGenerationReconciliationId;
  });
}

export async function closeVerifiedSuccessorGenerationReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    successorGenerationDeliveryId: string;
    successorGenerationReconciliationId: string;
    reclosureNote: string;
  }
) {
  const reclosureNote = input.reclosureNote.trim().slice(0,8000);
  if (!reclosureNote) throw new Error("successor_generation_reclosure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const result = await client.query<{
      successor_generation_reconciliation_id: string;
      successor_generation_delivery_id: string;
      successor_generation_plan_id: string;
      second_recurrence_retriage_id: string;
      next_generation_recurrence_id: string;
      predecessor_next_generation_reclosure_id: string;
      case_id: string;
      target: IntegrationTarget;
      successor_generation_plan_fingerprint: string;
      successor_generation_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      retriage_status: string;
      case_status: string;
      latest_reconciliation_id: string;
      latest_next_generation_recurrence_id: string;
      predecessor_next_generation_reclosure_fingerprint: string;
      next_generation_recurrence_fingerprint: string;
    }>(
      `select r.successor_generation_reconciliation_id,r.successor_generation_delivery_id,
              r.successor_generation_plan_id,r.second_recurrence_retriage_id,r.next_generation_recurrence_id,
              r.predecessor_next_generation_reclosure_id,r.case_id,r.target,
              r.successor_generation_plan_fingerprint,
              r.successor_generation_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              t.status as retriage_status,c.status as case_status,
              (
                select newest.successor_generation_reconciliation_id
                from app.workspace_successor_generation_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.successor_generation_delivery_id=r.successor_generation_delivery_id
                order by newest.created_at desc,newest.successor_generation_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id,
              (
                select newest_recurrence.next_generation_recurrence_id
                from app.workspace_reconciliation_exception_next_generation_recurrences newest_recurrence
                where newest_recurrence.workspace_id=r.workspace_id
                  and newest_recurrence.case_id=r.case_id
                order by newest_recurrence.recurred_at desc,newest_recurrence.next_generation_recurrence_id desc
                limit 1
              ) as latest_next_generation_recurrence_id,
              predecessor_reclosure.next_generation_reclosure_fingerprint as predecessor_next_generation_reclosure_fingerprint,
              recurrence.next_generation_recurrence_fingerprint
       from app.workspace_successor_generation_delivery_reconciliations r
       join app.workspace_successor_generation_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id
        and d.delivery_id=r.successor_generation_delivery_id
       join app.workspace_successor_generation_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id
        and p.successor_generation_plan_id=r.successor_generation_plan_id
       join app.workspace_second_recurrence_exception_triage_cycles t
         on t.workspace_id=p.workspace_id
        and t.second_recurrence_retriage_id=p.second_recurrence_retriage_id
       join app.workspace_reconciliation_exception_next_generation_recurrences recurrence
         on recurrence.workspace_id=p.workspace_id
        and recurrence.next_generation_recurrence_id=p.next_generation_recurrence_id
       join app.workspace_reconciliation_exception_next_generation_reclosures predecessor_reclosure
         on predecessor_reclosure.workspace_id=p.workspace_id
        and predecessor_reclosure.next_generation_reclosure_id=p.next_generation_reclosure_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where r.workspace_id=$1
         and r.case_id=$2
         and r.successor_generation_delivery_id=$3
         and r.successor_generation_reconciliation_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.caseId,
        input.successorGenerationDeliveryId,
        input.successorGenerationReconciliationId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("successor_generation_reclosure_verification_not_found");
    if (row.status !== "matched") {
      throw new Error("successor_generation_reclosure_verified_match_required");
    }
    if (
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.retriage_status !== "approved" ||
      row.case_status !== "open"
    ) {
      throw new Error("successor_generation_reclosure_open_approved_cycle_required");
    }
    if (
      row.latest_reconciliation_id !== row.successor_generation_reconciliation_id
    ) {
      throw new Error("successor_generation_reclosure_latest_verification_required");
    }
    if (row.latest_next_generation_recurrence_id !== row.next_generation_recurrence_id) {
      throw new Error("successor_generation_reclosure_latest_recurrence_required");
    }

    const existing = await client.query<{ successor_generation_reclosure_id: string }>(
      `select successor_generation_reclosure_id
       from app.workspace_reconciliation_successor_generation_reclosures
       where workspace_id=$1 and next_generation_recurrence_id=$2
       limit 1`,
      [input.workspaceId, row.next_generation_recurrence_id]
    );
    if (existing.rows[0]) return existing.rows[0].successor_generation_reclosure_id;

    const reclosureFingerprint = successorGenerationReclosureFingerprint({
      predecessorNextGenerationReclosureId: row.predecessor_next_generation_reclosure_id,
      nextGenerationRecurrenceId: row.next_generation_recurrence_id,
      secondRecurrenceRetriageId: row.second_recurrence_retriage_id,
      successorGenerationPlanId: row.successor_generation_plan_id,
      successorGenerationDeliveryId: row.successor_generation_delivery_id,
      successorGenerationReconciliationId: row.successor_generation_reconciliation_id,
      predecessorNextGenerationReclosureFingerprint: row.predecessor_next_generation_reclosure_fingerprint,
      nextGenerationRecurrenceFingerprint: row.next_generation_recurrence_fingerprint,
      successorGenerationPlanFingerprint: row.successor_generation_plan_fingerprint,
      successorGenerationPackageFingerprint: row.successor_generation_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      reclosureNote
    });
    const successorGenerationReclosureId = randomUUID();

    await client.query(
      `insert into app.workspace_reconciliation_successor_generation_reclosures (
        workspace_id,successor_generation_reclosure_id,predecessor_next_generation_reclosure_id,
        next_generation_recurrence_id,second_recurrence_retriage_id,successor_generation_plan_id,
        successor_generation_delivery_id,successor_generation_reconciliation_id,case_id,
        target,predecessor_next_generation_reclosure_fingerprint,next_generation_recurrence_fingerprint,
        successor_generation_plan_fingerprint,successor_generation_package_fingerprint,
        verification_fingerprint,successor_generation_reclosure_fingerprint,
        reclosure_note,closed_by,closed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now()
      )`,
      [
        input.workspaceId,
        successorGenerationReclosureId,
        row.predecessor_next_generation_reclosure_id,
        row.next_generation_recurrence_id,
        row.second_recurrence_retriage_id,
        row.successor_generation_plan_id,
        row.successor_generation_delivery_id,
        row.successor_generation_reconciliation_id,
        row.case_id,
        row.target,
        row.predecessor_next_generation_reclosure_fingerprint,
        row.next_generation_recurrence_fingerprint,
        row.successor_generation_plan_fingerprint,
        row.successor_generation_package_fingerprint,
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
      throw new Error("successor_generation_reclosure_open_case_required");
    }

    return successorGenerationReclosureId;
  });
}
