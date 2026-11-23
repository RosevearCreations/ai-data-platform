import {headers} from "next/headers";import {auth} from "@/lib/auth";import {build436Snapshot,BUILD_436_SCHEMA} from "@/lib/build436-branch-reconciliation";
export const dynamic="force-dynamic";
export async function GET(){const s=await auth.api.getSession({headers:await headers()});if(!s)return Response.json({error:"authentication_required"},{status:401});return Response.json({schema:BUILD_436_SCHEMA,build:436,capturedAt:new Date().toISOString(),...build436Snapshot()},{headers:{"Cache-Control":"no-store"}});}
