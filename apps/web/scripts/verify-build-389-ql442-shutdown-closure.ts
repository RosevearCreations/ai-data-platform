import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  BUILD_389, QL_442, evaluateQl442IsolatedShutdown,
  type Ql442Inputs, type HostShutdown, type IndependentOff,
  type MasterClosure, type Ql441SourceProof, type DualOwnerReview
} from "../lib/ql442-isolated-shutdown-closure";

const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const ids = ["rosevear-ai-hub","rosevear-comms-hub","ai-data-platform"] as const;
const makeKey = () => {
  const k = generateKeyPairSync("ed25519");
  return { privateKey:k.privateKey,
    pin:k.publicKey.export({type:"spki",format:"der"}).toString("base64") };
};
const keys = {
  source:makeKey(),host:makeKey(),receiver:makeKey(),owner:makeKey(),reviewer:makeKey(),
  masters:Object.fromEntries(ids.map(x=>[x,makeKey()])) as Record<(typeof ids)[number],ReturnType<typeof makeKey>>
};
const signed = <T>(payload:T,key:ReturnType<typeof makeKey>) => ({
  payload,signature:sign(null,Buffer.from(JSON.stringify(payload)),key.privateKey).toString("base64")
});
const iso = (ms:number) => new Date(ms).toISOString();
function fixture(late = false) {
  const now = Date.now() - 4000;
  const prior = {
    state:"DURABLE_QL441_GO_WITNESSED_ON_REVIEW_ONLY" as const,
    connection:"HOLD" as const,activationAuthorized:false as const,
    receiver:"ON_WITNESSED_ISOLATED_LEASE_SHUTDOWN_REQUIRED" as const,
    originalIncidentId:"incident_ql442_123456",
    challengeId:"challenge_ql442_123456",
    leaseId:"lease_ql442_12345678",
    leaseExpiresAt:iso(now + (late ? -1000 : 70000)),
    independentOnDigest:"a".repeat(64),
    decisionReceiptDigest:"b".repeat(64)
  };
  const source:Ql441SourceProof = {
    schema:"rosevear.ql442.original-comms-ql441-source-proof.v1",
    incidentId:prior.originalIncidentId,
    ql441Digest:sha(prior),ql441DecisionReceiptDigest:prior.decisionReceiptDigest,
    assertedState:"QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION",
    observedAt:iso(now)
  };
  const host:HostShutdown = {
    schema:"rosevear.ql442.original-host-signed-shutdown.v1",
    incidentId:prior.originalIncidentId,
    challengeId:prior.challengeId,leaseId:prior.leaseId,
    hostMachineId:"DESKTOP-AE894KC",priorIndependentOnDigest:prior.independentOnDigest,
    ql441DecisionReceiptDigest:prior.decisionReceiptDigest,
    receiverState:"OFF",watchdogArmed:true,shutdownSequence:11,
    shutdownAt:iso(now)
  };
  const off:IndependentOff = {
    schema:"rosevear.ql442.independent-receiver-off-readback.v1",
    incidentId:prior.originalIncidentId,challengeId:prior.challengeId,leaseId:prior.leaseId,
    signedHostShutdownDigest:sha(host),receiverState:"OFF",offSequence:12,
    observedAt:iso(now)
  };
  const reports:MasterClosure[] = ids.map(masterId=>({
    schema:"rosevear.ql442.three-master-closure-attestation.v1" as const,
    masterId,incidentId:prior.originalIncidentId,hostShutdownDigest:sha(host),
    independentOffDigest:sha(off),
    leaseDisposition:late ? "EXPIRED_EXCEPTION" : "ON_TIME",
    decision:late ? "SIGNED_LATE_OFF_KEEP_EXCEPTION_OPEN" : "SIGNED_OFF_CLOSEOUT_REVIEW",
    reviewedAt:iso(now)
  }));
  const review:DualOwnerReview = {
    schema:"rosevear.ql442.dual-owner-pilot-closure-review.v1",
    incidentId:prior.originalIncidentId,
    ownerId:"Ree_Original",reviewerId:"Jack_Independent",
    independentOffDigest:sha(off),masterReportsDigest:sha(reports),
    decision:late ? "ACKNOWLEDGE_LEASE_EXCEPTION_KEEP_OPEN" :
      "CLOSE_ISOLATED_PILOT_ONLY_NO_ACTIVATION",
    reviewedAt:iso(now)
  };
  const input:Ql442Inputs = {
    previous:prior,
    sourceProof:signed(source,keys.source),
    hostShutdown:signed(host,keys.host),
    independentOff:signed(off,keys.receiver),
    masterReports:reports.map(m=>signed(m,keys.masters[m.masterId])),
    ownerReview:{
      payload:review,
      ownerSignature:signed(review,keys.owner).signature,
      reviewerSignature:signed(review,keys.reviewer).signature
    },
    pins:{
      commsSource:keys.source.pin,originalHost:keys.host.pin,
      independentReceiver:keys.receiver.pin,owner:keys.owner.pin,reviewer:keys.reviewer.pin,
      masters:Object.fromEntries(ids.map(id=>[id,keys.masters[id].pin])) as
        Record<(typeof ids)[number],string>
    },
    independentlyVerifiedPins:true,trustedClockVerified:true,
    previousProtectedCustodyVerified:true,incidentAlreadyClosed:false,nowMs:now
  };
  return { input, prior, source, host, off, reports, review, now };
}
const good=fixture();
assert.equal(BUILD_389,389);
assert.equal(QL_442,"rosevear.master.ql442.isolated-shutdown-closure.v1");
const accepted=evaluateQl442IsolatedShutdown(good.input);
assert.equal(accepted.state,"SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION");
assert.equal(accepted.masterCount,3);
assert.match(accepted.evidenceDigest??"",/^[a-f0-9]{64}$/);
assert.equal(accepted.connection,"HOLD");
assert.equal(accepted.activationAuthorized,false);
assert.equal(accepted.physicalReceiverCurrentlyOff,false);
assert.equal(accepted.manualIsolationAndIndependentOffRequired,true);
const late=evaluateQl442IsolatedShutdown(fixture(true).input);
assert.equal(late.state,"LATE_OFF_ATTESTED_LEASE_EXCEPTION_OPEN");
assert.equal(late.leaseExpired,true);
assert.equal(late.activationAuthorized,false);

