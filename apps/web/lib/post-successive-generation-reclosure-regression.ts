import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listSuccessiveGenerationCorrectiveClosureForUser,
  type SuccessiveGenerationCorrectiveClosureModel,
  type SuccessiveGenerationReconciliationExceptionReclosure
} from "./successive-generation-corrective-delivery-reconciliation";
import {
  loadApprovedSuccessiveGenerationCorrectivePlanContext,
  type SuccessiveGenerationCorrectiveExecutionContext,
  type SuccessiveGenerationCorrectiveLiveDelivery
} from "./successive-generation-corrective-delivery-execution";
import type {
  ConsumerStateVerificationResponse,
  IntegrationPackageV1,
  IntegrationTarget
} from "./integration-delivery";

type WorkspaceRole = "owner" | "admin" | "member";
type JsonRecord = Record<string, unknown>;

export type PostSuccessiveGenerationReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostSuccessiveGenerationReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successiveGenerationReclosureRegressionCheckId: string;
  successiveGenerationReclosureId: string;
  predecessorSubsequentGenerationReclosureId: string;
  subsequentGenerationRecurrenceId: string;
  caseId: string;
  successiveGenerationPlanId: string;
  successiveGenerationDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  successiveGenerationReclosureFingerprint: string;
  subsequentGenerationRecurrenceFingerprint: string;
  successiveGenerationPlanFingerprint: string;
  successiveGenerationPackageId: string;
  successiveGenerationReplayKey: string;
  successiveGenerationPackageFingerprint: string;
  status: PostSuccessiveGenerationReclosureStatus;
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

export interface SuccessiveGenerationExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  successiveGenerationRecurrenceId: string;
  successiveGenerationReclosureId: string;
  successiveGenerationReclosureRegressionCheckId: string;
  predecessorSubsequentGenerationRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  successiveGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  successiveGenerationRecurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostSuccessiveGenerationReclosureModel {
  closure: SuccessiveGenerationCorrectiveClosureModel;
  checks: PostSuccessiveGenerationReclosureCheck[];
  recurrences: SuccessiveGenerationExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostSuccessiveGenerationReclosureContext {
  reclosure: SuccessiveGenerationReconciliationExceptionReclosure;
  delivery: SuccessiveGenerationCorrectiveLiveDelivery;
  execution: SuccessiveGenerationCorrectiveExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  successive_generation_reclosure_regression_check_id: string;
  successive_generation_reclosure_id: string; predecessor_subsequent_generation_reclosure_id: string;
  subsequent_generation_recurrence_id: string; case_id: string; successive_generation_plan_id: string;
  successive_generation_delivery_id: string; target: IntegrationTarget; consumer_id: string;
  successive_generation_reclosure_fingerprint: string; subsequent_generation_recurrence_fingerprint: string;
  successive_generation_plan_fingerprint: string; successive_generation_package_id: string;
  successive_generation_replay_key: string; successive_generation_package_fingerprint: string;
  status: PostSuccessiveGenerationReclosureStatus; expected_record_count: number;
  matched_count: number; mismatched_count: number; missing_count: number;
  validation_code: string; http_status: number | null; consumer_verified_at: Date | null;
  verification_fingerprint: string; record_results: ReconciliationRecordResult[];
  actor_user_id: string; created_at: Date;
};

type RecurrenceRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  successive_generation_recurrence_id: string; successive_generation_reclosure_id: string;
  successive_generation_reclosure_regression_check_id: string; predecessor_subsequent_generation_recurrence_id: string;
  case_id: string; target: IntegrationTarget; successive_generation_reclosure_fingerprint: string;
  regression_fingerprint: string; successive_generation_recurrence_fingerprint: string;
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
    throw new Error("post_successive_generation_reclosure_manager_required");
  }
}

