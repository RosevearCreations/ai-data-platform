import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult,
  type ReconciliationStatus
} from "./post-delivery-reconciliation";
import {
  listCorrectiveDeliveryForUser,
  loadApprovedCorrectivePlanContext,
  type CorrectiveDeliveryModel,
  type CorrectiveLiveDelivery,
  type CorrectivePlanExecutionContext
} from "./corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export interface CorrectiveDeliveryReconciliation {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  correctiveReconciliationId: string;
  correctiveDeliveryId: string;
  sourceDeliveryId: string;
  planId: string;
  caseId: string;
  target: IntegrationTarget;
  consumerId: string;
  planFingerprint: string;
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
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

export interface ReconciliationExceptionClosure {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  closureId: string;
  caseId: string;
  planId: string;
  correctiveDeliveryId: string;
  correctiveReconciliationId: string;
  target: IntegrationTarget;
  planFingerprint: string;
  correctivePackageFingerprint: string;
  verificationFingerprint: string;
  closureFingerprint: string;
  closureNote: string;
  closedBy: string;
  closedAt: string;
  canManage: boolean;
}

export interface CorrectiveClosureModel {
  corrective: CorrectiveDeliveryModel;
  reconciliations: CorrectiveDeliveryReconciliation[];
  closures: ReconciliationExceptionClosure[];
  totals: {
    acceptedCorrectiveDeliveries: number;
    neverVerified: number;
    matchedLatest: number;
    driftLatest: number;
    verificationErrors: number;
    verifiedClosures: number;
  };
}

export interface AcceptedCorrectiveReconciliationContext {
  delivery: CorrectiveLiveDelivery;
  execution: CorrectivePlanExecutionContext;
  package: IntegrationPackageV1;
}

type ReconciliationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  corrective_reconciliation_id: string;
  corrective_delivery_id: string;
  source_delivery_id: string;
  plan_id: string;
  case_id: string;
  target: IntegrationTarget;
  consumer_id: string;
  plan_fingerprint: string;
  corrective_package_id: string;
  corrective_replay_key: string;
  corrective_package_fingerprint: string;
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

type ClosureRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  closure_id: string;
  case_id: string;
  plan_id: string;
  corrective_delivery_id: string;
  corrective_reconciliation_id: string;
  target: IntegrationTarget;
  plan_fingerprint: string;
  corrective_package_fingerprint: string;
  verification_fingerprint: string;
  closure_fingerprint: string;
  closure_note: string;
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
    throw new Error("corrective_closure_manager_required");
  }
  return role;
}

export function correctiveClosureConfirmation(target: IntegrationTarget) {
  return "CLOSE VERIFIED " + target.toUpperCase() + " EXCEPTION";
}

