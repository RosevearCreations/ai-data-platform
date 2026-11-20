import {runBuild428ProtectedActivation} from "../lib/build428-source-signer-activation-database";
import {BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES} from "../lib/master-source-signer-provisioning";

async function main(){
 if(process.env.VERCEL_ENV!=="production"){
  console.log("Skipping Build 428 source activation outside the Vercel production environment.");
  return;
 }
 const result=await runBuild428ProtectedActivation();
 if(result.verifiedRequiredSources!==BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES.length){
  throw new Error("build428_required_first_heartbeat_not_verified");
 }
 console.log(`Build 428 production first-heartbeat gate passed: ${result.verifiedRequiredSources}/${BUILD_428_REQUIRED_FIRST_HEARTBEAT_SOURCES.length} required sources verified; ${result.activeSources}/7 sources genuinely signed.`);
}
void main().catch(error=>{console.error(error);process.exit(1);});
