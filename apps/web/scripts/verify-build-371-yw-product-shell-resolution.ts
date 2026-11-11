import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_371,
  BUILD_371_CONTROLLER_BASE_REVISION,
  BUILD_371_MASTER_SNAPSHOT,
  BUILD_371_YW_OBSERVATION,
  composeBuild371YwResolution
} from "../lib/yw-product-shell-resolution";

const root=path.resolve(process.cwd());
const source=(relative:string)=>fs.readFileSync(path.join(root,relative),"utf8");
const now=new Date("2026-11-11T19:05:00.000Z");

const current=composeBuild371YwResolution({now});
assert.equal(BUILD_371,371);
assert.equal(BUILD_371_CONTROLLER_BASE_REVISION,"6b3e68672894a4f90ef68fe26ec00bd8adc02aa1");
assert.equal(BUILD_371_YW_OBSERVATION.productionMain,"fee921c01a1bcbcb4679ef9a0f6b36d0f29aeaea");
assert.equal(BUILD_371_YW_OBSERVATION.deploymentGitRevision,BUILD_371_YW_OBSERVATION.productionMain);
assert.equal(BUILD_371_YW_OBSERVATION.deployedManifestRevision,BUILD_371_YW_OBSERVATION.productionMain);
assert.equal(BUILD_371_YW_OBSERVATION.sourceRole,"platform_shell");
assert.equal(BUILD_371_YW_OBSERVATION.tenantBoundary,"platform_shell");
assert.equal(BUILD_371_YW_OBSERVATION.signatureState,"AWAITING_INDEPENDENT_SOURCE_SIGNER");
assert.equal(BUILD_371_YW_OBSERVATION.connectionState,"DISCONNECTED / HOLD");

assert.equal(current.identityState,"VERIFIED_EXACT");
assert.equal(current.signerState,"HOLD_UNENROLLED");
assert.equal(current.receiptState,"HOLD_NOT_RECEIVED");
assert.equal(current.sourceClosureState,"HOLD");
assert.equal(current.master.gateState,"HOLD");
assert.equal(current.resolutionState,"SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD");
assert.equal(current.latestOwnerDecision,"PENDING");

assert.equal(BUILD_371_MASTER_SNAPSHOT.aiHub.ack,"MASTER360-AIHUB-309-ACK");
assert.equal(BUILD_371_MASTER_SNAPSHOT.aiHub.main,"0a94c72ee4a1ded1babeac68deeb981ad33835ef");
assert.equal(BUILD_371_MASTER_SNAPSHOT.comms.handoff,"MASTER360-COMMS-QL417-HANDOFF");
assert.equal(BUILD_371_MASTER_SNAPSHOT.comms.main,"6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6");

const signerEvents=[{
  eventId:"registry-yw-371",sourceId:"yw" as const,eventType:"ENROLLED" as const,
  keyId:"yw-source-key-371",publicKeySpkiSha256:"sha256:"+"a".repeat(64),
  custodyEvidenceURI:"urn:rosevear:evidence:yw371:registry-custody",
  independentlyVerifiedAt:"2026-11-11T19:01:00.000Z",
  recordedAt:"2026-11-11T19:01:01.000Z"
}];
const custodyEvents=[{
  eventId:"intake-yw-371",intakeId:"11111111-1111-4111-8111-111111111111",
  sourceId:"yw" as const,eventType:"ENROLLMENT_COMMITTED" as const,
  keyId:"yw-source-key-371",
  computedSpkiSha256:"sha256:"+"a".repeat(64),
  independentPinSpkiSha256:"sha256:"+"a".repeat(64),
  pinEvidenceURI:"urn:rosevear:evidence:yw371:pin",
  custodyEvidenceURI:"urn:rosevear:evidence:yw371:custody",
  witnessEvidenceURI:"urn:rosevear:evidence:yw371:witness",
  recordedAt:"2026-11-11T19:01:02.000Z"
}];
const receipts=[{
  receiptId:"receipt-yw-371",sourceId:"yw" as const,keyId:"yw-source-key-371",
  sourceRevision:BUILD_371_YW_OBSERVATION.productionMain,
  manifestRevision:BUILD_371_YW_OBSERVATION.productionMain,
  receiptSha256:"b".repeat(64),nonce:"yw371-nonce",
  issuedAt:"2026-11-11T19:02:00.000Z",
  healthObservedAt:"2026-11-11T19:02:10.000Z",
  healthState:"HEALTHY" as const,sourceRuntime:"yw-production",
  verificationState:"VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt:"2026-11-11T19:02:20.000Z"
}];
const admissionEvents=[{
  admissionEventId:"admit-yw-371",sourceId:"yw" as const,keyId:"yw-source-key-371",
  receiptSha256:"b".repeat(64),sourceRevision:BUILD_371_YW_OBSERVATION.productionMain,
  outcome:"ADMITTED" as const,receiptId:"receipt-yw-371",blockers:[],
  recordedAt:"2026-11-11T19:02:21.000Z"
}];

