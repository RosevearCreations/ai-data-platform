import {createPublicKey,verify} from "node:crypto";
export const BUILD_442_SCHEMA="rosevear.ai-data-platform.build442-original-device-witness.v1" as const;
export type WitnessEnvelope={schema:typeof BUILD_442_SCHEMA;appId:string;sourceCommit:string;witnessId:string;witnessRole:string;originalDeviceId:string;observedAt:string;nonce:string;interfaceCertified:boolean;receiverAckVerified:boolean;ownerAcceptanceVerified:boolean;keyId:string;signature:string};
const ids=new Set(["ai-data-platform","rosevear-comms-hub","rosevear-ai-hub","icamp","yw","devilndove","rosiedazzlers"]);
export function verifyBuild442Witness(v:WitnessEnvelope,pins:Record<string,string>,now=new Date()){
 if(v.schema!==BUILD_442_SCHEMA||!ids.has(v.appId)||!/^[a-f0-9]{40}$/.test(v.sourceCommit)||!/^[a-zA-Z0-9_-]{16,128}$/.test(v.nonce))throw Error("invalid_witness_contract");
 if(!v.witnessId||!v.witnessRole||!v.originalDeviceId||!v.keyId||!v.signature)throw Error("incomplete_witness_identity");
 if(!v.interfaceCertified||!v.receiverAckVerified||!v.ownerAcceptanceVerified)throw Error("field_acceptance_incomplete");
 const delta=now.getTime()-Date.parse(v.observedAt);
 if(!Number.isFinite(delta)||delta<0||delta>5*60_000)throw Error("witness_expired");
 const pem=pins[v.keyId];
 if(!pem)throw Error("witness_key_not_enrolled");
 const {signature,...payload}=v;
 const message=Buffer.from(JSON.stringify(payload),"utf8");
 const bytes=Buffer.from(signature,"base64");
 if(bytes.length!==64||!verify(null,message,createPublicKey(pem),bytes))throw Error("witness_signature_invalid");
 return {appId:v.appId,sourceCommit:v.sourceCommit,witnessId:v.witnessId,witnessRole:v.witnessRole,originalDeviceId:v.originalDeviceId,observedAt:v.observedAt,nonce:v.nonce};
}
