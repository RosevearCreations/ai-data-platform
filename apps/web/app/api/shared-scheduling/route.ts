import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createSharedScheduleItem,
  listSharedSchedulingForUser,
  prepareScheduleExchangePackage,
  reviewScheduleExchangePackage
} from "@/lib/shared-scheduling-database";

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
  if(message.includes("conflicts_require_resolution")) return 409;
  return 409;
}

export async function GET() {
  const userId=await sessionUserId();
  if(!userId) return Response.json({error:"authentication_required"},{status:401});
  return Response.json(await listSharedSchedulingForUser(userId),{
    headers:{"Cache-Control":"no-store"}
  });
}

export async function POST(request:Request) {
  const userId=await sessionUserId();
  if(!userId) return Response.json({error:"authentication_required"},{status:401});
  try{
    const body=await request.json();
    const action=String(body.action ?? "");

    if(action==="create-schedule-item"){
      return Response.json({result:await createSharedScheduleItem(userId,{
        workspaceId:String(body.workspaceId ?? ""),
        canonicalTenantKey:String(body.canonicalTenantKey ?? ""),
        sourceApplicationId:String(body.sourceApplicationId ?? ""),
        destinationApplicationId:String(body.destinationApplicationId ?? ""),
        sourceRecordId:String(body.sourceRecordId ?? ""),
        itemType:String(body.itemType ?? ""),
        title:String(body.title ?? ""),
        status:String(body.status ?? ""),
        startAt:String(body.startAt ?? ""),
        endAt:typeof body.endAt==="string" ? body.endAt : null,
        timezone:String(body.timezone ?? ""),
        locationText:typeof body.locationText==="string" ? body.locationText : null,
        customerRecordId:typeof body.customerRecordId==="string" ? body.customerRecordId : null,
        serviceRecordId:typeof body.serviceRecordId==="string" ? body.serviceRecordId : null,
        staffRecordIds:Array.isArray(body.staffRecordIds) ? body.staffRecordIds.map(String) : [],
        equipmentRecordIds:Array.isArray(body.equipmentRecordIds) ? body.equipmentRecordIds.map(String) : [],
        notes:typeof body.notes==="string" ? body.notes : null
      })});
    }

    if(action==="prepare-package"){
      return Response.json({result:await prepareScheduleExchangePackage(userId,{
        scheduleId:String(body.scheduleId ?? ""),
        destinationTenantKey:String(body.destinationTenantKey ?? "")
      })});
    }

    if(action==="review-package"){
      const decision=body.decision==="approve" ? "approve" :
        body.decision==="reject" ? "reject" : null;
      if(!decision) return Response.json({error:"schedule_review_decision_invalid"},{status:400});
      return Response.json({result:await reviewScheduleExchangePackage(userId,{
        packageId:String(body.packageId ?? ""),
        decision,
        reason:String(body.reason ?? "")
      })});
    }

    return Response.json({error:"schedule_exchange_action_invalid"},{status:400});
  }catch(error){
    const message=error instanceof Error ? error.message : "schedule_exchange_request_failed";
    return Response.json({error:message},{status:statusForError(message)});
  }
}