export function correctiveReconciliationErrorFingerprint(input: {
  correctivePackageId: string;
  correctiveReplayKey: string;
  correctivePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("corrective-verify1-", input);
}

export function correctiveClosureFingerprint(input: {
  caseId: string;
  planId: string;
  correctiveDeliveryId: string;
  correctiveReconciliationId: string;
  planFingerprint: string;
  correctivePackageFingerprint: string;
  verificationFingerprint: string;
  closureNote: string;
}) {
  return fingerprint("corrective-closure1-", input);
}

function reconciliationFromRow(
  row: ReconciliationRow,
  role: WorkspaceRole
): CorrectiveDeliveryReconciliation {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    correctiveReconciliationId: row.corrective_reconciliation_id,
    correctiveDeliveryId: row.corrective_delivery_id,
    sourceDeliveryId: row.source_delivery_id,
    planId: row.plan_id,
    caseId: row.case_id,
    target: row.target,
    consumerId: row.consumer_id,
    planFingerprint: row.plan_fingerprint,
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

function closureFromRow(
  row: ClosureRow,
  role: WorkspaceRole
): ReconciliationExceptionClosure {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    closureId: row.closure_id,
    caseId: row.case_id,
    planId: row.plan_id,
    correctiveDeliveryId: row.corrective_delivery_id,
    correctiveReconciliationId: row.corrective_reconciliation_id,
    target: row.target,
    planFingerprint: row.plan_fingerprint,
    correctivePackageFingerprint: row.corrective_package_fingerprint,
    verificationFingerprint: row.verification_fingerprint,
    closureFingerprint: row.closure_fingerprint,
    closureNote: row.closure_note,
    closedBy: row.closed_by,
    closedAt: row.closed_at.toISOString(),
    canManage: role === "owner" || role === "admin"
  };
}

export async function listCorrectiveClosureForUser(
  userId: string
): Promise<CorrectiveClosureModel> {
  const corrective = await listCorrectiveDeliveryForUser(userId);
  const roles = new Map(
    corrective.triage.reconciliation.live.bridge.workspaces.map((workspace) => [
      workspace.id,
      workspace.role
    ])
  );
  const data = await withUserDatabase(userId, async (client) => {
    const reconciliations = await client.query<ReconciliationRow>(
      `select r.*,w.name as workspace_name
       from app.workspace_corrective_delivery_reconciliations r
       join app.workspaces w on w.id=r.workspace_id
       order by r.created_at desc
       limit 500`
    );
    const closures = await client.query<ClosureRow>(
      `select c.*,w.name as workspace_name
       from app.workspace_reconciliation_exception_closures c
       join app.workspaces w on w.id=c.workspace_id
       order by c.closed_at desc
       limit 500`
    );
    return {
      reconciliations: reconciliations.rows,
      closures: closures.rows
    };
  });

  const reconciliations = data.reconciliations.map((row) =>
    reconciliationFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );
  const closures = data.closures.map((row) =>
    closureFromRow(
      row,
      (roles.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );

  const accepted = corrective.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );
  const latestByDelivery = new Map<string, CorrectiveDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.correctiveDeliveryId;
    if (!latestByDelivery.has(key)) latestByDelivery.set(key, item);
  }

  return {
    corrective,
    reconciliations,
    closures,
    totals: {
      acceptedCorrectiveDeliveries: accepted.length,
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
      verifiedClosures: closures.length
    }
  };
}

export async function loadAcceptedCorrectiveReconciliationContext(
  userId: string,
  input: { workspaceId: string; correctiveDeliveryId: string }
): Promise<AcceptedCorrectiveReconciliationContext> {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      plan_id: string;
      status: string;
      case_status: string;
      plan_status: string;
      consumer_id: string;
      source_delivery_id: string;
      corrective_package_id: string;
      corrective_replay_key: string;
      corrective_package_fingerprint: string;
    }>(
      `select d.plan_id,d.status,c.status as case_status,p.status as plan_status,
              d.consumer_id,d.source_delivery_id,d.corrective_package_id,
              d.corrective_replay_key,d.corrective_package_fingerprint
       from app.workspace_corrective_live_deliveries d
       join app.workspace_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id and p.plan_id=d.plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, input.correctiveDeliveryId]
    );
    return result.rows[0] ?? null;
  });
  if (!row) throw new Error("corrective_reconciliation_delivery_not_found");
  if (row.status !== "accepted") {
    throw new Error("corrective_reconciliation_accepted_delivery_required");
  }
  if (row.plan_status !== "approved" || row.case_status !== "approved") {
    throw new Error("corrective_reconciliation_approved_case_required");
  }

  const execution = await loadApprovedCorrectivePlanContext(userId, {
    workspaceId: input.workspaceId,
    planId: row.plan_id
  });
  if (
    execution.correctivePackage.packageId !== row.corrective_package_id ||
    execution.correctivePackage.replayKey !== row.corrective_replay_key ||
    execution.correctivePackage.fingerprint !== row.corrective_package_fingerprint ||
    execution.plan.deliveryId !== row.source_delivery_id ||
    execution.consumerId !== row.consumer_id
  ) {
    throw new Error("corrective_reconciliation_package_identity_mismatch");
  }

  const model = await listCorrectiveDeliveryForUser(userId);
  const delivery = model.deliveries.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      item.deliveryId === input.correctiveDeliveryId
  );
  if (!delivery || delivery.status !== "accepted") {
    throw new Error("corrective_reconciliation_delivery_not_found");
  }

  return {
    delivery,
    execution,
    package: execution.correctivePackage
  };
}

export function compareCorrectiveConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  return compareConsumerState(integrationPackage, response);
}

export async function recordCorrectiveDeliveryReconciliation(
  userId: string,
  input: {
    workspaceId: string;
    context: AcceptedCorrectiveReconciliationContext;
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
    const delivery = input.context.delivery;
    const execution = input.context.execution;

    const current = await client.query<{
      status: string;
      plan_status: string;
      case_status: string;
      consumer_id: string;
      plan_fingerprint: string;
      corrective_package_id: string;
      corrective_replay_key: string;
      corrective_package_fingerprint: string;
    }>(
      `select d.status,p.status as plan_status,c.status as case_status,
              d.consumer_id,d.plan_fingerprint,d.corrective_package_id,
              d.corrective_replay_key,d.corrective_package_fingerprint
       from app.workspace_corrective_live_deliveries d
       join app.workspace_corrective_delivery_plans p
         on p.workspace_id=d.workspace_id and p.plan_id=d.plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=p.workspace_id and c.case_id=p.case_id
       where d.workspace_id=$1 and d.delivery_id=$2
       limit 1`,
      [input.workspaceId, delivery.deliveryId]
    );
    const row = current.rows[0];
    if (!row || row.status !== "accepted") {
      throw new Error("corrective_reconciliation_accepted_delivery_required");
    }
    if (row.plan_status !== "approved" || row.case_status !== "approved") {
      throw new Error("corrective_reconciliation_approved_case_required");
    }
    if (
      row.consumer_id !== delivery.consumerId ||
      row.plan_fingerprint !== execution.plan.planFingerprint ||
      row.corrective_package_id !== input.context.package.packageId ||
      row.corrective_replay_key !== input.context.package.replayKey ||
      row.corrective_package_fingerprint !== input.context.package.fingerprint
    ) {
      throw new Error("corrective_reconciliation_package_identity_mismatch");
    }

    const reconciliationId = randomUUID();
    await client.query(
      `insert into app.workspace_corrective_delivery_reconciliations (
        workspace_id,corrective_reconciliation_id,corrective_delivery_id,
        source_delivery_id,plan_id,case_id,target,consumer_id,plan_fingerprint,
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
        reconciliationId,
        delivery.deliveryId,
        delivery.sourceDeliveryId,
        delivery.planId,
        execution.plan.caseId,
        delivery.target,
        delivery.consumerId,
        execution.plan.planFingerprint,
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
    return reconciliationId;
  });
}

