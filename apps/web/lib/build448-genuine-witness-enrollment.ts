import {createPublicKey} from "node:crypto";
import type {Build443WitnessBinding} from "./build443-witness-key-custody";
import {BUILD_447_APPS} from "./build447-recovery-witness-reconciliation";

export type Build448KeyConfig={keyId:string;pem:string;binding:Build443WitnessBinding};
export type Build448AppEnrollment={appId:string;status:"READY_FOR_SIGNED_ORIGINAL_DEVICE_SUBMISSION"|"HOLD_NOT_ENROLLED"|"HOLD_AMBIGUOUS_OR_INVALID_ENROLLMENT";keyCount:number};
const KEY_ID=/^[a-zA-Z0-9_-]{2,100}$/;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
export function build448EnrollmentInventory(pinsText:string|null|undefined,bindingsText:string|null|undefined){
 let pins:unknown=null,bindings:unknown=null;
 try{
  if(pinsText&&bindingsText&&pinsText.length<200000&&bindingsText.length<200000){
   pins=JSON.parse(pinsText);bindings=JSON.parse(bindingsText);
  }
 }catch{/* invalid configuration stays held */}
 const parsed=record(pins)&&record(bindings);
 const configs:Build448KeyConfig[]=[];
 let invalidEntries=0;
 if(parsed){
  const pinsRecord=pins as Record<string,unknown>,bindRecord=bindings as Record<string,unknown>;
  for(const [keyId,untrusted] of Object.entries(bindRecord)){
   if(!KEY_ID.test(keyId)||!record(untrusted)||typeof pinsRecord[keyId]!=="string"){invalidEntries++;continue;}
   const v=untrusted as Record<string,unknown>,pem=pinsRecord[keyId] as string;
   if(v.active!==true||v.independentOfSource!==true||typeof v.originalDeviceId!=="string"||v.originalDeviceId.length<2
     ||typeof v.witnessId!=="string"||v.witnessId.length<2||typeof v.witnessRole!=="string"||v.witnessRole.length<2
     ||!Array.isArray(v.appIds)||v.appIds.length===0||v.appIds.some(x=>typeof x!=="string"||!BUILD_447_APPS.includes(x as typeof BUILD_447_APPS[number]))){
    invalidEntries++;continue;
   }
   try{
    const key=createPublicKey(pem);
    if(key.asymmetricKeyType!=="ed25519"){invalidEntries++;continue;}
    configs.push({keyId,pem,binding:v as unknown as Build443WitnessBinding});
   }catch{invalidEntries++;}
  }
 }
 const applications:Build448AppEnrollment[]=BUILD_447_APPS.map(appId=>{
  const entries=configs.filter(v=>v.binding.appIds.includes(appId));
  const distinctDevices=new Set(entries.map(e=>e.binding.originalDeviceId));
  const state=entries.length===0?"HOLD_NOT_ENROLLED":
   entries.length!==1||distinctDevices.size!==1?"HOLD_AMBIGUOUS_OR_INVALID_ENROLLMENT":
   "READY_FOR_SIGNED_ORIGINAL_DEVICE_SUBMISSION";
  return {appId,status:state,keyCount:entries.length};
 });
 const enrolled=applications.filter(x=>x.status==="READY_FOR_SIGNED_ORIGINAL_DEVICE_SUBMISSION").length;
 return {schema:"rosevear.ai-data-platform.build448-witness-enrollment.v1",configured:parsed,
  activeValidPublicKeys:configs.length,invalidEntries,appsExpected:7,appsReady:enrolled,applications,
  state:enrolled===7&&invalidEntries===0?"SEVEN_APP_PUBLIC_KEY_CUSTODY_CONFIGURED":"HOLD_GENUINE_INDEPENDENT_KEY_ENROLLMENT",
  acceptance:"HOLD_UNTIL_SEVEN_INDEPENDENT_ORIGINAL_DEVICE_SIGNATURES_ARE_VERIFIED",
  note:"A configured public key or owner's statement is NOT a genuine device witness. Private keys must stay on independently controlled original devices."};
}