export function successiveGenerationRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN SUCCESSIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postSuccessiveGenerationReclosureErrorFingerprint(input: {
  successiveGenerationReclosureId: string;
  successiveGenerationPackageId: string;
  successiveGenerationReplayKey: string;
  successiveGenerationPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-successive-generation-reclosure1-", input);
}

export function successiveGenerationRecurrenceFingerprint(input: {
  successiveGenerationReclosureId: string;
  successiveGenerationReclosureRegressionCheckId: string;
  caseId: string;
  successiveGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("successive-generation-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostSuccessiveGenerationReclosureCheck {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    successiveGenerationReclosureRegressionCheckId: row.successive_generation_reclosure_regression_check_id,
    successiveGenerationReclosureId: row.successive_generation_reclosure_id,
    predecessorSubsequentGenerationReclosureId: row.predecessor_subsequent_generation_reclosure_id,
    subsequentGenerationRecurrenceId: row.subsequent_generation_recurrence_id, caseId: row.case_id,
    successiveGenerationPlanId: row.successive_generation_plan_id,
    successiveGenerationDeliveryId: row.successive_generation_delivery_id,
    target: row.target, consumerId: row.consumer_id,
    successiveGenerationReclosureFingerprint: row.successive_generation_reclosure_fingerprint,
    subsequentGenerationRecurrenceFingerprint: row.subsequent_generation_recurrence_fingerprint,
    successiveGenerationPlanFingerprint: row.successive_generation_plan_fingerprint,
    successiveGenerationPackageId: row.successive_generation_package_id,
    successiveGenerationReplayKey: row.successive_generation_replay_key,
    successiveGenerationPackageFingerprint: row.successive_generation_package_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): SuccessiveGenerationExceptionRecurrence {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    successiveGenerationRecurrenceId: row.successive_generation_recurrence_id,
    successiveGenerationReclosureId: row.successive_generation_reclosure_id,
    successiveGenerationReclosureRegressionCheckId: row.successive_generation_reclosure_regression_check_id,
    predecessorSubsequentGenerationRecurrenceId: row.predecessor_subsequent_generation_recurrence_id, caseId: row.case_id,
    target: row.target, successiveGenerationReclosureFingerprint: row.successive_generation_reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    successiveGenerationRecurrenceFingerprint: row.successive_generation_recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason, recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostSuccessiveGenerationReclosureForUser(
  userId: string
): Promise<PostSuccessiveGenerationReclosureModel> {
  const closure = await listSuccessiveGenerationCorrectiveClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_post_successive_generation_reclosure_checks x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.created_at desc,x.successive_generation_reclosure_regression_check_id desc limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_successive_generation_recurrences x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.recurred_at desc,x.successive_generation_recurrence_id desc limit 500`
    );
    return {checks:checks.rows,recurrences:recurrences.rows};
  });
  const checks=data.checks.map(checkFromRow);
  const recurrences=data.recurrences.map(recurrenceFromRow);
  const latest=new Map<string,PostSuccessiveGenerationReclosureCheck>();
  for(const item of checks){
    const key=item.workspaceId+":"+item.successiveGenerationReclosureId;
    if(!latest.has(key)) latest.set(key,item);
  }
  return {
    closure, checks, recurrences,
    totals:{
      verifiedReclosures:closure.reclosures.length,
      neverChecked:closure.reclosures.filter(x=>!latest.has(x.workspaceId+":"+x.successiveGenerationReclosureId)).length,
      stableLatest:[...latest.values()].filter(x=>x.status==="stable").length,
      recurredLatest:[...latest.values()].filter(x=>x.status==="recurred").length,
      verificationErrors:[...latest.values()].filter(x=>x.status==="rejected"||x.status==="transport-error").length,
      governedRecurrences:recurrences.length
    }
  };
}

export async function loadPostSuccessiveGenerationReclosureContext(
  userId: string,
  input: {workspaceId:string; successiveGenerationReclosureId:string}
): Promise<PostSuccessiveGenerationReclosureContext> {
  const model=await listSuccessiveGenerationCorrectiveClosureForUser(userId);
  const reclosure=model.reclosures.find(x=>
    x.workspaceId===input.workspaceId &&
    x.successiveGenerationReclosureId===input.successiveGenerationReclosureId
  );
  if(!reclosure) throw new Error("post_successive_generation_reclosure_not_found");
  const delivery=model.successiveGeneration.deliveries.find(x=>
    x.workspaceId===input.workspaceId &&
    x.deliveryId===reclosure.successiveGenerationDeliveryId
  );
  if(!delivery || delivery.status!=="accepted") {
    throw new Error("post_successive_generation_reclosure_accepted_delivery_required");
  }

  const gate=await withUserDatabase(userId,async(client)=>{
    const r=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; subsequent_generation_recurrence_fingerprint:string;
      latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.successive_generation_reclosure_fingerprint as reclosure_fingerprint,
              recurrence.subsequent_generation_recurrence_fingerprint,
              (
                select latest.successive_generation_reclosure_id
                from app.workspace_reconciliation_successive_generation_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.successive_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.successive_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_successive_generation_reclosures r
       join app.workspace_successive_generation_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.successive_generation_delivery_id
       join app.workspace_successive_generation_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.successive_generation_plan_id=r.successive_generation_plan_id
       join app.workspace_reconciliation_subsequent_generation_recurrences recurrence
         on recurrence.workspace_id=r.workspace_id and recurrence.subsequent_generation_recurrence_id=r.subsequent_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_successive_generation_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.successive_generation_reclosure_id=r.successive_generation_reclosure_id
       where r.workspace_id=$1 and r.successive_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.successiveGenerationReclosureId]
    );
    return r.rows[0]??null;
  });
  if(!gate) throw new Error("post_successive_generation_reclosure_not_found");
  if(gate.case_status!=="closed") throw new Error("post_successive_generation_reclosure_closed_case_required");
  if(gate.delivery_status!=="accepted" || gate.plan_status!=="approved") {
    throw new Error("post_successive_generation_reclosure_context_stale");
  }
  if(
    gate.reclosure_fingerprint!==reclosure.successiveGenerationReclosureFingerprint ||
    gate.subsequent_generation_recurrence_fingerprint!==reclosure.subsequentGenerationRecurrenceFingerprint ||
    gate.latest_reclosure_id!==reclosure.successiveGenerationReclosureId
  ) throw new Error("post_successive_generation_reclosure_identity_mismatch");
  if(gate.recurrence2_id) throw new Error("post_successive_generation_reclosure_already_recurred");

  const execution=await loadApprovedSuccessiveGenerationCorrectivePlanContext(userId,{
    workspaceId:input.workspaceId,
    successiveGenerationPlanId:reclosure.successiveGenerationPlanId,
    allowClosedCase:true
  });
  if(
    execution.plan.planFingerprint!==reclosure.successiveGenerationPlanFingerprint ||
    execution.successiveGenerationPackage.fingerprint!==reclosure.successiveGenerationPackageFingerprint ||
    execution.successiveGenerationPackage.packageId!==delivery.successiveGenerationPackageId ||
    execution.successiveGenerationPackage.replayKey!==delivery.successiveGenerationReplayKey ||
    execution.successiveGenerationPackage.fingerprint!==delivery.successiveGenerationPackageFingerprint ||
    execution.consumerId!==delivery.consumerId
  ) throw new Error("post_successive_generation_reclosure_package_identity_mismatch");

  return {reclosure,delivery,execution,package:execution.successiveGenerationPackage};
}

export function comparePostSuccessiveGenerationReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison=compareConsumerState(integrationPackage,response);
  const status:PostSuccessiveGenerationReclosureStatus =
    comparison.status==="matched" ? "stable" :
    comparison.status==="drift" ? "recurred" : comparison.status;
  return {...comparison,status};
}

export async function recordPostSuccessiveGenerationReclosureCheck(
  userId:string,
  input:{
    workspaceId:string; context:PostSuccessiveGenerationReclosureContext;
    status:PostSuccessiveGenerationReclosureStatus; expectedRecordCount:number;
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
              r.successive_generation_reclosure_fingerprint as reclosure_fingerprint,
              (
                select latest.successive_generation_reclosure_id
                from app.workspace_reconciliation_successive_generation_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.successive_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.successive_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_successive_generation_reclosures r
       join app.workspace_successive_generation_corrective_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.successive_generation_delivery_id
       join app.workspace_successive_generation_corrective_delivery_plans p
         on p.workspace_id=r.workspace_id and p.successive_generation_plan_id=r.successive_generation_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_successive_generation_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.successive_generation_reclosure_id=r.successive_generation_reclosure_id
       where r.workspace_id=$1 and r.successive_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,reclosure.successiveGenerationReclosureId]
    );
    const row=current.rows[0];
    if(!row || row.case_status!=="closed") throw new Error("post_successive_generation_reclosure_closed_case_required");
    if(row.delivery_status!=="accepted" || row.plan_status!=="approved") throw new Error("post_successive_generation_reclosure_context_stale");
    if(
      row.reclosure_fingerprint!==reclosure.successiveGenerationReclosureFingerprint ||
      row.latest_reclosure_id!==reclosure.successiveGenerationReclosureId ||
      execution.plan.planFingerprint!==reclosure.successiveGenerationPlanFingerprint ||
      input.context.package.packageId!==delivery.successiveGenerationPackageId ||
      input.context.package.replayKey!==delivery.successiveGenerationReplayKey ||
      input.context.package.fingerprint!==delivery.successiveGenerationPackageFingerprint
    ) throw new Error("post_successive_generation_reclosure_identity_mismatch");
    if(row.recurrence2_id) throw new Error("post_successive_generation_reclosure_already_recurred");

    const id=randomUUID();
    await client.query(
      `insert into app.workspace_post_successive_generation_reclosure_checks (
        workspace_id,successive_generation_reclosure_regression_check_id,
        successive_generation_reclosure_id,predecessor_subsequent_generation_reclosure_id,subsequent_generation_recurrence_id,case_id,
        successive_generation_plan_id,successive_generation_delivery_id,target,consumer_id,
        successive_generation_reclosure_fingerprint,subsequent_generation_recurrence_fingerprint,
        successive_generation_plan_fingerprint,successive_generation_package_id,
        successive_generation_replay_key,successive_generation_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,id,reclosure.successiveGenerationReclosureId,
        reclosure.predecessorSubsequentGenerationReclosureId,reclosure.subsequentGenerationRecurrenceId,reclosure.caseId,
        reclosure.successiveGenerationPlanId,reclosure.successiveGenerationDeliveryId,
        reclosure.target,delivery.consumerId,reclosure.successiveGenerationReclosureFingerprint,
        reclosure.subsequentGenerationRecurrenceFingerprint,reclosure.successiveGenerationPlanFingerprint,
        delivery.successiveGenerationPackageId,delivery.successiveGenerationReplayKey,
        delivery.successiveGenerationPackageFingerprint,input.status,input.expectedRecordCount,
        input.matchedCount,input.mismatchedCount,input.missingCount,
        input.validationCode.slice(0,96),input.httpStatus??null,
        input.consumerVerifiedAt??null,input.verificationFingerprint,
        JSON.stringify(input.recordResults),userId
      ]
    );
    return id;
  });
}

export async function recurSuccessiveGenerationReclosedException(
  userId:string,
  input:{
    workspaceId:string; successiveGenerationReclosureId:string;
    successiveGenerationReclosureRegressionCheckId:string; recurrenceReason:string;
  }
) {
  const reason=input.recurrenceReason.trim().slice(0,8000);
  if(!reason) throw new Error("post_successive_generation_recurrence_reason_required");
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const existing=await client.query<{successive_generation_recurrence_id:string}>(
      `select successive_generation_recurrence_id
       from app.workspace_reconciliation_successive_generation_recurrences
       where workspace_id=$1 and successive_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.successiveGenerationReclosureId]
    );
    if(existing.rows[0]) return existing.rows[0].successive_generation_recurrence_id;

    const result=await client.query<{
      check_id:string; reclosure_id:string; predecessor_subsequent_generation_recurrence_id:string;
      case_id:string; target:IntegrationTarget; status:PostSuccessiveGenerationReclosureStatus;
      reclosure_fingerprint:string; verification_fingerprint:string;
      case_status:string; latest_check_id:string; latest_reclosure_id:string;
    }>(
      `select x.successive_generation_reclosure_regression_check_id as check_id,
              x.successive_generation_reclosure_id as reclosure_id,
              x.subsequent_generation_recurrence_id as predecessor_subsequent_generation_recurrence_id,x.case_id,x.target,x.status,
              x.successive_generation_reclosure_fingerprint as reclosure_fingerprint,
              x.verification_fingerprint,
              c.status as case_status,
              (
                select newest.successive_generation_reclosure_regression_check_id
                from app.workspace_post_successive_generation_reclosure_checks newest
                where newest.workspace_id=x.workspace_id
                  and newest.successive_generation_reclosure_id=x.successive_generation_reclosure_id
                order by newest.created_at desc,newest.successive_generation_reclosure_regression_check_id desc limit 1
              ) as latest_check_id,
              (
                select newest.successive_generation_reclosure_id
                from app.workspace_reconciliation_successive_generation_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.successive_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id
       from app.workspace_post_successive_generation_reclosure_checks x
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=x.workspace_id and c.case_id=x.case_id
       where x.workspace_id=$1 and x.successive_generation_reclosure_id=$2
         and x.successive_generation_reclosure_regression_check_id=$3 limit 1`,
      [input.workspaceId,input.successiveGenerationReclosureId,input.successiveGenerationReclosureRegressionCheckId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("post_successive_generation_recurrence_check_not_found");
    if(row.status!=="recurred" || row.case_status!=="closed") {
      throw new Error("post_successive_generation_recurrence_recurred_closed_required");
    }
    if(row.latest_check_id!==row.check_id) throw new Error("post_successive_generation_recurrence_latest_check_required");
    if(row.latest_reclosure_id!==row.reclosure_id) throw new Error("post_successive_generation_recurrence_latest_reclosure_required");

    const successiveGenerationRecurrenceId=randomUUID();
    const governed=successiveGenerationRecurrenceFingerprint({
      successiveGenerationReclosureId:row.reclosure_id,
      successiveGenerationReclosureRegressionCheckId:row.check_id,
      caseId:row.case_id,
      successiveGenerationReclosureFingerprint:row.reclosure_fingerprint,
      regressionFingerprint:row.verification_fingerprint,
      recurrenceReason:reason
    });
    await client.query(
      `insert into app.workspace_reconciliation_successive_generation_recurrences (
        workspace_id,successive_generation_recurrence_id,successive_generation_reclosure_id,
        successive_generation_reclosure_regression_check_id,predecessor_subsequent_generation_recurrence_id,
        case_id,target,successive_generation_reclosure_fingerprint,regression_fingerprint,
        successive_generation_recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [input.workspaceId,successiveGenerationRecurrenceId,row.reclosure_id,row.check_id,
       row.predecessor_subsequent_generation_recurrence_id,row.case_id,row.target,row.reclosure_fingerprint,
       row.verification_fingerprint,governed,reason,userId]
    );
    const updated=await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
           investigation_note=left(
             case when investigation_note='' then $4
               else investigation_note || E'\n\nBuild 076 governed successive-generation recurrence: ' || $4 end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId,row.case_id,userId,reason]
    );
    if(!updated.rowCount) throw new Error("post_successive_generation_recurrence_closed_case_required");
    return successiveGenerationRecurrenceId;
  });
}
