import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build386MultiHorizonStabilityBaselineModel } from "../lib/yw562-multi-horizon-stability-baseline";
import {
  BUILD_387,
  BUILD_387_CONTROLLER_BASE_REVISION,
  composeBuild387EarlyWarningRecovery
} from "../lib/yw562-early-warning-recovery";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_387, 387);
assert.equal(
  BUILD_387_CONTROLLER_BASE_REVISION,
  "e5a3e1a253c8746cbf096ec6d03f67f2f1aff899"
);

const warning386 = {
  earlyWarningState: "EARLY_WARNING_ACTIVE",
  baselineHealthy: false,
  connectionState: "DISCONNECTED_HOLD"
} as unknown as Build386MultiHorizonStabilityBaselineModel;

const recovered = composeBuild387EarlyWarningRecovery({
  build386: warning386,
  recoveryObservations: [{
    observationId: "recovery-387",
    observedAt: "2026-11-13T03:40:00.000Z",
    warningState: "CLEAR",
    remediationState: "VERIFIED",
    baselineRestored: true,
    aiHubAcknowledged: true,
    commsAcknowledged: true,
    controllerAcknowledged: true
  }],
  remediationReviews: [{
    remediationId: "remediation-387",
    controlId: "renewal-drift-prevention",
    previousScore: 0.92,
    restoredScore: 0.97,
    independentlyVerified: true
  }]
});
assert.equal(recovered.recoveryState, "RECOVERY_VERIFIED");
assert.equal(recovered.remediationEffective, true);
assert.equal(recovered.allThreeMastersAcknowledged, true);
assert.equal(recovered.baselineRestorationState, "MULTI_HORIZON_BASELINE_RESTORED");
assert.equal(recovered.warningClosureState, "WARNING_CLOSED");

const incomplete = composeBuild387EarlyWarningRecovery({
  build386: warning386,
  recoveryObservations: [{
    observationId: "recovery-incomplete",
    observedAt: "2026-11-13T03:40:00.000Z",
    warningState: "EARLY_WARNING_ACTIVE",
    remediationState: "IN_PROGRESS",
    baselineRestored: false,
    aiHubAcknowledged: true,
    commsAcknowledged: false,
    controllerAcknowledged: true
  }],
  remediationReviews: []
});
assert.equal(incomplete.recoveryState, "RECOVERY_IN_PROGRESS");
assert.equal(incomplete.warningClosureState, "WARNING_OPEN");
assert.equal(incomplete.connectionState, "DISCONNECTED_HOLD");

const migration = source("../../db/migrations/0151_master_yw562_early_warning_recovery.sql");
for (const token of [
  "master_build387_early_warning_recovery_observations",
  "master_build387_remediation_effectiveness_reviews",
  "master_build387_baseline_restoration_audits",
  "REMEDIATION_EFFECTIVE",
  "MULTI_HORIZON_BASELINE_RESTORED",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const css = source("app/master-instrument-shell.css");
for (const token of [
  ".masterInstrumentShell",
  "--instrument-purple",
  "--instrument-green",
  "--instrument-amber",
  "--instrument-red",
  ".commandMetrics",
  ".reviewBatchSummary",
  "@media (max-width: 620px)"
]) assert.ok(css.includes(token), "instrument theme token " + token);

const layout = source("app/layout.tsx");
assert.ok(layout.includes('import "./master-instrument-shell.css";'));

for (const page of [
  "app/master-shell-command-center/page.tsx",
  "app/master-sysop/page.tsx",
  "app/source-shell-onboarding/page.tsx",
  "app/comms-complementary-plane/page.tsx",
  "app/cross-application-control-center/page.tsx",
  "app/master-security-certification/page.tsx",
  "app/master-production-readiness/page.tsx"
]) {
  assert.ok(
    source(page).includes("masterInstrumentShell"),
    page + " does not apply the shared instrument shell"
  );
}

const uiContract = source("../../docs/MASTER_SHELL_INSTRUMENT_UI_SYSTEM.md");
for (const token of [
  "AI Data Platform Master Shell",
  "Rosevear Comms Hub",
  "Rosevear AI Hub",
  "Yard Workers platform shell",
  "iCamp platform shell",
  "deep navy",
  "KPI instrument strip",
  "fail-closed"
]) assert.ok(uiContract.includes(token), "UI contract token " + token);

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build387_early_warning_recovery_observations"',
  '"master_build387_remediation_effectiveness_reviews"',
  '"master_build387_baseline_restoration_audits"',
  '"0151_master_yw562_early_warning_recovery.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-387-yw562-early-warning-recovery.ts";
assert.equal(String(pkg.scripts["verify:build387"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 387 Early-Warning Recovery Tracking, Degradation Remediation Effectiveness, Multi-Horizon Baseline Restoration & Master Shell Instrument UI verification passed."
);
