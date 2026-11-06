import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  executeSafeRecoveryPlan,
  listIntegrationRecoveryForUser,
  recordRecoveryDecision,
  runSafeRecoveryCycle,
  scanIntegrationRecoveryPlans
} from "@/lib/integration-recovery-database";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function userId(){
  const session=await auth.api.getSession({headers:await headers()});
  return session?.user.id??null;
}

function statusForError(message:string){
  if(message==="workspace_admin_required") return 403;
  if(message.includes("not_found")) return 404;
  if(message.includes("cooldown")) return 429;
  if(message.includes("limit_reached")||message.includes("expired")) return 409;
  if(message.includes("invalid")||message.includes("not_allowed")||message.includes("not_required")) return 400;
  return 409;
}

export async function GET(){
  const id=await userId();
  if(!id) return Response.json({error:"authentication_required"},{status:401});
  return Response.json(await listIntegrationRecoveryForUser(id),{
    headers:{"Cache-Control":"no-store"}
  });
}

export async function POST(request:Request){
  const id=await userId();
  if(!id) return Response.json({error:"authentication_required"},{status:401});
  try{
    const body=await request.json();
    const action=String(body.action??"");

    if(action==="scan"){
      return Response.json({result:await scanIntegrationRecoveryPlans(id)});
    }
    if(action==="run-safe-cycle"){
      return Response.json({result:await runSafeRecoveryCycle(id)});
    }
    if(action==="execute-safe-plan"){
      return Response.json({result:await executeSafeRecoveryPlan(id,String(body.planId??""))});
    }
    if(action==="decision"){
      const decision=body.decision==="approve"?"approve":body.decision==="reject"?"reject":null;
      if(!decision) return Response.json({error:"integration_recovery_decision_invalid"},{status:400});
      return Response.json({result:await recordRecoveryDecision(id,{
        planId:String(body.planId??""),
        decision,
        reason:String(body.reason??"")
      })});
    }
    return Response.json({error:"integration_recovery_action_invalid"},{status:400});
  }catch(error){
    const message=error instanceof Error?error.message:"integration_recovery_request_failed";
    return Response.json({error:message},{status:statusForError(message)});
  }
}
