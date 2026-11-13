import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build382RuntimeRenewalDriftContinuityModel } from "../lib/yw562-runtime-renewal-drift-continuity";
import {
  BUILD_383,
  BUILD_383_CONTROLLER_BASE_REVISION,
  composeBuild383RuntimeContinuityIncidentLedger
} from "../lib/yw562-runtime-continuity-incident-ledger";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_383, 383);
assert.equal(
  BUILD_383_CONTROLLER_BASE_REVISION,
  "a364c042b6142754387d268eb28869de2fd1d84e"
);

const healthy382 = {
  renewalDriftState: "CURRENT",
  connectionState: "CONNECTED"
} as unknown as Build382RuntimeRenewalDriftContinuityModel;

const clear = composeBuild383RuntimeContinuityIncidentLedger({
  build382: healthy382,
  incidents: [],
  now: new Date("2026-11-13T01:00:00.000Z")
});
assert.equal(clear.incidentLedgerState, "CLEAR");
assert.equal(clear.connectionState, "CONNECTED");

const drift382 = {
  renewalDriftState: "DRIFT_DETECTED",
  connectionState: "DISCONNECTED_HOLD"
} as unknown as Build382RuntimeRenewalDriftContinuityModel;

const missing = composeBuild383RuntimeContinuityIncidentLedger({
  build382: drift382,
  incidents: [],
  now: new Date("2026-11-13T01:00:00.000Z")
});
assert.equal(missing.incidentLedgerState, "INCIDENT_REQUIRED");
assert.equal(missing.connectionState, "DISCONNECTED_HOLD");

const tracked = composeBuild383RuntimeContinuityIncidentLedger({
  build382: drift382,
  incidents: [{
    incidentId: "incident-383",
    driftReason: "RENEWAL_EXPIRED",
    openedAt: "2026-11-13T00:40:00.000Z",
    lastRecoveryAttemptAt: "2026-11-13T00:50:00.000Z",
    recoveredAt: null,
    closureEvidenceVerified: false,
    masterAcknowledgements: ["rosevear-ai-hub"]
  }],
  now: new Date("2026-11-13T01:00:00.000Z")
});
assert.equal(tracked.incidentLedgerState, "OPEN_INCIDENT_TRACKED");
assert.equal(tracked.recoveryAgingState, "BREACHED");
assert.equal(tracked.driftEscalationState, "ESCALATION_REQUIRED");
assert.equal(tracked.threeMasterAcknowledged, false);

const migration = source(
  "../../db/migrations/0147_master_yw562_runtime_continuity_incident_ledger.sql"
);
for (const token of [
  "master_build383_runtime_continuity_incidents",
  "master_build383_drift_escalation_events",
  "master_build383_incident_closure_events",
  "CLOSED_VERIFIED",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build383_runtime_continuity_incidents"',
  '"master_build383_drift_escalation_events"',
  '"master_build383_incident_closure_events"',
  '"0147_master_yw562_runtime_continuity_incident_ledger.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-383-yw562-runtime-continuity-incident-ledger.ts";
assert.equal(String(pkg.scripts["verify:build383"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 383 Runtime Continuity Incident Ledger, Renewal Recovery Aging & Three-Master Drift Escalation Closure verification passed."
);
