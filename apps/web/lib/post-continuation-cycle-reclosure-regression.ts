import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listContinuationCycleCorrectiveClosureForUser,
  type ContinuationCycleCorrectiveClosureModel,
  type ContinuationCycleReconciliationExceptionReclosure
} from "./continuation-cycle-corrective-delivery-reconciliation";
import {
  loadApprovedContinuationCycleCorrectivePlanContext,
  type ContinuationCycleCorrectiveExecutionContext,
  type ContinuationCycleCorrectiveLiveDelivery
} from "./continuation-cycle-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type PostContinuationCycleReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostContinuationCycleReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  continuationCycleReclosureRegressionCheckId: string;
  continuationCycleReclosureId: string;
  predecessorSuccessiveCycleReclosureId: string;
  successiveCycleRecurrenceId: string;
  caseId: string;
  continuationCyclePlanId: string;
  continuationCycleDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  continuationCycleReclosureFingerprint: string;
  successiveCycleRecurrenceFingerprint: string;
  continuationCyclePlanFingerprint: string;
  continuationCyclePackageId: string;
  continuationCycleReplayKey: string;
  continuationCyclePackageFingerprint: string;
  status: PostContinuationCycleReclosureStatus;
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

export interface ContinuationCycleExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  continuationCycleRecurrenceId: string;
  continuationCycleReclosureId: string;
  continuationCycleReclosureRegressionCheckId: string;
  predecessorSuccessiveCycleRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  continuationCycleReclosureFingerprint: string;
  regressionFingerprint: string;
  continuationCycleRecurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostContinuationCycleReclosureModel {
  closure: ContinuationCycleCorrectiveClosureModel;
  checks: PostContinuationCycleReclosureCheck[];
  recurrences: ContinuationCycleExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostContinuationCycleReclosureContext {
  reclosure: ContinuationCycleReconciliationExceptionReclosure;
  delivery: ContinuationCycleCorrectiveLiveDelivery;
  execution: ContinuationCycleCorrectiveExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  continuation_cycle_reclosure_regression_check_id: string;
  continuation_cycle_reclosure_id: string; predecessor_successive_cycle_reclosure_id: string;
  successive_cycle_recurrence_id: string; case_id: string; continuation_cycle_plan_id: string;
  continuation_cycle_delivery_id: string; target: IntegrationTarget; consumer_id: string;
  continuation_cycle_reclosure_fingerprint: string; successive_cycle_recurrence_fingerprint: string;
  continuation_cycle_plan_fingerprint: string; continuation_cycle_package_id: string;
  continuation_cycle_replay_key: string; continuation_cycle_package_fingerprint: string;
  status: PostContinuationCycleReclosureStatus; expected_record_count: number;
  matched_count: number; mismatched_count: number; missing_count: number;
  validation_code: string; http_status: number | null; consumer_verified_at: Date | null;
  verification_fingerprint: string; record_results: ReconciliationRecordResult[];
  actor_user_id: string; created_at: Date;
};

type RecurrenceRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  continuation_cycle_recurrence_id: string; continuation_cycle_reclosure_id: string;
  continuation_cycle_reclosure_regression_check_id: string; predecessor_successive_cycle_recurrence_id: string;
  case_id: string; target: IntegrationTarget; continuation_cycle_reclosure_fingerprint: string;
  regression_fingerprint: string; continuation_cycle_recurrence_fingerprint: string;
  recurrence_reason: string; recurred_by: string; recurred_at: Date;
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonRecord)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v]) => [k, canonical(v)]));
  }
  return value;
}

