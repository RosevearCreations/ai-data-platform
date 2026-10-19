import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listNextCycleCorrectiveClosureForUser,
  type NextCycleCorrectiveClosureModel,
  type NextCycleReconciliationExceptionReclosure
} from "./next-cycle-corrective-delivery-reconciliation";
import {
  loadApprovedNextCycleCorrectivePlanContext,
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

export type PostNextCycleReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostNextCycleReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  nextCycleReclosureRegressionCheckId: string;
  nextCycleReclosureId: string;
  predecessorContinuationGenerationReclosureId: string;
  continuationGenerationRecurrenceId: string;
  caseId: string;
  nextCyclePlanId: string;
  nextCycleDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  nextCycleReclosureFingerprint: string;
  continuationGenerationRecurrenceFingerprint: string;
  nextCyclePlanFingerprint: string;
  nextCyclePackageId: string;
  nextCycleReplayKey: string;
  nextCyclePackageFingerprint: string;
  status: PostNextCycleReclosureStatus;
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

export interface NextCycleExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  nextCycleRecurrenceId: string;
  nextCycleReclosureId: string;
  nextCycleReclosureRegressionCheckId: string;
  predecessorContinuationGenerationRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  nextCycleReclosureFingerprint: string;
  regressionFingerprint: string;
  nextCycleRecurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostNextCycleReclosureModel {
  closure: NextCycleCorrectiveClosureModel;
  checks: PostNextCycleReclosureCheck[];
  recurrences: NextCycleExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostNextCycleReclosureContext {
  reclosure: NextCycleReconciliationExceptionReclosure;
  delivery: NextCycleCorrectiveLiveDelivery;
  execution: NextCycleCorrectiveExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  next_cycle_reclosure_regression_check_id: string;
  next_cycle_reclosure_id: string; predecessor_continuation_generation_reclosure_id: string;
  continuation_generation_recurrence_id: string; case_id: string; next_cycle_plan_id: string;
  next_cycle_delivery_id: string; target: IntegrationTarget; consumer_id: string;
  next_cycle_reclosure_fingerprint: string; continuation_generation_recurrence_fingerprint: string;
  next_cycle_plan_fingerprint: string; next_cycle_package_id: string;
  next_cycle_replay_key: string; next_cycle_package_fingerprint: string;
  status: PostNextCycleReclosureStatus; expected_record_count: number;
  matched_count: number; mismatched_count: number; missing_count: number;
  validation_code: string; http_status: number | null; consumer_verified_at: Date | null;
  verification_fingerprint: string; record_results: ReconciliationRecordResult[];
  actor_user_id: string; created_at: Date;
};

type RecurrenceRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  next_cycle_recurrence_id: string; next_cycle_reclosure_id: string;
  next_cycle_reclosure_regression_check_id: string; predecessor_continuation_generation_recurrence_id: string;
  case_id: string; target: IntegrationTarget; next_cycle_reclosure_fingerprint: string;
  regression_fingerprint: string; next_cycle_recurrence_fingerprint: string;
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
    throw new Error("post_next_cycle_reclosure_manager_required");
  }
}

