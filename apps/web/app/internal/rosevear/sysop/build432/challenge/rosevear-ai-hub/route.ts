import {issueBuild432HubChallenge} from "@/lib/build432-original-host-relay-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{return Response.json(await issueBuild432HubChallenge(),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}catch{return Response.json({state:"CHALLENGE_UNAVAILABLE",authorizesAction:false},{status:503,headers:{"Cache-Control":"no-store"}});}}
