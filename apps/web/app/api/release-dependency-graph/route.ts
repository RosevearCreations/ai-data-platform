import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild439Dashboard} from "@/lib/build439-release-dashboard";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401});
 try{return Response.json(await readBuild439Dashboard(session.user.id),{headers:{"Cache-Control":"no-store"}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:"build439_read_failed"},{status:500});}
}
