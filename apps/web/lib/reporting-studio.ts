import { listWorkspacesForUser } from "./database";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { listBulkReviewWorkbenchForUser } from "./bulk-data-review";
import { listApprovedDatasetPublishingForUser } from "./approved-dataset-publishing";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import { buildDataQualityWorkbench } from "./data-quality";
import { buildAdoptionReview } from "./adoption-database";
import { listRetentionOverviewForUser } from "./retention-database";
import { listRemotePilotOverviewForUser } from "./remote-pilot-database";
import type { ReportingKpi, ReportingKpiKey, ReportingStudioModel, WorkspaceReport } from "./reporting-studio-contract";

function percent(numerator:number,denominator:number){return denominator>0?Math.round((numerator/denominator)*1000)/10:0;}
function kpi(key:ReportingKpiKey,label:string,value:number,unit:ReportingKpi["unit"],detail:string,href:string,numerator:number|null=null,denominator:number|null=null):ReportingKpi{
 return {key,label,value,unit,detail,href,numerator,denominator};
}

export async function buildReportingStudio(userId:string):Promise<ReportingStudioModel>{
 const [workspaces,collection,review,approved,delivery,quality,adoption,retention,remote]=await Promise.all([
  listWorkspacesForUser(userId),
  listCollectionRunConsoleForUser(userId),
  listBulkReviewWorkbenchForUser(userId),
  listApprovedDatasetPublishingForUser(userId),
  listIntegrationDeliveryOverviewForUser(userId),
  buildDataQualityWorkbench(userId),
  buildAdoptionReview(userId),
  listRetentionOverviewForUser(userId),
  listRemotePilotOverviewForUser(userId)
 ]);
 const reports:WorkspaceReport[]=[];
 for(const workspace of workspaces){
   const sources=collection.sources.filter(item=>item.workspaceId===workspace.id);
   const collectionAttempts=sources.reduce((sum,item)=>sum+item.local.attempts.length+item.remote.attempts.length,0);
   const collectionSuccesses=sources.reduce((sum,item)=>sum+item.local.successes+item.remote.pagesSucceeded,0);
   const reviewExceptions=review.exceptions.filter(item=>item.workspaceId===workspace.id).length;
   const approvedCandidates=approved.candidates.filter(item=>item.workspaceId===workspace.id).length;
   const publishedDatasets=approved.publications.filter(item=>item.workspaceId===workspace.id&&item.status==="published").length;
   const deliveryEntry=delivery.find(item=>item.workspace.id===workspace.id);
   const deliveryAccepted=deliveryEntry?.counts["delivery-accepted"]??0;
   const deliveryExceptions=(deliveryEntry?.counts["delivery-rejected"]??0)+(deliveryEntry?.counts["transport-error"]??0)+(deliveryEntry?.counts["handshake-rejected"]??0);
   const qualityItems=[
     ...quality.datasets.filter(item=>item.workspaceId===workspace.id).map(item=>item.quality),
     ...quality.batches.filter(item=>item.workspaceId===workspace.id).map(item=>item.quality)
   ];
   const qualityHealthy=qualityItems.filter(item=>item.state==="healthy").length;
   const adoptionEntry=adoption.workspaces.find(item=>item.workspaceId===workspace.id);
   const activityEvents=adoptionEntry?.activityEvents??0;
   const retentionEntry=retention.find(item=>item.workspace.id===workspace.id);
   const retentionBytes=retentionEntry?.measuredBytes??0;
   const remoteEntry=remote.find(item=>item.workspace.id===workspace.id);
   const providerUnits=(remoteEntry?.events??[]).reduce((sum,item)=>sum+item.unitsEstimated,0);
   const totalExceptions=reviewExceptions+deliveryExceptions+sources.reduce((sum,item)=>sum+item.local.failures+item.remote.pagesFailed,0);
   const totalOperational=collectionAttempts+approvedCandidates+(deliveryEntry?.recent.length??0);
   const kpis:ReportingKpi[]=[
     kpi("collection-success","Collection success",percent(collectionSuccesses,collectionAttempts),"percent",collectionSuccesses+" successful collection attempt(s) from "+collectionAttempts+" measured attempt(s).","/collection-runs",collectionSuccesses,collectionAttempts),
     kpi("approval-throughput","Approval throughput",approvedCandidates,"count",approvedCandidates+" approved review candidate(s); "+publishedDatasets+" active publication(s).","/approved-data",publishedDatasets,approvedCandidates),
     kpi("exception-rate","Exception rate",percent(totalExceptions,totalOperational),"percent",totalExceptions+" measured exception/failure signal(s) across "+totalOperational+" operational evidence item(s).","/attention",totalExceptions,totalOperational),
     kpi("integration-outcomes","Accepted deliveries",deliveryAccepted,"count",deliveryAccepted+" accepted delivery event(s); "+deliveryExceptions+" rejected/error event(s).","/integration-delivery",deliveryAccepted,deliveryAccepted+deliveryExceptions),
     kpi("data-quality","Healthy quality assessments",percent(qualityHealthy,qualityItems.length),"percent",qualityHealthy+" healthy assessment(s) from "+qualityItems.length+" measured dataset/review assessment(s).","/data-quality",qualityHealthy,qualityItems.length),
     kpi("workspace-activity","Workspace activity",activityEvents,"count","Durable workspace activity events measured by adoption telemetry.","/adoption"),
     kpi("adoption","Adoption standing",adoptionEntry?.permissions.status==="healthy"?100:0,"percent",adoptionEntry?.permissions.status==="healthy"?"Permission evidence is healthy.":"Permission/adoption evidence requires review.","/adoption"),
     kpi("retention","Measured retention footprint",retentionBytes,"bytes","Measured retention/storage proxy for this workspace.","/retention"),
     kpi("provider-usage","Provider units",providerUnits,"units","Browserless provider-unit evidence recorded by remote execution telemetry.","/remote-execution")
   ];
   reports.push({
     workspaceId:workspace.id,workspaceName:workspace.name,role:workspace.role,kpis,
     evidence:{collectionAttempts,collectionSuccesses,reviewExceptions,approvedCandidates,publishedDatasets,
      deliveryAccepted,deliveryExceptions,qualityAssessments:qualityItems.length,qualityHealthy,
      activityEvents,retentionBytes,providerUnits}
   });
 }
 const totals=reports.reduce((acc,item)=>({
   workspaces:acc.workspaces+1,
   collectionAttempts:acc.collectionAttempts+item.evidence.collectionAttempts,
   collectionSuccesses:acc.collectionSuccesses+item.evidence.collectionSuccesses,
   approvedCandidates:acc.approvedCandidates+item.evidence.approvedCandidates,
   publishedDatasets:acc.publishedDatasets+item.evidence.publishedDatasets,
   exceptions:acc.exceptions+item.evidence.reviewExceptions+item.evidence.deliveryExceptions,
   deliveryAccepted:acc.deliveryAccepted+item.evidence.deliveryAccepted,
   qualityAssessments:acc.qualityAssessments+item.evidence.qualityAssessments,
   qualityHealthy:acc.qualityHealthy+item.evidence.qualityHealthy,
   activityEvents:acc.activityEvents+item.evidence.activityEvents,
   retentionBytes:acc.retentionBytes+item.evidence.retentionBytes,
   providerUnits:acc.providerUnits+item.evidence.providerUnits
 }),{workspaces:0,collectionAttempts:0,collectionSuccesses:0,approvedCandidates:0,publishedDatasets:0,exceptions:0,deliveryAccepted:0,qualityAssessments:0,qualityHealthy:0,activityEvents:0,retentionBytes:0,providerUnits:0});
 return {
   schema:"ai-data-platform.reporting-studio.v1",
   generatedAt:new Date().toISOString(),
   workspaces:reports,
   totals,
   presets:[
    {id:"operations",label:"Operations",kpis:["collection-success","exception-rate","workspace-activity","provider-usage"]},
    {id:"governance",label:"Governance",kpis:["approval-throughput","data-quality","adoption","retention"]},
    {id:"delivery",label:"Delivery",kpis:["approval-throughput","integration-outcomes","exception-rate"]},
    {id:"executive",label:"Executive",kpis:["collection-success","approval-throughput","integration-outcomes","data-quality","retention"]}
   ]
 };
}

function csvCell(value:unknown){const text=String(value??"");return '"'+text.replaceAll('"','""')+'"';}
export function renderReportingCsv(model:ReportingStudioModel){
 const lines=[["workspaceId","workspaceName","role","kpiKey","label","value","unit","numerator","denominator","detail","generatedAt"].map(csvCell).join(",")];
 for(const workspace of model.workspaces){
   for(const item of workspace.kpis){
     lines.push([workspace.workspaceId,workspace.workspaceName,workspace.role,item.key,item.label,item.value,item.unit,item.numerator??"",item.denominator??"",item.detail,model.generatedAt].map(csvCell).join(","));
   }
 }
 return lines.join("\r\n")+"\r\n";
}
