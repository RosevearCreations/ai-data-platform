import { authPool, listWorkspacesForUser } from "./database";
import { listConnectorOverviewForUser } from "./connector-database";
import type {
  AccessReviewConnector,
  AccessReviewMember,
  AccessReviewState,
  SecurityAccessReviewModel,
  SecurityWorkspaceReview
} from "./security-access-review-contract";

function daysSince(value:Date){
  return Math.max(0,Math.floor((Date.now()-value.getTime())/86_400_000));
}
function reviewState(rank:number):AccessReviewState{
  return rank>=2?"attention":rank===1?"review":"healthy";
}
export async function buildSecurityAccessReview(userId:string):Promise<SecurityAccessReviewModel>{
  const workspaces=await listWorkspacesForUser(userId);
  const connectorOverview=await listConnectorOverviewForUser(userId);
  const connectorByWorkspace=new Map(connectorOverview.workspaces.map(entry=>[entry.workspace.id,entry]));
  const reviews:SecurityWorkspaceReview[]=[];
  for(const workspace of workspaces){
    const manager=workspace.role==="owner"||workspace.role==="admin";
    let members:AccessReviewMember[]=[];
    let privilegedOperationCount=0;
    if(manager){
      const memberRows=await authPool.query<{
        user_id:string;name:string;role:"owner"|"admin"|"member";created_at:Date;last_privileged_at:Date|null;
      }>(
        `
          select
            wm.user_id,
            coalesce(u.name,wm.user_id) as name,
            wm.role,
            wm.created_at,
            greatest(
              (select max(created_at) from app.workspace_connector_audit a where a.workspace_id=wm.workspace_id and a.actor_user_id=wm.user_id),
              (select max(occurred_at) from app.integration_delivery_events d where d.workspace_id=wm.workspace_id and d.actor_user_id=wm.user_id),
              (select max(occurred_at) from app.workspace_operational_outcomes o where o.workspace_id=wm.workspace_id and o.actor_user_id=wm.user_id)
            ) as last_privileged_at
          from app.workspace_members wm
          left join auth."user" u on u.id=wm.user_id
          where wm.workspace_id=$1
          order by case wm.role when 'owner' then 1 when 'admin' then 2 else 3 end,coalesce(u.name,wm.user_id)
        `,
        [workspace.id]
      );
      members=memberRows.rows.map(row=>{
        const rolePrivileged=row.role==="owner"||row.role==="admin";
        const inactiveDays=row.last_privileged_at?daysSince(row.last_privileged_at):daysSince(row.created_at);
        const reasons:string[]=[];
        const recommendations:string[]=[];
        let rank=0;
        if(rolePrivileged && !row.last_privileged_at && inactiveDays>=90){
          rank=Math.max(rank,1);
          reasons.push("Privileged membership has no recorded privileged-operation evidence in the reviewed event sources.");
          recommendations.push("Confirm this privileged role is still required before making any access change.");
        }else if(rolePrivileged && row.last_privileged_at && inactiveDays>=90){
          rank=Math.max(rank,1);
          reasons.push("No reviewed privileged-operation evidence in the last "+inactiveDays+" day(s).");
          recommendations.push("Review whether owner/admin access still matches current responsibilities.");
        }
        if(row.role==="admin" && members.length===0){
          // no-op marker keeps recommendations evidence-driven rather than automatic
        }
        return {
          userId:row.user_id,name:row.name,role:row.role,memberSince:row.created_at.toISOString(),
          lastPrivilegedActivityAt:row.last_privileged_at?.toISOString()??null,
          state:reviewState(rank),reasons,recommendations
        };
      });
      const count=await authPool.query<{count:string}>(
        `
          select (
            (select count(*) from app.workspace_connector_audit where workspace_id=$1 and actor_user_id is not null) +
            (select count(*) from app.integration_delivery_events where workspace_id=$1 and actor_user_id is not null) +
            (select count(*) from app.workspace_operational_outcomes where workspace_id=$1 and actor_user_id is not null)
          )::text as count
        `,[workspace.id]
      );
      privilegedOperationCount=Number(count.rows[0]?.count??0);
    }else{
      members=[{
        userId,name:"Current member",role:workspace.role,memberSince:"",
        lastPrivilegedActivityAt:null,state:"healthy",reasons:["Broader membership review requires workspace owner/admin authority."],recommendations:[]
      }];
    }
    const connectorEntry=connectorByWorkspace.get(workspace.id);
    const connectors:AccessReviewConnector[]=(connectorEntry?.installations??[]).map(installation=>{
      const used=new Set((connectorEntry?.audit??[]).filter(a=>a.connectorKey===installation.connectorKey&&a.status==="succeeded").map(a=>a.capability));
      const unused=installation.grantedCapabilities.filter(grant=>!used.has(grant));
      return {
        connectorKey:installation.connectorKey,
        enabled:installation.enabled,
        grants:installation.grantedCapabilities,
        usedGrants:installation.grantedCapabilities.filter(grant=>used.has(grant)),
        unusedGrants:unused,
        state:unused.length?"review":"healthy",
        recommendations:unused.length?["Review unused connector grants and remove only after owner/admin approval and operational verification."]:[]
      };
    });
    const effectiveCapabilities=Object.entries(workspace.profileCapabilities).filter(([,enabled])=>enabled===true).map(([key])=>key);
    const notes=[
      "Recommendations are advisory only; Build 266 does not modify membership, roles, profile capabilities or connector grants.",
      manager?"Manager review includes workspace membership and selected privileged-operation evidence.":"Current role can review effective workspace capabilities but cannot inspect other members."
    ];
    reviews.push({
      workspaceId:workspace.id,workspaceName:workspace.name,currentRole:workspace.role,profileKey:workspace.profileKey,
      effectiveCapabilities,members,connectors,privilegedOperationCount,reviewNotes:notes
    });
  }
  const allMembers=reviews.flatMap(review=>review.members);
  const unusedConnectorGrants=reviews.flatMap(review=>review.connectors).reduce((sum,item)=>sum+item.unusedGrants.length,0);
  return {
    generatedAt:new Date().toISOString(),workspaces:reviews,
    totals:{
      workspaces:reviews.length,
      members:allMembers.length,
      attentionMembers:allMembers.filter(member=>member.state!=="healthy").length,
      unusedConnectorGrants,
      privilegedOperations:reviews.reduce((sum,review)=>sum+review.privilegedOperationCount,0)
    }
  };
}
