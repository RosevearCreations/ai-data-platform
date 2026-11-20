import {runBuild429ProductionAcceptance} from "../lib/build429-seven-source-health-database";
async function main(){
 if(process.env.VERCEL_ENV!=="production"){
  console.log("Skipping Build 429 seven-source health acceptance outside the Vercel production environment.");
  return;
 }
 const result=await runBuild429ProductionAcceptance();
 console.log(`Build 429 production seven-source health gate passed: ${result.verifiedSources}/7 sources genuinely signed; ${result.classifiedSources}/7 classified; ${result.heldSources} explicit HOLDs; YW+iCamp remained verified.`);
}
void main().catch(error=>{console.error(error);process.exit(1);});
