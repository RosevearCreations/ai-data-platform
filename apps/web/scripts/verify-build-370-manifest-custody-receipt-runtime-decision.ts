import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_370_CONTROLLER_BASE_REVISION,
  BUILD_370_MANIFEST_OBSERVATIONS,
  BUILD_370_MASTER_SNAPSHOT,
  composeBuild370Decision
} from "../lib/manifest-custody-receipt-decision";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const now = new Date("2026-11-11T18:35:00.000Z");
const current = composeBuild370Decision({ now });

assert.equal(current.build, 370);
assert.equal(
  BUILD_370_CONTROLLER_BASE_REVISION,
  "206aaf4f5007da10607efe692776256b90a9a28b"
);
assert.equal(BUILD_370_MASTER_SNAPSHOT.aiHub.ack, "MASTER360-AIHUB-309-ACK");
assert.equal(
  BUILD_370_MASTER_SNAPSHOT.aiHub.main,
  "0a94c72ee4a1ded1babeac68deeb981ad33835ef"
);
assert.equal(
  BUILD_370_MASTER_SNAPSHOT.comms.handoff,
  "MASTER360-COMMS-QL417-HANDOFF"
);
assert.equal(
  BUILD_370_MASTER_SNAPSHOT.comms.main,
  "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6"
);
assert.equal(current.master.gateState, "HOLD");

const yw = current.sources.find((item) => item.sourceId === "yw");
const icamp = current.sources.find((item) => item.sourceId === "icamp");
assert.ok(yw);
assert.ok(icamp);

