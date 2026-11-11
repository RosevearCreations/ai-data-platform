import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_374,
  BUILD_374_CONTROLLER_BASE_REVISION,
  BUILD_374_MASTER_RUNTIME,
  composeBuild374Yw561Activation
} from "../lib/yw561-trusted-source-health-activation-owner-gate";
import { BUILD_373_YW561_LIVE_OBSERVATION } from "../lib/yw561-live-signer-receipt-replay-owner-recheck";

const root=path.resolve(process.cwd());
const source=(relative:string)=>fs.readFileSync(path.join(root,relative),"utf8");
const now=new Date("2026-11-11T20:10:00.000Z");

const current=composeBuild374Yw561Activation({now});
assert.equal(BUILD_374,374);
assert.equal(BUILD_374_CONTROLLER_BASE_REVISION,"2e5405519b5c96a7bbd803688a099eae300dde31");
assert.equal(BUILD_374_MASTER_RUNTIME.aiHub.main,"0a94c72ee4a1ded1babeac68deeb981ad33835ef");
assert.equal(BUILD_374_MASTER_RUNTIME.comms.main,"6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6");
assert.equal(current.trustedSignerAdmissionState,"HOLD");
assert.equal(current.currentReceiptActivationState,"HOLD");
assert.equal(current.currentReplayActivationState,"HOLD");
assert.equal(current.sourceHealthActivationState,"HOLD");
assert.equal(current.threeMasterRuntimeCorrelationState,"HOLD");
assert.equal(current.ownerAcceptanceGateState,"HOLD");
assert.equal(current.connectionState,"NOT_INFERRED");

const signerEvents=[{
  eventId:"77777777-7777-4777-8777-777777777777",
  sourceId:"yw" as const,
  eventType:"ENROLLED" as const,
  keyId:"yw-source-health-374",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:registry-custody-374",
  independentlyVerifiedAt:"2026-11-11T20:06:00.000Z",
  recordedAt:"2026-11-11T20:06:01.000Z"
}];

const custodyEvents=[{
  eventId:"88888888-8888-4888-8888-888888888888",
  intakeId:"99999999-9999-4999-8999-999999999999",
  sourceId:"yw" as const,
  eventType:"ENROLLMENT_COMMITTED" as const,
  keyId:"yw-source-health-374",
  computedSpkiSha256:"sha256:"+"a".repeat(64),
  independentPinSpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin-374",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody-374",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness-374",
  recordedAt:"2026-11-11T20:06:02.000Z"
}];

const custodyEvidenceEvents=[{
  evidenceEventId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sourceProductionRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  keyId:"yw-source-health-374",
  publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw561:pin-374",
  custodyEvidenceURI:"urn:rosevear:evidence:yw561:custody-374",
  witnessEvidenceURI:"urn:rosevear:evidence:yw561:witness-374",
  registryEventId:"77777777-7777-4777-8777-777777777777",
  enrollmentEventId:"88888888-8888-4888-8888-888888888888",
  custodyState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T20:06:03.000Z",
  recordedAt:"2026-11-11T20:06:03.000Z"
}];

const receiptId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const receipts=[{
  receiptId,
  sourceId:"yw" as const,
  keyId:"yw-source-health-374",
  sourceRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptSha256:"b".repeat(64),
  nonce:"yw561-source-health-nonce-374",
  issuedAt:"2026-11-11T20:07:00.000Z",
  healthObservedAt:"2026-11-11T20:07:10.000Z",
  healthState:"HEALTHY" as const,
  sourceRuntime:"yw-production",
  verificationState:"VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt:"2026-11-11T20:07:20.000Z"
}];

const admissionEvents=[{
  admissionEventId:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  sourceId:"yw" as const,
  keyId:"yw-source-health-374",
  receiptSha256:"b".repeat(64),
  sourceRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  outcome:"ADMITTED" as const,
  receiptId,
  blockers:[],
  recordedAt:"2026-11-11T20:07:21.000Z"
}];

const replayEvents=[{
  replayEventId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  sourceProductionRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision:BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptId,
  receiptSha256:"b".repeat(64),
  nonceSha256:"sha256:"+"c".repeat(64),
  replayEvidenceURI:"urn:rosevear:evidence:yw561:source-health-replay-374",
  replayEvidenceDigest:"sha256:"+"d".repeat(64),
  correlationState:"VERIFIED_CORRELATED" as const,
  blockers:[],
  checkedAt:"2026-11-11T20:07:22.000Z",
  recordedAt:"2026-11-11T20:07:22.000Z"
}];

