import {createHash,randomBytes,randomUUID} from "node:crypto";
import {withProtectedDatabase} from "./database";
import {admitSysopTelemetryEnvelope,verifySysopTelemetryEnvelope} from "./sysop-telemetry-v1";

type Envelope={payload:Record<string,unknown>;signature:string};
const TTL_MS=120_000;
export async function issueBuild432HubChallenge(){
 const challenge=randomBytes(32).toString("hex"),challengeId=randomUUID(),digest=createHash("sha256").update(challenge).digest("hex");
 const expiresAt=new Date(Date.now()+TTL_MS);
 await withProtectedDatabase(client=>client.query("insert into app.master_build432_hub_challenges(challenge_id,challenge_sha256,issued_at,expires_at) values($1,$2,now(),$3)",[challengeId,digest,expiresAt]));
 return {schema:"rosevear.ai-data-platform.build432-hub-challenge.v1",appId:"rosevear-ai-hub",challenge,expiresAt:expiresAt.toISOString(),authorizesAction:false};
}
export async function admitBuild432HubRelay(envelope:Envelope){
 const payload=envelope?.payload;if(!payload||payload.appId!=="rosevear-ai-hub"||payload.protocolVersion!=="1.2")throw new Error("build432_hub_payload_invalid");
 const challenge=String(payload.challenge??"");if(!/^[a-f0-9]{64}$/.test(challenge))throw new Error("build432_hub_challenge_invalid");
 // A forged or stale device signature must not consume a genuine Windows challenge.
 // Verify against the configured original-host public pin before claiming the nonce.
 const preflight=verifySysopTelemetryEnvelope(envelope,Date.now(),{expectedChallenge:challenge});
 if(preflight.appId!=="rosevear-ai-hub"||preflight.protocolVersion!=="1.2"||!preflight.challengeVerified)
  throw new Error("build451_original_host_preflight_rejected");
 const digest=createHash("sha256").update(challenge).digest("hex");
 const challengeRow=await withProtectedDatabase(async client=>{
  const r=await client.query<{challenge_id:string}>(`update app.master_build432_hub_challenges
   set used_at=now() where challenge_sha256=$1 and used_at is null and expires_at>now()
   returning challenge_id`,[digest]);
  return r.rows[0]??null;
 });
 if(!challengeRow)throw new Error("build432_hub_challenge_expired_or_replayed");
 const admitted=await admitSysopTelemetryEnvelope(envelope,{expectedChallenge:challenge});
 if(admitted.appId!=="rosevear-ai-hub"||admitted.protocolVersion!=="1.2"||!admitted.challengeVerified)throw new Error("build432_hub_signature_not_verified");
 const relayReceiptId=randomUUID(),sourceCommit=String(payload.sourceCommit),sysop=(payload.sysop??{}) as Record<string,unknown>;
 await withProtectedDatabase(client=>client.query(`insert into app.master_build432_hub_relay_receipts(
  relay_receipt_id,challenge_id,telemetry_receipt_id,source_commit,observed_boot_time_ms,received_at
 ) values($1,$2,$3,$4,$5,now())`,[relayReceiptId,challengeRow.challenge_id,admitted.receiptId,sourceCommit,sysop.bootTimeMs??null]));
 return {state:"ACTIVE_V12_SIGNED",receiptId:relayReceiptId,telemetryReceiptId:admitted.receiptId,appId:"rosevear-ai-hub",sourceCommit,authorizesAction:false};
}
export async function latestBuild432HubRelay(maxAgeSeconds=300){
 return withProtectedDatabase(async client=>{
  const r=await client.query<{relay_receipt_id:string;telemetry_receipt_id:string;source_commit:string;received_at:Date}>(`select relay_receipt_id,telemetry_receipt_id,source_commit,received_at from app.master_build432_hub_relay_receipts
   where received_at>now()-($1::text||' seconds')::interval order by received_at desc limit 1`,[String(maxAgeSeconds)]);
  const row=r.rows[0];return row?{...row,received_at:row.received_at.toISOString()}:null;
 });
}
