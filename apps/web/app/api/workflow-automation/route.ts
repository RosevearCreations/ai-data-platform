import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createWorkflowAutomationRule,
  evaluateRecentWorkflowAutomation,
  listWorkflowAutomationForUser,
  reviewWorkflowAutomationRule
} from "@/lib/workflow-automation-database";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function userId(){
  const session=await auth.api.getSession({headers:await headers()});
  return session?.user.id??null;
}

function statusForError(message:string){
  if(message==="workspace_admin_required") return 403;
  if(message.includes("not_found")) return 404;
  if(message.includes("duplicate")) return 409;
  if(
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("denied") ||
    message.includes("mismatch")
  ) return 400;
  return 409;
}

export async function GET(){
  const id=await userId();
  if(!id) return Response.json({error:"authentication_required"},{status:401});
  return Response.json(await listWorkflowAutomationForUser(id),{
    headers:{"Cache-Control":"no-store"}
  });
}

export async function POST(request:Request){
  const id=await userId();
  if(!id) return Response.json({error:"authentication_required"},{status:401});

  try{
    const body=await request.json();
    const action=String(body.action??"");

    if(action==="create-rule"){
      const result=await createWorkflowAutomationRule(id,{
        workspaceId:body.workspaceId,
        name:body.name,
        sourceApplicationId:body.sourceApplicationId,
        destinationApplicationId:body.destinationApplicationId,
        environment:body.environment,
        tenantId:body.tenantId,
        eventTypes:Array.isArray(body.eventTypes)?body.eventTypes:[],
        actionKind:body.actionKind,
        actionConfig:
          body.actionConfig&&typeof body.actionConfig==="object"
            ? body.actionConfig
            :{},
        supersedesRuleId:body.supersedesRuleId
      });
      return Response.json({result},{status:201});
    }

    if(action==="review-rule"){
      const decision=
        body.decision==="approve" ||
        body.decision==="reject" ||
        body.decision==="disable"
          ?body.decision
          :null;
      if(!decision){
        return Response.json(
          {error:"workflow_automation_review_decision_invalid"},
          {status:400}
        );
      }
      const result=await reviewWorkflowAutomationRule(id,{
        ruleId:String(body.ruleId??""),
        decision,
        reason:String(body.reason??"")
      });
      return Response.json({result},{status:201});
    }

    if(action==="evaluate-recent"){
      return Response.json({
        result:await evaluateRecentWorkflowAutomation(id)
      });
    }

    return Response.json(
      {error:"workflow_automation_action_invalid"},
      {status:400}
    );
  }catch(error){
    const message=
      error instanceof Error
        ?error.message
        :"workflow_automation_request_failed";
    return Response.json(
      {error:message},
      {status:statusForError(message)}
    );
  }
}