export async function closeVerifiedReconciliationException(
  userId: string,
  input: {
    workspaceId: string;
    caseId: string;
    correctiveDeliveryId: string;
    correctiveReconciliationId: string;
    closureNote: string;
  }
) {
  const closureNote = input.closureNote.trim().slice(0, 8000);
  if (!closureNote) throw new Error("corrective_closure_note_required");

  return withUserDatabase(userId, async (client) => {
    await requireManager(client, input.workspaceId);

    const existing = await client.query<{ closure_id: string }>(
      `select closure_id
       from app.workspace_reconciliation_exception_closures
       where workspace_id=$1 and case_id=$2
       limit 1`,
      [input.workspaceId, input.caseId]
    );
    if (existing.rows[0]) return existing.rows[0].closure_id;

    const result = await client.query<{
      corrective_reconciliation_id: string;
      corrective_delivery_id: string;
      plan_id: string;
      case_id: string;
      target: IntegrationTarget;
      plan_fingerprint: string;
      corrective_package_fingerprint: string;
      verification_fingerprint: string;
      status: ReconciliationStatus;
      delivery_status: string;
      plan_status: string;
      case_status: string;
      latest_reconciliation_id: string;
    }>(
      `select r.corrective_reconciliation_id,r.corrective_delivery_id,
              r.plan_id,r.case_id,r.target,r.plan_fingerprint,
              r.corrective_package_fingerprint,r.verification_fingerprint,
              r.status,d.status as delivery_status,p.status as plan_status,
              c.status as case_status,
              (
                select newest.corrective_reconciliation_id
                from app.workspace_corrective_delivery_reconciliations newest
                where newest.workspace_id=r.workspace_id
                  and newest.corrective_delivery_id=r.corrective_delivery_id
                order by newest.created_at desc,newest.corrective_reconciliation_id desc
                limit 1
              ) as latest_reconciliation_id
       from app.workspace_corrective_delivery_reconciliations r
       join app.workspace_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.corrective_delivery_id
       join app.workspace_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.plan_id=r.plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       where r.workspace_id=$1
         and r.corrective_reconciliation_id=$2
         and r.corrective_delivery_id=$3
         and r.case_id=$4
       limit 1`,
      [
        input.workspaceId,
        input.correctiveReconciliationId,
        input.correctiveDeliveryId,
        input.caseId
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("corrective_closure_verification_not_found");
    if (
      row.status !== "matched" ||
      row.delivery_status !== "accepted" ||
      row.plan_status !== "approved" ||
      row.case_status !== "approved"
    ) {
      throw new Error("corrective_closure_verified_match_required");
    }
    if (row.latest_reconciliation_id !== row.corrective_reconciliation_id) {
      throw new Error("corrective_closure_latest_verification_required");
    }

    const closureFingerprint = correctiveClosureFingerprint({
      caseId: row.case_id,
      planId: row.plan_id,
      correctiveDeliveryId: row.corrective_delivery_id,
      correctiveReconciliationId: row.corrective_reconciliation_id,
      planFingerprint: row.plan_fingerprint,
      correctivePackageFingerprint: row.corrective_package_fingerprint,
      verificationFingerprint: row.verification_fingerprint,
      closureNote
    });
    const closureId = randomUUID();

    await client.query(
        `insert into app.workspace_reconciliation_exception_closures (
          workspace_id,closure_id,case_id,plan_id,corrective_delivery_id,
          corrective_reconciliation_id,target,plan_fingerprint,
          corrective_package_fingerprint,verification_fingerprint,
          closure_fingerprint,closure_note,closed_by,closed_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()
        )`,
        [
          input.workspaceId,
          closureId,
          row.case_id,
          row.plan_id,
          row.corrective_delivery_id,
          row.corrective_reconciliation_id,
          row.target,
          row.plan_fingerprint,
          row.corrective_package_fingerprint,
          row.verification_fingerprint,
          closureFingerprint,
          closureNote,
          userId
        ]
      );
    const closed = await client.query(
        `update app.workspace_reconciliation_exception_cases
         set status='closed',updated_by=$3,updated_at=now(),
             closed_by=$3,closed_at=now(),
             investigation_note=case
               when investigation_note='' then $4
               else investigation_note || E'\\n\\nBuild 055 verified closure: ' || $4
             end
         where workspace_id=$1 and case_id=$2 and status='approved'`,
        [input.workspaceId, row.case_id, userId, closureNote]
      );
    if (!closed.rowCount) {
      throw new Error("corrective_closure_case_not_approved");
    }

    return closureId;
  });
}
