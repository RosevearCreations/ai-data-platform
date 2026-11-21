import { authorizeTelemetryRequest, buildLocalAIDPTelemetryEnvelope } from "@/lib/sysop-telemetry-v1";
export const runtime="nodejs";export const dynamic="force-dynamic";
const CHALLENGE_HEADER="x-rosevear-telemetry-challenge";
export async function GET(request:Request){
 if(!authorizeTelemetryRequest(request))return Response.json({state:"NOT_AUTHORIZED",connected:false,authorizesAction:false},{status:401,headers:{"Cache-Control":"no-store"}});
 const challenge=request.headers.get(CHALLENGE_HEADER);
 if(challenge!==null&&!/^[a-f0-9]{64}$/.test(challenge))return Response.json({state:"INVALID_CHALLENGE",connected:false,authorizesAction:false},{status:400,headers:{"Cache-Control":"no-store"}});
 try{return Response.json(buildLocalAIDPTelemetryEnvelope(Date.now(),challenge),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
 catch{return Response.json({state:"NOT_ENROLLED",connected:false,authorizesAction:false},{status:503,headers:{"Cache-Control":"no-store"}});}
}
