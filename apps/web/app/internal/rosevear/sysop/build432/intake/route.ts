import {admitBuild432HubRelay} from "@/lib/build432-original-host-relay-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:Request){
 try{
  const raw=await request.text();if(Buffer.byteLength(raw,"utf8")>20000)return Response.json({state:"PAYLOAD_TOO_LARGE"},{status:413});
  const body=JSON.parse(raw);return Response.json(await admitBuild432HubRelay(body),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return Response.json({state:"HOLD",error:e instanceof Error?e.message:"build432_intake_failed",authorizesAction:false},{status:400,headers:{"Cache-Control":"no-store"}});}
}
