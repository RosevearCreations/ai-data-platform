import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import {
  buildTaskExchangeEnvelope,
  normalizeSharedTask,
  safeTaskReviewReason,
  type TaskExchangeApplication,
  type TaskKind,
  type TaskPriority
} from "./shared-task-exchange-core";
import { listWorkspacesForUser, withUserDatabase } from "./database";

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") throw new Error("workspace_admin_required");
}

function dateOrNull(value: unknown) {
  return value === null || value === undefined ? null : new Date(String(value));
}

export async function listSharedTaskExchangeForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [tasks,links,packages] = await Promise.all([
      client.query(`select * from app.shared_task_work_items order by created_at desc limit 500`),
      client.query(`select * from app.shared_task_links order by created_at desc limit 500`),
      client.query(`
        select p.*, t.title, t.task_kind, t.priority, t.source_application_id,
               rv.decision, rv.reason, rv.reviewed_at
        from app.shared_task_exchange_packages p
        inner join app.shared_task_work_items t on t.task_id=p.task_id
        left join app.shared_task_exchange_reviews rv on rv.package_id=p.package_id
        order by case when rv.decision is null then 0 else 1 end, p.created_at desc
        limit 500`)
    ]);

    return {
      tasks: tasks.rows.map((row)=>({
        taskId:String(row.task_id),
        workspaceId:String(row.workspace_id),
        sourceApplicationId:String(row.source_application_id) as TaskExchangeApplication,
        destinationApplicationId:String(row.destination_application_id) as TaskExchangeApplication,
        canonicalTenantKey:String(row.canonical_tenant_key),
        sourceRecordType:String(row.source_record_type),
        sourceRecordId:String(row.source_record_id),
        taskKind:String(row.task_kind) as TaskKind,
        priority:String(row.priority) as TaskPriority,
        title:String(row.title),
        summary:String(row.summary),
        dueAt:dateOrNull(row.due_at),
        assigneeHint:row.assignee_hint ? String(row.assignee_hint) : null,
        linkedCustomerRecordId:row.linked_customer_record_id ? String(row.linked_customer_record_id) : null,
        linkedJobRecordId:row.linked_job_record_id ? String(row.linked_job_record_id) : null,
        state:"held" as const,
        holdReason:"task-exchange-not-authorized" as const,
        createdAt:new Date(String(row.created_at))
      })),
      links: links.rows.map((row)=>({
        linkId:String(row.link_id),
        workspaceId:String(row.workspace_id),
        parentTaskId:String(row.parent_task_id),
        childTaskId:String(row.child_task_id),
        relationship:String(row.relationship),
        reason:String(row.reason),
        createdAt:new Date(String(row.created_at))
      })),
      packages: packages.rows.map((row)=>({
        packageId:String(row.package_id),
        workspaceId:String(row.workspace_id),
        taskId:String(row.task_id),
        title:String(row.title),
        taskKind:String(row.task_kind),
        priority:String(row.priority),
        sourceApplicationId:String(row.source_application_id),
        destinationApplicationId:String(row.destination_application_id),
        destinationTenantKey:String(row.destination_tenant_key),
        payloadSha256:String(row.payload_sha256),
        state:"held" as const,
        holdReason:"task-exchange-not-authorized" as const,
        reviewDecision:row.decision === "approve" || row.decision === "reject" ? row.decision : null,
        reviewReason:row.reason ? String(row.reason) : null,
        reviewedAt:dateOrNull(row.reviewed_at),
        createdAt:new Date(String(row.created_at))
      }))
    };
  });

  return {
    workspaces,
    ...state,
    summary:{
      heldTasks:state.tasks.length,
      linkedTasks:state.links.length,
      heldPackages:state.packages.length,
      pendingReviews:state.packages.filter((item)=>item.reviewDecision===null).length,
      approvedForFutureHandoff:state.packages.filter((item)=>item.reviewDecision==="approve").length,
      urgentTasks:state.tasks.filter((item)=>item.priority==="urgent").length
    },
    policy:{
      appendOnlyTasks:true,
      packageState:"held",
      peerApplicationWrites:false,
      outboundNetworkRequests:false,
      automaticTaskCreation:false,
      ownerAdminReviewRequired:true,
      ql266Resumed:false
    }
  };
}

