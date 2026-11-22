import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild433Dashboard,refreshBuild433Dashboard} from "@/lib/build433-continuous-production-assurance-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function uid(){const s=await auth.api.getSession({headers:await headers()});return s?.user.id??null;}
export async function GET(){const id=await uid();if(!id)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await readBuild433Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build433_read_failed"},{status:500});}}
export async function POST(){const id=await uid();if(!id)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await refreshBuild433Dashboard(id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build433_refresh_failed"},{status:500});}}
