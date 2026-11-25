import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild446OwnerClosure} from "@/lib/build446-mailbox-closure-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:{"Cache-Control":"no-store"}});
 try{return Response.json(await readBuild446OwnerClosure(session.user.id,session.session.createdAt),{headers:{"Cache-Control":"no-store"}});}
 catch(e){return Response.json({error:e instanceof Error&&e.message==="build446_owner_required"?"owner_role_required":"recovery_closure_unavailable"},{status:403,headers:{"Cache-Control":"no-store"}});}
}