assert.equal(
  yw.productionMain,
  "2c7234c975528a3a3ab76ca22829c8b4a541de97"
);
assert.equal(
  yw.deploymentId,
  "dpl_5GPLC36MjUc8KUsyNS2zqQu7Nc8d"
);
assert.equal(yw.observedManifestRevision, yw.productionMain);
assert.equal(yw.deploymentGitRevision, yw.productionMain);
assert.equal(yw.tenantBoundary, "platform_shell");
assert.equal(yw.observedSourceRole, "business_shell");
assert.equal(yw.expectedSourceRole, "platform_shell");
assert.equal(yw.manifestState, "HOLD_ROLE_MISMATCH");
assert.equal(yw.custodyState, "HOLD_UNENROLLED");
assert.equal(yw.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(yw.decisionState, "HOLD");

assert.equal(
  icamp.productionMain,
  "69d46513b45e340a4e295165abbd3d99b3a62274"
);
assert.equal(
  icamp.deploymentId,
  "dpl_48KWSeSdV6KhujxbUeSs8Ao7VMWM"
);
assert.equal(icamp.observedManifestRevision, icamp.productionMain);
assert.equal(icamp.deploymentGitRevision, icamp.productionMain);
assert.equal(icamp.tenantBoundary, "platform_shell");
assert.equal(icamp.observedSourceRole, "platform_shell");
assert.equal(icamp.manifestState, "VERIFIED_EXACT");
assert.equal(icamp.custodyState, "HOLD_UNENROLLED");
assert.equal(icamp.receiptState, "HOLD_NOT_RECEIVED");
assert.equal(icamp.decisionState, "HOLD");

assert.equal(current.summary.exactManifestRevisionObserved, 2);
assert.equal(current.summary.fullyConfirmedManifestIdentity, 1);
assert.equal(current.summary.custodyCorrelated, 0);
assert.equal(current.summary.freshReceiptClosure, 0);
assert.equal(current.summary.readyForOwnerDecision, 0);
assert.equal(current.summary.threeMasterGate, "HOLD");

assert.equal(current.policy.independentDeploymentObservationRequired, true);
assert.equal(current.policy.exactManifestRevisionRequired, true);
assert.equal(current.policy.exactProductShellRoleRequired, true);
assert.equal(current.policy.controllerTrustedSignerRequired, true);
assert.equal(current.policy.custodyEvidenceMustCorrelateToTrustedSigner, true);
assert.equal(current.policy.sourcePrivateKeyMayBeStored, false);
assert.equal(current.policy.freshReceiptMustMatchExactRevision, true);
assert.equal(current.policy.receiptAdmissionMustBeControllerVerified, true);
assert.equal(current.policy.threeMasterRuntimeGateRequired, true);
assert.equal(current.policy.codeGreenIsRuntimeAcceptance, false);

const signerEvents = [{
  eventId: "registry-icamp-370",
  sourceId: "icamp" as const,
  eventType: "ENROLLED" as const,
  keyId: "icamp-source-key-370",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:icamp-custody-registry-370",
  independentlyVerifiedAt: "2026-11-11T18:31:00.000Z",
  recordedAt: "2026-11-11T18:31:01.000Z"
}];

const custodyEvents = [{
  eventId: "intake-event-icamp-370",
  intakeId: "11111111-1111-4111-8111-111111111111",
  sourceId: "icamp" as const,
  eventType: "ENROLLMENT_COMMITTED" as const,
  keyId: "icamp-source-key-370",
  computedSpkiSha256: "sha256:" + "a".repeat(64),
  independentPinSpkiSha256: "sha256:" + "a".repeat(64),
  pinEvidenceURI: "urn:rosevear:evidence:icamp-pin-370",
  custodyEvidenceURI: "urn:rosevear:evidence:icamp-custody-370",
  witnessEvidenceURI: "urn:rosevear:evidence:icamp-witness-370",
  recordedAt: "2026-11-11T18:31:02.000Z"
}];

const receipts = [{
  receiptId: "receipt-icamp-370",
  sourceId: "icamp" as const,
  keyId: "icamp-source-key-370",
  sourceRevision: "69d46513b45e340a4e295165abbd3d99b3a62274",
  manifestRevision: "69d46513b45e340a4e295165abbd3d99b3a62274",
  receiptSha256: "b".repeat(64),
  nonce: "icamp-370-nonce",
  issuedAt: "2026-11-11T18:32:00.000Z",
  healthObservedAt: "2026-11-11T18:32:05.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: "icamp-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T18:32:10.000Z"
}];

const admissions = [{
  admissionEventId: "admit-icamp-370",
  sourceId: "icamp" as const,
  keyId: "icamp-source-key-370",
  receiptSha256: "b".repeat(64),
  sourceRevision: "69d46513b45e340a4e295165abbd3d99b3a62274",
  outcome: "ADMITTED" as const,
  receiptId: "receipt-icamp-370",
  blockers: [],
  recordedAt: "2026-11-11T18:32:11.000Z"
}];

const iCampClosed = composeBuild370Decision({
  signerEvents,
  custodyEvents,
  receipts,
  admissionEvents: admissions,
  now
});
const simulatedICamp = iCampClosed.sources.find((item) => item.sourceId === "icamp");
assert.ok(simulatedICamp);
assert.equal(simulatedICamp.custodyState, "VERIFIED_CORRELATED");
assert.equal(simulatedICamp.receiptState, "VERIFIED_CURRENT");
assert.equal(simulatedICamp.sourceClosureState, "READY");
assert.equal(simulatedICamp.decisionState, "HOLD");
assert.equal(iCampClosed.summary.readyForOwnerDecision, 0);
assert.equal(iCampClosed.master.gateState, "HOLD");

const migration = source(
  "../../db/migrations/0134_master_manifest_custody_receipt_runtime_decision.sql"
);
for (const token of [
  "master_deployed_manifest_observation_events",
  "master_source_custody_correlation_events",
  "master_fresh_receipt_admission_closure_events",
  "master_three_master_runtime_decision_rechecks",
  "HOLD_ROLE_MISMATCH",
  "VERIFIED_CORRELATED",
  "HOLD_SIGNER_CUSTODY",
  "READY_FOR_OWNER_DECISION",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source("lib/manifest-custody-receipt-decision-database.ts");
for (const token of [
  "listBuild370DecisionForUser",
  "recordBuild370CurrentObservationAndRecheck",
  "master_deployed_manifest_observation_events",
  "master_source_custody_correlation_events",
  "master_fresh_receipt_admission_closure_events",
  "master_three_master_runtime_decision_rechecks",
  "build370-manifest-custody-receipt-decision"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("private_key"));

const api = source("app/api/manifest-custody-receipt-decision/route.ts");
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("recordBuild370CurrentObservationAndRecheck"));

const page = source("app/manifest-custody-receipt-decision/page.tsx");
for (const token of [
  "Build 370 · Independent production observation",
  "Independent manifest observation now confirms both production SHAs.",
  "Yard Workers source-role discrepancy remains visible.",
  "Custody and receipt gates remain independent.",
  "Three-Master runtime decision remains HOLD."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/manifest-custody-receipt-decision"'));
const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/manifest-custody-receipt-decision"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_deployed_manifest_observation_events"',
  '"master_source_custody_correlation_events"',
  '"master_fresh_receipt_admission_closure_events"',
  '"master_three_master_runtime_decision_rechecks"',
  '"0134_master_manifest_custody_receipt_runtime_decision.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-370-manifest-custody-receipt-runtime-decision.ts";
assert.equal(String(pkg.scripts["verify:build370"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

assert.equal(BUILD_370_MANIFEST_OBSERVATIONS.length, 2);

console.log(
  "Build 370 Independent Deployed Manifest Observation, Source Signer Custody Evidence Correlation, Fresh Receipt Admission Closure & Three-Master Runtime Decision Recheck verification passed."
);
