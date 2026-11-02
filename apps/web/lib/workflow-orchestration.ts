import { listWorkspacesForUser } from "./database";
import { listCollectionProjectsForUser } from "./collection-project-database";
import { listCollectionRunConsoleForUser } from "./collection-runs";
import { listBulkReviewWorkbenchForUser } from "./bulk-data-review";
import { listApprovedDatasetPublishingForUser } from "./approved-dataset-publishing";
import { listIntegrationDeliveryOverviewForUser } from "./integration-delivery-database";
import type { GuidedRunbook, RunbookStep, WorkflowOrchestrationModel } from "./workflow-orchestration-contract";

function step(input:Omit<RunbookStep,"status"> & {status:RunbookStep["status"]}){return input;}

export async function buildWorkflowOrchestrationModel(userId:string):Promise<WorkflowOrchestrationModel>{
 const [workspaces,projects,runs,review,approved,delivery]=await Promise.all([
  listWorkspacesForUser(userId),
  listCollectionProjectsForUser(userId),
  listCollectionRunConsoleForUser(userId),
  listBulkReviewWorkbenchForUser(userId),
  listApprovedDatasetPublishingForUser(userId),
  listIntegrationDeliveryOverviewForUser(userId)
 ]);
 const runbooks:GuidedRunbook[]=[];
 for(const workspace of workspaces){
   const workspaceProjects=projects.filter(item=>item.workspaceId===workspace.id&&item.status!=="archived");
   const workspaceSources=runs.sources.filter(item=>item.workspaceId===workspace.id);
   const inReview=review.items.filter(item=>item.workspaceId===workspace.id);
   const approvedCandidates=approved.candidates.filter(item=>item.workspaceId===workspace.id);
   const unpublished=approvedCandidates.filter(item=>!item.publicationId);
   const published=approved.publications.filter(item=>item.workspaceId===workspace.id&&item.status==="published");
   const deliveryWorkspace=delivery.find(item=>item.workspace.id===workspace.id);
   const eligibleBatches=deliveryWorkspace?.eligibleBatches??[];
   const recentAccepted=(deliveryWorkspace?.recent??[]).filter(item=>item.eventType==="delivery-accepted");
   const readyProjects=workspaceProjects.filter(item=>item.readiness==="ready");
   const successfulAttempts=workspaceSources.reduce((sum,item)=>sum+item.local.successes+item.remote.pagesSucceeded,0);
   const canManage=workspace.role==="owner"||workspace.role==="admin";

   const steps:RunbookStep[]=[
    step({
      id:"collect",label:"Collect",description:"Prepare an approved source and perform collection through the existing collection controls.",href:"/collection-runs",
      status:successfulAttempts>0?"complete":readyProjects.length>0?"ready":"blocked",
      evidence:[
        readyProjects.length+" ready collection project(s)",
        successfulAttempts+" successful collection attempt(s)"
      ],
      gate:"Existing Source Policy, source readiness, provider/runtime and collection controls remain authoritative.",
      actionLabel:successfulAttempts>0?"Review collection evidence":"Open collection runs"
    }),
    step({
      id:"review",label:"Review",description:"Inspect normalized rows and quality findings before any approval decision.",href:"/data-review",
      status:inReview.length>0?"ready":successfulAttempts>0?"attention":"blocked",
      evidence:[inReview.length+" in-review batch(es)",review.exceptions.filter(item=>item.workspaceId===workspace.id).length+" open review exception(s)"],
      gate:"No review decision is made by the runbook. Existing review/bulk-review controls remain required.",
      actionLabel:"Open data review"
    }),
    step({
      id:"approve",label:"Approve",description:"Use the governed review approval path, then verify the approved publication candidate.",href:"/approved-data",
      status:unpublished.length>0?"ready":approvedCandidates.length>0?"complete":inReview.length>0?"blocked":"blocked",
      evidence:[approvedCandidates.length+" approved candidate(s)",unpublished.length+" unpublished approved candidate(s)"],
      gate:canManage?"Owner/admin approval authority is available; explicit approval remains required.":"Current workspace role cannot perform manager-only approval/publishing actions.",
      actionLabel:"Open approved data"
    }),
    step({
      id:"publish",label:"Publish",description:"Create the governed approved-data publication before integration delivery.",href:"/approved-data",
      status:published.length>0?"complete":unpublished.length>0&&canManage?"ready":"blocked",
      evidence:[published.length+" active publication(s)"],
      gate:"Publication is a separate explicit action and does not occur automatically from runbook progress.",
      actionLabel:"Open publication controls"
    }),
    step({
      id:"deliver",label:"Deliver",description:"Prepare and execute downstream delivery only through the existing integration gates.",href:"/integration-delivery",
      status:recentAccepted.length>0?"complete":eligibleBatches.length>0?"ready":"blocked",
      evidence:[eligibleBatches.length+" approved/exported integration batch(es)",recentAccepted.length+" recent accepted delivery event(s)"],
      gate:"Runbooks never bypass simulator, handshake, authorization, idempotency, consumer acknowledgement or live-delivery controls.",
      actionLabel:"Open integration delivery"
    })
   ];
   runbooks.push({
     id:"collect-review-approve-deliver:"+workspace.id,
     name:"Collect → Review → Approve → Publish → Deliver",
     purpose:"Guide one governed data journey while preserving every existing approval and safety gate.",
     workspaceId:workspace.id,workspaceName:workspace.name,role:workspace.role,steps,
     completeSteps:steps.filter(item=>item.status==="complete").length,
     blockedSteps:steps.filter(item=>item.status==="blocked").length
   });
 }
 const allSteps=runbooks.flatMap(item=>item.steps);
 return {
  generatedAt:new Date().toISOString(),
  runbooks,
  templates:[
   {id:"collect-review-approve-deliver",name:"Governed data delivery",sequence:["Collect","Review","Approve","Publish","Deliver"],safety:["No automatic approval","No automatic publication","No automatic downstream mutation","Existing authority and evidence gates stay in force"]},
   {id:"quality-review-publish",name:"Quality review to publication",sequence:["Data Quality","Review","Approve","Publish"],safety:["Quality findings are advisory","Approval remains explicit","Publication remains explicit"]},
   {id:"diagnose-simulate-deliver",name:"Integration recovery",sequence:["Connector Diagnostics","Integration Simulator","Integration Delivery"],safety:["Diagnostics are read-only","Simulation sends nothing","Live delivery retains existing controls"]}
  ],
  totals:{
   workspaces:workspaces.length,runbooks:runbooks.length,
   readySteps:allSteps.filter(item=>item.status==="ready"||item.status==="attention").length,
   blockedSteps:allSteps.filter(item=>item.status==="blocked").length,
   completeSteps:allSteps.filter(item=>item.status==="complete").length
  }
 };
}
