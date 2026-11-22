import {runBuild432ProductionAcceptance} from "../lib/build432-seven-source-closure-database";
async function main(){if(process.env.VERCEL_ENV!=="production"){console.log("Skipping Build 432 seven-source closure acceptance outside Vercel production.");return;}const r=await runBuild432ProductionAcceptance();console.log(`Build 432 production closure passed: ${r.verifiedSources}/7 genuine v1.2 sources verified; state=${r.state}; closure=${r.closureId}.`);}
void main().catch(e=>{console.error(e);process.exit(1);});
