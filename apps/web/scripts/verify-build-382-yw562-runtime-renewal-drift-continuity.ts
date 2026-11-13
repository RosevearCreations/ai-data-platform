import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build381ReceiverHealthContinuityModel } from "../lib/yw562-receiver-health-continuity";
import {
  BUILD_382,
  BUILD_382_CONTROLLER_BASE_REVISION,
  composeBuild382RuntimeRenewalDriftContinuity
} from "../lib/yw562-runtime-renewal-drift-continuity";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_382, 382);
assert.equal(
  BUILD_382_CONTROLLER_BASE_REVISION,
  "3d73fecb47b2933b71c0b2b866a38a14ead475db"
);

const renewal = {
  renewalEventId: "55555555-5555-4555-8555-555555555555",
  sourceRevision: "6e0b77eebcfc77aa7fc48dcc398da958af8df696",
  aiHubMain: "dbc3fd8ae7f8df3bfc85a402a00b0954648ec543",
  commsMain: "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7",
  originalHostId: "DESKTOP-AE894KC",
  aiHubRuntimeReceiptId: "aih-381",
  aiHubRuntimeDigest: "1".repeat(64),
  aiHubSignerKeyId: "aih-key",
  commsRuntimeReceiptId: "comms-381",
  commsRuntimeDigest: "2".repeat(64),
  commsSignerKeyId: "comms-key",
  controllerRuntimeReceiptId: "aidp-381",
  controllerRuntimeDigest: "3".repeat(64),
  controllerSignerKeyId: "aidp-key",
  validUntil: "2026-11-12T23:10:00.000Z"
};

const connected381 = {
  latestRenewal: renewal,
  receiverHealthContinuityState: "HEALTHY_RENEWED_CURRENT",
  threeMasterConnectedRevalidationState: "CONNECTED_REVALIDATED",
  rollbackState: "NO_ROLLBACK_REQUIRED",
  connectionState: "CONNECTED",
  mastersSynced: true
} as unknown as Build381ReceiverHealthContinuityModel;

const current = composeBuild382RuntimeRenewalDriftContinuity({
  build381: connected381,
  now: new Date("2026-11-12T23:09:00.000Z")
});
assert.equal(current.renewalDriftState, "CURRENT");
assert.equal(current.driftReason, "NONE");
assert.equal(current.failClosedRecoveryValidationState, "NOT_REQUIRED");
assert.equal(
  current.threeMasterContinuityState,
  "CONNECTED_CONTINUITY_VERIFIED"
);
assert.equal(current.connectionState, "CONNECTED");
assert.equal(current.mastersSynced, true);

const expired381 = {
  ...connected381,
  receiverHealthContinuityState: "ROLLBACK_REQUIRED_HEALTH_EXPIRED",
  threeMasterConnectedRevalidationState: "HOLD_RECEIVER_HEALTH",
  rollbackState: "ROLLBACK_REQUIRED_FAIL_CLOSED",
  connectionState: "DISCONNECTED_HOLD",
  mastersSynced: false
} as unknown as Build381ReceiverHealthContinuityModel;

const expired = composeBuild382RuntimeRenewalDriftContinuity({
  build381: expired381,
  now: new Date("2026-11-12T23:11:00.000Z")
});
assert.equal(expired.renewalDriftState, "DRIFT_DETECTED");
assert.equal(expired.driftReason, "RENEWAL_EXPIRED");
assert.equal(
  expired.failClosedRecoveryValidationState,
  "FAIL_CLOSED_REQUIRED"
);
assert.equal(expired.connectionState, "DISCONNECTED_HOLD");

const rolledBack381 = {
  ...expired381,
  rollbackState: "ROLLED_BACK_VERIFIED"
} as unknown as Build381ReceiverHealthContinuityModel;
const rolledBack = composeBuild382RuntimeRenewalDriftContinuity({
  build381: rolledBack381,
  now: new Date("2026-11-12T23:11:00.000Z")
});
assert.equal(
  rolledBack.failClosedRecoveryValidationState,
  "FAIL_CLOSED_RECOVERY_VERIFIED"
);
assert.equal(
  rolledBack.threeMasterContinuityState,
  "DISCONNECTED_FAIL_CLOSED_VERIFIED"
);
assert.equal(rolledBack.connectionState, "DISCONNECTED_HOLD");
assert.equal(rolledBack.mastersSynced, false);

const missing = composeBuild382RuntimeRenewalDriftContinuity({
  build381: {
    ...expired381,
    latestRenewal: null
  } as unknown as Build381ReceiverHealthContinuityModel,
  now: new Date("2026-11-12T23:11:00.000Z")
});
assert.equal(missing.driftReason, "RENEWAL_MISSING");
assert.equal(missing.connectionState, "DISCONNECTED_HOLD");

const migration = source(
  "../../db/migrations/0146_master_yw562_runtime_renewal_drift_continuity.sql"
);
for (const token of [
  "master_build382_runtime_continuity_audits",
  "DRIFT_DETECTED",
  "FAIL_CLOSED_REQUIRED",
  "FAIL_CLOSED_RECOVERY_VERIFIED",
  "CONNECTED_CONTINUITY_VERIFIED",
  "DISCONNECTED_FAIL_CLOSED_VERIFIED",
  "force row level security",
  "for insert to ai_data_protected_runtime",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), `migration token ${token}`);
}

const spine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(spine.includes('"master_build382_runtime_continuity_audits"'));
assert.ok(
  spine.includes('"0146_master_yw562_runtime_renewal_drift_continuity.sql"')
);

const documentation = source(
  "../../docs/BUILD_382_YW562_RUNTIME_RENEWAL_DRIFT_CONTINUITY.md"
);
assert.ok(documentation.includes("Runtime drift cannot extend CONNECTED state."));
assert.ok(documentation.includes("append-only Build 382 continuity audit"));

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-382-yw562-runtime-renewal-drift-continuity.ts";
assert.equal(String(pkg.scripts["verify:build382"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(command) <
    String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 382 Protected Runtime Renewal Drift Detection, Automatic Fail-Closed Recovery Validation & Three-Master CONNECTED Continuity Audit verification passed."
);
