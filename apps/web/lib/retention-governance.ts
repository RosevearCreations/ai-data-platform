import { listRetentionOverviewForUser } from "./retention-database";
import { withUserDatabase } from "./database";
import type { RetentionClassKey } from "./retention";
import type {
  RetentionGovernanceClass,
  RetentionGovernanceModel,
  RetentionGovernanceWorkspace
} from "./retention-governance-contract";

type AgeRow={key:RetentionClassKey;oldest_at:Date|null;newest_at:Date|null};

function ageDays(value:Date|null){
  if(!value)return null;
  return Math.max(0,Math.floor((Date.now()-value.getTime())/86_400_000));
}

async function retentionAgeEvidence(userId:string,workspaceId:string){
  return withUserDatabase(userId,async(client)=>{
    const result=await client.query<AgeRow>(`
      select 'sync-payloads'::text as key,min(created_at) as oldest_at,max(created_at) as newest_at
      from (
        select created_at from app.workspace_saved_scrapers where workspace_id=$1
        union all
        select created_at from app.workspace_reviewed_datasets where workspace_id=$1
      ) q
      union all
      select 'intelligence-modules',min(created_at),max(created_at) from app.workspace_intelligence_modules where workspace_id=$1
      union all
      select 'barcode-terminal',min(created_at),max(created_at) from app.workspace_barcode_captures where workspace_id=$1
      union all
      select 'remote-terminal',min(created_at),max(created_at) from app.remote_execution_jobs where workspace_id=$1
      union all
      select 'intelligence-audit',min(created_at),max(created_at) from app.workspace_intelligence_audit where workspace_id=$1
      union all
      select 'remote-provider-audit',min(created_at),max(created_at) from app.remote_execution_provider_events where workspace_id=$1
      union all
      select 'connector-audit',min(created_at),max(created_at) from app.workspace_connector_audit where workspace_id=$1
      union all
      select 'operational-outcomes',min(created_at),max(created_at) from app.workspace_operational_outcomes where workspace_id=$1
      union all
      select 'production-learning-snapshots',min(created_at),max(created_at) from app.production_learning_review_snapshots where workspace_id=$1
      union all
      select 'integration-delivery-audit',min(created_at),max(created_at)
      from (
        select created_at from app.integration_delivery_events where workspace_id=$1
        union all
        select created_at from app.integration_consumer_receipts where workspace_id=$1
      ) q
      union all
      select 'retention-control-audit',min(created_at),max(created_at)
      from (
        select created_at from app.workspace_retention_policy_events where workspace_id=$1
        union all
        select created_at from app.workspace_retention_cleanup_runs where workspace_id=$1
      ) q
    `,[workspaceId]);
    return new Map(result.rows.map(row=>[row.key,row]));
  });
}

function ruleSummary(item:{
 retentionDays:number|null;
 disposition:string;
 protectedEvidence:boolean;
}){
 if(item.protectedEvidence){
   return item.retentionDays
     ? `Protected evidence; database retention controls apply at ${item.retentionDays} days where implemented. Not eligible for Build 267 destructive cleanup.`
     : "Protected evidence; retained and excluded from Build 267 destructive cleanup.";
 }
 if(item.disposition==="manual-archive"){
   return `Records beyond the ${item.retentionDays??"configured"}-day threshold are archive candidates only; no automatic archive or delete occurs.`;
 }
 if(item.disposition==="bounded-delete"){
   return `Only terminal/closed records older than ${item.retentionDays??"configured"} days are delete-eligible, and deletion remains bounded by the approved run limit.`;
 }
 return "Current-state records remain governed in place by their existing schema and module controls.";
}

export async function buildRetentionGovernanceModel(userId:string):Promise<RetentionGovernanceModel>{
 const overview=await listRetentionOverviewForUser(userId);
 const workspaces:RetentionGovernanceWorkspace[]=[];
 for(const item of overview){
   const ages=await retentionAgeEvidence(userId,item.workspace.id);
   const classes:RetentionGovernanceClass[]=item.classes.map(retentionClass=>{
     const age=ages.get(retentionClass.key);
     return {
       key:retentionClass.key,
       label:retentionClass.label,
       oldestAt:age?.oldest_at?.toISOString()??null,
       newestAt:age?.newest_at?.toISOString()??null,
       oldestAgeDays:ageDays(age?.oldest_at??null),
       retentionDays:retentionClass.retentionDays,
       disposition:retentionClass.disposition as RetentionGovernanceClass["disposition"],
       protectedEvidence:retentionClass.protectedEvidence,
       rows:retentionClass.rows,
       measuredBytes:retentionClass.measuredBytes,
       archiveEligibleRows:retentionClass.archiveEligibleRows,
       deleteEligibleRows:retentionClass.deleteEligibleRows,
       deleteEligibleBytes:retentionClass.deleteEligibleBytes,
       overBudget:retentionClass.overBudget,
       ruleSummary:ruleSummary(retentionClass)
     };
   });
   const protectedClasses=classes.filter(entry=>entry.protectedEvidence);
   const protectedRows=protectedClasses.reduce((sum,entry)=>sum+entry.rows,0);
   const protectedBytes=protectedClasses.reduce((sum,entry)=>sum+entry.measuredBytes,0);
   const boundedDeleteRowsThisRun=Math.min(item.deleteEligibleRows,item.maxRowsPerRun);
   workspaces.push({
     workspaceId:item.workspace.id,
     workspaceName:item.workspace.name,
     role:item.workspace.role,
     cleanupApproved:item.cleanupApproved,
     maxRowsPerRun:item.maxRowsPerRun,
     managedRows:item.managedRows,
     measuredBytes:item.measuredBytes,
     archiveEligibleRows:item.archiveEligibleRows,
     deleteEligibleRows:item.deleteEligibleRows,
     deleteEligibleBytes:item.deleteEligibleBytes,
     protectedRows,
     protectedBytes,
     projectedRowsAfterFullEligibleDelete:Math.max(0,item.managedRows-item.deleteEligibleRows),
     projectedBytesAfterFullEligibleDelete:Math.max(0,item.measuredBytes-item.deleteEligibleBytes),
     boundedDeleteRowsThisRun,
     recentRuns:item.recentRuns.map(run=>({
       runId:run.runId,status:run.status,beforeRows:run.beforeRows,afterRows:run.afterRows,
       beforeStorageBytes:run.beforeStorageBytes,afterStorageBytes:run.afterStorageBytes,
       deletedBarcodeRows:run.deletedBarcodeRows,deletedRemoteJobs:run.deletedRemoteJobs,
       errorCode:run.errorCode,createdAt:run.createdAt.toISOString()
     })),
     classes
   });
 }
 return {
   generatedAt:new Date().toISOString(),
   workspaces,
   totals:{
     workspaces:workspaces.length,
     managedRows:workspaces.reduce((sum,item)=>sum+item.managedRows,0),
     archiveEligibleRows:workspaces.reduce((sum,item)=>sum+item.archiveEligibleRows,0),
     deleteEligibleRows:workspaces.reduce((sum,item)=>sum+item.deleteEligibleRows,0),
     protectedRows:workspaces.reduce((sum,item)=>sum+item.protectedRows,0)
   }
 };
}
