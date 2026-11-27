import {readBuild453OwnerIntake} from "./build453-autonomous-intake-database";
import {classifyBuild454} from "./build454-autonomous-recovery";

export async function readBuild454OwnerExceptions(userId:string){
 // Owner authorization and protected aggregate query are performed by Build 453.
 // Retry only transient reads. Never retry credentials, delivery or physical controls.
 let lastError:unknown;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const evidence=await readBuild453OwnerIntake(userId);
   return {...classifyBuild454(evidence),readAttempts:attempt,source:"original_master_intake_aggregate"};
  }catch(error){
   lastError=error;
   // Authorization failures must remain fail closed without automatic retry.
   if(error instanceof Error&&/owner_required|operator_required|authentication|required|permission|role/i.test(error.message))throw error;
  }
 }
 throw lastError instanceof Error?lastError:new Error("build454_intake_unavailable");
}
