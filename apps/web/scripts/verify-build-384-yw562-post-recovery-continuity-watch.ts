import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build383RuntimeContinuityIncidentLedgerModel } from "../lib/yw562-runtime-continuity-incident-ledger";
import {
  BUILD_384,
  BUILD_384_CONTROLLER_BASE_REVISION,
  composeBuild384PostRecoveryContinuityWatch
} from "../lib/yw562-post-recovery-continuity-watch";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_384, 384);
assert.equal(
  BUILD_384_CONTROLLER_BASE_REVISION,
  "b1a176044dca68c6ffec3f07f127b67d09aa3a6e"
);

const recovered = {
  connectionState: "CONNECTED",
  incidentLedgerState: "CLEAR"
} as unknown as Build383RuntimeContinuityIncidentLedgerModel;

const healthySamples = [
  "2026-11-13T01:30:00.000Z",
  "2026-11-13T01:35:00.000Z",
  "2026-11-13T01:40:00.000Z"
].map((observedAt, index) => ({
  sampleId: "sample-" + index,
  observedAt,
  connectionState: "CONNECTED" as const,
  renewalDriftState: "CURRENT" as const,
  incidentState: "CLEAR" as const,
  masterReceiptsHealthy: true
}));

const healthy = composeBuild384PostRecoveryContinuityWatch({
  build383: recovered,
  watchSamples: healthySamples,
  recurrenceEvents: [],
  now: new Date("2026-11-13T01:45:00.000Z")
});
assert.equal(healthy.watchState, "POST_RECOVERY_WATCH_HEALTHY");
assert.equal(healthy.recurrenceState, "NO_RECURRENCE_DETECTED");
assert.equal(healthy.preventionAuditState, "PREVENTION_CONTROLS_HEALTHY");
assert.equal(healthy.connectionState, "CONNECTED");

const recurrence = composeBuild384PostRecoveryContinuityWatch({
  build383: recovered,
  watchSamples: healthySamples,
  recurrenceEvents: [{
    recurrenceId: "recurrence-384",
    priorIncidentId: "incident-383",
    driftReason: "RENEWAL_EXPIRED",
    detectedAt: "2026-11-13T01:44:00.000Z",
    threeMasterAcknowledged: false,
    preventionActionVerified: false
  }],
  now: new Date("2026-11-13T01:45:00.000Z")
});
assert.equal(recurrence.recurrenceDetected, true);
assert.equal(recurrence.recurrenceState, "RECURRENCE_ESCALATION_REQUIRED");
assert.equal(recurrence.preventionAuditState, "RECURRENCE_PREVENTION_REQUIRED");
assert.equal(recurrence.connectionState, "DISCONNECTED_HOLD");

const migration = source(
  "../../db/migrations/0148_master_yw562_post_recovery_continuity_watch.sql"
);
for (const token of [
  "master_build384_post_recovery_watch_samples",
  "master_build384_recurrent_drift_events",
  "master_build384_recurrence_prevention_audits",
  "RECURRENCE_PREVENTION_VERIFIED",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build384_post_recovery_watch_samples"',
  '"master_build384_recurrent_drift_events"',
  '"master_build384_recurrence_prevention_audits"',
  '"0148_master_yw562_post_recovery_continuity_watch.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-384-yw562-post-recovery-continuity-watch.ts";
assert.equal(String(pkg.scripts["verify:build384"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 384 Post-Recovery Continuity Watch, Recurrent Drift Detection & Three-Master Incident Recurrence Prevention Audit verification passed."
);
