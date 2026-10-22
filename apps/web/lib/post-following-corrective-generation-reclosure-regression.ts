import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { withUserDatabase } from "./database";
import {
  compareConsumerState,
  type ReconciliationRecordResult
} from "./post-delivery-reconciliation";
import {
  listFollowingCorrectiveGenerationClosureForUser,
  type FollowingCorrectiveGenerationClosureModel,
  type FollowingCorrectiveGenerationExceptionReclosure
} from "./following-corrective-generation-delivery-reconciliation";
import {
  loadApprovedFollowingCorrectiveGenerationPlanContext,
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

export type PostFollowingCorrectiveGenerationReclosureStatus =
  | "stable"
  | "recurred"
  | "rejected"
  | "transport-error";

export interface PostFollowingCorrectiveGenerationReclosureCheck {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  followingCorrectiveGenerationReclosureRegressionCheckId: string;
  followingCorrectiveGenerationReclosureId: string;
  predecessorNextCorrectiveGenerationReclosureId: string;
  nextCorrectiveGenerationRecurrenceId: string;
  caseId: string;
  followingCorrectiveGenerationPlanId: string;
  followingCorrectiveGenerationDeliveryId: string;
  target: IntegrationTarget;
  consumerId: string;
  followingCorrectiveGenerationReclosureFingerprint: string;
  nextCorrectiveGenerationRecurrenceFingerprint: string;
  followingCorrectiveGenerationPlanFingerprint: string;
  followingCorrectiveGenerationPackageId: string;
  followingCorrectiveGenerationReplayKey: string;
  followingCorrectiveGenerationPackageFingerprint: string;
  status: PostFollowingCorrectiveGenerationReclosureStatus;
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

export interface FollowingCorrectiveGenerationExceptionRecurrence {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  followingCorrectiveGenerationRecurrenceId: string;
  followingCorrectiveGenerationReclosureId: string;
  followingCorrectiveGenerationReclosureRegressionCheckId: string;
  predecessorNextCorrectiveGenerationRecurrenceId: string;
  caseId: string;
  target: IntegrationTarget;
  followingCorrectiveGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  followingCorrectiveGenerationRecurrenceFingerprint: string;
  recurrenceReason: string;
  recurredBy: string;
  recurredAt: string;
  canManage: boolean;
}

export interface PostFollowingCorrectiveGenerationReclosureModel {
  closure: FollowingCorrectiveGenerationClosureModel;
  checks: PostFollowingCorrectiveGenerationReclosureCheck[];
  recurrences: FollowingCorrectiveGenerationExceptionRecurrence[];
  totals: {
    verifiedReclosures: number;
    neverChecked: number;
    stableLatest: number;
    recurredLatest: number;
    verificationErrors: number;
    governedRecurrences: number;
  };
}

export interface PostFollowingCorrectiveGenerationReclosureContext {
  reclosure: FollowingCorrectiveGenerationExceptionReclosure;
  delivery: FollowingCorrectiveGenerationLiveDelivery;
  execution: FollowingCorrectiveGenerationExecutionContext;
  package: IntegrationPackageV1;
}

type CheckRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  following_corrective_generation_reclosure_regression_check_id: string;
  following_corrective_generation_reclosure_id: string; predecessor_next_corrective_generation_reclosure_id: string;
  next_corrective_generation_recurrence_id: string; case_id: string; following_corrective_generation_plan_id: string;
  following_corrective_generation_delivery_id: string; target: IntegrationTarget; consumer_id: string;
  following_corrective_generation_reclosure_fingerprint: string; next_corrective_generation_recurrence_fingerprint: string;
  following_corrective_generation_plan_fingerprint: string; following_corrective_generation_package_id: string;
  following_corrective_generation_replay_key: string; following_corrective_generation_package_fingerprint: string;
  status: PostFollowingCorrectiveGenerationReclosureStatus; expected_record_count: number;
  matched_count: number; mismatched_count: number; missing_count: number;
  validation_code: string; http_status: number | null; consumer_verified_at: Date | null;
  verification_fingerprint: string; record_results: ReconciliationRecordResult[];
  actor_user_id: string; created_at: Date;
};

type RecurrenceRow = QueryResultRow & {
  workspace_id: string; workspace_name: string; role: WorkspaceRole;
  following_corrective_generation_recurrence_id: string; following_corrective_generation_reclosure_id: string;
  following_corrective_generation_reclosure_regression_check_id: string; predecessor_next_corrective_generation_recurrence_id: string;
  case_id: string; target: IntegrationTarget; following_corrective_generation_reclosure_fingerprint: string;
  regression_fingerprint: string; following_corrective_generation_recurrence_fingerprint: string;
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
    throw new Error("post_following_corrective_generation_reclosure_manager_required");
  }
}

