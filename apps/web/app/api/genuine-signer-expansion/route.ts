import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {observeApiOperation} from "@/lib/performance-observatory-database";
import {readBuild431Dashboard,refreshBuild431} from "@/lib/build431-genuine-signer-expansion-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function userId(){const session=await auth.api.getSession({headers:await headers()});return session?.user.id??null;}
export async function GET(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.genuine-signer-expansion.get",async()=>{try{return Response.json(await readBuild431Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build431_read_failed"},{status:500});}});}
export async function POST(){const id=await userId();if(!id)return Response.json({error:"authentication_required"},{status:401});return observeApiOperation(id,"api.genuine-signer-expansion.refresh",async()=>{try{return Response.json(await refreshBuild431(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build431_refresh_failed"},{status:500});}});}
