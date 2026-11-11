import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_372,
  BUILD_372_CONTROLLER_BASE_REVISION,
  BUILD_372_MASTER_SNAPSHOT,
  BUILD_372_YW561_OBSERVATION,
  BUILD_372_YW561_PROVIDER_SNAPSHOT,
  composeBuild372Yw561Closure
} from "../lib/yw561-signer-receipt-replay-closure";

const root=path.resolve(process.cwd());
const source=(relative:string)=>fs.readFileSync(path.join(root,relative),"utf8");
const now=new Date("2026-11-11T19:50:00.000Z");

const current=composeBuild372Yw561Closure({now});
assert.equal(BUILD_372,372);
assert.equal(
  BUILD_372_CONTROLLER_BASE_REVISION,
  "cb54e6a983a7a9902dea6fdb8ef5d2c23b1207fc"
);
assert.equal(
  BUILD_372_YW561_OBSERVATION.productionMain,
  "3ac1bbce127a011af7830ad88da020112d132122"
);
assert.equal(
  BUILD_372_YW561_OBSERVATION.deploymentId,
  "dpl_5775v27Ginzas21xz8dP8PT1MUbv"
);
assert.equal(
  BUILD_372_YW561_OBSERVATION.deploymentGitRevision,
  BUILD_372_YW561_OBSERVATION.productionMain
);
assert.equal(
  BUILD_372_YW561_OBSERVATION.deployedManifestRevision,
  BUILD_372_YW561_OBSERVATION.productionMain
);
assert.equal(BUILD_372_YW561_OBSERVATION.sourceRole,"platform_shell");
assert.equal(BUILD_372_YW561_OBSERVATION.tenantBoundary,"platform_shell");
assert.equal(
  BUILD_372_YW561_OBSERVATION.signatureState,
  "AWAITING_INDEPENDENT_SOURCE_SIGNER"
);
assert.equal(BUILD_372_YW561_OBSERVATION.connectionState,"DISCONNECTED / HOLD");

assert.equal(current.identityState,"VERIFIED_EXACT");
assert.equal(current.signerState,"HOLD_UNENROLLED");
assert.equal(current.custodyIntakeState,"HOLD_NOT_RECEIVED");
assert.equal(current.receiptState,"HOLD_NOT_RECEIVED");
assert.equal(current.replayState,"HOLD_NOT_RECEIVED");
assert.equal(current.sourceEvidenceReady,false);
assert.equal(current.master.gateState,"HOLD");
assert.equal(current.closureState,"YW561_CURRENT_EVIDENCE_HOLD");
assert.equal(current.latestOwnerDecision,"PENDING");

assert.equal(
  BUILD_372_YW561_PROVIDER_SNAPSHOT.providerReceiver,
  "CODE_READY_RUNTIME_HOLD"
);
assert.equal(
  BUILD_372_YW561_PROVIDER_SNAPSHOT.sourceHealthSigner,
  "SEPARATE_MASTER_TRUST_DOMAIN"
);
assert.equal(
  BUILD_372_YW561_PROVIDER_SNAPSHOT.masterDeliveryAcceptance,
  "HOLD"
);

assert.equal(BUILD_372_MASTER_SNAPSHOT.aiHub.ack,"MASTER360-AIHUB-309-ACK");
assert.equal(
  BUILD_372_MASTER_SNAPSHOT.aiHub.main,
  "0a94c72ee4a1ded1babeac68deeb981ad33835ef"
);
assert.equal(
  BUILD_372_MASTER_SNAPSHOT.comms.handoff,
  "MASTER360-COMMS-QL417-HANDOFF"
);
assert.equal(
  BUILD_372_MASTER_SNAPSHOT.comms.main,
  "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6"
);

const signerEvents=[{
  eventId:"registry-yw561-372",
  sourceId:"yw" as const,
  eventType:"ENROLLED" as const,
  keyId:"yw-source-health-372",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:registry-custody",
  independentlyVerifiedAt:"2026-11-11T19:46:00.000Z",
  recordedAt:"2026-11-11T19:46:01.000Z"
}];

const custodyEvents=[{
  eventId:"intake-event-yw561-372",
  intakeId:"11111111-1111-4111-8111-111111111111",
  sourceId:"yw" as const,
  eventType:"ENROLLMENT_COMMITTED" as const,
  keyId:"yw-source-health-372",
  computedSpkiSha256:"sha256:"+"a".repeat(64),
  independentPinSpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness",
  recordedAt:"2026-11-11T19:46:02.000Z"
}];

const custodyEvidenceEvents=[{
  evidenceEventId:"build372-custody-yw561",
  sourceProductionRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  keyId:"yw-source-health-372",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness",
  registryEventId:"registry-yw561-372",
  enrollmentEventId:"intake-event-yw561-372",
  custodyState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T19:46:03.000Z",
  recordedAt:"2026-11-11T19:46:03.000Z"
}];

const receipts=[{
  receiptId:"22222222-2222-4222-8222-222222222222",
  sourceId:"yw" as const,
  keyId:"yw-source-health-372",
  sourceRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  manifestRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  receiptSha256:"b".repeat(64),
  nonce:"yw561-source-health-nonce-372",
  issuedAt:"2026-11-11T19:47:00.000Z",
  healthObservedAt:"2026-11-11T19:47:10.000Z",
  healthState:"HEALTHY" as const,
  sourceRuntime:"yw-production",
  verificationState:"VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt:"2026-11-11T19:47:20.000Z"
}];

