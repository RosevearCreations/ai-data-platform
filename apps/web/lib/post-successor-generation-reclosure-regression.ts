import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listSuccessorGenerationCorrectiveClosureForUser,
  type SuccessorGenerationCorrectiveClosureModel,
  type SuccessorGenerationReconciliationExceptionReclosure
} from "./successor-generation-corrective-delivery-reconciliation";
import {
  loadApprovedSuccessorGenerationCorrectivePlanContext,
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

export type PostSuccessorGenerationReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostSuccessorGenerationReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorGenerationReclosureRegressionCheckId: string;
  successorGenerationReclosureId: string;
  predecessorNextGenerationReclosureId: string;
  nextGenerationRecurrenceId: string;
  caseId: string;
  successorGenerationPlanId: string;
  successorGenerationDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  successorGenerationReclosureFingerprint: string;
  nextGenerationRecurrenceFingerprint: string;
  successorGenerationPlanFingerprint: string;
  successorGenerationPackageId: string;
  successorGenerationReplayKey: string;
  successorGenerationPackageFingerprint: string;
  status: PostSuccessorGenerationReclosureStatus;
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

export interface SuccessorGenerationExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successorGenerationRecurrenceId: string;
  successorGenerationReclosureId: string;
  successorGenerationReclosureRegressionCheckId: string;
  predecessorNextGenerationRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  successorGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  successorGenerationRecurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostSuccessorGenerationReclosureModel {
  closure: SuccessorGenerationCorrectiveClosureModel;
  checks: PostSuccessorGenerationReclosureCheck[];
  recurrences: SuccessorGenerationExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostSuccessorGenerationReclosureContext {
  reclosure: SuccessorGenerationReconciliationExceptionReclosure;
  delivery: SuccessorGenerationCorrectiveLiveDelivery;
  execution: SuccessorGenerationCorrectiveExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  successor_generation_reclosure_regression_check_id: string;
  successor_generation_reclosure_id: string; predecessor_next_generation_reclosure_id: string;
  next_generation_recurrence_id: string; case_id: string; successor_generation_plan_id: string;
  successor_generation_delivery_id: string; target: IntegrationTarget; consumer_id: string;
  successor_generation_reclosure_fingerprint: string; next_generation_recurrence_fingerprint: string;
  successor_generation_plan_fingerprint: string; successor_generation_package_id: string;
  successor_generation_replay_key: string; successor_generation_package_fingerprint: string;
  status: PostSuccessorGenerationReclosureStatus; expected_record_count: number;
  matched_count: number; mismatched_count: number; missing_count: number;
  validation_code: string; http_status: number | null; consumer_verified_at: Date | null;
  verification_fingerprint: string; record_results: ReconciliationRecordResult[];
  actor_user_id: string; created_at: Date;
};

type RecurrenceRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  successor_generation_recurrence_id: string; successor_generation_reclosure_id: string;
  successor_generation_reclosure_regression_check_id: string; predecessor_next_generation_recurrence_id: string;
  case_id: string; target: IntegrationTarget; successor_generation_reclosure_fingerprint: string;
  regression_fingerprint: string; successor_generation_recurrence_fingerprint: string;
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
    throw new Error("post_successor_generation_reclosure_manager_required");
  }
}