function fails(label:string, mutate:(f:ReturnType<typeof fixture>)=>void,reason:string){
  const f=fixture();mutate(f);
  const result=evaluateQl442IsolatedShutdown(f.input);
  assert.equal(result.state,"HOLD",label);
  assert.equal(result.reason,reason,label);
  assert.equal(result.connection,"HOLD",label);
  assert.equal(result.activationAuthorized,false,label);
  assert.equal(result.evidenceDigest,null,label);
}
fails("missing source custody",f=>{f.input.previousProtectedCustodyVerified=false;},
  "PROTECTED_SOURCE_CLOCK_OR_ONE_USE_CUSTODY_REQUIRED");
fails("prior receipt replay",f=>{f.input.incidentAlreadyClosed=true;},
  "PROTECTED_SOURCE_CLOCK_OR_ONE_USE_CUSTODY_REQUIRED");
fails("untrusted clock",f=>{f.input.trustedClockVerified=false;},
  "PROTECTED_SOURCE_CLOCK_OR_ONE_USE_CUSTODY_REQUIRED");
fails("fake prior connection",f=>{f.input.previous={...f.prior,connection:"HOLD",activationAuthorized:true} as unknown as Ql442Inputs["previous"];},
  "EXACT_QL441_PROTECTED_INCIDENT_REQUIRED");
fails("source signature forged",f=>{f.input.sourceProof.payload.ql441Digest="0".repeat(64);},
  "ORIGINAL_QL441_SOURCE_SIGNATURE_INVALID");
fails("invalid source pin",f=>{f.input.pins.commsSource=keys.owner.pin;},
  "INDEPENDENT_PINNED_SIGNER_SEPARATION_REQUIRED");
fails("wrong host machine",f=>{f.input.hostShutdown={...f.input.hostShutdown,
  payload:{...f.host,hostMachineId:"TEMPLAR"} as unknown as HostShutdown};},
  "ORIGINAL_HOST_SIGNED_SHUTDOWN_INVALID");
