import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import { summarizeDataReviewRows, type DataReviewRow } from "./data-review-workbench";

export const BULK_REVIEW_REASON_CODES = ["verified-clean","duplicate-set","source-incomplete","policy-review","needs-owner-review","quality-exception","other"] as const;
export type BulkReviewReasonCode = (typeof BULK_REVIEW_REASON_CODES)[number];
export type BulkReviewDecision = "approve" | "reject" | "hold";

export interface BulkReviewItem {
  workspaceId:string; workspaceName:string; role:"owner"|"admin"|"member";
  reviewId:string; title:string; sourceDatasetId:string; sourceServerVersion:number;
  rowCount:number; includedCount:number; updatedAt:string; eventCount:number;
  canDecide:boolean; openExceptionCount:number;
}
export interface BulkReviewException {
  workspaceId:string; workspaceName:string; exceptionId:string; reviewId:string;
  title:string; reasonCode:string; note:string; createdBy:string; createdAt:string;
}
export interface BulkReviewModel {
  generatedAt:string;
  workspaces:Array<{id:string;name:string;role:"owner"|"admin"|"member"}>;
  items:BulkReviewItem[]; exceptions:BulkReviewException[];
  totals:{inReview:number;selectable:number;openExceptions:number};
}
type BatchRow = QueryResultRow & {
  workspace_id:string; workspace_name:string; review_id:string; title:string;
  source_dataset_id:string; source_server_version:string|number; working_rows:DataReviewRow[];
  row_count:string|number; included_count:string|number; updated_at:Date;
  event_count:string|number; open_exception_count:string|number;
};
type ExceptionRow = QueryResultRow & {
  workspace_id:string; workspace_name:string; exception_id:string; review_id:string;
  title:string; reason_code:string; note:string; created_by:string; created_at:Date;
};
function normalizeIds(value:unknown){
  if(!Array.isArray(value)) throw new Error("bulk_review_ids_invalid");
  const ids=[...new Set(value.filter((item):item is string=>typeof item==="string").map((item)=>item.trim()).filter(Boolean))];
  if(!ids.length || ids.length>50) throw new Error("bulk_review_selection_invalid");
  return ids;
}
function normalizeReason(value:unknown):BulkReviewReasonCode{
  if(typeof value!=="string" || !BULK_REVIEW_REASON_CODES.includes(value as BulkReviewReasonCode)) throw new Error("bulk_review_reason_invalid");
  return value as BulkReviewReasonCode;
}
function normalizeNote(value:unknown){ return typeof value==="string" ? value.trim().slice(0,4000) : ""; }
function previewFingerprint(input:unknown){ return "brp1-"+createHash("sha256").update(JSON.stringify(input)).digest("hex"); }

async function requireAdmin(client:PoolClient,workspaceId:string){
  const result=await client.query<{role:string}>(
    "select role from app.workspace_members where workspace_id=$1 and user_id=nullif(current_setting('app.user_id', true),'') limit 1",[workspaceId]
  );
  const role=result.rows[0]?.role;
  if(role!=="owner" && role!=="admin") throw new Error("bulk_review_admin_required");
}
async function selectedRows(client:PoolClient,workspaceId:string,reviewIds:string[]){
  const result=await client.query<{review_id:string;status:string;working_rows:DataReviewRow[];title:string;source_dataset_id:string;source_server_version:string|number}>(
    `select review_id,status,working_rows,title,source_dataset_id,source_server_version
     from app.workspace_data_review_batches
     where workspace_id=$1 and review_id = any($2::uuid[])
     order by review_id`,[workspaceId,reviewIds]
  );
  if(result.rows.length!==reviewIds.length) throw new Error("bulk_review_scope_mismatch");
  if(result.rows.some((row)=>row.status!=="in-review")) throw new Error("bulk_review_terminal_item");
  return result.rows;
}

export async function listBulkReviewWorkbenchForUser(userId:string):Promise<BulkReviewModel>{
  const workspaces=await listWorkspacesForUser(userId);
  const roleByWorkspace=new Map(workspaces.map((item)=>[item.id,item.role]));
  return withUserDatabase(userId,async(client)=>{
    const [batches,exceptions]=await Promise.all([
      client.query<BatchRow>(`select b.workspace_id,w.name as workspace_name,b.review_id,b.title,
        b.source_dataset_id,b.source_server_version,b.working_rows,b.row_count,b.included_count,b.updated_at,
        (select count(*) from app.workspace_data_review_events e where e.workspace_id=b.workspace_id and e.review_id=b.review_id)::int as event_count,
        (select count(*) from app.workspace_data_review_exceptions x where x.workspace_id=b.workspace_id and x.review_id=b.review_id and x.status='open')::int as open_exception_count
        from app.workspace_data_review_batches b join app.workspaces w on w.id=b.workspace_id
        where b.status='in-review' order by b.updated_at desc limit 200`),
      client.query<ExceptionRow>(`select x.workspace_id,w.name as workspace_name,x.exception_id,x.review_id,b.title,x.reason_code,x.note,x.created_by,x.created_at
        from app.workspace_data_review_exceptions x
        join app.workspace_data_review_batches b on b.workspace_id=x.workspace_id and b.review_id=x.review_id
        join app.workspaces w on w.id=x.workspace_id
        where x.status='open' order by x.created_at desc limit 200`)
    ]);
    const items=batches.rows.map((row):BulkReviewItem=>{
      const role=(roleByWorkspace.get(row.workspace_id)??"member") as "owner"|"admin"|"member";
      return {workspaceId:row.workspace_id,workspaceName:row.workspace_name,role,reviewId:row.review_id,title:row.title,
        sourceDatasetId:row.source_dataset_id,sourceServerVersion:Number(row.source_server_version),rowCount:Number(row.row_count),
        includedCount:Number(row.included_count),updatedAt:row.updated_at.toISOString(),eventCount:Number(row.event_count),
        canDecide:role==="owner"||role==="admin",openExceptionCount:Number(row.open_exception_count)};
    });
    return {
      generatedAt:new Date().toISOString(),
      workspaces:workspaces.map((item)=>({id:item.id,name:item.name,role:item.role})),
      items,
      exceptions:exceptions.rows.map((row)=>({workspaceId:row.workspace_id,workspaceName:row.workspace_name,exceptionId:row.exception_id,
        reviewId:row.review_id,title:row.title,reasonCode:row.reason_code,note:row.note,createdBy:row.created_by,createdAt:row.created_at.toISOString()})),
      totals:{inReview:items.length,selectable:items.filter((item)=>item.canDecide).length,openExceptions:exceptions.rows.length}
    };
  });
}