const ready=composeBuild374Yw561Activation({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(ready.trustedSignerAdmissionState,"ADMITTED");
assert.equal(ready.currentReceiptActivationState,"ACTIVE_CURRENT");
assert.equal(ready.currentReplayActivationState,"ACTIVE_CURRENT");
assert.equal(ready.sourceHealthActivationState,"ACTIVE");
assert.equal(ready.threeMasterRuntimeCorrelationState,"CORRELATED_OPEN");
assert.equal(ready.ownerAcceptanceGateState,"READY_FOR_EXPLICIT_OWNER_ACCEPTANCE");
assert.equal(ready.connectionState,"NOT_INFERRED");

const accepted=composeBuild374Yw561Activation({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  ownerDecisions:[{
    decisionId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    sourceId:"yw" as const,
    receiptId,
    decision:"ACCEPT" as const,
    evidenceURI:"urn:rosevear:evidence:yw561:owner-accept-374",
    detail:"Explicit owner acceptance after exact source-health and three-Master gates.",
    decidedAt:"2026-11-11T20:08:00.000Z",
    recordedAt:"2026-11-11T20:08:01.000Z"
  }],
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(accepted.ownerAcceptanceGateState,"ACCEPTED");
assert.equal(accepted.latestExactReceiptOwnerDecision,"ACCEPT");
assert.equal(accepted.connectionState,"NOT_INFERRED");

const staleDecision=composeBuild374Yw561Activation({
  signerEvents,custodyEvents,custodyEvidenceEvents,receipts,admissionEvents,replayEvents,
  ownerDecisions:[{
    decisionId:"ffffffff-ffff-4fff-8fff-ffffffffffff",
    sourceId:"yw" as const,
    receiptId:"11111111-2222-4333-8444-555555555555",
    decision:"ACCEPT" as const,
    evidenceURI:"urn:rosevear:evidence:yw561:stale-owner-accept-374",
    detail:"Older receipt decision must not activate the current receipt.",
    decidedAt:"2026-11-11T20:08:00.000Z",
    recordedAt:"2026-11-11T20:08:01.000Z"
  }],
  masterOverride:{gateState:"OPEN"},now
});
assert.equal(staleDecision.ownerAcceptanceGateState,"READY_FOR_EXPLICIT_OWNER_ACCEPTANCE");
assert.equal(staleDecision.latestExactReceiptOwnerDecision,"PENDING");

assert.equal(current.policy.trustedSignerPrivateKeyAccepted,false);
assert.equal(current.policy.providerDeliveryEvidenceCannotActivateSourceHealth,true);
assert.equal(current.policy.explicitOwnerDecisionRequired,true);
assert.equal(current.policy.ownerDecisionMustReferenceExactCurrentReceipt,true);
assert.equal(current.policy.codeGreenCannotOpenRuntimeGate,true);
assert.equal(current.policy.connectedStateMayBeInferred,false);

const migration=source("../../db/migrations/0138_master_yw561_trusted_source_health_activation_owner_gate.sql");
for(const token of [
  "master_yw561_trusted_signer_admission_events",
  "master_yw561_current_receipt_replay_activation_events",
  "master_yw561_three_master_runtime_correlation_events",
  "master_yw561_owner_acceptance_gate_events",
  "READY_FOR_EXPLICIT_OWNER_ACCEPTANCE",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token),`migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));

const database=source("lib/yw561-trusted-source-health-activation-owner-gate-database.ts");
for(const token of [
  "listBuild374Yw561ActivationForUser",
  "recordBuild374Yw561Activation",
  "loadBuild373EvidenceFromClient",
  "master_yw561_trusted_signer_admission_events",
  "master_yw561_current_receipt_replay_activation_events",
  "master_yw561_three_master_runtime_correlation_events",
  "master_yw561_owner_acceptance_gate_events"
]) assert.ok(database.includes(token),`database token ${token}`);
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("YW561_RECEIVER_TOKEN"));

const api=source("app/api/yw561-trusted-source-health-activation/route.ts");
assert.ok(api.includes("recordBuild374Yw561Activation"));
assert.ok(api.includes("authentication_required"));

const page=source("app/yw561-trusted-source-health-activation/page.tsx");
for(const token of [
  "Build 374 · YW561 trusted source-health activation",
  "Activation is evidence-bound, not deployment-bound.",
  "Owner acceptance is never automatic."
]) assert.ok(page.includes(token),`page token ${token}`);

const nav=source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw561-trusted-source-health-activation"'));
const operator=source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw561-trusted-source-health-activation"'));

const spine=source("scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  '"master_yw561_trusted_signer_admission_events"',
  '"master_yw561_current_receipt_replay_activation_events"',
  '"master_yw561_three_master_runtime_correlation_events"',
  '"master_yw561_owner_acceptance_gate_events"',
  '"0138_master_yw561_trusted_source_health_activation_owner_gate.sql"'
]) assert.ok(spine.includes(token),`db spine token ${token}`);

const pkg=JSON.parse(source("package.json"));
const command="tsx scripts/verify-build-374-yw561-trusted-source-health-activation-owner-gate.ts";
assert.equal(String(pkg.scripts["verify:build374"]),command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
  String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 374 YW561 Trusted Source-Health Signer Admission, Current Receipt/Replay Evidence Activation, Three-Master Runtime Evidence Correlation & Explicit Owner Acceptance Gate verification passed."
);
