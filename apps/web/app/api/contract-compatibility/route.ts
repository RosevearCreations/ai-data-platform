import {headers} from "next/headers";import {auth} from "@/lib/auth";import {readBuild437Dashboard} from "@/lib/build437-contract-compatibility-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){const s=await auth.api.getSession({headers:await headers()});if(!s)return Response.json({error:"authentication_required"},{status:401});try{return Response.json(await readBuild437Dashboard(s.user.id),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build437_read_failed"},{status:500});}}
