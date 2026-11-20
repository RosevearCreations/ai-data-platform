import {timingSafeEqual} from "node:crypto";
import {sweepBuild427Protected} from "@/lib/build427-master-health-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
function authorized(request:Request){const expected=process.env.CRON_SECRET;const raw=request.headers.get("authorization")??"";if(!expected||!raw.startsWith("Bearer "))return false;const a=Buffer.from(raw.slice(7)),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:Request){if(!process.env.CRON_SECRET)return Response.json({error:"cron_secret_not_configured"},{status:503});if(!authorized(request))return Response.json({error:"not_authorized"},{status:401});try{const result=await sweepBuild427Protected();return Response.json({ok:true,build:427,...result},{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build427_cron_failed"},{status:500});}}
