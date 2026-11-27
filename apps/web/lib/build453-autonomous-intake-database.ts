import {randomUUID} from "node:crypto";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {decodeWebhookSecret} from "./webhook-gateway-core";
import {assessBuild453,type Build453Summary} from "./build453-autonomous-intake";
type Raw={
 sourceEndpointCount?:unknown;site12AllowedEndpointCount?:unknown;sourceSecretEnvNames?:unknown;
 activeSubscriptions?:unknown;webhookReceipts?:unknown;site12EventReceipts?:unknown;
 lastSite12ReceiptAt?:unknown;eventPublications?:unknown;eventRoutes?:unknown;
 lastSignedSweepAt?:unknown;lastWindowsRelayAt?:unknown
};
function count(x:unknown){return typeof x==="number"&&Number.isSafeInteger(x)&&x>=0?x:0;}
function iso(x:unknown):string|null{
 if(typeof x!=="string")return null;
 const t=Date.parse(x);return Number.isFinite(t)?new Date(t).toISOString():null;
}
async function inspectBuild453(){
 const raw=await withProtectedDatabase(async client=>{
  const r=await client.query<{summary:Raw}>("select app.build453_intake_source_summary() as summary");
  return r.rows[0]?.summary??{};
 });
 let valid=0;
 const vars=Array.isArray(raw.sourceSecretEnvNames)?raw.sourceSecretEnvNames:[];
 for(const name of new Set(vars.filter((v):v is string=>typeof v==="string"&&/^[A-Z][A-Z0-9_]{2,127}$/.test(v)))){
  const key=decodeWebhookSecret(process.env[name]);
  if(key){valid++;key.fill(0);}
 }
 const summary:Build453Summary={
  sourceEndpointCount:count(raw.sourceEndpointCount),
  site12AllowedEndpointCount:count(raw.site12AllowedEndpointCount),
  validSecretBindingCount:valid,
  activeSubscriptions:count(raw.activeSubscriptions),
  webhookReceipts:count(raw.webhookReceipts),
  site12EventReceipts:count(raw.site12EventReceipts),
  lastSite12ReceiptAt:iso(raw.lastSite12ReceiptAt),
  eventPublications:count(raw.eventPublications),
  eventRoutes:count(raw.eventRoutes),
  lastSignedSweepAt:iso(raw.lastSignedSweepAt),
  lastWindowsRelayAt:iso(raw.lastWindowsRelayAt)
 };
 return assessBuild453(summary);
}
export async function runBuild453AutonomousIntakeWatch(){
 const report=await inspectBuild453();
 await withProtectedDatabase(async client=>{
  await client.query(`insert into app.master_build453_intake_watch(
   inspection_day,capture_id,capture_mode,state,site12_receipts,intake_endpoints,event_subscriptions,evidence)
   values ((now() at time zone 'UTC')::date,$1,'CRON',$2,$3,$4,$5,$6::jsonb)
   on conflict(inspection_day) do nothing`,[
    randomUUID(),report.intakeState,report.counts.site12SourceReceipts,
    report.counts.endpoints,report.counts.activeEventSubscriptions,
    JSON.stringify({schema:report.schema,asOf:report.asOf,ownPipelineHolds:report.ownPipelineHolds,
     externalSourceHolds:report.externalSourceHolds,sourceAgeMinutes:report.sourceAgeMinutes,
     signedSweepAgeMinutes:report.signedSweepAgeMinutes,originalRelayAgeMinutes:report.originalRelayAgeMinutes})
   ]);
 });
 return {state:report.intakeState,ownPipelineHolds:report.ownPipelineHolds,
  site12SourceReceipts:report.counts.site12SourceReceipts};
}
export async function readBuild453OwnerIntake(userId:string){
 const role=await withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  return r.rows[0]?.role??null;
 });
 if(role!=="owner")throw new Error("build453_owner_required");
 const [report,history]=await Promise.all([
  inspectBuild453(),
  withProtectedDatabase(async client=>{
   const r=await client.query<{captured_at:Date;state:string;inspection_day:string;site12_receipts:number}>(
    "select captured_at,state,inspection_day,site12_receipts from app.master_build453_intake_watch order by captured_at desc limit 7");
   return r.rows.map(x=>({day:String(x.inspection_day),at:new Date(x.captured_at).toISOString(),state:x.state,site12SourceReceipts:x.site12_receipts}));
  })
 ]);
 return {...report,lastAutonomousCheck:history[0]??null,recentAutonomousChecks:history,
  sourceOfTruth:"protected_aggregate_of_existing_intake_and_signed_source_receipts",
  rawKeysOrGuestDataReturned:false};
}