export async function createSharedTask(userId:string,input:{
  workspaceId:string;
  sourceApplicationId:string;
  destinationApplicationId:string;
  canonicalTenantKey:string;
  sourceRecordType:string;
  sourceRecordId:string;
  taskKind:string;
  priority:string;
  title:string;
  summary:string;
  dueAt?:string|null;
  assigneeHint?:string|null;
  linkedCustomerRecordId?:string|null;
  linkedJobRecordId?:string|null;
}) {
  const normalized=normalizeSharedTask(input);
  return withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,input.workspaceId);
    const taskId=randomUUID();
    const result=await client.query<{task_id:string}>(
      `insert into app.shared_task_work_items (
        task_id,workspace_id,source_application_id,destination_application_id,
        canonical_tenant_key,source_record_type,source_record_id,task_kind,priority,
        title,summary,due_at,assignee_hint,linked_customer_record_id,linked_job_record_id,
        task_sha256,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      on conflict (workspace_id,task_sha256) do nothing returning task_id`,
      [
        taskId,input.workspaceId,normalized.sourceApplicationId,normalized.destinationApplicationId,
        normalized.canonicalTenantKey,normalized.sourceRecordType,normalized.sourceRecordId,
        normalized.taskKind,normalized.priority,normalized.title,normalized.summary,
        normalized.dueAt,normalized.assigneeHint,normalized.linkedCustomerRecordId,
        normalized.linkedJobRecordId,normalized.taskSha256,userId
      ]
    );
    let resolvedId=result.rows[0]?.task_id ? String(result.rows[0].task_id) : "";
    if(!resolvedId){
      const existing=await client.query<{task_id:string}>(
        `select task_id from app.shared_task_work_items
         where workspace_id=$1 and task_sha256=$2 limit 1`,
        [input.workspaceId,normalized.taskSha256]
      );
      resolvedId=existing.rows[0]?.task_id ?? "";
    }
    if(!resolvedId) throw new Error("task_exchange_conflict");

    await client.query(
      `insert into app.shared_task_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,task_id,details)
       values ($1,$2,$3,'task-created',$4,$5::jsonb)`,
      [randomUUID(),input.workspaceId,userId,resolvedId,JSON.stringify({
        sourceApplicationId:normalized.sourceApplicationId,
        destinationApplicationId:normalized.destinationApplicationId,
        priority:normalized.priority,
        peerApplicationWrite:false
      })]
    );
    return {taskId:resolvedId,...normalized,state:"held" as const};
  });
}