const sourceClosed=composeBuild371YwResolution({
  signerEvents,custodyEvents,receipts,admissionEvents,now
});
assert.equal(sourceClosed.identityState,"VERIFIED_EXACT");
assert.equal(sourceClosed.signerState,"VERIFIED_CORRELATED");
assert.equal(sourceClosed.receiptState,"VERIFIED_CURRENT");
assert.equal(sourceClosed.sourceClosureState,"READY");
assert.equal(sourceClosed.master.gateState,"HOLD");
assert.equal(sourceClosed.resolutionState,"SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD");

for(const [key,value] of Object.entries(current.policy)){
  assert.equal(value,true,key);
}
assert.equal(current.policy.sourcePrivateKeyMayBeStored,false);

const migration=source("../../db/migrations/0135_master_yw_source_resolution.sql");
for(const token of [
  "master_yw_source_resolution_events",
  "platform_shell",
  "VERIFIED_CORRELATED",
  "SOURCE_IDENTITY_RESOLVED_RUNTIME_HOLD",
  "READY_FOR_OWNER_DECISION",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token),`migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));

const db=source("lib/yw-product-shell-resolution-database.ts");
for(const token of [
  "recordBuild371YwResolution",
  "master_deployed_manifest_observation_events",
  "master_source_custody_correlation_events",
  "master_fresh_receipt_admission_closure_events",
  "master_three_master_runtime_decision_rechecks",
  "master_yw_source_resolution_events"
]) assert.ok(db.includes(token),`database token ${token}`);
assert.ok(!db.includes("privateKey"));

const api=source("app/api/yw-product-shell-resolution/route.ts");
assert.ok(api.includes("recordBuild371YwResolution"));
assert.ok(api.includes("authentication_required"));

const page=source("app/yw-product-shell-resolution/page.tsx");
for(const token of [
  "Build 371 · Yard Workers source reconciliation",
  "The Build 370 Yard Workers role mismatch is resolved in production.",
  "Signer and health admission remain fail-closed.",
  "Three-Master runtime discrepancy remains unresolved by source code."
]) assert.ok(page.includes(token),`page token ${token}`);

const nav=source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw-product-shell-resolution"'));
const tools=source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/yw-product-shell-resolution"'));

const spine=source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(spine.includes('"master_yw_source_resolution_events"'));
assert.ok(spine.includes('"0135_master_yw_source_resolution.sql"'));

const pkg=JSON.parse(source("package.json"));
const command="tsx scripts/verify-build-371-yw-product-shell-resolution.ts";
assert.equal(pkg.scripts["verify:build371"],command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts.build).indexOf(command)<String(pkg.scripts.build).indexOf("run-production-migrations.ts"));

console.log("Build 371 Yard Workers Product-Shell Identity Reconciliation, Independent Source Signer Enrollment Closure, Fresh Signed Health Receipt Admission & Three-Master Runtime Discrepancy Resolution verification passed.");
