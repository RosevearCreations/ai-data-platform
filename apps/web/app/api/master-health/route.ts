import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {observeApiOperation} from "@/lib/performance-observatory-database";
import {readBuild427Dashboard,refreshBuild427} from "@/lib/build427-master-health-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function userId(){const session=await auth.api.getSession({headers:await headers()});return session?.user.id??null;}
function status(m:string){return m.includes("operator_required")?403:500;}
export async function GET(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.master-health.get",async()=>{try{return Response.json(await readBuild427Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){const m=e instanceof Error?e.message:"build427_read_failed";return Response.json({error:m},{status:status(m)});}});}
export async function POST(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.master-health.refresh",async()=>{try{return Response.json(await refreshBuild427(id),{headers:{"Cache-Control":"no-store"}});}catch(e){const m=e instanceof Error?e.message:"build427_refresh_failed";return Response.json({error:m},{status:status(m)});}});}
