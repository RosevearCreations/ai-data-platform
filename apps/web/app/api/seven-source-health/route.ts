import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {observeApiOperation} from "@/lib/performance-observatory-database";
import {readBuild429Dashboard,refreshBuild429} from "@/lib/build429-seven-source-health-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function userId(){const session=await auth.api.getSession({headers:await headers()});return session?.user.id??null;}
export async function GET(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.seven-source-health.get",async()=>{try{return Response.json(await readBuild429Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build429_read_failed"},{status:500});}});}
export async function POST(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.seven-source-health.refresh",async()=>{try{return Response.json(await refreshBuild429(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build429_refresh_failed"},{status:500});}});}
