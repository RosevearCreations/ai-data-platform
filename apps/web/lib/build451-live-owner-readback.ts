import {readBuild450ConnectionValidation} from "./build450-live-discovery";
import {assessBuild451} from "./build451-authority-continuity";
export async function readBuild451OwnerReadback(userId:string,sessionCreatedAt:Date|string){
 const source=await readBuild450ConnectionValidation(userId,sessionCreatedAt);
 const assessed=assessBuild451({
  rows:source.rows,historyVerified:source.history.verified,
  latestSweepAt:source.latestSweep?.at??null,latestVerified:source.latestSweep?.verified??0
 });
 return {...assessed,maskedOriginalOwner:source.maskedOwnerAccount,ownerRecovered:source.ownerRecovered,
  latestSweepMode:source.lastOperatorValidationAt===source.latestSweep?.at?"OPERATOR": "SCHEDULED_OR_PREVIOUS",
  evidenceUpdatedAt:new Date().toISOString()};
}
