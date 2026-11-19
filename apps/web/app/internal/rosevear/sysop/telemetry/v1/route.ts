import { authorizeTelemetryRequest, buildLocalAIDPTelemetryEnvelope } from "@/lib/sysop-telemetry-v1";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!authorizeTelemetryRequest(request))return Response.json({state:"NOT_AUTHORIZED",connected:false,authorizesAction:false},{status:401,headers:{"Cache-Control":"no-store"}});
 try{return Response.json(buildLocalAIDPTelemetryEnvelope(),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
 catch{return Response.json({state:"NOT_ENROLLED",connected:false,authorizesAction:false},{status:503,headers:{"Cache-Control":"no-store"}});}
}