export function nextCycleRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN NEXT-CYCLE RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postNextCycleReclosureErrorFingerprint(input: {
  nextCycleReclosureId: string;
  nextCyclePackageId: string;
  nextCycleReplayKey: string;
  nextCyclePackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-next-cycle-reclosure1-", input);
}

export function nextCycleRecurrenceFingerprint(input: {
  nextCycleReclosureId: string;
  nextCycleReclosureRegressionCheckId: string;
  caseId: string;
  nextCycleReclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("next-cycle-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostNextCycleReclosureCheck {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    nextCycleReclosureRegressionCheckId: row.next_cycle_reclosure_regression_check_id,
    nextCycleReclosureId: row.next_cycle_reclosure_id,
    predecessorContinuationGenerationReclosureId: row.predecessor_continuation_generation_reclosure_id,
    continuationGenerationRecurrenceId: row.continuation_generation_recurrence_id, caseId: row.case_id,
    nextCyclePlanId: row.next_cycle_plan_id,
    nextCycleDeliveryId: row.next_cycle_delivery_id,
    target: row.target, consumerId: row.consumer_id,
    nextCycleReclosureFingerprint: row.next_cycle_reclosure_fingerprint,
    continuationGenerationRecurrenceFingerprint: row.continuation_generation_recurrence_fingerprint,
    nextCyclePlanFingerprint: row.next_cycle_plan_fingerprint,
    nextCyclePackageId: row.next_cycle_package_id,
    nextCycleReplayKey: row.next_cycle_replay_key,
    nextCyclePackageFingerprint: row.next_cycle_package_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): NextCycleExceptionRecurrence {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    nextCycleRecurrenceId: row.next_cycle_recurrence_id,
    nextCycleReclosureId: row.next_cycle_reclosure_id,
    nextCycleReclosureRegressionCheckId: row.next_cycle_reclosure_regression_check_id,
    predecessorContinuationGenerationRecurrenceId: row.predecessor_continuation_generation_recurrence_id, caseId: row.case_id,
    target: row.target, nextCycleReclosureFingerprint: row.next_cycle_reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    nextCycleRecurrenceFingerprint: row.next_cycle_recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason, recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostNextCycleReclosureForUser(
  userId: string
): Promise<PostNextCycleReclosureModel> {
  const closure = await listNextCycleCorrectiveClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_post_next_cycle_reclosure_checks x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.created_at desc,x.next_cycle_reclosure_regression_check_id desc limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_next_cycle_recurrences x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.recurred_at desc,x.next_cycle_recurrence_id desc limit 500`
    );
    return {checks:checks.rows,recurrences:recurrences.rows};
  });
  const checks=data.checks.map(checkFromRow);
  const recurrences=data.recurrences.map(recurrenceFromRow);
  const latest=new Map<string,PostNextCycleReclosureCheck>();
  for(const item of checks){
    const key=item.workspaceId+":"+item.nextCycleReclosureId;
    if(!latest.has(key)) latest.set(key,item);
  }
  return {
    closure, checks, recurrences,
    totals:{
      verifiedReclosures:closure.reclosures.length,
      neverChecked:closure.reclosures.filter(x=>!latest.has(x.workspaceId+":"+x.nextCycleReclosureId)).length,
      stableLatest:[...latest.values()].filter(x=>x.status==="stable").length,
      recurredLatest:[...latest.values()].filter(x=>x.status==="recurred").length,
      verificationErrors:[...latest.values()].filter(x=>x.status==="rejected"||x.status==="transport-error").length,
      governedRecurrences:recurrences.length
    }
  };
}

export async function loadPostNextCycleReclosureContext(
  userId: string,
  input: {workspaceId:string; nextCycleReclosureId:string}
): Promise<PostNextCycleReclosureContext> {
  const model=await listNextCycleCorrectiveClosureForUser(userId);
  const reclosure=model.reclosures.find(x=>
    x.workspaceId===input.workspaceId &&
    x.nextCycleReclosureId===input.nextCycleReclosureId
  );
  if(!reclosure) throw new Error("post_next_cycle_reclosure_not_found");
  const delivery=model.nextCycle.deliveries.find(x=>
    x.workspaceId===input.workspaceId &&
    x.deliveryId===reclosure.nextCycleDeliveryId
  );
  if(!delivery || delivery.status!=="accepted") {
    throw new Error("post_next_cycle_reclosure_accepted_delivery_required");
  }

  const gate=await withUserDatabase(userId,async(client)=>{
    const r=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; continuation_generation_recurrence_fingerprint:string;
      latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.next_cycle_reclosure_fingerprint as reclosure_fingerprint,
              recurrence.continuation_generation_recurrence_fingerprint,
              (
                select latest.next_cycle_reclosure_id
                from app.workspace_reconciliation_next_cycle_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.next_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.next_cycle_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_next_cycle_reclosures r
       join app.workspace_next_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.next_cycle_delivery_id
       join app.workspace_next_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.next_cycle_plan_id=r.next_cycle_plan_id
       join app.workspace_reconciliation_continuation_generation_recurrences recurrence
         on recurrence.workspace_id=r.workspace_id and recurrence.continuation_generation_recurrence_id=r.continuation_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_next_cycle_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.next_cycle_reclosure_id=r.next_cycle_reclosure_id
       where r.workspace_id=$1 and r.next_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.nextCycleReclosureId]
    );
    return r.rows[0]??null;
  });
  if(!gate) throw new Error("post_next_cycle_reclosure_not_found");
  if(gate.case_status!=="closed") throw new Error("post_next_cycle_reclosure_closed_case_required");
  if(gate.delivery_status!=="accepted" || gate.plan_status!=="approved") {
    throw new Error("post_next_cycle_reclosure_context_stale");
  }
  if(
    gate.reclosure_fingerprint!==reclosure.nextCycleReclosureFingerprint ||
    gate.continuation_generation_recurrence_fingerprint!==reclosure.continuationGenerationRecurrenceFingerprint ||
    gate.latest_reclosure_id!==reclosure.nextCycleReclosureId
  ) throw new Error("post_next_cycle_reclosure_identity_mismatch");
  if(gate.recurrence2_id) throw new Error("post_next_cycle_reclosure_already_recurred");

  const execution=await loadApprovedNextCycleCorrectivePlanContext(userId,{
    workspaceId:input.workspaceId,
    nextCyclePlanId:reclosure.nextCyclePlanId,
    allowClosedCase:true
  });
  if(
    execution.plan.planFingerprint!==reclosure.nextCyclePlanFingerprint ||
    execution.nextCyclePackage.fingerprint!==reclosure.nextCyclePackageFingerprint ||
    execution.nextCyclePackage.packageId!==delivery.nextCyclePackageId ||
    execution.nextCyclePackage.replayKey!==delivery.nextCycleReplayKey ||
    execution.nextCyclePackage.fingerprint!==delivery.nextCyclePackageFingerprint ||
    execution.consumerId!==delivery.consumerId
  ) throw new Error("post_next_cycle_reclosure_package_identity_mismatch");

  return {reclosure,delivery,execution,package:execution.nextCyclePackage};
}

export function comparePostNextCycleReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison=compareConsumerState(integrationPackage,response);
  const status:PostNextCycleReclosureStatus =
    comparison.status==="matched" ? "stable" :
    comparison.status==="drift" ? "recurred" : comparison.status;
  return {...comparison,status};
}

export async function recordPostNextCycleReclosureCheck(
  userId:string,
  input:{
    workspaceId:string; context:PostNextCycleReclosureContext;
    status:PostNextCycleReclosureStatus; expectedRecordCount:number;
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
              r.next_cycle_reclosure_fingerprint as reclosure_fingerprint,
              (
                select latest.next_cycle_reclosure_id
                from app.workspace_reconciliation_next_cycle_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.next_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.next_cycle_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_next_cycle_reclosures r
       join app.workspace_next_cycle_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.next_cycle_delivery_id
       join app.workspace_next_cycle_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.next_cycle_plan_id=r.next_cycle_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_next_cycle_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.next_cycle_reclosure_id=r.next_cycle_reclosure_id
       where r.workspace_id=$1 and r.next_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,reclosure.nextCycleReclosureId]
    );
    const row=current.rows[0];
    if(!row || row.case_status!=="closed") throw new Error("post_next_cycle_reclosure_closed_case_required");
    if(row.delivery_status!=="accepted" || row.plan_status!=="approved") throw new Error("post_next_cycle_reclosure_context_stale");
    if(
      row.reclosure_fingerprint!==reclosure.nextCycleReclosureFingerprint ||
      row.latest_reclosure_id!==reclosure.nextCycleReclosureId ||
      execution.plan.planFingerprint!==reclosure.nextCyclePlanFingerprint ||
      input.context.package.packageId!==delivery.nextCyclePackageId ||
      input.context.package.replayKey!==delivery.nextCycleReplayKey ||
      input.context.package.fingerprint!==delivery.nextCyclePackageFingerprint
    ) throw new Error("post_next_cycle_reclosure_identity_mismatch");
    if(row.recurrence2_id) throw new Error("post_next_cycle_reclosure_already_recurred");

    const id=randomUUID();
    await client.query(
      `insert into app.workspace_post_next_cycle_reclosure_checks (
        workspace_id,next_cycle_reclosure_regression_check_id,
        next_cycle_reclosure_id,predecessor_continuation_generation_reclosure_id,continuation_generation_recurrence_id,case_id,
        next_cycle_plan_id,next_cycle_delivery_id,target,consumer_id,
        next_cycle_reclosure_fingerprint,continuation_generation_recurrence_fingerprint,
        next_cycle_plan_fingerprint,next_cycle_package_id,
        next_cycle_replay_key,next_cycle_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,id,reclosure.nextCycleReclosureId,
        reclosure.predecessorContinuationGenerationReclosureId,reclosure.continuationGenerationRecurrenceId,reclosure.caseId,
        reclosure.nextCyclePlanId,reclosure.nextCycleDeliveryId,
        reclosure.target,delivery.consumerId,reclosure.nextCycleReclosureFingerprint,
        reclosure.continuationGenerationRecurrenceFingerprint,reclosure.nextCyclePlanFingerprint,
        delivery.nextCyclePackageId,delivery.nextCycleReplayKey,
        delivery.nextCyclePackageFingerprint,input.status,input.expectedRecordCount,
        input.matchedCount,input.mismatchedCount,input.missingCount,
        input.validationCode.slice(0,96),input.httpStatus??null,
        input.consumerVerifiedAt??null,input.verificationFingerprint,
        JSON.stringify(input.recordResults),userId
      ]
    );
    return id;
  });
}

export async function recurNextCycleReclosedException(
  userId:string,
  input:{
    workspaceId:string; nextCycleReclosureId:string;
    nextCycleReclosureRegressionCheckId:string; recurrenceReason:string;
  }
) {
  const reason=input.recurrenceReason.trim().slice(0,8000);
  if(!reason) throw new Error("post_next_cycle_recurrence_reason_required");
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const existing=await client.query<{next_cycle_recurrence_id:string}>(
      `select next_cycle_recurrence_id
       from app.workspace_reconciliation_next_cycle_recurrences
       where workspace_id=$1 and next_cycle_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.nextCycleReclosureId]
    );
    if(existing.rows[0]) return existing.rows[0].next_cycle_recurrence_id;

    const result=await client.query<{
      check_id:string; reclosure_id:string; predecessor_continuation_generation_recurrence_id:string;
      case_id:string; target:IntegrationTarget; status:PostNextCycleReclosureStatus;
      reclosure_fingerprint:string; verification_fingerprint:string;
      case_status:string; latest_check_id:string; latest_reclosure_id:string;
    }>(
      `select x.next_cycle_reclosure_regression_check_id as check_id,
              x.next_cycle_reclosure_id as reclosure_id,
              x.continuation_generation_recurrence_id as predecessor_continuation_generation_recurrence_id,x.case_id,x.target,x.status,
              x.next_cycle_reclosure_fingerprint as reclosure_fingerprint,
              x.verification_fingerprint,
              c.status as case_status,
              (
                select newest.next_cycle_reclosure_regression_check_id
                from app.workspace_post_next_cycle_reclosure_checks newest
                where newest.workspace_id=x.workspace_id
                  and newest.next_cycle_reclosure_id=x.next_cycle_reclosure_id
                order by newest.created_at desc,newest.next_cycle_reclosure_regression_check_id desc limit 1
              ) as latest_check_id,
              (
                select newest.next_cycle_reclosure_id
                from app.workspace_reconciliation_next_cycle_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.next_cycle_reclosure_id desc limit 1
              ) as latest_reclosure_id
       from app.workspace_post_next_cycle_reclosure_checks x
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=x.workspace_id and c.case_id=x.case_id
       where x.workspace_id=$1 and x.next_cycle_reclosure_id=$2
         and x.next_cycle_reclosure_regression_check_id=$3 limit 1`,
      [input.workspaceId,input.nextCycleReclosureId,input.nextCycleReclosureRegressionCheckId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("post_next_cycle_recurrence_check_not_found");
    if(row.status!=="recurred" || row.case_status!=="closed") {
      throw new Error("post_next_cycle_recurrence_recurred_closed_required");
    }
    if(row.latest_check_id!==row.check_id) throw new Error("post_next_cycle_recurrence_latest_check_required");
    if(row.latest_reclosure_id!==row.reclosure_id) throw new Error("post_next_cycle_recurrence_latest_reclosure_required");

    const nextCycleRecurrenceId=randomUUID();
    const governed=nextCycleRecurrenceFingerprint({
      nextCycleReclosureId:row.reclosure_id,
      nextCycleReclosureRegressionCheckId:row.check_id,
      caseId:row.case_id,
      nextCycleReclosureFingerprint:row.reclosure_fingerprint,
      regressionFingerprint:row.verification_fingerprint,
      recurrenceReason:reason
    });
    await client.query(
      `insert into app.workspace_reconciliation_next_cycle_recurrences (
        workspace_id,next_cycle_recurrence_id,next_cycle_reclosure_id,
        next_cycle_reclosure_regression_check_id,predecessor_continuation_generation_recurrence_id,
        case_id,target,next_cycle_reclosure_fingerprint,regression_fingerprint,
        next_cycle_recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [input.workspaceId,nextCycleRecurrenceId,row.reclosure_id,row.check_id,
       row.predecessor_continuation_generation_recurrence_id,row.case_id,row.target,row.reclosure_fingerprint,
       row.verification_fingerprint,governed,reason,userId]
    );
    const updated=await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
           investigation_note=left(
             case when investigation_note='' then $4
               else investigation_note || E'\n\nBuild 084 governed next-cycle recurrence: ' || $4 end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId,row.case_id,userId,reason]
    );
    if(!updated.rowCount) throw new Error("post_next_cycle_recurrence_closed_case_required");
    return nextCycleRecurrenceId;
  });
}