export function followingCorrectiveGenerationRecurrenceConfirmation(target: IntegrationTarget) {
  return "REOPEN FOLLOWING-CORRECTIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

export function postFollowingCorrectiveGenerationReclosureErrorFingerprint(input: {
  followingCorrectiveGenerationReclosureId: string;
  followingCorrectiveGenerationPackageId: string;
  followingCorrectiveGenerationReplayKey: string;
  followingCorrectiveGenerationPackageFingerprint: string;
  status: "rejected" | "transport-error";
  validationCode: string;
  occurredAt: string;
}) {
  return fingerprint("post-following-corrective-generation-reclosure1-", input);
}

export function followingCorrectiveGenerationRecurrenceFingerprint(input: {
  followingCorrectiveGenerationReclosureId: string;
  followingCorrectiveGenerationReclosureRegressionCheckId: string;
  caseId: string;
  followingCorrectiveGenerationReclosureFingerprint: string;
  regressionFingerprint: string;
  recurrenceReason: string;
}) {
  return fingerprint("following-corrective-generation-recurrence1-", input);
}

function checkFromRow(row: CheckRow): PostFollowingCorrectiveGenerationReclosureCheck {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    followingCorrectiveGenerationReclosureRegressionCheckId: row.following_corrective_generation_reclosure_regression_check_id,
    followingCorrectiveGenerationReclosureId: row.following_corrective_generation_reclosure_id,
    predecessorNextCorrectiveGenerationReclosureId: row.predecessor_next_corrective_generation_reclosure_id,
    nextCorrectiveGenerationRecurrenceId: row.next_corrective_generation_recurrence_id, caseId: row.case_id,
    followingCorrectiveGenerationPlanId: row.following_corrective_generation_plan_id,
    followingCorrectiveGenerationDeliveryId: row.following_corrective_generation_delivery_id,
    target: row.target, consumerId: row.consumer_id,
    followingCorrectiveGenerationReclosureFingerprint: row.following_corrective_generation_reclosure_fingerprint,
    nextCorrectiveGenerationRecurrenceFingerprint: row.next_corrective_generation_recurrence_fingerprint,
    followingCorrectiveGenerationPlanFingerprint: row.following_corrective_generation_plan_fingerprint,
    followingCorrectiveGenerationPackageId: row.following_corrective_generation_package_id,
    followingCorrectiveGenerationReplayKey: row.following_corrective_generation_replay_key,
    followingCorrectiveGenerationPackageFingerprint: row.following_corrective_generation_package_fingerprint,
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

function recurrenceFromRow(row: RecurrenceRow): FollowingCorrectiveGenerationExceptionRecurrence {
  return {
    workspaceId: row.workspace_id, workspaceName: row.workspace_name, role: row.role,
    followingCorrectiveGenerationRecurrenceId: row.following_corrective_generation_recurrence_id,
    followingCorrectiveGenerationReclosureId: row.following_corrective_generation_reclosure_id,
    followingCorrectiveGenerationReclosureRegressionCheckId: row.following_corrective_generation_reclosure_regression_check_id,
    predecessorNextCorrectiveGenerationRecurrenceId: row.predecessor_next_corrective_generation_recurrence_id, caseId: row.case_id,
    target: row.target, followingCorrectiveGenerationReclosureFingerprint: row.following_corrective_generation_reclosure_fingerprint,
    regressionFingerprint: row.regression_fingerprint,
    followingCorrectiveGenerationRecurrenceFingerprint: row.following_corrective_generation_recurrence_fingerprint,
    recurrenceReason: row.recurrence_reason, recurredBy: row.recurred_by,
    recurredAt: row.recurred_at.toISOString(),
    canManage: row.role === "owner" || row.role === "admin"
  };
}

export async function listPostFollowingCorrectiveGenerationReclosureForUser(
  userId: string
): Promise<PostFollowingCorrectiveGenerationReclosureModel> {
  const closure = await listFollowingCorrectiveGenerationClosureForUser(userId);
  const data = await withUserDatabase(userId, async (client) => {
    const checks = await client.query<CheckRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_post_following_cg_reclosure_checks x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.created_at desc,x.following_corrective_generation_reclosure_regression_check_id desc limit 500`
    );
    const recurrences = await client.query<RecurrenceRow>(
      `select x.*,w.name as workspace_name,wm.role
       from app.workspace_reconciliation_following_cg_recurrences x
       join app.workspaces w on w.id=x.workspace_id
       join app.workspace_members wm on wm.workspace_id=x.workspace_id
        and wm.user_id=nullif(current_setting('app.user_id',true),'')
       order by x.recurred_at desc,x.following_corrective_generation_recurrence_id desc limit 500`
    );
    return {checks:checks.rows,recurrences:recurrences.rows};
  });
  const checks=data.checks.map(checkFromRow);
  const recurrences=data.recurrences.map(recurrenceFromRow);
  const latest=new Map<string,PostFollowingCorrectiveGenerationReclosureCheck>();
  for(const item of checks){
    const key=item.workspaceId+":"+item.followingCorrectiveGenerationReclosureId;
    if(!latest.has(key)) latest.set(key,item);
  }
  return {
    closure, checks, recurrences,
    totals:{
      verifiedReclosures:closure.reclosures.length,
      neverChecked:closure.reclosures.filter(x=>!latest.has(x.workspaceId+":"+x.followingCorrectiveGenerationReclosureId)).length,
      stableLatest:[...latest.values()].filter(x=>x.status==="stable").length,
      recurredLatest:[...latest.values()].filter(x=>x.status==="recurred").length,
      verificationErrors:[...latest.values()].filter(x=>x.status==="rejected"||x.status==="transport-error").length,
      governedRecurrences:recurrences.length
    }
  };
}

export async function loadPostFollowingCorrectiveGenerationReclosureContext(
  userId: string,
  input: {workspaceId:string; followingCorrectiveGenerationReclosureId:string}
): Promise<PostFollowingCorrectiveGenerationReclosureContext> {
  const model=await listFollowingCorrectiveGenerationClosureForUser(userId);
  const reclosure=model.reclosures.find(x=>
    x.workspaceId===input.workspaceId &&
    x.followingCorrectiveGenerationReclosureId===input.followingCorrectiveGenerationReclosureId
  );
  if(!reclosure) throw new Error("post_following_corrective_generation_reclosure_not_found");
  const delivery=model.followingCorrectiveGeneration.deliveries.find(x=>
    x.workspaceId===input.workspaceId &&
    x.deliveryId===reclosure.followingCorrectiveGenerationDeliveryId
  );
  if(!delivery || delivery.status!=="accepted") {
    throw new Error("post_following_corrective_generation_reclosure_accepted_delivery_required");
  }

  const gate=await withUserDatabase(userId,async(client)=>{
    const r=await client.query<{
      case_status:string; delivery_status:string; plan_status:string;
      reclosure_fingerprint:string; next_corrective_generation_recurrence_fingerprint:string;
      latest_reclosure_id:string; recurrence2_id:string|null;
    }>(
      `select c.status as case_status,d.status as delivery_status,p.status as plan_status,
              r.following_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
              recurrence.next_corrective_generation_recurrence_fingerprint,
              (
                select latest.following_corrective_generation_reclosure_id
                from app.workspace_reconciliation_following_cg_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.following_corrective_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.following_corrective_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_following_cg_reclosures r
       join app.workspace_following_corrective_generation_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.following_corrective_generation_delivery_id
       join app.workspace_following_corrective_generation_plans p
         on p.workspace_id=r.workspace_id and p.following_corrective_generation_plan_id=r.following_corrective_generation_plan_id
       join app.workspace_reconciliation_next_corrective_generation_recurrences recurrence
         on recurrence.workspace_id=r.workspace_id and recurrence.next_corrective_generation_recurrence_id=r.next_corrective_generation_recurrence_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_following_cg_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.following_corrective_generation_reclosure_id=r.following_corrective_generation_reclosure_id
       where r.workspace_id=$1 and r.following_corrective_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.followingCorrectiveGenerationReclosureId]
    );
    return r.rows[0]??null;
  });
  if(!gate) throw new Error("post_following_corrective_generation_reclosure_not_found");
  if(gate.case_status!=="closed") throw new Error("post_following_corrective_generation_reclosure_closed_case_required");
  if(gate.delivery_status!=="accepted" || gate.plan_status!=="approved") {
    throw new Error("post_following_corrective_generation_reclosure_context_stale");
  }
  if(
    gate.reclosure_fingerprint!==reclosure.followingCorrectiveGenerationReclosureFingerprint ||
    gate.next_corrective_generation_recurrence_fingerprint!==reclosure.nextCorrectiveGenerationRecurrenceFingerprint ||
    gate.latest_reclosure_id!==reclosure.followingCorrectiveGenerationReclosureId
  ) throw new Error("post_following_corrective_generation_reclosure_identity_mismatch");
  if(gate.recurrence2_id) throw new Error("post_following_corrective_generation_reclosure_already_recurred");

  const execution=await loadApprovedFollowingCorrectiveGenerationPlanContext(userId,{
    workspaceId:input.workspaceId,
    followingCorrectiveGenerationPlanId:reclosure.followingCorrectiveGenerationPlanId,
    allowClosedCase:true
  });
  if(
    execution.plan.planFingerprint!==reclosure.followingCorrectiveGenerationPlanFingerprint ||
    execution.followingCorrectiveGenerationPackage.fingerprint!==reclosure.followingCorrectiveGenerationPackageFingerprint ||
    execution.followingCorrectiveGenerationPackage.packageId!==delivery.followingCorrectiveGenerationPackageId ||
    execution.followingCorrectiveGenerationPackage.replayKey!==delivery.followingCorrectiveGenerationReplayKey ||
    execution.followingCorrectiveGenerationPackage.fingerprint!==delivery.followingCorrectiveGenerationPackageFingerprint ||
    execution.consumerId!==delivery.consumerId
  ) throw new Error("post_following_corrective_generation_reclosure_package_identity_mismatch");

  return {reclosure,delivery,execution,package:execution.followingCorrectiveGenerationPackage};
}

export function comparePostFollowingCorrectiveGenerationReclosureConsumerState(
  integrationPackage: IntegrationPackageV1,
  response: ConsumerStateVerificationResponse
) {
  const comparison=compareConsumerState(integrationPackage,response);
  const status:PostFollowingCorrectiveGenerationReclosureStatus =
    comparison.status==="matched" ? "stable" :
    comparison.status==="drift" ? "recurred" : comparison.status;
  return {...comparison,status};
}

export async function recordPostFollowingCorrectiveGenerationReclosureCheck(
  userId:string,
  input:{
    workspaceId:string; context:PostFollowingCorrectiveGenerationReclosureContext;
    status:PostFollowingCorrectiveGenerationReclosureStatus; expectedRecordCount:number;
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
              r.following_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
              (
                select latest.following_corrective_generation_reclosure_id
                from app.workspace_reconciliation_following_cg_reclosures latest
                where latest.workspace_id=r.workspace_id and latest.case_id=r.case_id
                order by latest.closed_at desc,latest.following_corrective_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id,
              recurrence2.following_corrective_generation_recurrence_id as recurrence2_id
       from app.workspace_reconciliation_following_cg_reclosures r
       join app.workspace_following_corrective_generation_live_deliveries d
         on d.workspace_id=r.workspace_id and d.delivery_id=r.following_corrective_generation_delivery_id
       join app.workspace_following_corrective_generation_plans p
         on p.workspace_id=r.workspace_id and p.following_corrective_generation_plan_id=r.following_corrective_generation_plan_id
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=r.workspace_id and c.case_id=r.case_id
       left join app.workspace_reconciliation_following_cg_recurrences recurrence2
         on recurrence2.workspace_id=r.workspace_id
        and recurrence2.following_corrective_generation_reclosure_id=r.following_corrective_generation_reclosure_id
       where r.workspace_id=$1 and r.following_corrective_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,reclosure.followingCorrectiveGenerationReclosureId]
    );
    const row=current.rows[0];
    if(!row || row.case_status!=="closed") throw new Error("post_following_corrective_generation_reclosure_closed_case_required");
    if(row.delivery_status!=="accepted" || row.plan_status!=="approved") throw new Error("post_following_corrective_generation_reclosure_context_stale");
    if(
      row.reclosure_fingerprint!==reclosure.followingCorrectiveGenerationReclosureFingerprint ||
      row.latest_reclosure_id!==reclosure.followingCorrectiveGenerationReclosureId ||
      execution.plan.planFingerprint!==reclosure.followingCorrectiveGenerationPlanFingerprint ||
      input.context.package.packageId!==delivery.followingCorrectiveGenerationPackageId ||
      input.context.package.replayKey!==delivery.followingCorrectiveGenerationReplayKey ||
      input.context.package.fingerprint!==delivery.followingCorrectiveGenerationPackageFingerprint
    ) throw new Error("post_following_corrective_generation_reclosure_identity_mismatch");
    if(row.recurrence2_id) throw new Error("post_following_corrective_generation_reclosure_already_recurred");

    const id=randomUUID();
    await client.query(
      `insert into app.workspace_post_following_cg_reclosure_checks (
        workspace_id,following_corrective_generation_reclosure_regression_check_id,
        following_corrective_generation_reclosure_id,predecessor_next_corrective_generation_reclosure_id,next_corrective_generation_recurrence_id,case_id,
        following_corrective_generation_plan_id,following_corrective_generation_delivery_id,target,consumer_id,
        following_corrective_generation_reclosure_fingerprint,next_corrective_generation_recurrence_fingerprint,
        following_corrective_generation_plan_fingerprint,following_corrective_generation_package_id,
        following_corrective_generation_replay_key,following_corrective_generation_package_fingerprint,status,
        expected_record_count,matched_count,mismatched_count,missing_count,
        validation_code,http_status,consumer_verified_at,verification_fingerprint,
        record_results,actor_user_id,created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,now()
      )`,
      [
        input.workspaceId,id,reclosure.followingCorrectiveGenerationReclosureId,
        reclosure.predecessorNextCorrectiveGenerationReclosureId,reclosure.nextCorrectiveGenerationRecurrenceId,reclosure.caseId,
        reclosure.followingCorrectiveGenerationPlanId,reclosure.followingCorrectiveGenerationDeliveryId,
        reclosure.target,delivery.consumerId,reclosure.followingCorrectiveGenerationReclosureFingerprint,
        reclosure.nextCorrectiveGenerationRecurrenceFingerprint,reclosure.followingCorrectiveGenerationPlanFingerprint,
        delivery.followingCorrectiveGenerationPackageId,delivery.followingCorrectiveGenerationReplayKey,
        delivery.followingCorrectiveGenerationPackageFingerprint,input.status,input.expectedRecordCount,
        input.matchedCount,input.mismatchedCount,input.missingCount,
        input.validationCode.slice(0,96),input.httpStatus??null,
        input.consumerVerifiedAt??null,input.verificationFingerprint,
        JSON.stringify(input.recordResults),userId
      ]
    );
    return id;
  });
}