fails("watchdog off",f=>{f.input.hostShutdown=signed({...f.host,watchdogArmed:false} as unknown as HostShutdown,keys.host);},
  "ORIGINAL_HOST_SIGNED_SHUTDOWN_INVALID");
fails("host ON",f=>{f.input.hostShutdown=signed({...f.host,receiverState:"ON"} as unknown as HostShutdown,keys.host);},
  "ORIGINAL_HOST_SIGNED_SHUTDOWN_INVALID");
fails("signed host wrong lease",f=>{f.input.hostShutdown=signed({...f.host,leaseId:"wrong_lease_id_ql442"} as HostShutdown,keys.host);},
  "ORIGINAL_HOST_SIGNED_SHUTDOWN_INVALID");
fails("independent OFF missing",f=>{f.input.independentOff={
  payload:f.off,signature:"X".repeat(88)};},
  "INDEPENDENT_SIGNED_OFF_SEQUENCE_OR_CUSTODY_INVALID");
fails("independent OFF old sequence",f=>{f.input.independentOff=signed({...f.off,offSequence:10},keys.receiver);},
  "INDEPENDENT_SIGNED_OFF_SEQUENCE_OR_CUSTODY_INVALID");
fails("independent OFF old readback",f=>{f.input.independentOff=signed({...f.off,observedAt:iso(f.now-130000)},keys.receiver);},
  "INDEPENDENT_SIGNED_OFF_SEQUENCE_OR_CUSTODY_INVALID");
fails("independent OFF wrong host digest",f=>{f.input.independentOff=signed({...f.off,signedHostShutdownDigest:"0".repeat(64)},keys.receiver);},
  "INDEPENDENT_SIGNED_OFF_SEQUENCE_OR_CUSTODY_INVALID");
fails("missing third Master",f=>{f.input.masterReports=f.input.masterReports.slice(0,2);},
  "THREE_DISTINCT_MASTER_CLOSURE_REPORTS_REQUIRED");
fails("duplicate Master",f=>{f.input.masterReports=[f.input.masterReports[0],f.input.masterReports[0],f.input.masterReports[2]];},
  "THREE_MASTER_SIGNED_SHUTDOWN_CLOSURE_REJECTED");
fails("Master false connect",f=>{f.input.masterReports=[signed({...f.reports[0],decision:"CONNECT_NOW"} as unknown as MasterClosure,keys.masters[ids[0]]),...f.input.masterReports.slice(1)];},
  "THREE_MASTER_SIGNED_SHUTDOWN_CLOSURE_REJECTED");
fails("Master wrong digest",f=>{f.input.masterReports=[signed({...f.reports[0],independentOffDigest:"0".repeat(64)},keys.masters[ids[0]]),...f.input.masterReports.slice(1)];},
  "THREE_MASTER_SIGNED_SHUTDOWN_CLOSURE_REJECTED");
fails("owner asked activate",f=>{f.input.ownerReview.payload={...f.review,decision:"CONNECT_NOW"} as unknown as DualOwnerReview;},
  "DUAL_OWNER_SIGNED_CLOSEOUT_REJECTED");
fails("same owner identity",f=>{const r={...f.review,reviewerId:f.review.ownerId};f.input.ownerReview={
  payload:r,ownerSignature:signed(r,keys.owner).signature,
  reviewerSignature:signed(r,keys.reviewer).signature};},
  "DUAL_OWNER_SIGNED_CLOSEOUT_REJECTED");
fails("owner missing independent signature",f=>{f.input.ownerReview.reviewerSignature=f.input.ownerReview.ownerSignature;},
  "DUAL_OWNER_SIGNED_CLOSEOUT_REJECTED");
fails("owner stale",f=>{const r={...f.review,reviewedAt:iso(f.now-121000)};f.input.ownerReview={
  payload:r,ownerSignature:signed(r,keys.owner).signature,
  reviewerSignature:signed(r,keys.reviewer).signature};},
  "DUAL_OWNER_SIGNED_CLOSEOUT_REJECTED");

console.log("Build 389 / QL-442 signed isolated shutdown, lease expiry, independent OFF, three-Master pilot closeout and fail-closed tests passed.");
