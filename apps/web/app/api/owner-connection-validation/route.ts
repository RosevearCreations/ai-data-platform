import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild449Dashboard} from "@/lib/build449-automatic-owner-dashboard";
import {readBuild432Dashboard,refreshBuild432} from "@/lib/build432-seven-source-closure-database";
import {readBuild450ConnectionValidation} from "@/lib/build450-live-discovery";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const noStore={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:noStore});
 try{return Response.json(await readBuild450ConnectionValidation(session.user.id,session.session.createdAt),{headers:noStore});}
 catch{return Response.json({error:"owner_connection_readback_unavailable"},{status:403,headers:noStore});}
}
export async function POST(request:Request){
 // Requires same-origin browser interaction and a genuine original owner session; never accepts a client-supplied source truth value.
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)
  return Response.json({error:"same_origin_required"},{status:403,headers:noStore});
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:noStore});
 try{
  const owner=await readBuild449Dashboard(session.user.id,session.session.createdAt);
  if(owner.originalOwnerSession!=="RECOVERED_AND_AUTHENTICATED")return Response.json({error:"original_owner_recovery_required"},{status:403,headers:noStore});
  const prior=await readBuild432Dashboard(session.user.id);
  const newestOperator=prior.runs.find(r=>r.mode==="OPERATOR");
  if(newestOperator&&Date.now()-Date.parse(newestOperator.observed_at)<10*60_000)
   return Response.json({state:"RECENT_OWNER_VALIDATION_ALREADY_RECORDED",lastAt:newestOperator.observed_at},{status:200,headers:noStore});
  await refreshBuild432(session.user.id);
  return Response.json({state:"OWNER_AUTHORIZED_FRESH_SIGNED_CHALLENGE_COMPLETED",report:await readBuild450ConnectionValidation(session.user.id,session.session.createdAt)},{headers:noStore});
 }catch{
  return Response.json({error:"live_original_source_validation_unavailable_no_evidence_fabricated"},{status:503,headers:noStore});
 }
}
