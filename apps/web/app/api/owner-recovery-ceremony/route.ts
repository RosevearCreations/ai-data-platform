import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild444OwnerCeremony} from "@/lib/build444-readiness-database";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:{"Cache-Control":"no-store"}});
 try{return Response.json(await readBuild444OwnerCeremony(session.user.id),{headers:{"Cache-Control":"no-store"}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:"owner_verification_failed"},{status:403,headers:{"Cache-Control":"no-store"}});}
}
