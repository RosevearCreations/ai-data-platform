import { admitSysopTelemetryEnvelope, authorizeTelemetryRequest } from "@/lib/sysop-telemetry-v1";
export const runtime="nodejs";export const dynamic="force-dynamic";const MAX=16_384;
export async function POST(request:Request){
 if(!authorizeTelemetryRequest(request))return Response.json({error:"telemetry_transport_not_authorized"},{status:401,headers:{"Cache-Control":"no-store"}});
 const raw=await request.text();if(Buffer.byteLength(raw,"utf8")>MAX)return Response.json({error:"telemetry_body_too_large"},{status:413});
 try{return Response.json(await admitSysopTelemetryEnvelope(JSON.parse(raw)),{status:202,headers:{"Cache-Control":"no-store"}});}
 catch(error){const message=error instanceof Error?error.message:"build423_telemetry_intake_failed";return Response.json({error:message},{status:message.includes("not_enrolled")?503:400,headers:{"Cache-Control":"no-store"}});}
}
