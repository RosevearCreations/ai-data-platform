import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  BUILD_375,
  BUILD_375_CONTROLLER_BASE_REVISION,
  BUILD_375_MASTER_RUNTIME,
  composeBuild375Yw561DecisionRuntimeConnection
} from "../lib/yw561-owner-decision-runtime-connection-reconciliation";
import { BUILD_373_YW561_LIVE_OBSERVATION } from "../lib/yw561-live-signer-receipt-replay-owner-recheck";

const root = path.resolve(process.cwd());
const source = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const now = new Date("2026-11-11T20:25:00.000Z");

const current = composeBuild375Yw561DecisionRuntimeConnection({ now });
assert.equal(BUILD_375, 375);
assert.equal(
  BUILD_375_CONTROLLER_BASE_REVISION,
  "08b1aaf52aab23f9e2fa89e1f3f79ebfb86f6e5b"
);
assert.equal(
  BUILD_375_MASTER_RUNTIME.aiHub.main,
  "0a94c72ee4a1ded1babeac68deeb981ad33835ef"
);
assert.equal(BUILD_375_MASTER_RUNTIME.comms.build, "QL-418");
assert.equal(
  BUILD_375_MASTER_RUNTIME.comms.main,
  "0cd042d044226848ab50da25a5cc0efc14577e39"
);
assert.equal(current.decisionExecutionState, "HOLD_NO_CURRENT_RECEIPT");
assert.equal(current.acceptanceContinuityState, "HOLD_NO_CURRENT_RECEIPT");
assert.equal(current.currentRuntimeGateState, "HOLD");
assert.equal(current.runtimeGateTransitionState, "INITIAL_HOLD");
assert.equal(current.connectionReconciliationState, "DISCONNECTED_HOLD");
assert.equal(current.connected, false);

const signerEvents = [{
  eventId: "77777777-7777-4777-8777-777777777777",
  sourceId: "yw" as const,
  eventType: "ENROLLED" as const,
  keyId: "yw-source-health-375",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:registry-custody-375",
  independentlyVerifiedAt: "2026-11-11T20:21:00.000Z",
  recordedAt: "2026-11-11T20:21:01.000Z"
}];

const custodyEvents = [{
  eventId: "88888888-8888-4888-8888-888888888888",
  intakeId: "99999999-9999-4999-8999-999999999999",
  sourceId: "yw" as const,
  eventType: "ENROLLMENT_COMMITTED" as const,
  keyId: "yw-source-health-375",
  computedSpkiSha256: "sha256:" + "a".repeat(64),
  independentPinSpkiSha256: "sha256:" + "a".repeat(64),
  pinEvidenceURI: "urn:rosevear:evidence:yw561:pin-375",
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:custody-375",
  witnessEvidenceURI: "urn:rosevear:evidence:yw561:witness-375",
  recordedAt: "2026-11-11T20:21:02.000Z"
}];

const custodyEvidenceEvents = [{
  evidenceEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sourceProductionRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  keyId: "yw-source-health-375",
  publicKeySpkiSha256: "sha256:" + "a".repeat(64),
  pinEvidenceURI: "urn:rosevear:evidence:yw561:pin-375",
  custodyEvidenceURI: "urn:rosevear:evidence:yw561:custody-375",
  witnessEvidenceURI: "urn:rosevear:evidence:yw561:witness-375",
  registryEventId: "77777777-7777-4777-8777-777777777777",
  enrollmentEventId: "88888888-8888-4888-8888-888888888888",
  custodyState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-11T20:21:03.000Z",
  recordedAt: "2026-11-11T20:21:03.000Z"
}];

const receiptId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const receipts = [{
  receiptId,
  sourceId: "yw" as const,
  keyId: "yw-source-health-375",
  sourceRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptSha256: "b".repeat(64),
  nonce: "yw561-source-health-nonce-375",
  issuedAt: "2026-11-11T20:22:00.000Z",
  healthObservedAt: "2026-11-11T20:22:10.000Z",
  healthState: "HEALTHY" as const,
  sourceRuntime: "yw-production",
  verificationState: "VERIFIED_SOURCE_BOUND_HEALTH" as const,
  verifiedAt: "2026-11-11T20:22:20.000Z"
}];

