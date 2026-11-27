import {withUserDatabase} from "./database";
import {build452Site12Trace,BUILD_452_TYPES,type Build452Event,type Build452EventType} from "./build452-site12-trace";
type SourceRow={receipt_id:string;tenant_id:string|null;event_id:string;event_type:string;event_occurred_at:Date;received_at:Date;event_envelope:unknown};
function fields(raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
 const root=raw as Record<string,unknown>;
 // Webhook gateway owns original envelope signature/identity. Read its normalized non-sensitive object reference only.
 const p=root.data??root.payload??root;
 return p&&typeof p==="object"&&!Array.isArray(p)?p as Record<string,unknown>:{};
}
function safeId(x:unknown){return typeof x==="string"&&/^[A-Za-z0-9:_-]{2,120}$/.test(x)?x:null;}
function parse(row:SourceRow):Build452Event|null{
 const p=fields(row.event_envelope),site=String(p.siteNumber??"");
 const objectId=safeId(p.objectId),operationId=safeId(p.operationId);
 const version=p.version;
 if(site!=="12"||!objectId||!operationId||typeof version!=="number"||!Number.isSafeInteger(version)||version<1||!row.tenant_id||
   !BUILD_452_TYPES.includes(row.event_type as Build452EventType)||p.purpose!=="OPERATIONS_SUMMARY")return null;
 return {product:"icamp",tenantId:row.tenant_id,eventId:row.event_id,
  eventType:row.event_type as Build452EventType,siteNumber:"12",objectId,operationId,
  occurredAt:row.event_occurred_at.toISOString(),observedAt:row.received_at.toISOString(),version,
  purpose:"OPERATIONS_SUMMARY",sourceReceiptId:row.receipt_id,folioReference:safeId(p.folioReference)};
}
export async function readBuild452Site12Owner(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role;
  if(role!=="owner")throw new Error("build452_owner_required");
  // Never return the original webhook payload, customer names, payment details or tenant-wide records.
  const r=await client.query<SourceRow>(`select receipt_id,tenant_id,event_id,event_type,
    event_occurred_at,received_at,event_envelope from app.webhook_receipts
    where source_application_id='icamp' and event_type=any($1::text[])
      and received_at>=now()-interval '14 days'
    order by received_at desc limit 1000`,[[...BUILD_452_TYPES]]);
  const normalized=r.rows.map(parse).filter((x):x is Build452Event=>x!==null);
  const report=build452Site12Trace(normalized);
  return {...report,rawSourceReceiptWindowCount:r.rows.length,
   sourceMappingExcluded:r.rows.length-normalized.length,readbackAt:new Date().toISOString(),
   sourceSystem:"existing_authenticated_webhook_receipts",sourceWindowDays:14,
   operationalDataMutated:false};
 });
}
