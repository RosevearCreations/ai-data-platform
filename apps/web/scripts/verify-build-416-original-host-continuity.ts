import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_416_READ_ONLY_SINK,
  BUILD_416_SERVICE_POLICIES,
  BUILD_416_SOURCE_REVIEW,
  evaluateBuild416OriginalHostContinuity,
  validateBuild416HostReceipt,
  validateBuild416PeerAck,
  validateBuild416Rotation,
  type Build416CertificateRotationReceipt,
  type Build416HostBootWitnessReceipt,
  type Build416PeerAckReceipt
} from "../lib/master-original-host-continuity";

const now="2026-11-17T17:00:00.000Z";
const sha=(c:string)=>"sha256:"+c.repeat(64);

const host=(serviceId:Build416HostBootWitnessReceipt["serviceId"]):Build416HostBootWitnessReceipt=>({
  receiptId:"host-"+serviceId,
  serviceId,
  hostId:"DESKTOP-AE894KC",
  scmServiceName:BUILD_416_SERVICE_POLICIES[serviceId].scmServiceName,
  observedSourceRevision:"a".repeat(40),
  installerArtifactDigest:sha("1"),
  executableDigest:sha("2"),
  serviceAccountIdentityDigest:sha("3"),
  preBootEvidenceDigest:sha("4"),
  postBootEvidenceDigest:sha("5"),
  bootSessionId:"boot-session-416-0001",
  serviceInstalled:true,
  startupMode:"AUTOMATIC",
  recoveryPolicyVerified:true,
  unattendedStartBeforeLoginVerified:true,
  postBootRunningVerified:true,
  noManualInterventionObserved:true,
  tenMinuteContinuityVerified:true,
  continuous24HoursVerified:true,
  rollbackToPriorConfigurationVerified:true,
  ownerStartupModeApproved:true,
  ownerApprovalReceiptDigest:sha("6"),
  independentCustodianReceiptDigest:sha("7"),
  independentWitnessReceiptDigest:sha("8"),
  observedAt:"2026-11-17T16:55:00.000Z",
  expiresAt:"2026-11-18T16:55:00.000Z",
  state:"VERIFIED"
});

const peer=(peerId:Build416PeerAckReceipt["peerId"]):Build416PeerAckReceipt=>({
  receiptId:"peer-"+peerId,
  peerId,
  route:BUILD_416_READ_ONLY_SINK,
  routeImplemented:true,
  protocolVersion:"1.1",
  mtlsClientCertificateEnrolled:true,
  mtlsHandshakeVerified:true,
  serverLeafPinVerified:true,
  peerSignerEnrolled:true,
  signedAckVerified:true,
  ackDisposition:"RECEIVED",
  eventDigest:sha("9"),
  ackDigest:sha("a"),
  transportEvidenceDigest:sha("b"),
  replayProtectionVerified:true,
  noCommandSink:true,
  receiptOnlySink:true,
  sourceAuthorityPreserved:true,
  directPeerDatabaseWrite:false,
  observedAt:"2026-11-17T16:59:00.000Z",
  expiresAt:"2026-11-17T17:01:00.000Z",
  independentlyVerified:true,
  state:"VERIFIED"
});

const rotation=(peerId:Build416CertificateRotationReceipt["peerId"]):Build416CertificateRotationReceipt=>({
  receiptId:"rotation-"+peerId,
  peerId,
  ownerPlanDigest:sha("c"),
  previousLeafPinDigest:sha("d"),
  candidateLeafPinDigest:sha("e"),
  overlapHours:12,
  candidateHandshakeVerified:true,
  peerReenrolled:true,
  freshSignedAckUnderCandidateVerified:true,
  previousCredentialRetainedDuringOverlap:true,
  oldCredentialRetiredAfterAcceptance:true,
  rollbackReadyDuringOverlap:true,
  automaticActivationAuthorized:false,
  observedAt:"2026-11-17T16:59:00.000Z",
  expiresAt:"2026-11-18T16:59:00.000Z",
  independentlyVerified:true,
  state:"COMPLETED"
});

for(const serviceId of Object.keys(BUILD_416_SERVICE_POLICIES) as Build416HostBootWitnessReceipt["serviceId"][]){
  assert.equal(validateBuild416HostReceipt(host(serviceId),now),true);
}
for(const peerId of ["ai-data-platform","rosevear-comms-hub"] as const){
  assert.equal(validateBuild416PeerAck(peer(peerId),now),true);
  assert.equal(validateBuild416Rotation(rotation(peerId),now),true);
}

