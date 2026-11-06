import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createSharedTask,
  linkSharedTasks,
  listSharedTaskExchangeForUser,
  prepareTaskExchangePackage,
  reviewTaskExchangePackage
} from "@/lib/shared-task-exchange-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message:string) {
  if(message==="workspace_admin_required") return 403;
  if(message.includes("not_found")) return 404;
  if(message.includes("invalid") || message.includes("denied")) return 400;
  return 409;
}

export async function GET() {
  const userId=await sessionUserId();
  if(!userId) return Response.json({error:"authentication_required"},{status:401});
  return Response.json(await listSharedTaskExchangeForUser(userId),{
    headers:{"Cache-Control":"no-store"}
  });
}

export async function POST(request:Request) {
  const userId=await sessionUserId();
  if(!userId) return Response.json({error:"authentication_required"},{status:401});
  try{
    const body=await request.json();
    const action=String(body.action ?? "");

    if(action==="create-task"){
      return Response.json({result:await createSharedTask(userId,{
        workspaceId:String(body.workspaceId ?? ""),
        sourceApplicationId:String(body.sourceApplicationId ?? ""),
        destinationApplicationId:String(body.destinationApplicationId ?? ""),
        canonicalTenantKey:String(body.canonicalTenantKey ?? ""),
        sourceRecordType:String(body.sourceRecordType ?? ""),
        sourceRecordId:String(body.sourceRecordId ?? ""),
        taskKind:String(body.taskKind ?? ""),
        priority:String(body.priority ?? ""),
        title:String(body.title ?? ""),
        summary:String(body.summary ?? ""),
        dueAt:typeof body.dueAt==="string" ? body.dueAt : null,
        assigneeHint:typeof body.assigneeHint==="string" ? body.assigneeHint : null,
        linkedCustomerRecordId:typeof body.linkedCustomerRecordId==="string" ? body.linkedCustomerRecordId : null,
        linkedJobRecordId:typeof body.linkedJobRecordId==="string" ? body.linkedJobRecordId : null
      })});
    }

    if(action==="link-tasks"){
      const relationship =
        body.relationship==="follow-up" || body.relationship==="blocks" ||
        body.relationship==="relates-to" || body.relationship==="derived-from"
          ? body.relationship : null;
      if(!relationship) return Response.json({error:"task_relationship_invalid"},{status:400});
      return Response.json({result:await linkSharedTasks(userId,{
        workspaceId:String(body.workspaceId ?? ""),
        parentTaskId:String(body.parentTaskId ?? ""),
        childTaskId:String(body.childTaskId ?? ""),
        relationship,
        reason:String(body.reason ?? "")
      })});
    }

    if(action==="prepare-package"){
      return Response.json({result:await prepareTaskExchangePackage(userId,{
        taskId:String(body.taskId ?? ""),
        destinationTenantKey:String(body.destinationTenantKey ?? "")
      })});
    }

    if(action==="review-package"){
      const decision=body.decision==="approve" ? "approve" :
        body.decision==="reject" ? "reject" : null;
      if(!decision) return Response.json({error:"task_review_decision_invalid"},{status:400});
      return Response.json({result:await reviewTaskExchangePackage(userId,{
        packageId:String(body.packageId ?? ""),
        decision,
        reason:String(body.reason ?? "")
      })});
    }

    return Response.json({error:"task_exchange_action_invalid"},{status:400});
  }catch(error){
    const message=error instanceof Error ? error.message : "task_exchange_request_failed";
    return Response.json({error:message},{status:statusForError(message)});
  }
}
