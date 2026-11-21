import {runBuild430ProductionAcceptance} from "../lib/build430-sweep-challenge-database";
async function main(){
 if(process.env.VERCEL_ENV!=="production"){console.log("Skipping Build 430 source-signed sweep challenge acceptance outside the Vercel production environment.");return;}
 const result=await runBuild430ProductionAcceptance();
 console.log(`Build 430 production challenge gate passed: 2/2 YW+iCamp v1.2 sources verified twice; overlap isolation=${result.overlapIsolationVerified}; first=${result.firstSweepId}; second=${result.secondSweepId}; overlap=${result.overlapSweepId}.`);
}
void main().catch(error=>{console.error(error);process.exit(1);});