const sourceHeld=evaluateBuild416OriginalHostContinuity({
  build415SoftwareReleasePresent:true,
  hostReceipts:Object.keys(BUILD_416_SERVICE_POLICIES).map(id=>host(id as Build416HostBootWitnessReceipt["serviceId"])),
  peerAckReceipts:[peer("ai-data-platform"),peer("rosevear-comms-hub")],
  rotationReceipts:[rotation("ai-data-platform"),rotation("rosevear-comms-hub")],
  nowIso:now
});
assert.equal(sourceHeld.governanceState,"HOLD_CURRENT_SOURCE_GAPS_NOT_IMPLEMENTED");
assert.deepEqual(sourceHeld.currentSourceGaps,[
  "AI_DATA_READ_ONLY_SINK_NOT_IMPLEMENTED",
  "COMMS_READ_ONLY_SINK_NOT_IMPLEMENTED",
  "AI_DATA_WINDOWS_WORKER_INSTALLER_NOT_IMPLEMENTED",
  "COMMS_WINDOWS_WORKER_INSTALLER_NOT_IMPLEMENTED",
  "HUB_WINDOWS_SCM_SERVICE_INSTALLER_NOT_IMPLEMENTED"
]);
assert.equal(sourceHeld.policy.cloudGreenImpliesWindowsAcceptance,false);
assert.equal(sourceHeld.policy.receiverOrActuatorControlInScope,false);
assert.equal(sourceHeld.policy.installOrStartWorkersInScope,false);
assert.equal(BUILD_416_SOURCE_REVIEW.hubOutboundClientContract,"IMPLEMENTED");
assert.equal(BUILD_416_SOURCE_REVIEW.aiDataSinkRoute,"NOT_IMPLEMENTED");
assert.equal(BUILD_416_SOURCE_REVIEW.commsSinkRoute,"NOT_IMPLEMENTED");

const badHost={...host("rosevear-ai-data-platform-worker"),startupMode:"MANUAL" as const};
assert.equal(validateBuild416HostReceipt(badHost,now),false);
const badAck={...peer("ai-data-platform"),signedAckVerified:false};
assert.equal(validateBuild416PeerAck(badAck,now),false);
const badRotation={...rotation("ai-data-platform"),overlapHours:25};
assert.equal(validateBuild416Rotation(badRotation,now),false);

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

const migration=read("db/migrations/0179_master_original_host_continuity.sql");
for(const token of [
  "master_build416_host_boot_witness_receipts",
  "master_build416_peer_ack_receipts",
  "master_build416_certificate_rotation_receipts",
  "DESKTOP-AE894KC",
  "Rosevear-AIDataPlatform",
  "/internal/rosevear/master/events/read-only/v1",
  "force row level security",
  "revoke insert,update,delete",
  "automatic_activation_authorized=false"
]) assert.ok(migration.includes(token),"migration token missing: "+token);

const page=read("apps/web/app/original-host-continuity/page.tsx");
for(const token of [
  "Build 416 · Original-Host Continuity",
  "Windows Boot Witness, Runtime Custody & Independent Peer ACK",
  "NOT IMPLEMENTED",
  "Observed physical state",
  "Secrets are deliberately excluded"
]) assert.ok(page.includes(token),"page token missing: "+token);

const doc=read("docs/BUILD_416_ORIGINAL_HOST_CONTINUITY.md");
for(const token of [
  "793faaed8498bc649ae9b48788474ae715675697",
  "319b718950ff48e5a8ca28fd82d03d2e56bf74ad",
  "904f1480d349b6ee508fd11221063d28cc35342e",
  "NOT IMPLEMENTED",
  "Rosevear AI Hub Unattended Boot",
  "24-hour continuity",
  "does not perform the rotation"
]) assert.ok(doc.includes(token),"doc token missing: "+token);

const manifest=JSON.parse(read(".github/rosevear-build416-original-host-continuity.v1.json"));
assert.equal(manifest.build,416);
assert.equal(manifest.originalHost,"DESKTOP-AE894KC");
assert.equal(manifest.policy.cloudGreenImpliesWindowsAcceptance,false);
assert.equal(manifest.policy.receiverOrActuatorControlInScope,false);
assert.equal(manifest.policy.lockstepReleaseRequired,false);

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 416"));

console.log(
  "Build 416 Original-Host Service Continuity, Reboot Witness & Independent Runtime Custody verification passed."
);
