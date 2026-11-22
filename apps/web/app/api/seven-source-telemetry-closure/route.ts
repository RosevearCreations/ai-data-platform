import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild432Dashboard,refreshBuild432} from "@/lib/build432-seven-source-closure-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function uid(){const s=await auth.api.getSession({headers:await headers()});return s?.user.id??null;}
export async function GET(){const id=await uid();if(!id)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await readBuild432Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build432_read_failed"},{status:500});}}
export async function POST(){const id=await uid();if(!id)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await refreshBuild432(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build432_refresh_failed"},{status:500});}}
