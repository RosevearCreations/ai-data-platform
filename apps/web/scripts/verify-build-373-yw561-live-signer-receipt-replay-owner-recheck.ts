import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_373,
  BUILD_373_CONTROLLER_BASE_REVISION,
  BUILD_373_YW561_LIVE_OBSERVATION,
  composeBuild373Yw561OwnerRecheck
} from "../lib/yw561-live-signer-receipt-replay-owner-recheck";

const root=path.resolve(process.cwd());
const source=(relative:string)=>fs.readFileSync(path.join(root,relative),"utf8");
const now=new Date("2026-11-11T20:02:00.000Z");

const current=composeBuild373Yw561OwnerRecheck({now});
assert.equal(BUILD_373,373);
assert.equal(
  BUILD_373_CONTROLLER_BASE_REVISION,
  "f1cc5109d31099adbe875dfab0bb2b74eddeeddd"
);
assert.equal(
  BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  "3ac1bbce127a011af7830ad88da020112d132122"
);
assert.equal(
  BUILD_373_YW561_LIVE_OBSERVATION.deploymentId,
  "dpl_5775v27Ginzas21xz8dP8PT1MUbv"
);
assert.equal(
  BUILD_373_YW561_LIVE_OBSERVATION.deploymentGitRevision,
  BUILD_373_YW561_LIVE_OBSERVATION.productionMain
);
assert.equal(
  BUILD_373_YW561_LIVE_OBSERVATION.deployedManifestRevision,
  BUILD_373_YW561_LIVE_OBSERVATION.productionMain
);
assert.equal(BUILD_373_YW561_LIVE_OBSERVATION.sourceRole,"platform_shell");
assert.equal(BUILD_373_YW561_LIVE_OBSERVATION.tenantBoundary,"platform_shell");
assert.equal(
  BUILD_373_YW561_LIVE_OBSERVATION.signatureState,
  "AWAITING_INDEPENDENT_SOURCE_SIGNER"
);
assert.equal(BUILD_373_YW561_LIVE_OBSERVATION.connectionState,"DISCONNECTED / HOLD");

assert.equal(current.identityState,"VERIFIED_EXACT");
assert.equal(current.signerCorrelationState,"HOLD_UNENROLLED");
assert.equal(current.receiptClosureState,"HOLD_NOT_RECEIVED");
assert.equal(current.replayAcceptanceState,"HOLD_NOT_RECEIVED");
assert.equal(current.sourceEvidenceState,"HOLD");
assert.equal(current.master.currentGateState,"HOLD");
assert.equal(current.master.gateState,"HOLD");
assert.equal(current.latestExactReceiptOwnerDecision,"PENDING");
assert.equal(current.ownerDecisionState,"HOLD");

const signerEvents=[{
  eventId:"registry-yw561-373",
  sourceId:"yw" as const,
  eventType:"ENROLLED" as const,
  keyId:"yw-source-health-373",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:registry-custody-373",
  independentlyVerifiedAt:"2026-11-11T19:56:00.000Z",
  recordedAt:"2026-11-11T19:56:01.000Z"
}];

const custodyEvents=[{
  eventId:"intake-event-yw561-373",
  intakeId:"11111111-1111-4111-8111-111111111111",
  sourceId:"yw" as const,
  eventType:"ENROLLMENT_COMMITTED" as const,
  keyId:"yw-source-health-373",
  computedSpkiSha256:"sha256:"+"a".repeat(64),
  independentPinSpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin-373",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody-373",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness-373",
  recordedAt:"2026-11-11T19:56:02.000Z"
}];

const custodyEvidenceEvents=[{
  evidenceEventId:"build372-custody-yw561-373",
  sourceProductionRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  keyId:"yw-source-health-373",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin-373",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody-373",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness-373",
  registryEventId:"registry-yw561-373",
  enrollmentEventId:"intake-event-yw561-373",
  custodyState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T19:56:03.000Z",
  recordedAt:"2026-11-11T19:56:03.000Z"
}];

const receiptId="22222222-2222-4222-8222-222222222222";
const receipts=[{
  receiptId,
  sourceId:"yw" as const,
  keyId:"yw-source-health-373",
  sourceRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptSha256:"b".repeat(64),
  nonce:"yw561-source-health-nonce-373",
  issuedAt:"2026-11-11T19:58:00.000Z",
  healthObservedAt:"2026-11-11T19:58:10.000Z",
  healthState:"HEALTHY" as const,
  sourceRuntime:"yw-production",
  verificationState:"VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt:"2026-11-11T19:58:20.000Z"
}];

const admissionEvents=[{
  admissionEventId:"admit-yw561-373",
  sourceId:"yw" as const,
  keyId:"yw-source-health-373",
  receiptSha256:"b".repeat(64),
  sourceRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  outcome:"ADMITTED" as const,
  receiptId,
  blockers:[],
  recordedAt:"2026-11-11T19:58:21.000Z"
}];

const replayEvents=[{
  replayEventId:"33333333-3333-4333-8333-333333333333",
  sourceProductionRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptId,
  receiptSha256:"b".repeat(64),
  nonceSha256:"sha256:"+"c".repeat(64),
  replayEvidenceURI:"urn:rosevear:evidence:yw561:source-health-replay-373",
  replayEvidenceDigest:"sha256:"+"d".repeat(64),
  correlationState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T19:58:22.000Z",
  recordedAt:"2026-11-11T19:58:22.000Z"
}];