const admissionEvents = [{
  admissionEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  sourceId: "yw" as const,
  keyId: "yw-source-health-375",
  receiptSha256: "b".repeat(64),
  sourceRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  outcome: "ADMITTED" as const,
  receiptId,
  blockers: [],
  recordedAt: "2026-11-11T20:22:21.000Z"
}];

const replayEvents = [{
  replayEventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  sourceProductionRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  manifestRevision: BUILD_373_YW561_LIVE_OBSERVATION.productionMain,
  receiptId,
  receiptSha256: "b".repeat(64),
  nonceSha256: "sha256:" + "c".repeat(64),
  replayEvidenceURI: "urn:rosevear:evidence:yw561:source-health-replay-375",
  replayEvidenceDigest: "sha256:" + "d".repeat(64),
  correlationState: "VERIFIED_CORRELATED" as const,
  blockers: [],
  checkedAt: "2026-11-11T20:22:22.000Z",
  recordedAt: "2026-11-11T20:22:22.000Z"
}];

const ready = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  masterOverride: { gateState: "OPEN" },
  now
});
assert.equal(ready.decisionExecutionState, "READY_FOR_EXPLICIT_OWNER_ACCEPTANCE");
assert.equal(ready.acceptanceContinuityState, "HOLD_NO_ACCEPT");
assert.equal(ready.currentRuntimeGateState, "OPEN");
assert.equal(ready.runtimeGateTransitionState, "INITIAL_OPEN");
assert.equal(ready.connectionReconciliationState, "DISCONNECTED_HOLD");
assert.equal(ready.connected, false);

const acceptedDecision = {
  decisionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sourceId: "yw" as const,
  receiptId,
  decision: "ACCEPT" as const,
  evidenceURI: "urn:rosevear:evidence:yw561:owner-accept-375",
  detail: "Explicit owner acceptance for the exact current receipt.",
  decidedAt: "2026-11-11T20:23:00.000Z",
  recordedAt: "2026-11-11T20:23:01.000Z"
};

const accepted = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "OPEN" },
  previousRuntimeGateState: "HOLD",
  now
});
assert.equal(accepted.decisionExecutionState, "ALREADY_ACCEPTED");
assert.equal(accepted.acceptanceContinuityState, "ACTIVE");
assert.equal(accepted.runtimeGateTransitionState, "HOLD_TO_OPEN");
assert.equal(accepted.connectionReconciliationState, "READY_FOR_VERIFIED_CONNECTION");
assert.equal(accepted.connected, false);

const connected = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "OPEN" },
  previousRuntimeGateState: "OPEN",
  connectionObservationOverride: "CONNECTED / VERIFIED",
  independentConnectionEvidenceVerified: true,
  now
});
assert.equal(connected.acceptanceContinuityState, "ACTIVE");
assert.equal(connected.runtimeGateTransitionState, "UNCHANGED_OPEN");
assert.equal(connected.connectionReconciliationState, "CONNECTED_VERIFIED");
assert.equal(connected.connected, true);

const staleAccept = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [{
    ...acceptedDecision,
    decisionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    receiptId: "11111111-2222-4333-8444-555555555555"
  }],
  masterOverride: { gateState: "OPEN" },
  now
});
assert.equal(staleAccept.decisionExecutionState, "READY_FOR_EXPLICIT_OWNER_ACCEPTANCE");
assert.equal(staleAccept.acceptanceContinuityState, "HOLD_RECEIPT_CHANGED");
assert.equal(staleAccept.connected, false);

const rejected = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [{
    ...acceptedDecision,
    decisionId: "12121212-1212-4212-8212-121212121212",
    decision: "REJECT" as const
  }],
  masterOverride: { gateState: "OPEN" },
  now
});
assert.equal(rejected.decisionExecutionState, "REJECTED");
assert.equal(rejected.acceptanceContinuityState, "REJECTED");
assert.equal(rejected.connectionReconciliationState, "DISCONNECTED_HOLD");