export function successorGenerationRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN SUCCESSOR-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postSuccessorGenerationReclosureErrorFingerprint(input: {
  successorGenerationReclosureId: string;
  successorGenerationPackageId: string;
  successorGenerationReplayKey: string;
  successorGenerationPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-successor-generation-reclosure1-", input);
}

export function successorGenerationRecurrenceFingerprint(input: {
  successorGenerationReclosureId: string;
  successorGenerationReclosureRegressionCheckId: string;
  caseId: string;
  successorGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("successor-generation-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostSuccessorGenerationReclosureCheck {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    successorGenerationReclosureRegressionCheckId: row.successor_generation_reclosure_regression_check_id,
    successorGenerationReclosureId: row.successor_generation_reclosure_id,
    predecessorNextGenerationReclosureId: row.predecessor_next_generation_reclosure_id,
    nextGenerationRecurrenceId: row.next_generation_recurrence_id, caseId: row.case_id,
    successorGenerationPlanId: row.successor_generation_plan_id,
    successorGenerationDeliveryId: row.successor_generation_delivery_id,
    target: row.target, consumerId: row.consumer_id,
    successorGenerationReclosureFingerprint: row.successor_generation_reclosure_fingerprint,
    nextGenerationRecurrenceFingerprint: row.next_generation_recurrence_fingerprint,
    successorGenerationPlanFingerprint: row.successor_generation_plan_fingerprint,
    successorGenerationPackageId: row.successor_generation_package_id,
    successorGenerationReplayKey: row.successor_generation_replay_key,
    successorGenerationPackageFingerprint: row.successor_generation_package_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): SuccessorGenerationExceptionRecurrence {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    successorGenerationRecurrenceId: row.successor_generation_recurrence_id,
    successorGenerationReclosureId: row.successor_generation_reclosure_id,
    successorGenerationReclosureRegressionCheckId: row.successor_generation_reclosure_regression_check_id,
    predecessorNextGenerationRecurrenceId: row.predecessor_next_generation_recurrence_id, caseId: row.case_id,
    target: row.target, successorGenerationReclosureFingerprint: row.successor_generation_reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    successorGenerationRecurrenceFingerprint: row.successor_generation_recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason, recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostSuccessorGenerationReclosureForUser(
  userId: string
): Promise<PostSuccessorGenerationReclosureModel> {
  const closure = await listSuccessorGenerationCorrectiveClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_post_successor_generation_reclosure_checks x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.created_at desc,x.successor_generation_reclosure_regression_check_id desc limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_successor_generation_recurrences x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.recurred_at desc,x.successor_generation_recurrence_id desc limit 500`
    );
    return {checks:checks.rows,recurrences:recurrences.rows};
  });
  const checks=data.checks.map(checkFromRow);
  const recurrences=data.recurrences.map(recurrenceFromRow);
  const latest=new Map<string,PostSuccessorGenerationReclosureCheck>();
  for(const item of checks){
    const key=item.workspaceId+":"+item.successorGenerationReclosureId;
    if(!latest.has(key)) latest.set(key,item);
  }
  return {
    closure, checks, recurrences,
    totals:{
      verifiedReclosures:closure.reclosures.length,
      neverChecked:closure.reclosures.filter(x=>!latest.has(x.workspaceId+":"+x.successorGenerationReclosureId)).length,
      stableLatest:[...latest.values()].filter(x=>x.status==="stable").length,
      recurredLatest:[...latest.values()].filter(x=>x.status==="recurred").length,
      verificationErrors:[...latest.values()].filter(x=>x.status==="rejected"||x.status==="transport-error").length,
      governedRecurrences:recurrences.length
    }
  };
}

export async function loadPostSuccessorGenerationReclosureContext(
  userId: string,
  input: {workspaceId:string; successorGenerationReclosureId:string}
): Promise<PostSuccessorGenerationReclosureContext> {
  const model=await listSuccessorGenerationCorrectiveClosureForUser(userId);
  const reclosure=model.reclosures.find(x=>
    x.workspaceId===input.workspaceId &&
    x.successorGenerationReclosureId===input.successorGenerationReclosureId
  );
  if(!reclosure) throw new Error("post_successor_generation_reclosure_not_found");
  const delivery=model.successorGeneration.deliveries.find(x=>
    x.workspaceId===input.workspaceId &&
    x.deliveryId===reclosure.successorGenerationDeliveryId
  );
  if(!delivery || delivery.status!=="accepted") {
    throw new Error("post_successor_generation_reclosure_accepted_delivery_required");
  }

  const gate=await withUserDatabase(userId,async(client)=>{
    const r=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; next_generation_recurrence_fingerprint:string;
      latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.successor_generation_reclosure_fingerprint as reclosure_fingerprint,
              recurrence.next_generation_recurrence_fingerprint,
              (
                select latest.successor_generation_reclosure_id
                from app.workspace_reconciliation_successor_generation_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.successor_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.successor_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_successor_generation_reclosures r
       join app.workspace_successor_generation_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.successor_generation_delivery_id
       join app.workspace_successor_generation_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.successor_generation_plan_id=r.successor_generation_plan_id
       join app.workspace_reconciliation_exception_next_generation_recurrences recurrence
         on recurrence.workspace_id=r.workspace_id and recurrence.next_generation_recurrence_id=r.next_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_successor_generation_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.successor_generation_reclosure_id=r.successor_generation_reclosure_id
       where r.workspace_id=$1 and r.successor_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.successorGenerationReclosureId]
    );
    return r.rows[0]??null;
  });
  if(!gate) throw new Error("post_successor_generation_reclosure_not_found");
  if(gate.case_status!=="closed") throw new Error("post_successor_generation_reclosure_closed_case_required");
  if(gate.delivery_status!=="accepted" || gate.plan_status!=="approved") {
    throw new Error("post_successor_generation_reclosure_context_stale");
  }
  if(
    gate.reclosure_fingerprint!==reclosure.successorGenerationReclosureFingerprint ||
    gate.next_generation_recurrence_fingerprint!==reclosure.nextGenerationRecurrenceFingerprint ||
    gate.latest_reclosure_id!==reclosure.successorGenerationReclosureId
  ) throw new Error("post_successor_generation_reclosure_identity_mismatch");
  if(gate.recurrence2_id) throw new Error("post_successor_generation_reclosure_already_recurred");

  const execution=await loadApprovedSuccessorGenerationCorrectivePlanContext(userId,{
    workspaceId:input.workspaceId,
    successorGenerationPlanId:reclosure.successorGenerationPlanId,
    allowClosedCase:true
  });
  if(
    execution.plan.planFingerprint!==reclosure.successorGenerationPlanFingerprint ||
    execution.successorGenerationPackage.fingerprint!==reclosure.successorGenerationPackageFingerprint ||
    execution.successorGenerationPackage.packageId!==delivery.successorGenerationPackageId ||
    execution.successorGenerationPackage.replayKey!==delivery.successorGenerationReplayKey ||
    execution.successorGenerationPackage.fingerprint!==delivery.successorGenerationPackageFingerprint ||
    execution.consumerId!==delivery.consumerId
  ) throw new Error("post_successor_generation_reclosure_package_identity_mismatch");

  return {reclosure,delivery,execution,package:execution.successorGenerationPackage};
}

export function comparePostSuccessorGenerationReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison=compareConsumerState(integrationPackage,response);
  const status:PostSuccessorGenerationReclosureStatus =
    comparison.status==="matched" ? "stable" :
    comparison.status==="drift" ? "recurred" : comparison.status;
  return {...comparison,status};
}

export async function recordPostSuccessorGenerationReclosureCheck(
  userId:string,
  input:{
    workspaceId:string; context:PostSuccessorGenerationReclosureContext;
    status:PostSuccessorGenerationReclosureStatus; expectedRecordCount:number;
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
              r.successor_generation_reclosure_fingerprint as reclosure_fingerprint,
              (
                select latest.successor_generation_reclosure_id
                from app.workspace_reconciliation_successor_generation_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.successor_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.successor_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_successor_generation_reclosures r
       join app.workspace_successor_generation_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.successor_generation_delivery_id
       join app.workspace_successor_generation_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.successor_generation_plan_id=r.successor_generation_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_successor_generation_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.successor_generation_reclosure_id=r.successor_generation_reclosure_id
       where r.workspace_id=$1 and r.successor_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,reclosure.successorGenerationReclosureId]
    );
    const row=current.rows[0];
    if(!row || row.case_status!=="closed") throw new Error("post_successor_generation_reclosure_closed_case_required");
    if(row.delivery_status!=="accepted" || row.plan_status!=="approved") throw new Error("post_successor_generation_reclosure_context_stale");
    if(
      row.reclosure_fingerprint!==reclosure.successorGenerationReclosureFingerprint ||
      row.latest_reclosure_id!==reclosure.successorGenerationReclosureId ||
      execution.plan.planFingerprint!==reclosure.successorGenerationPlanFingerprint ||
      input.context.package.packageId!==delivery.successorGenerationPackageId ||
      input.context.package.replayKey!==delivery.successorGenerationReplayKey ||
      input.context.package.fingerprint!==delivery.successorGenerationPackageFingerprint
    ) throw new Error("post_successor_generation_reclosure_identity_mismatch");
    if(row.recurrence2_id) throw new Error("post_successor_generation_reclosure_already_recurred");

    const id=randomUUID();
    await client.query(
      `insert into app.workspace_post_successor_generation_reclosure_checks (
        workspace_id,successor_generation_reclosure_regression_check_id,
        successor_generation_reclosure_id,predecessor_next_generation_reclosure_id,next_generation_recurrence_id,case_id,
        successor_generation_plan_id,successor_generation_delivery_id,target,consumer_id,
        successor_generation_reclosure_fingerprint,next_generation_recurrence_fingerprint,
        successor_generation_plan_fingerprint,successor_generation_package_id,
        successor_generation_replay_key,successor_generation_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,id,reclosure.successorGenerationReclosureId,
        reclosure.predecessorNextGenerationReclosureId,reclosure.nextGenerationRecurrenceId,reclosure.caseId,
        reclosure.successorGenerationPlanId,reclosure.successorGenerationDeliveryId,
        reclosure.target,delivery.consumerId,reclosure.successorGenerationReclosureFingerprint,
        reclosure.nextGenerationRecurrenceFingerprint,reclosure.successorGenerationPlanFingerprint,
        delivery.successorGenerationPackageId,delivery.successorGenerationReplayKey,
        delivery.successorGenerationPackageFingerprint,input.status,input.expectedRecordCount,
        input.matchedCount,input.mismatchedCount,input.missingCount,
        input.validationCode.slice(0,96),input.httpStatus??null,
        input.consumerVerifiedAt??null,input.verificationFingerprint,
        JSON.stringify(input.recordResults),userId
      ]
    );
    return id;
  });
}

export async function recurSuccessorGenerationReclosedException(
  userId:string,
  input:{
    workspaceId:string; successorGenerationReclosureId:string;
    successorGenerationReclosureRegressionCheckId:string; recurrenceReason:string;
  }
) {
  const reason=input.recurrenceReason.trim().slice(0,8000);
  if(!reason) throw new Error("post_successor_generation_recurrence_reason_required");
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const existing=await client.query<{successor_generation_recurrence_id:string}>(
      `select successor_generation_recurrence_id
       from app.workspace_reconciliation_successor_generation_recurrences
       where workspace_id=$1 and successor_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.successorGenerationReclosureId]
    );
    if(existing.rows[0]) return existing.rows[0].successor_generation_recurrence_id;

    const result=await client.query<{
      check_id:string; reclosure_id:string; predecessor_next_generation_recurrence_id:string;
      case_id:string; target:IntegrationTarget; status:PostSuccessorGenerationReclosureStatus;
      reclosure_fingerprint:string; verification_fingerprint:string;
      case_status:string; latest_check_id:string; latest_reclosure_id:string;
    }>(
      `select x.successor_generation_reclosure_regression_check_id as check_id,
              x.successor_generation_reclosure_id as reclosure_id,
              x.next_generation_recurrence_id as predecessor_next_generation_recurrence_id,x.case_id,x.target,x.status,
              x.successor_generation_reclosure_fingerprint as reclosure_fingerprint,
              x.verification_fingerprint,
              c.status as case_status,
              (
                select newest.successor_generation_reclosure_regression_check_id
                from app.workspace_post_successor_generation_reclosure_checks newest
                where newest.workspace_id=x.workspace_id
                  and newest.successor_generation_reclosure_id=x.successor_generation_reclosure_id
                order by newest.created_at desc,newest.successor_generation_reclosure_regression_check_id desc limit 1
              ) as latest_check_id,
              (
                select newest.successor_generation_reclosure_id
                from app.workspace_reconciliation_successor_generation_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.successor_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id
       from app.workspace_post_successor_generation_reclosure_checks x
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=x.workspace_id and c.case_id=x.case_id
       where x.workspace_id=$1 and x.successor_generation_reclosure_id=$2
         and x.successor_generation_reclosure_regression_check_id=$3 limit 1`,
      [input.workspaceId,input.successorGenerationReclosureId,input.successorGenerationReclosureRegressionCheckId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("post_successor_generation_recurrence_check_not_found");
    if(row.status!=="recurred" || row.case_status!=="closed") {
      throw new Error("post_successor_generation_recurrence_recurred_closed_required");
    }
    if(row.latest_check_id!==row.check_id) throw new Error("post_successor_generation_recurrence_latest_check_required");
    if(row.latest_reclosure_id!==row.reclosure_id) throw new Error("post_successor_generation_recurrence_latest_reclosure_required");

    const nextGenerationRecurrenceId=randomUUID();
    const governed=successorGenerationRecurrenceFingerprint({
      successorGenerationReclosureId:row.reclosure_id,
      successorGenerationReclosureRegressionCheckId:row.check_id,
      caseId:row.case_id,
      successorGenerationReclosureFingerprint:row.reclosure_fingerprint,
      regressionFingerprint:row.verification_fingerprint,
      recurrenceReason:reason
    });
    await client.query(
      `insert into app.workspace_reconciliation_successor_generation_recurrences (
        workspace_id,successor_generation_recurrence_id,successor_generation_reclosure_id,
        successor_generation_reclosure_regression_check_id,predecessor_next_generation_recurrence_id,
        case_id,target,successor_generation_reclosure_fingerprint,regression_fingerprint,
        successor_generation_recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [input.workspaceId,nextGenerationRecurrenceId,row.reclosure_id,row.check_id,
       row.predecessor_next_generation_recurrence_id,row.case_id,row.target,row.reclosure_fingerprint,
       row.verification_fingerprint,governed,reason,userId]
    );
    const updated=await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
           investigation_note=left(
             case when investigation_note='' then $4
               else investigation_note || E'\n\nBuild 068 governed recurrence: ' || $4 end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId,row.case_id,userId,reason]
    );
    if(!updated.rowCount) throw new Error("post_successor_generation_recurrence_closed_case_required");
    return nextGenerationRecurrenceId;
  });
}
