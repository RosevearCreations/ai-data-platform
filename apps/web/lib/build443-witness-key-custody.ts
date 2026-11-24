import type {WitnessEnvelope} from "./build442-witness-crypto";
export type Build443WitnessBinding={appIds:string[];originalDeviceId:string;witnessId:string;witnessRole:string;independentOfSource:boolean;active:boolean};
export function requireBuild443WitnessBinding(v:WitnessEnvelope,bindings:Record<string,Build443WitnessBinding>){
 const b=bindings[v.keyId];
 if(!b||b.active!==true||b.independentOfSource!==true)throw Error("trusted_independent_verifier_not_enrolled");
 if(!Array.isArray(b.appIds)||!b.appIds.includes(v.appId)||b.originalDeviceId!==v.originalDeviceId||b.witnessId!==v.witnessId||b.witnessRole!==v.witnessRole)
  throw Error("witness_identity_or_source_scope_mismatch");
 return {appId:v.appId,deviceId:v.originalDeviceId,verifiedKeyId:v.keyId};
}