const runtimeClosed = composeBuild375Yw561DecisionRuntimeConnection({
  signerEvents,
  custodyEvents,
  custodyEvidenceEvents,
  receipts,
  admissionEvents,
  replayEvents,
  ownerDecisions: [acceptedDecision],
  masterOverride: { gateState: "HOLD" },
  previousRuntimeGateState: "OPEN",
  now
});
assert.equal(runtimeClosed.acceptanceContinuityState, "HOLD_MASTER_GATE");
assert.equal(runtimeClosed.runtimeGateTransitionState, "OPEN_TO_HOLD");
assert.equal(runtimeClosed.connectionReconciliationState, "DISCONNECTED_HOLD");

assert.equal(current.policy.ownerDecisionIsExplicit, true);
assert.equal(current.policy.acceptRequiresExactCurrentReceipt, true);
assert.equal(current.policy.staleReceiptAcceptMayContinue, false);
assert.equal(current.policy.codeGreenMayOpenRuntimeGate, false);
assert.equal(current.policy.independentConnectionEvidenceRequired, true);
assert.equal(current.policy.connectionMayBeAutoInferred, false);

const migration = source(
  "../../db/migrations/0139_master_yw561_owner_decision_runtime_connection_reconciliation.sql"
);
for (const token of [
  "master_yw561_owner_decision_execution_events",
  "master_yw561_acceptance_continuity_events",
  "master_yw561_runtime_gate_transition_events",
  "master_yw561_connection_reconciliation_events",
  "CONNECTED_VERIFIED",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) assert.ok(migration.includes(token), `migration token ${token}`);
assert.ok(!migration.toLowerCase().includes("private_key"));

const database = source(
  "lib/yw561-owner-decision-runtime-connection-reconciliation-database.ts"
);
for (const token of [
  "executeBuild375OwnerDecision",
  "recordBuild375Reconciliation",
  "build375_owner_acceptance_gate_hold",
  "build375_exact_current_receipt_required",
  "master_owner_decision_audit",
  "master_yw561_owner_decision_execution_events",
  "master_yw561_acceptance_continuity_events",
  "master_yw561_runtime_gate_transition_events",
  "master_yw561_connection_reconciliation_events"
]) assert.ok(database.includes(token), `database token ${token}`);
assert.ok(!database.includes("privateKey"));
assert.ok(!database.includes("service_role"));
assert.ok(!database.includes("YW561_RECEIVER_TOKEN"));

const api = source("app/api/yw561-owner-decision-runtime-connection/route.ts");
assert.ok(api.includes('action === "execute-owner-decision"'));
assert.ok(api.includes('action === "reconcile"'));
assert.ok(api.includes("authentication_required"));

const page = source("app/yw561-owner-decision-runtime-connection/page.tsx");
for (const token of [
  "Build 375 · YW561 owner decision and connection reconciliation",
  "ACCEPT is an execution, not a shortcut.",
  "Acceptance continuity is continuously receipt-bound.",
  "Connection remains independently verified."
]) assert.ok(page.includes(token), `page token ${token}`);

const nav = source("lib/application-navigation.ts");
assert.ok(nav.includes('href: "/yw561-owner-decision-runtime-connection"'));
const operator = source("lib/module-operator-tools.ts");
assert.ok(operator.includes('"/yw561-owner-decision-runtime-connection"'));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_yw561_owner_decision_execution_events"',
  '"master_yw561_acceptance_continuity_events"',
  '"master_yw561_runtime_gate_transition_events"',
  '"master_yw561_connection_reconciliation_events"',
  '"0139_master_yw561_owner_decision_runtime_connection_reconciliation.sql"'
]) assert.ok(spine.includes(token), `db spine token ${token}`);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-375-yw561-owner-decision-runtime-connection-reconciliation.ts";
assert.equal(String(pkg.scripts["verify:build375"]), command);
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 375 YW561 Explicit Owner Acceptance Decision Execution, Exact-Receipt Acceptance Continuity, Three-Master Runtime Gate Transition & Connection-State Reconciliation verification passed."
);
