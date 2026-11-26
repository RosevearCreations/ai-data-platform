import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {diagnoseBuild451SourceEnvelope,type Build451Pin} from "../lib/build451-signer-diagnostics";
const {privateKey,publicKey}=generateKeyPairSync("ed25519");
const pem=publicKey.export({type:"spki",format:"pem"}).toString();
const der=publicKey.export({type:"spki",format:"der"});
const pin:Build451Pin={publicKeyPem:pem,fingerprint:createHash("sha256").update(der).digest("hex"),expectedCommit:"a".repeat(40)};
const pins={"icamp":pin};
const now=Date.parse("2026-11-26T17:00:00Z");
function canonical(v:unknown):string{
 if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+":"+canonical((v as Record<string,unknown>)[k])).join(",")+"}";
 return JSON.stringify(v);
}
function envelope(extra:Record<string,unknown>={}){
 const p={appId:"icamp",sourceCommit:pin.expectedCommit,issuedAtMs:now-3000,expiresAtMs:now+60000,
  protocolVersion:"1.2",challenge:"f".repeat(64),dataClass:"NON_SENSITIVE_AGGREGATE",tenantId:null,authorizesAction:false,
  sysop:{observedAtMs:now-3000},...extra};
 return {payload:p,signature:sign(null,Buffer.from(canonical(p)),privateKey).toString("hex")};
}
assert.deepEqual(diagnoseBuild451SourceEnvelope(envelope(),"icamp",now,pins),{
 code:"SIGNED_CANDIDATE_PENDING_FULL_ADMISSION",cryptographicSignatureVerified:true,authorizesAction:false
});
assert.equal(diagnoseBuild451SourceEnvelope(envelope({sourceCommit:"b".repeat(40)}),"icamp",now,pins).code,"VERIFIED_SIGNATURE_COMMIT_DRIFT");
assert.equal(diagnoseBuild451SourceEnvelope(envelope({issuedAtMs:now-200000}),"icamp",now,pins).code,"VERIFIED_SIGNATURE_CLOCK_OR_EXPIRY");
assert.equal(diagnoseBuild451SourceEnvelope(envelope({tenantId:"secret-tenant"}),"icamp",now,pins).code,"VERIFIED_SIGNATURE_PRIVACY_OR_ACTION_SCOPE");
assert.equal(diagnoseBuild451SourceEnvelope(envelope({protocolVersion:"1.1"}),"icamp",now,pins).code,"VERIFIED_SIGNATURE_PROTOCOL_OR_CHALLENGE");
const tampered=envelope();tampered.payload.sourceCommit="b".repeat(40);
assert.equal(diagnoseBuild451SourceEnvelope(tampered,"icamp",now,pins).code,"UNTRUSTED_SIGNATURE_OR_KEY");
assert.equal(diagnoseBuild451SourceEnvelope(envelope(),"yw",now,pins).code,"SOURCE_IDENTITY_MISMATCH");
assert.equal(diagnoseBuild451SourceEnvelope(envelope(),"icamp",now,{}).code,"NO_TRUSTED_SOURCE_PIN");
assert.equal(diagnoseBuild451SourceEnvelope({},"icamp",now,pins).cryptographicSignatureVerified,false);
console.log("Build 451 cryptographically verified signer commit drift, clock skew, scope, protocol and tamper diagnostics passed; no admission or pin change.");
