import {timingSafeEqual} from "node:crypto";
import {sweepBuild427Protected} from "@/lib/build427-master-health-database";
import {runBuild429ProtectedSweep} from "@/lib/build429-seven-source-health-database";
import {runBuild430ProtectedSweep} from "@/lib/build430-sweep-challenge-database";
import {runBuild431ProtectedSweep} from "@/lib/build431-genuine-signer-expansion-database";
import {runBuild432Closure} from "@/lib/build432-seven-source-closure-database";
import {runBuild453AutonomousIntakeWatch} from "@/lib/build453-autonomous-intake-database";
import {runBuild455ProtectedExceptionSweep} from "@/lib/build455-exception-database";
import {runBuild456ProtectedIntelligenceSweep} from "@/lib/build456-incident-database";
export const runtime="nodejs";export const dynamic="force-dynamic";
function authorized(request:Request){const expected=process.env.CRON_SECRET;const raw=request.headers.get("authorization")??"";if(!expected||!raw.startsWith("Bearer "))return false;const a=Buffer.from(raw.slice(7)),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:Request){if(!process.env.CRON_SECRET)return Response.json({error:"cron_secret_not_configured"},{status:503});if(!authorized(request))return Response.json({error:"not_authorized"},{status:401});try{let intake:{state:string;ownPipelineHolds?:number;site12SourceReceipts?:number};
 try{intake=await runBuild453AutonomousIntakeWatch();}catch{intake={state:"BUILD453_INTAKE_AUDIT_UNAVAILABLE"};}
 let exceptions:{build:number;open?:number;recovered?:number;state?:string};
 try{const x=await runBuild455ProtectedExceptionSweep();exceptions={build:455,open:x.open,recovered:x.recovered};}
 catch{exceptions={build:455,state:"EXCEPTION_HISTORY_WRITE_UNAVAILABLE"};}
 let intelligence:{build:number;uniqueOpenIncidents?:number;state?:string};
 try{const x=await runBuild456ProtectedIntelligenceSweep();intelligence={build:456,uniqueOpenIncidents:x.uniqueOpenIncidents};}
 catch{intelligence={build:456,state:"INCIDENT_INTELLIGENCE_SNAPSHOT_UNAVAILABLE"};}
 const legacy=await sweepBuild427Protected();const correlated=await runBuild429ProtectedSweep("CRON");const challenge=await runBuild430ProtectedSweep("CRON");const expansion=await runBuild431ProtectedSweep("CRON");const closure=await runBuild432Closure("CRON");return Response.json({ok:true,build:456,build453:intake,build455:exceptions,build456:intelligence,legacyBuild427:legacy,build429:{sweepId:correlated.sweepId,verifiedSources:correlated.verifiedSources,classifiedSources:correlated.classifiedSources,heldSources:correlated.heldSources,state:correlated.state},build430:{sweepId:challenge.sweepId,verifiedSources:challenge.verified,challengeVerifiedSources:challenge.challenged,state:challenge.state},build431:{sweepId:expansion.sweepId,verifiedSources:expansion.verifiedSources,classifiedSources:expansion.classifiedSources,heldSources:expansion.heldSources,state:expansion.state},build432:{closureId:closure.closureId,verifiedSources:closure.verifiedSources,state:closure.state}},{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"build432_cron_failed"},{status:500});}}