function fingerprint(prefix: string, value: unknown) {
  return prefix + createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

async function requireManager(client: PoolClient, workspaceId: string) {
  const r=await client.query<{role:WorkspaceRole}>(
    `select role from app.workspace_members
     where workspace_id=$1 and user_id=nullif(current_setting('app.user_id',true),'') limit 1`,
    [workspaceId]
  );
  if (r.rows[0]?.role !== "owner" && r.rows[0]?.role !== "admin") {
    throw new Error("post_continuation_cycle_reclosure_manager_required");
  }
}

export function continuationCycleRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN CONTINUATION-CYCLE RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postContinuationCycleReclosureErrorFingerprint(input: {
  continuationCycleReclosureId: string;
  continuationCyclePackageId: string;
  continuationCycleReplayKey: string;
  continuationCyclePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-continuation-cycle-reclosure1-", input);
}

export function continuationCycleRecurrenceFingerprint(input: {
  continuationCycleReclosureId: string;
  continuationCycleReclosureRegressionCheckId: string;
  caseId: string;
  continuationCycleReclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("continuation-cycle-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostContinuationCycleReclosureCheck {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    continuationCycleReclosureRegressionCheckId: row.continuation_cycle_reclosure_regression_check_id,
    continuationCycleReclosureId: row.continuation_cycle_reclosure_id,
    predecessorSuccessiveCycleReclosureId: row.predecessor_successive_cycle_reclosure_id,
    successiveCycleRecurrenceId: row.successive_cycle_recurrence_id, caseId: row.case_id,
    continuationCyclePlanId: row.continuation_cycle_plan_id,
    continuationCycleDeliveryId: row.continuation_cycle_delivery_id,
    target: row.target, consumerId: row.consumer_id,
    continuationCycleReclosureFingerprint: row.continuation_cycle_reclosure_fingerprint,
    successiveCycleRecurrenceFingerprint: row.successive_cycle_recurrence_fingerprint,
    continuationCyclePlanFingerprint: row.continuation_cycle_plan_fingerprint,
    continuationCyclePackageId: row.continuation_cycle_package_id,
    continuationCycleReplayKey: row.continuation_cycle_replay_key,
    continuationCyclePackageFingerprint: row.continuation_cycle_package_fingerprint,
    status: row.status, expectedRecordCount: Number(row.expected_record_count),
    matchedCount: Number(row.matched_count), mismatchedCount: Number(row.mismatched_count),
    missingCount: Number(row.missing_count), validationCode: row.validation_code,
    httpStatus: row.http_status, consumerVerifiedAt: row.consumer_verified_at?.toISOString() ?? null,
    verificationFingerprint: row.verification_fingerprint,
    recordResults: Array.isArray(row.record_results) ? row.record_results : [],
    actorUserId: row.actor_user_id, createdAt: row.created_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

function recurrenceFromRow(row: RecurrenceRow): ContinuationCycleExceptionRecurrence {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    continuationCycleRecurrenceId: row.continuation_cycle_recurrence_id,
    continuationCycleReclosureId: row.continuation_cycle_reclosure_id,
    continuationCycleReclosureRegressionCheckId: row.continuation_cycle_reclosure_regression_check_id,
    predecessorSuccessiveCycleRecurrenceId: row.predecessor_successive_cycle_recurrence_id, caseId: row.case_id,
    target: row.target, continuationCycleReclosureFingerprint: row.continuation_cycle_reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    continuationCycleRecurrenceFingerprint: row.continuation_cycle_recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason, recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostContinuationCycleReclosureForUser(
  userId: string
): Promise<PostContinuationCycleReclosureModel> {
  const closure = await listContinuationCycleCorrectiveClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_post_continuation_cycle_reclosure_checks x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.created_at desc,x.continuation_cycle_reclosure_regression_check_id desc limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_continuation_cycle_recurrences x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.recurred_at desc,x.continuation_cycle_recurrence_id desc limit 500`
    );
    return {checks:checks.rows,recurrences:recurrences.rows};
  });
  const checks=data.checks.map(checkFromRow);
  const recurrences=data.recurrences.map(recurrenceFromRow);
  const latest=new Map<string,PostContinuationCycleReclosureCheck>();
  for(const item of checks){
    const key=item.workspaceId+":"+item.continuationCycleReclosureId;
    if(!latest.has(key)) latest.set(key,item);
  }
  return {
    closure, checks, recurrences,
    totals:{
      verifiedReclosures:closure.reclosures.length,
      neverChecked:closure.reclosures.filter(x=>!latest.has(x.workspaceId+":"+x.continuationCycleReclosureId)).length,
      stableLatest:[...latest.values()].filter(x=>x.status==="stable").length,
      recurredLatest:[...latest.values()].filter(x=>x.status==="recurred").length,
      verificationErrors:[...latest.values()].filter(x=>x.status==="rejected"||x.status==="transport-error").length,
      governedRecurrences:recurrences.length
    }
  };
}

export async function loadPostContinuationCycleReclosureContext(
  userId: string,
  input: {workspaceId:string; continuationCycleReclosureId:string}
): Promise<PostContinuationCycleReclosureContext> {
  const model=await listContinuationCycleCorrectiveClosureForUser(userId);
  const reclosure=model.reclosures.find(x=>
    x.workspaceId===input.workspaceId &&
    x.continuationCycleReclosureId===input.continuationCycleReclosureId
  );
  if(!reclosure) throw new Error("post_continuation_cycle_reclosure_not_found");
  const delivery=model.continuationCycle.deliveries.find(x=>
    x.workspaceId===input.workspaceId &&
    x.deliveryId===reclosure.continuationCycleDeliveryId
  );
  if(!delivery || delivery.status!=="accepted") {
    throw new Error("post_continuation_cycle_reclosure_accepted_delivery_required");
  }

  const gate=await withUserDatabase(userId,async(client)=>{
    const r=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; successive_cycle_recurrence_fingerprint:string;
      latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.continuation_cycle_reclosure_fingerprint as reclosure_fingerprint,
              recurrence.successive_cycle_recurrence_fingerprint,
              (
                select latest.continuation_cycle_reclosure_id
                from app.workspace_reconciliation_continuation_cycle_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.continuation_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.continuation_cycle_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_continuation_cycle_reclosures r
       join app.workspace_continuation_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.continuation_cycle_delivery_id
       join app.workspace_continuation_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.continuation_cycle_plan_id=r.continuation_cycle_plan_id
       join app.workspace_reconciliation_successive_cycle_recurrences recurrence
         on recurrence.workspace_id=r.workspace_id and recurrence.successive_cycle_recurrence_id=r.successive_cycle_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_continuation_cycle_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.continuation_cycle_reclosure_id=r.continuation_cycle_reclosure_id
       where r.workspace_id=$1 and r.continuation_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.continuationCycleReclosureId]
    );
    return r.rows[0]??null;
  });
  if(!gate) throw new Error("post_continuation_cycle_reclosure_not_found");
  if(gate.case_status!=="closed") throw new Error("post_continuation_cycle_reclosure_closed_case_required");
  if(gate.delivery_status!=="accepted" || gate.plan_status!=="approved") {
    throw new Error("post_continuation_cycle_reclosure_context_stale");
  }
  if(
    gate.reclosure_fingerprint!==reclosure.continuationCycleReclosureFingerprint ||
    gate.successive_cycle_recurrence_fingerprint!==reclosure.successiveCycleRecurrenceFingerprint ||
    gate.latest_reclosure_id!==reclosure.continuationCycleReclosureId
  ) throw new Error("post_continuation_cycle_reclosure_identity_mismatch");
  if(gate.recurrence2_id) throw new Error("post_continuation_cycle_reclosure_already_recurred");

  const execution=await loadApprovedContinuationCycleCorrectivePlanContext(userId,{
    workspaceId:input.workspaceId,
    continuationCyclePlanId:reclosure.continuationCyclePlanId,
    allowClosedCase:true
  });
  if(
    execution.plan.planFingerprint!==reclosure.continuationCyclePlanFingerprint ||
    execution.continuationCyclePackage.fingerprint!==reclosure.continuationCyclePackageFingerprint ||
    execution.continuationCyclePackage.packageId!==delivery.continuationCyclePackageId ||
    execution.continuationCyclePackage.replayKey!==delivery.continuationCycleReplayKey ||
    execution.continuationCyclePackage.fingerprint!==delivery.continuationCyclePackageFingerprint ||
    execution.consumerId!==delivery.consumerId
  ) throw new Error("post_continuation_cycle_reclosure_package_identity_mismatch");

  return {reclosure,delivery,execution,package:execution.continuationCyclePackage};
}

export function comparePostContinuationCycleReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison=compareConsumerState(integrationPackage,response);
  const status:PostContinuationCycleReclosureStatus =
    comparison.status==="matched" ? "stable" :
    comparison.status==="drift" ? "recurred" : comparison.status;
  return {...comparison,status};
}

export async function recordPostContinuationCycleReclosureCheck(
  userId:string,
  input:{
    workspaceId:string; context:PostContinuationCycleReclosureContext;
    status:PostContinuationCycleReclosureStatus; expectedRecordCount:number;
    matchedCount:number; mismatchedCount:number; missingCount:number;
    validationCode:string; httpStatus?:number|null; consumerVerifiedAt?:string|null;
    verificationFingerprint:string; recordResults:ReconciliationRecordResult[];
  }
) {
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const {reclosure,delivery,execution}=input.context;
    const current=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.continuation_cycle_reclosure_fingerprint as reclosure_fingerprint,
              (
                select latest.continuation_cycle_reclosure_id
                from app.workspace_reconciliation_continuation_cycle_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.continuation_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.continuation_cycle_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_continuation_cycle_reclosures r
       join app.workspace_continuation_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.continuation_cycle_delivery_id
       join app.workspace_continuation_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.continuation_cycle_plan_id=r.continuation_cycle_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_continuation_cycle_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.continuation_cycle_reclosure_id=r.continuation_cycle_reclosure_id
       where r.workspace_id=$1 and r.continuation_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,reclosure.continuationCycleReclosureId]
    );
    const row=current.rows[0];
    if(!row || row.case_status!=="closed") throw new Error("post_continuation_cycle_reclosure_closed_case_required");
    if(row.delivery_status!=="accepted" || row.plan_status!=="approved") throw new Error("post_continuation_cycle_reclosure_context_stale");
    if(
      row.reclosure_fingerprint!==reclosure.continuationCycleReclosureFingerprint ||
      row.latest_reclosure_id!==reclosure.continuationCycleReclosureId ||
      execution.plan.planFingerprint!==reclosure.continuationCyclePlanFingerprint ||
      input.context.package.packageId!==delivery.continuationCyclePackageId ||
      input.context.package.replayKey!==delivery.continuationCycleReplayKey ||
      input.context.package.fingerprint!==delivery.continuationCyclePackageFingerprint
    ) throw new Error("post_continuation_cycle_reclosure_identity_mismatch");
    if(row.recurrence2_id) throw new Error("post_continuation_cycle_reclosure_already_recurred");

    const id=randomUUID();
    await client.query(
      `insert into app.workspace_post_continuation_cycle_reclosure_checks (
        workspace_id,continuation_cycle_reclosure_regression_check_id,
        continuation_cycle_reclosure_id,predecessor_successive_cycle_reclosure_id,successive_cycle_recurrence_id,case_id,
        continuation_cycle_plan_id,continuation_cycle_delivery_id,target,consumer_id,
        continuation_cycle_reclosure_fingerprint,successive_cycle_recurrence_fingerprint,
        continuation_cycle_plan_fingerprint,continuation_cycle_package_id,
        continuation_cycle_replay_key,continuation_cycle_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,id,reclosure.continuationCycleReclosureId,
        reclosure.predecessorSuccessiveCycleReclosureId,reclosure.successiveCycleRecurrenceId,reclosure.caseId,
        reclosure.continuationCyclePlanId,reclosure.continuationCycleDeliveryId,
        reclosure.target,delivery.consumerId,reclosure.continuationCycleReclosureFingerprint,
        reclosure.successiveCycleRecurrenceFingerprint,reclosure.continuationCyclePlanFingerprint,
        delivery.continuationCyclePackageId,delivery.continuationCycleReplayKey,
        delivery.continuationCyclePackageFingerprint,input.status,input.expectedRecordCount,
        input.matchedCount,input.mismatchedCount,input.missingCount,
        input.validationCode.slice(0,96),input.httpStatus??null,
        input.consumerVerifiedAt??null,input.verificationFingerprint,
        JSON.stringify(input.recordResults),userId
      ]
    );
    return id;
  });
}

export async function recurContinuationCycleReclosedException(
  userId:string,
  input:{
    workspaceId:string; continuationCycleReclosureId:string;
    continuationCycleReclosureRegressionCheckId:string; recurrenceReason:string;
  }
) {
  const reason=input.recurrenceReason.trim().slice(0,8000);
  if(!reason) throw new Error("post_continuation_cycle_recurrence_reason_required");
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const existing=await client.query<{continuation_cycle_recurrence_id:string}>(
      `select continuation_cycle_recurrence_id
       from app.workspace_reconciliation_continuation_cycle_recurrences
       where workspace_id=$1 and continuation_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.continuationCycleReclosureId]
    );
    if(existing.rows[0]) return existing.rows[0].continuation_cycle_recurrence_id;

    const result=await client.query<{
      check_id:string; reclosure_id:string; predecessor_successive_cycle_recurrence_id:string;
      case_id:string; target:IntegrationTarget; status:PostContinuationCycleReclosureStatus;
      reclosure_fingerprint:string; verification_fingerprint:string;
      case_status:string; latest_check_id:string; latest_reclosure_id:string;
    }>(
      `select x.continuation_cycle_reclosure_regression_check_id as check_id,
              x.continuation_cycle_reclosure_id as reclosure_id,
              x.successive_cycle_recurrence_id as predecessor_successive_cycle_recurrence_id,x.case_id,x.target,x.status,
              x.continuation_cycle_reclosure_fingerprint as reclosure_fingerprint,
              x.verification_fingerprint,
              c.status as case_status,
              (
                select newest.continuation_cycle_reclosure_regression_check_id
                from app.workspace_post_continuation_cycle_reclosure_checks newest
                where newest.workspace_id=x.workspace_id
                  and newest.continuation_cycle_reclosure_id=x.continuation_cycle_reclosure_id
                order by newest.created_at desc,newest.continuation_cycle_reclosure_regression_check_id desc limit 1
              ) as latest_check_id,
              (
                select newest.continuation_cycle_reclosure_id
                from app.workspace_reconciliation_continuation_cycle_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.continuation_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id
       from app.workspace_post_continuation_cycle_reclosure_checks x
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=x.workspace_id and c.case_id=x.case_id
       where x.workspace_id=$1 and x.continuation_cycle_reclosure_id=$2
         and x.continuation_cycle_reclosure_regression_check_id=$3 limit 1`,
      [input.workspaceId,input.continuationCycleReclosureId,input.continuationCycleReclosureRegressionCheckId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("post_continuation_cycle_recurrence_check_not_found");
    if(row.status!=="recurred" || row.case_status!=="closed") {
      throw new Error("post_continuation_cycle_recurrence_recurred_closed_required");
    }
    if(row.latest_check_id!==row.check_id) throw new Error("post_continuation_cycle_recurrence_latest_check_required");
    if(row.latest_reclosure_id!==row.reclosure_id) throw new Error("post_continuation_cycle_recurrence_latest_reclosure_required");

    const continuationCycleRecurrenceId=randomUUID();
    const governed=continuationCycleRecurrenceFingerprint({
      continuationCycleReclosureId:row.reclosure_id,
      continuationCycleReclosureRegressionCheckId:row.check_id,
      caseId:row.case_id,
      continuationCycleReclosureFingerprint:row.reclosure_fingerprint,
      regressionFingerprint:row.verification_fingerprint,
      recurrenceReason:reason
    });
    await client.query(
      `insert into app.workspace_reconciliation_continuation_cycle_recurrences (
        workspace_id,continuation_cycle_recurrence_id,continuation_cycle_reclosure_id,
        continuation_cycle_reclosure_regression_check_id,predecessor_successive_cycle_recurrence_id,
        case_id,target,continuation_cycle_reclosure_fingerprint,regression_fingerprint,
        continuation_cycle_recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [input.workspaceId,continuationCycleRecurrenceId,row.reclosure_id,row.check_id,
       row.predecessor_successive_cycle_recurrence_id,row.case_id,row.target,row.reclosure_fingerprint,
       row.verification_fingerprint,governed,reason,userId]
    );
    const updated=await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
           investigation_note=left(
             case when investigation_note='' then $4
               else investigation_note || E'\n\nBuild 100 governed continuation-cycle recurrence: ' || $4 end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId,row.case_id,userId,reason]
    );
    if(!updated.rowCount) throw new Error("post_continuation_cycle_recurrence_closed_case_required");
    return continuationCycleRecurrenceId;
  });
}
