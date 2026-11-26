import {createHash,createPublicKey,verify} from "node:crypto";

/** Non-authorizing diagnosis of an already signed external telemetry candidate.
 * Never admits a receipt, changes a pin, trusts an unverified commit or exposes a key.
 * Runtime callers use only server-held pins; the optional pin argument is for unit tests.
 */
export const BUILD_451_DIAGNOSTIC_SCHEMA="rosevear.ai-data-platform.build451-signer-repair.v1" as const;
export type Build451Pin={publicKeyPem:string;fingerprint:string;expectedCommit:string};
export type Build451Code=
 "SOURCE_IDENTITY_MISMATCH"|"NO_TRUSTED_SOURCE_PIN"|"UNTRUSTED_SIGNATURE_OR_KEY"|
 "VERIFIED_SIGNATURE_COMMIT_DRIFT"|"VERIFIED_SIGNATURE_CLOCK_OR_EXPIRY"|
 "VERIFIED_SIGNATURE_PRIVACY_OR_ACTION_SCOPE"|"VERIFIED_SIGNATURE_PROTOCOL_OR_CHALLENGE"|
 "SIGNED_CANDIDATE_PENDING_FULL_ADMISSION";
export type Build451Diagnosis={code:Build451Code;cryptographicSignatureVerified:boolean;authorizesAction:false};
function canonical(value:unknown):string{
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 if(value&&typeof value==="object")
  return "{"+Object.keys(value as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+":"+canonical((value as Record<string,unknown>)[k])).join(",")+"}";
 return JSON.stringify(value);
}
function envPins():Record<string,Build451Pin>{
 try{
  const raw=process.env.ROSEVEAR_SYSOP_TELEMETRY_PINS_JSON??"{}";
  if(raw.length>200000)return {};
  const parsed:unknown=JSON.parse(raw);
  return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,Build451Pin>:{};
 }catch{return {};}
}
function result(code:Build451Code,verified=false):Build451Diagnosis{
 return {code,cryptographicSignatureVerified:verified,authorizesAction:false};
}
export function diagnoseBuild451SourceEnvelope(
 envelope:unknown,expectedAppId:string,nowMs=Date.now(),trustPins:Record<string,Build451Pin>=envPins()
):Build451Diagnosis{
 try{
  if(!envelope||typeof envelope!=="object"||Array.isArray(envelope))return result("UNTRUSTED_SIGNATURE_OR_KEY");
  const obj=envelope as Record<string,unknown>,p=obj.payload;
  if(!p||typeof p!=="object"||Array.isArray(p))return result("UNTRUSTED_SIGNATURE_OR_KEY");
  const payload=p as Record<string,unknown>;
  if(payload.appId!==expectedAppId)return result("SOURCE_IDENTITY_MISMATCH");
  const pin=trustPins[expectedAppId];
  if(!pin||typeof pin.publicKeyPem!=="string"||typeof pin.fingerprint!=="string"||typeof pin.expectedCommit!=="string")
   return result("NO_TRUSTED_SOURCE_PIN");
  if(typeof obj.signature!=="string"||!/^[a-f0-9]{128}$/.test(obj.signature))
   return result("UNTRUSTED_SIGNATURE_OR_KEY");
  const pub=createPublicKey(pin.publicKeyPem),der=pub.export({type:"spki",format:"der"});
  const spki=createHash("sha256").update(der).digest("hex");
  const raw=createHash("sha256").update(der.subarray(der.length-32)).digest("hex");
  if(pin.fingerprint!==spki&&pin.fingerprint!==raw)return result("UNTRUSTED_SIGNATURE_OR_KEY");
  if(!verify(null,Buffer.from(canonical(payload),"utf8"),pub,Buffer.from(obj.signature,"hex")))
   return result("UNTRUSTED_SIGNATURE_OR_KEY");
  // The cryptographic signature is now valid for the currently pinned key.
  // This still does not prove the release commit was approved or the event was admitted.
  const commit=String(payload.sourceCommit??"");
  const expected=pin.expectedCommit==="SELF_VERCEL_GIT_COMMIT_SHA"&&expectedAppId==="ai-data-platform"
   ?(process.env.VERCEL_GIT_COMMIT_SHA??process.env.GITHUB_SHA??""):pin.expectedCommit;
  if(!/^[a-f0-9]{40}$/.test(commit)||expected!==commit)return result("VERIFIED_SIGNATURE_COMMIT_DRIFT",true);
  const issued=payload.issuedAtMs,expires=payload.expiresAtMs,seen=(payload.sysop as Record<string,unknown>|undefined)?.observedAtMs;
  const ageOk=Number.isSafeInteger(issued)&&Number.isSafeInteger(expires)&&Number.isSafeInteger(seen)
   &&Number(issued)<=nowMs+2000&&nowMs-Number(issued)<=90000&&Number(expires)>nowMs
   &&Number(expires)-Number(issued)<=90000&&Number(seen)<=nowMs+2000&&nowMs-Number(seen)<=90000;
  if(!ageOk)return result("VERIFIED_SIGNATURE_CLOCK_OR_EXPIRY",true);
  if(payload.dataClass!=="NON_SENSITIVE_AGGREGATE"||payload.tenantId!==null||payload.authorizesAction!==false)
   return result("VERIFIED_SIGNATURE_PRIVACY_OR_ACTION_SCOPE",true);
  if(payload.protocolVersion!=="1.2"||typeof payload.challenge!=="string"||!/^[a-f0-9]{64}$/.test(payload.challenge))
   return result("VERIFIED_SIGNATURE_PROTOCOL_OR_CHALLENGE",true);
  return result("SIGNED_CANDIDATE_PENDING_FULL_ADMISSION",true);
 }catch{return result("UNTRUSTED_SIGNATURE_OR_KEY");}
}
