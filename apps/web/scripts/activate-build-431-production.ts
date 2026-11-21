import {runBuild431ProductionAcceptance} from "../lib/build431-genuine-signer-expansion-database";
async function main(){
 if(process.env.VERCEL_ENV!=="production"){console.log("Skipping Build 431 genuine signer expansion acceptance outside the Vercel production environment.");return;}
 const result=await runBuild431ProductionAcceptance();
 console.log(`Build 431 production signer expansion gate passed: ${result.verifiedSources}/7 v1.2 signed sources; ${result.classifiedSources}/7 classified; ${result.heldSources} explicit provider/original-host HOLDs; AIDP+YW+iCamp verified.`);
}
void main().catch(error=>{console.error(error);process.exit(1);});
