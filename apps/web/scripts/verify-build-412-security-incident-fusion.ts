import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { BUILD_405_APPLICATION_IDS } from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_412,
  BUILD_412_SUPERVISED_ACTIONS,
  BUILD_412_TELEMETRY_DIMENSIONS,
  assessBuild412IncidentFusion,
  evaluateBuild412SupervisedAction,
  type Build412IncidentSignal,
  type Build412RemediationReceipt,
  type Build412TelemetryEvidence
} from "../lib/master-security-incident-fusion";

const observedAt = "2026-11-16T22:00:00.000Z";
const expiresAt = "2026-11-16T22:30:00.000Z";

const telemetry: Build412TelemetryEvidence[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_412_TELEMETRY_DIMENSIONS.map((dimension, index) => ({
      evidenceId: `b412-${appId}-${dimension.toLowerCase()}`,
      appId,
      dimension,
      state: index % 7 === 0 ? "DEGRADED" : "HEALTHY",
      evidenceDigest: "sha256:" + "a".repeat(64),
      observedAt,
      expiresAt,
      sourceOwned: true,
      rawSecretPresent: false,
      independentlyVerified: true
    }))
  );

const signals: Build412IncidentSignal[] = [
  {
    signalId: "sig-yw-runtime",
    appId: "yw",
    correlationId: "INC-412-SHARED-001",
    severity: "WARNING",
    category: "RUNTIME",
    sourceEvidenceDigest: "sha256:" + "b".repeat(64),
    observedAt,
    independentlyVerified: true
  },
  {
    signalId: "sig-icamp-queue",
    appId: "icamp",
    correlationId: "INC-412-SHARED-001",
    severity: "WARNING",
    category: "DELIVERY",
    sourceEvidenceDigest: "sha256:" + "c".repeat(64),
    observedAt,
    independentlyVerified: true
  }
];

const receipts: Build412RemediationReceipt[] = [{
  receiptId: "receipt-412-1",
  appId: "yw",
  action: "CONTAIN",
  sourceAuthority: "yard-workers-owner",
  ownerApprovalReceiptId: "owner-approval-412",
  custodianReceiptId: "custodian-412",
  beforeState: "DEGRADED",
  afterState: "CONTAINED",
  actionDigest: "sha256:" + "d".repeat(64),
  postActionTelemetryDigest: "sha256:" + "e".repeat(64),
  executedAt: observedAt,
  sourceExecutionVerified: true,
  authorityTransferOccurred: false
}];

const assessment = assessBuild412IncidentFusion({
  build411: {
    governanceState: "PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED"
  },
  telemetry,
  incidentSignals: signals,
  remediationReceipts: receipts,
  nowIso: "2026-11-16T22:10:00.000Z"
});

assert.equal(BUILD_412, 412);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_412_TELEMETRY_DIMENSIONS.length, 12);
assert.equal(BUILD_412_SUPERVISED_ACTIONS.length, 4);
assert.equal(assessment.counts.requiredTelemetryEvidence, 84);
assert.equal(
  assessment.governanceState,
  "SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED"
);
assert.equal(assessment.crossApplicationCorrelations.length, 1);
assert.deepEqual(
  new Set(assessment.crossApplicationCorrelations[0]?.appIds),
  new Set(["yw","icamp"])
);
assert.equal(assessment.policy.aiDataPlatformExecutesPeerRecovery, false);
assert.equal(assessment.policy.localOperationalAuthorityPreserved, true);
assert.equal(assessment.policy.commsAuthorityPreserved, true);
assert.equal(assessment.policy.productionGreenImpliesIncidentResolved, false);
assert.equal(assessment.policy.productionGreenImpliesPeerRecovered, false);

const approved = evaluateBuild412SupervisedAction({
  appId: "yw",
  action: "ROLLBACK",
  requesterRole: "owner",
  requesterUserId: "owner-a",
  reasonDigest: "sha256:" + "f".repeat(64),
  custodianUserId: "custodian-b",
  custodianReceiptVerified: true
});
assert.equal(approved.state, "AUTHORIZED_FOR_SOURCE_HANDOFF");
assert.equal(approved.aiDataPlatformExecutesPeerAction, false);

const selfCustody = evaluateBuild412SupervisedAction({
  appId: "icamp",
  action: "RECOVER",
  requesterRole: "owner",
  requesterUserId: "owner-a",
  reasonDigest: "sha256:" + "1".repeat(64),
  custodianUserId: "owner-a",
  custodianReceiptVerified: true
});
assert.equal(selfCustody.state, "HOLD_ADMINISTRATIVE_SEPARATION_REQUIRED");

const stale = assessBuild412IncidentFusion({
  build411: {
    governanceState: "PRIVILEGED_OPERATIONS_AND_SERVER_MODULE_CUSTODY_ASSURED"
  },
  telemetry,
  incidentSignals: signals,
  remediationReceipts: receipts,
  nowIso: "2026-11-16T23:00:00.000Z"
});
assert.equal(stale.governanceState, "SHARED_TELEMETRY_STALE");

const root = path.resolve(process.cwd(), "../..");
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const migration = source("db/migrations/0175_master_security_incident_fusion.sql");
for (const token of [
  "master_build412_telemetry_evidence",
  "master_build412_incident_signals",
  "master_build412_remediation_intents",
  "master_build412_remediation_receipts",
  "master_build412_incident_fusion_receipts",
  "force row level security",
  "master_b412_intent_owner_insert",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token missing: " + token);

const route = source("apps/web/app/api/security-incident-fusion/action/route.ts");
assert.ok(route.includes("requestBuild412SupervisedAction"));
assert.ok(route.includes("status: 202"));

const db = source("apps/web/lib/security-incident-fusion-database.ts");
assert.ok(db.includes("master_build411_custodian_receipts"));
assert.ok(db.includes("master_build412_remediation_intents"));
assert.ok(db.includes("current_master_sysop_role()"));
assert.ok(!db.includes("service_role"));
assert.ok(!db.includes("privateKey"));

const panel = source("apps/web/components/security-incident-fusion-panel.tsx");
for (const token of [
  "Build 412 · Security incident fusion",
  "Yard Workers slave shell",
  "iCamp slave shell",
  "CONTAIN","RECOVER","ROLLBACK","RESTART",
  "No peer recovery is claimed"
]) assert.ok(panel.includes(token), "panel token missing: " + token);

const incidentPage = source("apps/web/app/incident-runbook-recovery/page.tsx");
assert.ok(incidentPage.includes("SecurityIncidentFusionPanel"));
assert.ok(incidentPage.includes("summarizeBuild412FromRunbooks"));

const manifest = JSON.parse(
  source(".github/rosevear-security-incident-fusion.v1.json")
);
assert.equal(manifest.build, 412);
assert.equal(manifest.telemetryDimensions.length, 12);
assert.equal(manifest.supervisedActions.cloudDirectPeerMutationForbidden, true);
assert.equal(manifest.releaseBoundary.productionGreenImpliesIncidentResolved, false);

console.log(
  "Build 412 Cross-Application Security Incident Fusion, Containment, Recovery, Rollback & Shared Telemetry Assurance verification passed."
);
