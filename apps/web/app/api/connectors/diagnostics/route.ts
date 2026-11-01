import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildConnectorDiagnostics, runConnectorConnectionTest } from "@/lib/connector-diagnostics";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function userId(){
 const session=await auth.api.getSession({headers:await headers()});
 return session?.user.id??null;
}
function bodyObject(value:unknown){
 return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function responseError(error:unknown){
 const message=error instanceof Error?error.message:"connector_diagnostic_failed";
 const status=message==="workspace_admin_required"?403:message==="connector_not_registered"?404:400;
 return Response.json({error:message},{status});
}
export async function GET(){
 const id=await userId();
 if(!id)return Response.json({error:"unauthorized"},{status:401});
 return Response.json(await buildConnectorDiagnostics(id));
}
export async function POST(request:Request){
 const id=await userId();
 if(!id)return Response.json({error:"unauthorized"},{status:401});
 const body=bodyObject(await request.json().catch(()=>null));
 try{
  const result=await runConnectorConnectionTest(id,{
   workspaceId:String(body.workspaceId??""),
   connectorKey:String(body.connectorKey??"")
  });
  return Response.json({result,diagnostics:await buildConnectorDiagnostics(id)});
 }catch(error){return responseError(error);}
}