export async function recurFollowingCorrectiveGenerationReclosedException(
  userId:string,
  input:{
    workspaceId:string; followingCorrectiveGenerationReclosureId:string;
    followingCorrectiveGenerationReclosureRegressionCheckId:string; recurrenceReason:string;
  }
) {
  const reason=input.recurrenceReason.trim().slice(0,8000);
  if(!reason) throw new Error("post_following_corrective_generation_recurrence_reason_required");
  return withUserDatabase(userId,async(client)=>{
    await requireManager(client,input.workspaceId);
    const existing=await client.query<{following_corrective_generation_recurrence_id:string}>(
      `select following_corrective_generation_recurrence_id
       from app.workspace_reconciliation_following_cg_recurrences
       where workspace_id=$1 and following_corrective_generation_reclosure_id=$2 limit 1`,
      [input.workspaceId,input.followingCorrectiveGenerationReclosureId]
    );
    if(existing.rows[0]) return existing.rows[0].following_corrective_generation_recurrence_id;

    const result=await client.query<{
      check_id:string; reclosure_id:string; predecessor_next_corrective_generation_recurrence_id:string;
      case_id:string; target:IntegrationTarget; status:PostFollowingCorrectiveGenerationReclosureStatus;
      reclosure_fingerprint:string; verification_fingerprint:string;
      case_status:string; latest_check_id:string; latest_reclosure_id:string;
    }>(
      `select x.following_corrective_generation_reclosure_regression_check_id as check_id,
              x.following_corrective_generation_reclosure_id as reclosure_id,
              x.next_corrective_generation_recurrence_id as predecessor_next_corrective_generation_recurrence_id,x.case_id,x.target,x.status,
              x.following_corrective_generation_reclosure_fingerprint as reclosure_fingerprint,
              x.verification_fingerprint,
              c.status as case_status,
              (
                select newest.following_corrective_generation_reclosure_regression_check_id
                from app.workspace_post_following_cg_reclosure_checks newest
                where newest.workspace_id=x.workspace_id
                  and newest.following_corrective_generation_reclosure_id=x.following_corrective_generation_reclosure_id
                order by newest.created_at desc,newest.following_corrective_generation_reclosure_regression_check_id desc limit 1
              ) as latest_check_id,
              (
                select newest.following_corrective_generation_reclosure_id
                from app.workspace_reconciliation_following_cg_reclosures newest
                where newest.workspace_id=x.workspace_id and newest.case_id=x.case_id
                order by newest.closed_at desc,newest.following_corrective_generation_reclosure_id desc limit 1
              ) as latest_reclosure_id
       from app.workspace_post_following_cg_reclosure_checks x
       join app.workspace_reconciliation_exception_cases c
         on c.workspace_id=x.workspace_id and c.case_id=x.case_id
       where x.workspace_id=$1 and x.following_corrective_generation_reclosure_id=$2
         and x.following_corrective_generation_reclosure_regression_check_id=$3 limit 1`,
      [input.workspaceId,input.followingCorrectiveGenerationReclosureId,input.followingCorrectiveGenerationReclosureRegressionCheckId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("post_following_corrective_generation_recurrence_check_not_found");
    if(row.status!=="recurred" || row.case_status!=="closed") {
      throw new Error("post_following_corrective_generation_recurrence_recurred_closed_required");
    }
    if(row.latest_check_id!==row.check_id) throw new Error("post_following_corrective_generation_recurrence_latest_check_required");
    if(row.latest_reclosure_id!==row.reclosure_id) throw new Error("post_following_corrective_generation_recurrence_latest_reclosure_required");

    const followingCorrectiveGenerationRecurrenceId=randomUUID();
    const governed=followingCorrectiveGenerationRecurrenceFingerprint({
      followingCorrectiveGenerationReclosureId:row.reclosure_id,
      followingCorrectiveGenerationReclosureRegressionCheckId:row.check_id,
      caseId:row.case_id,
      followingCorrectiveGenerationReclosureFingerprint:row.reclosure_fingerprint,
      regressionFingerprint:row.verification_fingerprint,
      recurrenceReason:reason
    });
    await client.query(
      `insert into app.workspace_reconciliation_following_cg_recurrences (
        workspace_id,following_corrective_generation_recurrence_id,following_corrective_generation_reclosure_id,
        following_corrective_generation_reclosure_regression_check_id,predecessor_next_corrective_generation_recurrence_id,
        case_id,target,following_corrective_generation_reclosure_fingerprint,regression_fingerprint,
        following_corrective_generation_recurrence_fingerprint,recurrence_reason,recurred_by,recurred_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
      [input.workspaceId,followingCorrectiveGenerationRecurrenceId,row.reclosure_id,row.check_id,
       row.predecessor_next_corrective_generation_recurrence_id,row.case_id,row.target,row.reclosure_fingerprint,
       row.verification_fingerprint,governed,reason,userId]
    );
    const updated=await client.query(
      `update app.workspace_reconciliation_exception_cases
       set status='open',closed_by=null,closed_at=null,updated_by=$3,updated_at=now(),
           investigation_note=left(
             case when investigation_note='' then $4
               else investigation_note || E'\n\nBuild 108 governed following-corrective-generation recurrence: ' || $4 end,
             8000
           )
       where workspace_id=$1 and case_id=$2 and status='closed'`,
      [input.workspaceId,row.case_id,userId,reason]
    );
    if(!updated.rowCount) throw new Error("post_following_corrective_generation_recurrence_closed_case_required");
    return followingCorrectiveGenerationRecurrenceId;
  });
}
