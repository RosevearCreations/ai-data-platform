import type { QueryResultRow } from "pg";
import { listWorkspacesForUser, withUserDatabase } from "./database";
import type { AuditEvidenceItem, AuditEvidenceModel } from "./unified-audit-evidence-contract";
type EvidenceRow=QueryResultRow&{
 id:string;workspace_id:string;workspace_name:string;module:string;operation:string;result:string;actor_user_id:string|null;
 occurred_at:Date;source:string|null;consumer:string|null;collection_run_id:string|null;record_id:string|null;summary:string;details:Record<string,unknown>|null;
};
function distinct(values:string[]){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
export async function listUnifiedAuditEvidenceForUser(userId:string):Promise<AuditEvidenceModel>{
 const workspaces=await listWorkspacesForUser(userId);
 const rows=await withUserDatabase(userId,async(client)=>{
  const result=await client.query<EvidenceRow>(`
    select * from (
      select
        ('review:'||e.event_id::text) as id,e.workspace_id,w.name as workspace_name,
        'data-review'::text as module,e.action::text as operation,
        case when e.action in ('approved') then 'success' when e.action in ('rejected') then 'rejected' when e.action='held' then 'held' else 'recorded' end as result,
        e.actor_user_id,e.created_at as occurred_at,
        coalesce(b.source_url,'') as source,''::text as consumer,
        coalesce(e.details->>'collectionRunId',e.details->>'runId','') as collection_run_id,
        coalesce(e.details->>'recordId',b.source_dataset_id,'') as record_id,
        (b.title||' · review '||e.action)::text as summary,e.details
      from app.workspace_data_review_events e
      join app.workspace_data_review_batches b on b.workspace_id=e.workspace_id and b.review_id=e.review_id
      join app.workspaces w on w.id=e.workspace_id

      union all

      select
        ('publication:'||e.event_id::text),e.workspace_id,w.name,'approved-data',e.action,
        case when e.action='withdrawn' then 'withdrawn' else 'success' end,
        e.actor_user_id,e.created_at,p.source_url,''::text,
        coalesce(e.details->>'collectionRunId',''),p.source_dataset_id,
        (p.title||' · publication '||e.action),e.details
      from app.workspace_dataset_publication_events e
      join app.workspace_dataset_publications p on p.workspace_id=e.workspace_id and p.publication_id=e.publication_id
      join app.workspaces w on w.id=e.workspace_id

      union all

      select
        ('delivery:'||r.receipt_id::text),r.workspace_id,w.name,'publication-delivery','delivery-receipt',
        r.receipt_status,r.actor_user_id,r.created_at,''::text,r.consumer_id,
        coalesce(r.details->>'collectionRunId',''),r.publication_id::text,
        (r.target||' · '||r.receipt_status||' · '||r.validation_code),r.details
      from app.workspace_publication_delivery_receipts r
      join app.workspaces w on w.id=r.workspace_id

      union all

      select
        ('integration:'||e.event_id::text),e.workspace_id,w.name,'integration-delivery',e.event_type,
        case when e.event_type in ('delivery-accepted','handshake-accepted') then 'success'
             when e.event_type in ('delivery-rejected','handshake-rejected','transport-error') then 'failure'
             else 'attempted' end,
        e.actor_user_id,e.occurred_at,''::text,e.consumer_id,
        coalesce(e.details->>'collectionRunId',''),coalesce(e.package_id,e.batch_id,''),
        (e.target||' · '||e.event_type||' · '||e.validation_code),e.details
      from app.integration_delivery_events e
      join app.workspaces w on w.id=e.workspace_id

      union all

      select
        ('operations:'||e.event_id::text),e.workspace_id,w.name,'operations',e.event_type,
        case when e.event_type like '%error' or e.event_type like '%conflict' or e.compatibility_status='broken' then 'failure'
             when e.event_type like '%rejected' then 'rejected' else 'success' end,
        e.actor_user_id,e.occurred_at,
        coalesce(e.details->>'sourceUrl',e.details->>'source',''),''::text,
        coalesce(e.details->>'collectionRunId',e.details->>'runId',''),e.record_id,
        (e.event_family||' · '||e.event_type||' · '||e.record_id),e.details
      from app.workspace_operational_outcomes e
      join app.workspaces w on w.id=e.workspace_id

      union all

      select
        ('remote:'||e.event_id::text),e.workspace_id,w.name,'remote-execution',e.event_type,
        case when e.event_type='run-succeeded' then 'success'
             when e.event_type='run-failed' then 'failure'
             when e.event_type='kill-switch' then 'blocked' else 'recorded' end,
        null::text,e.created_at,
        coalesce(e.details->>'sourceOrigin',e.details->>'source',''),e.provider_key,
        coalesce(e.job_id::text,e.details->>'collectionRunId',''),coalesce(e.details->>'recordId',''),
        (e.provider_key||' · '||e.event_type),e.details
      from app.remote_execution_provider_events e
      join app.workspaces w on w.id=e.workspace_id
    ) evidence
    order by occurred_at desc
    limit 800
  `);
  return result.rows;
 });
 const items=rows.map((row):AuditEvidenceItem=>({
  id:row.id,workspaceId:row.workspace_id,workspaceName:row.workspace_name,module:row.module,operation:row.operation,result:row.result,
  actorUserId:row.actor_user_id??"",occurredAt:row.occurred_at.toISOString(),source:row.source??"",consumer:row.consumer??"",
  collectionRunId:row.collection_run_id??"",recordId:row.record_id??"",summary:row.summary,details:row.details??{}
 }));
 return {
  generatedAt:new Date().toISOString(),
  workspaces:workspaces.map((w)=>({id:w.id,name:w.name,role:w.role})),
  items,
  filters:{
   modules:distinct(items.map(x=>x.module)),operations:distinct(items.map(x=>x.operation)),results:distinct(items.map(x=>x.result)),
   actors:distinct(items.map(x=>x.actorUserId)),sources:distinct(items.map(x=>x.source)),consumers:distinct(items.map(x=>x.consumer))
  },
  totals:{events:items.length,modules:distinct(items.map(x=>x.module)).length,workspaces:distinct(items.map(x=>x.workspaceId)).length}
 };
}
