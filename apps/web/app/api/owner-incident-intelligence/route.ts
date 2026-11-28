import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild456OwnerIntelligence} from "@/lib/build456-incident-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:noStore});
 try{return Response.json(await readBuild456OwnerIntelligence(session.user.id),{headers:noStore});}
 catch{return Response.json({error:"owner_incident_intelligence_unavailable"},{status:403,headers:noStore});}
}
