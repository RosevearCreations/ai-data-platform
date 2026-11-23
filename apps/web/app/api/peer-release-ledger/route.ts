import {headers} from "next/headers";import {auth} from "@/lib/auth";import {readBuild435Dashboard} from "@/lib/build435-peer-release-ledger-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){const s=await auth.api.getSession({headers:await headers()});if(!s)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await readBuild435Dashboard(s.user.id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build435_read_failed"},{status:500});}}