export async function linkSharedTasks(userId:string,input:{
  workspaceId:string;
  parentTaskId:string;
  childTaskId:string;
  relationship:"follow-up"|"blocks"|"relates-to"|"derived-from";
  reason:string;
}) {
  if(!safeTaskReviewReason(input.reason)) throw new Error("task_link_reason_invalid");
  if(input.parentTaskId===input.childTaskId) throw new Error("task_self_link_denied");
  return withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,input.workspaceId);
    const tasks=await client.query<{task_id:string}>(
      `select task_id from app.shared_task_work_items
       where workspace_id=$1 and task_id=any($2::uuid[])`,
      [input.workspaceId,[input.parentTaskId,input.childTaskId]]
    );
    if(tasks.rowCount!==2) throw new Error("task_link_scope_invalid");
    const linkId=randomUUID();
    await client.query(
      `insert into app.shared_task_links
       (link_id,workspace_id,parent_task_id,child_task_id,relationship,reason,created_by)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [linkId,input.workspaceId,input.parentTaskId,input.childTaskId,input.relationship,input.reason.trim(),userId]
    );
    await client.query(
      `insert into app.shared_task_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,link_id,details)
       values ($1,$2,$3,'task-linked',$4,$5::jsonb)`,
      [randomUUID(),input.workspaceId,userId,linkId,JSON.stringify({
        parentTaskId:input.parentTaskId,childTaskId:input.childTaskId,relationship:input.relationship
      })]
    );
    return {linkId};
  });
}

export async function prepareTaskExchangePackage(userId:string,input:{
  taskId:string;
  destinationTenantKey:string;
}) {
  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(`select * from app.shared_task_work_items where task_id=$1 limit 1`,[input.taskId]);
    const row=result.rows[0];
    if(!row) throw new Error("task_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);
    const task=normalizeSharedTask({
      sourceApplicationId:String(row.source_application_id),
      destinationApplicationId:String(row.destination_application_id),
      canonicalTenantKey:String(row.canonical_tenant_key),
      sourceRecordType:String(row.source_record_type),
      sourceRecordId:String(row.source_record_id),
      taskKind:String(row.task_kind),
      priority:String(row.priority),
      title:String(row.title),
      summary:String(row.summary),
      dueAt:row.due_at ? new Date(String(row.due_at)).toISOString() : null,
      assigneeHint:row.assignee_hint ? String(row.assignee_hint) : null,
      linkedCustomerRecordId:row.linked_customer_record_id ? String(row.linked_customer_record_id) : null,
      linkedJobRecordId:row.linked_job_record_id ? String(row.linked_job_record_id) : null
    });
    const prepared=buildTaskExchangeEnvelope(task);
    const destinationTenantKey=input.destinationTenantKey.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(destinationTenantKey)) throw new Error("task_destination_tenant_invalid");

    const packageId=randomUUID();
    const inserted=await client.query<{package_id:string}>(
      `insert into app.shared_task_exchange_packages (
        package_id,workspace_id,task_id,destination_application_id,destination_tenant_key,
        payload_sha256,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (workspace_id,task_id,destination_application_id,destination_tenant_key,payload_sha256)
      do nothing returning package_id`,
      [packageId,workspaceId,input.taskId,task.destinationApplicationId,destinationTenantKey,prepared.payloadSha256,userId]
    );
    let resolvedId=inserted.rows[0]?.package_id ? String(inserted.rows[0].package_id) : "";
    if(!resolvedId){
      const existing=await client.query<{package_id:string}>(
        `select package_id from app.shared_task_exchange_packages
         where workspace_id=$1 and task_id=$2 and destination_application_id=$3
           and destination_tenant_key=$4 and payload_sha256=$5 limit 1`,
        [workspaceId,input.taskId,task.destinationApplicationId,destinationTenantKey,prepared.payloadSha256]
      );
      resolvedId=existing.rows[0]?.package_id ?? "";
    }
    if(!resolvedId) throw new Error("task_package_conflict");
    await client.query(
      `insert into app.shared_task_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,task_id,package_id,details)
       values ($1,$2,$3,'package-prepared',$4,$5,$6::jsonb)`,
      [randomUUID(),workspaceId,userId,input.taskId,resolvedId,JSON.stringify({
        state:"held",peerApplicationWriteRequested:false,payloadSha256:prepared.payloadSha256
      })]
    );
    return {packageId:resolvedId,payloadSha256:prepared.payloadSha256,state:"held" as const};
  });
}

export async function reviewTaskExchangePackage(userId:string,input:{
  packageId:string;
  decision:"approve"|"reject";
  reason:string;
}) {
  if(!safeTaskReviewReason(input.reason)) throw new Error("task_review_reason_invalid");
  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(`select workspace_id from app.shared_task_exchange_packages where package_id=$1 limit 1`,[input.packageId]);
    const workspaceId=result.rows[0]?.workspace_id ? String(result.rows[0].workspace_id) : "";
    if(!workspaceId) throw new Error("task_package_not_found");
    await requireWorkspaceAdmin(client,workspaceId);
    const reviewId=randomUUID();
    await client.query(
      `insert into app.shared_task_exchange_reviews
       (review_id,workspace_id,package_id,decision,reason,reviewed_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [reviewId,workspaceId,input.packageId,input.decision,input.reason.trim(),userId]
    );
    await client.query(
      `insert into app.shared_task_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,package_id,review_id,details)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [randomUUID(),workspaceId,userId,
       input.decision==="approve" ? "package-approved-for-future-handoff" : "package-rejected",
       input.packageId,reviewId,JSON.stringify({state:"held",peerApplicationWrite:false})]
    );
    return {reviewId,packageId:input.packageId,decision:input.decision,state:"held" as const};
  });
}
