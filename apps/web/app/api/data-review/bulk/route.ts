import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { commitBulkReviewDecision, listBulkReviewWorkbenchForUser, previewBulkReviewDecision, type BulkReviewDecision } from "@/lib/bulk-data-review";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function objectBody(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function textValue(value:unknown){return typeof value==="string"?value.trim():"";}
function errorStatus(message:string){if(message.includes("admin_required"))return 403;if(message.includes("scope_mismatch")||message.includes("not_found"))return 404;if(message.includes("terminal")||message.includes("preview_stale"))return 409;return 400;}
async function userId(){const session=await auth.api.getSession({headers:await headers()});return session?.user.id??null;}
export async function GET(){const id=await userId();if(!id)return Response.json({error:"Unauthorized"},{status:401});return Response.json(await listBulkReviewWorkbenchForUser(id));}
export async function POST(request:Request){
 const id=await userId();if(!id)return Response.json({error:"Unauthorized"},{status:401});
 const body=objectBody(await request.json().catch(()=>null));const action=textValue(body.action);
 const input={workspaceId:textValue(body.workspaceId),reviewIds:body.reviewIds,decision:textValue(body.decision) as BulkReviewDecision,reasonCode:body.reasonCode,note:body.note,previewToken:body.previewToken};
 try{
  if(action==="preview")return Response.json(await previewBulkReviewDecision(id,input));
  if(action==="commit"){const result=await commitBulkReviewDecision(id,input);return Response.json({result,model:await listBulkReviewWorkbenchForUser(id)});}
  return Response.json({error:"Invalid bulk-review action."},{status:400});
 }catch(error){const message=error instanceof Error?error.message:"bulk_review_failed";return Response.json({error:message},{status:errorStatus(message)});}
}