const admissionEvents=[{
  admissionEventId:"admit-yw561-372",
  sourceId:"yw" as const,
  keyId:"yw-source-health-372",
  receiptSha256:"b".repeat(64),
  sourceRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  outcome:"ADMITTED" as const,
  receiptId:"22222222-2222-4222-8222-222222222222",
  blockers:[],
  recordedAt:"2026-11-11T19:47:21.000Z"
}];

const replayEvents=[{
  replayEventId:"33333333-3333-4333-8333-333333333333",
  sourceProductionRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  manifestRevision:BUILD_372_YW561_OBSERVATION.productionMain,
  receiptId:"22222222-2222-4222-8222-222222222222",
  receiptSha256:"b".repeat(64),
  nonceSha256:"sha256:"+"c".repeat(64),
  replayEvidenceURI:"urn:rosevear:evidence:yw561:source-health-replay",
  replayEvidenceDigest:"sha256:"+"d".repeat(64),
  correlationState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T19:47:22.000Z",
  recordedAt:"2026-11-11T19:47:22.000Z"
}];

const sourceReady=composeBuild372Yw561Closure({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  now
});
assert.equal(sourceReady.identityState,"VERIFIED_EXACT");
assert.equal(sourceReady.signerState,"VERIFIED_CORRELATED");
assert.equal(sourceReady.custodyIntakeState,"VERIFIED_CORRELATED");
assert.equal(sourceReady.receiptState,"VERIFIED_CURRENT");
assert.equal(sourceReady.replayState,"VERIFIED_CORRELATED");
assert.equal(sourceReady.sourceEvidenceReady,true);
assert.equal(sourceReady.master.gateState,"HOLD");
assert.equal(sourceReady.closureState,"SOURCE_EVIDENCE_READY_MASTER_HOLD");

assert.equal(current.policy.providerSignerMaySatisfySourceHealthSigner,false);
assert.equal(current.policy.providerReplayMaySatisfySourceHealthReplay,false);
assert.equal(current.policy.sourcePrivateKeyMayBeStored,false);
assert.equal(current.policy.exactYw561RevisionRequired,true);
assert.equal(current.policy.controllerTrustedSourceSignerRequired,true);
assert.equal(current.policy.independentCustodyEvidenceRequired,true);
assert.equal(current.policy.controllerReceiptAdmissionRequired,true);
assert.equal(current.policy.durableReplayCorrelationRequired,true);
assert.equal(current.policy.threeMasterRuntimeGateRequired,true);
assert.equal(current.policy.codeGreenIsRuntimeAcceptance,false);
assert.equal(current.policy.ownerDecisionRemainsExplicit,true);

const migration=source(
  "../../db/migrations/0136_master_yw561_signer_receipt_replay_runtime_closure.sql"
);
for(const token of [
  "master_yw561_custody_evidence_intake_events",
  "master_yw561_replay_correlation_events",
  "master_yw561_runtime_closure_rechecks",
  "VERIFIED_CORRELATED",
  "SOURCE_EVIDENCE_READY_MASTER_HOLD",
  "YW561_CURRENT_EVIDENCE_HOLD",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token),`migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));

const database=source("lib/yw561-signer-receipt-replay-closure-database.ts");
for(const token of [
  "recordBuild372CustodyEvidence",
  "recordBuild372ReplayCorrelation",
  "recordBuild372RuntimeClosureRecheck",
  "master_yw561_custody_evidence_intake_events",
  "master_yw561_replay_correlation_events",
  "master_yw561_runtime_closure_rechecks",
  "createHash"
]) assert.ok(database.includes(token),`database token ${token}`);
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("YW561_RECEIVER_TOKEN"));

const api=source("app/api/yw561-signer-receipt-replay-closure/route.ts");
for(const token of [
  "record-custody-evidence",
  "record-replay-correlation",
  "record-runtime-closure-recheck",
  "authentication_required",
  "MAX_BODY_BYTES"
]) assert.ok(api.includes(token),`api token ${token}`);

const page=source("app/yw561-signer-receipt-replay-closure/page.tsx");
for(const token of [
  "Build 372 · YW561 source-health closure",
  "Provider-delivery Ed25519 proof is a separate trust domain.",
  "Current source-health evidence is still HOLD.",
  "Three-Master runtime closure remains independent."
]) assert.ok(page.includes(token),`page token ${token}`);

const nav=source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw561-signer-receipt-replay-closure"'));
const operator=source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw561-signer-receipt-replay-closure"'));

const spine=source("scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  '"master_yw561_custody_evidence_intake_events"',
  '"master_yw561_replay_correlation_events"',
  '"master_yw561_runtime_closure_rechecks"',
  '"0136_master_yw561_signer_receipt_replay_runtime_closure.sql"'
]) assert.ok(spine.includes(token),`db spine token ${token}`);

const pkg=JSON.parse(source("package.json"));
const command="tsx scripts/verify-build-372-yw561-signer-receipt-replay-master-closure.ts";
assert.equal(String(pkg.scripts["verify:build372"]),command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
  String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 372 Yard Workers Independent Signer Custody Evidence Intake, Exact YW561 Signed Health Receipt Admission, Durable Replay Correlation & Three-Master Runtime Closure Recheck verification passed."
);
