import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {observeApiOperation} from "@/lib/performance-observatory-database";
import {readBuild428Dashboard,refreshBuild428} from "@/lib/build428-source-signer-activation-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function userId(){const session=await auth.api.getSession({headers:await headers()});return session?.user.id??null;}
export async function GET(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.source-signer-activation.get",async()=>{try{return Response.json(await readBuild428Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build428_read_failed"},{status:500});}});}
export async function POST(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.source-signer-activation.refresh",async()=>{try{return Response.json(await refreshBuild428(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build428_refresh_failed"},{status:500});}});}