export async function previewBulkReviewDecision(userId:string,input:{workspaceId:string;reviewIds:unknown;decision:BulkReviewDecision;reasonCode:unknown;note?:unknown}){
  const reviewIds=normalizeIds(input.reviewIds);
  const reasonCode=normalizeReason(input.reasonCode);
  if(!["approve","reject","hold"].includes(input.decision)) throw new Error("bulk_review_decision_invalid");
  return withUserDatabase(userId,async(client)=>{
    await requireAdmin(client,input.workspaceId);
    const rows=await selectedRows(client,input.workspaceId,reviewIds);
    const items=rows.map((row)=>{
      const summary=summarizeDataReviewRows(Array.isArray(row.working_rows)?row.working_rows:[]);
      if(input.decision==="approve" && summary.included<1) throw new Error("data_review_requires_included_row");
      return {reviewId:row.review_id,title:row.title,sourceDatasetId:row.source_dataset_id,
        sourceServerVersion:Number(row.source_server_version),includedCount:summary.included,rowCount:summary.rows};
    });
    const normalized={workspaceId:input.workspaceId,reviewIds:reviewIds.slice().sort(),decision:input.decision,reasonCode,note:normalizeNote(input.note),items};
    return {...normalized,previewToken:previewFingerprint(normalized)};
  });
}

export async function commitBulkReviewDecision(userId:string,input:{workspaceId:string;reviewIds:unknown;decision:BulkReviewDecision;reasonCode:unknown;note?:unknown;previewToken:unknown}){
  const preview=await previewBulkReviewDecision(userId,input);
  if(typeof input.previewToken!=="string" || input.previewToken!==preview.previewToken) throw new Error("bulk_review_preview_stale");
  await withUserDatabase(userId,async(client)=>{
    await requireAdmin(client,preview.workspaceId);
    const rows=await selectedRows(client,preview.workspaceId,preview.reviewIds);
    for(const row of rows){
      const summary=summarizeDataReviewRows(Array.isArray(row.working_rows)?row.working_rows:[]);
      const details=JSON.stringify({bulk:true,decision:preview.decision,reasonCode:preview.reasonCode,note:preview.note,rows:summary.rows,included:summary.included});
      if(preview.decision==="hold"){
        await client.query(`insert into app.workspace_data_review_exceptions
          (workspace_id,exception_id,review_id,reason_code,note,created_by)
          values ($1,$2,$3,$4,$5,$6)`,[preview.workspaceId,randomUUID(),row.review_id,preview.reasonCode,preview.note,userId]);
        await client.query(`insert into app.workspace_data_review_events
          (workspace_id,event_id,review_id,action,actor_user_id,details)
          values ($1,$2,$3,'held',$4,$5::jsonb)`,[preview.workspaceId,randomUUID(),row.review_id,userId,details]);
      }else if(preview.decision==="approve"){
        await client.query(`update app.workspace_data_review_batches
          set status='approved',included_count=$3,cleanup_summary=$4::jsonb,review_note=$5,approved_by=$6,approved_at=now(),updated_by=$6,updated_at=now()
          where workspace_id=$1 and review_id=$2 and status='in-review'`,
          [preview.workspaceId,row.review_id,summary.included,JSON.stringify(summary),preview.note,userId]);
        await client.query(`insert into app.workspace_data_review_events
          (workspace_id,event_id,review_id,action,actor_user_id,details)
          values ($1,$2,$3,'approved',$4,$5::jsonb)`,[preview.workspaceId,randomUUID(),row.review_id,userId,details]);
      }else{
        await client.query(`update app.workspace_data_review_batches
          set status='rejected',review_note=$3,rejected_by=$4,rejected_at=now(),updated_by=$4,updated_at=now()
          where workspace_id=$1 and review_id=$2 and status='in-review'`,[preview.workspaceId,row.review_id,preview.note,userId]);
        await client.query(`insert into app.workspace_data_review_events
          (workspace_id,event_id,review_id,action,actor_user_id,details)
          values ($1,$2,$3,'rejected',$4,$5::jsonb)`,[preview.workspaceId,randomUUID(),row.review_id,userId,details]);
      }
    }
  });
  return preview;
}