const ready=composeBuild373Yw561OwnerRecheck({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(ready.signerCorrelationState,"VERIFIED_CORRELATED");
assert.equal(ready.receiptClosureState,"VERIFIED_CURRENT");
assert.equal(ready.replayAcceptanceState,"ACCEPTED");
assert.equal(ready.sourceEvidenceState,"READY");
assert.equal(ready.master.gateState,"OPEN");
assert.equal(ready.ownerDecisionState,"READY_FOR_OWNER_DECISION");

const accepted=composeBuild373Yw561OwnerRecheck({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  ownerDecisions:[{
    decisionId:"44444444-4444-4444-8444-444444444444",
    sourceId:"yw" as const,
    receiptId,
    decision:"ACCEPT" as const,
    evidenceURI:"urn:rosevear:evidence:yw561:owner-accept-373",
    detail:"Explicit owner acceptance after all exact source and Master gates.",
    decidedAt:"2026-11-11T19:59:00.000Z",
    recordedAt:"2026-11-11T19:59:01.000Z"
  }],
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(accepted.ownerDecisionState,"ACCEPTED");
assert.equal(accepted.latestExactReceiptOwnerDecision,"ACCEPT");

const staleAccept=composeBuild373Yw561OwnerRecheck({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  ownerDecisions:[{
    decisionId:"55555555-5555-4555-8555-555555555555",
    sourceId:"yw" as const,
    receiptId:"66666666-6666-4666-8666-666666666666",
    decision:"ACCEPT" as const,
    evidenceURI:"urn:rosevear:evidence:yw561:stale-owner-accept-373",
    detail:"Prior receipt decision must not authorize the current receipt.",
    decidedAt:"2026-11-11T19:59:00.000Z",
    recordedAt:"2026-11-11T19:59:01.000Z"
  }],
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(staleAccept.latestExactReceiptOwnerDecision,"PENDING");
assert.equal(staleAccept.ownerDecisionState,"READY_FOR_OWNER_DECISION");

assert.equal(current.policy.liveProductionIdentityRequired,true);
assert.equal(current.policy.independentSourceHealthSignerRequired,true);
assert.equal(current.policy.build372CustodyCorrelationRequired,true);
assert.equal(current.policy.exactYw561ReceiptRequired,true);
assert.equal(current.policy.controllerReceiptAdmissionRequired,true);
assert.equal(current.policy.durableReplayMustBeAccepted,true);
assert.equal(current.policy.providerEvidenceMaySatisfySourceHealth,false);
assert.equal(current.policy.threeMasterGateMustBeOpen,true);
assert.equal(current.policy.ownerDecisionMustReferenceExactReceipt,true);
assert.equal(current.policy.ownerDecisionRemainsExplicit,true);
assert.equal(current.policy.sourcePrivateKeyMayBeStored,false);
assert.equal(current.policy.codeGreenIsRuntimeAcceptance,false);

const migration=source(
  "../../db/migrations/0137_master_yw561_live_signer_receipt_replay_owner_recheck.sql"
);
for(const token of [
  "master_yw561_live_signer_correlation_events",
  "master_yw561_exact_health_receipt_closure_events",
  "master_yw561_durable_replay_acceptance_events",
  "master_yw561_three_master_owner_decision_rechecks",
  "READY_FOR_OWNER_DECISION",
  "ACCEPTED",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token),`migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));

const database=source("lib/yw561-live-signer-receipt-replay-owner-recheck-database.ts");
for(const token of [
  "listBuild373Yw561OwnerRecheckForUser",
  "recordBuild373Yw561OwnerRecheck",
  "master_yw561_live_signer_correlation_events",
  "master_yw561_exact_health_receipt_closure_events",
  "master_yw561_durable_replay_acceptance_events",
  "master_yw561_three_master_owner_decision_rechecks"
]) assert.ok(database.includes(token),`database token ${token}`);
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("YW561_RECEIVER_TOKEN"));

const api=source("app/api/yw561-live-signer-owner-recheck/route.ts");
assert.ok(api.includes("recordBuild373Yw561OwnerRecheck"));
assert.ok(api.includes("authentication_required"));

const page=source("app/yw561-live-signer-owner-recheck/page.tsx");
for(const token of [
  "Build 373 · YW561 live trust and owner decision recheck",
  "Live source-health signer correlation is still HOLD.",
  "Owner acceptance remains explicit."
]) assert.ok(page.includes(token),`page token ${token}`);

const nav=source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw561-live-signer-owner-recheck"'));
const operator=source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw561-live-signer-owner-recheck"'));

const spine=source("scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  '"master_yw561_live_signer_correlation_events"',
  '"master_yw561_exact_health_receipt_closure_events"',
  '"master_yw561_durable_replay_acceptance_events"',
  '"master_yw561_three_master_owner_decision_rechecks"',
  '"0137_master_yw561_live_signer_receipt_replay_owner_recheck.sql"'
]) assert.ok(spine.includes(token),`db spine token ${token}`);

const pkg=JSON.parse(source("package.json"));
const command="tsx scripts/verify-build-373-yw561-live-signer-receipt-replay-owner-recheck.ts";
assert.equal(String(pkg.scripts["verify:build373"]),command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
  String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 373 YW561 Live Source-Health Signer Enrollment Correlation, Exact Signed HEALTHY Receipt Closure, Durable Replay Acceptance & Three-Master Owner Decision Recheck verification passed."
);
