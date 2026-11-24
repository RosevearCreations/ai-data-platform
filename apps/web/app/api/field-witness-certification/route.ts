import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild441Dashboard} from "@/lib/build441-independent-field-witness-database";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401});
 try{return Response.json(await readBuild441Dashboard(session.user.id),{headers:{"Cache-Control":"no-store"}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:"build441_read_failed"},{status:500});}
}
