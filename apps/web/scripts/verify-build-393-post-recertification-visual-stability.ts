import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build392VisualGovernanceRemediation } from "../lib/master-visual-governance-remediation";
import {
  BUILD_393,
  BUILD_393_THEME_VERSION,
  assessBuild393PostRecertificationStability
} from "../lib/master-post-recertification-visual-stability";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_393, 393);
assert.equal(BUILD_393_THEME_VERSION, "rosevear-master-instrument.v1");

const build392Recertified = {
  governanceState: "VISUAL_GOVERNANCE_RECERTIFIED"
} as unknown as Build392VisualGovernanceRemediation;

const samples = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
].map((shellId) => ({
  sampleId: "sample-" + shellId,
  shellId: shellId as
    | "ai-data-platform"
    | "rosevear-comms-hub"
    | "rosevear-ai-hub"
    | "yw"
    | "icamp",
  observedAt: "2026-11-13T19:20:00.000Z",
  themeVersion: BUILD_393_THEME_VERSION,
  navigationStable: true,
  instrumentKpisStable: true,
  semanticStatusesStable: true,
  authorityBoundaryStable: true,
  responsiveParityStable: true,
  independentlyObserved: true
}));

const incomplete = assessBuild393PostRecertificationStability({
  build392: build392Recertified
});
assert.equal(incomplete.governanceState, "STABILITY_EVIDENCE_INCOMPLETE");
assert.equal(incomplete.missingStabilityShells.length, 5);

const recurrent = assessBuild393PostRecertificationStability({
  build392: build392Recertified,
  stabilitySamples: samples.map((sample) =>
    sample.shellId === "icamp"
      ? { ...sample, themeVersion: "rosevear-master-instrument.v0" }
      : sample
  )
});
assert.equal(recurrent.governanceState, "DRIFT_RECURRENCE_DETECTED");
assert.deepEqual(recurrent.recurrentDriftShells, ["icamp"]);

const needsEffectiveness = assessBuild393PostRecertificationStability({
  build392: build392Recertified,
  stabilitySamples: samples,
  remediatedShells: ["icamp"]
});
assert.equal(
  needsEffectiveness.governanceState,
  "REMEDIATION_EFFECTIVENESS_REQUIRED"
);

const ineffective = assessBuild393PostRecertificationStability({
  build392: build392Recertified,
  stabilitySamples: samples,
  remediatedShells: ["icamp"],
  effectivenessReviews: [{
    reviewId: "review-icamp-1",
    shellId: "icamp",
    observedAt: "2026-11-13T19:30:00.000Z",
    stableWindowHours: 2,
    recurrenceDetected: true,
    preventiveControlsEffective: false,
    ownerReviewed: true,
    independentlyVerified: true,
    reviewState: "INEFFECTIVE"
  }]
});
assert.equal(ineffective.governanceState, "REMEDIATION_EFFECTIVENESS_FAILED");

const needsAudit = assessBuild393PostRecertificationStability({
  build392: build392Recertified,
  stabilitySamples: samples,
  remediatedShells: ["icamp"],
  effectivenessReviews: [{
    reviewId: "review-icamp-2",
    shellId: "icamp",
    observedAt: "2026-11-13T19:30:00.000Z",
    stableWindowHours: 2,
    recurrenceDetected: false,
    preventiveControlsEffective: true,
    ownerReviewed: true,
    independentlyVerified: true,
    reviewState: "EFFECTIVE"
  }]
});
assert.equal(needsAudit.governanceState, "RECURRENCE_PREVENTION_AUDIT_REQUIRED");

const verified = assessBuild393PostRecertificationStability({
  build392: build392Recertified,
  stabilitySamples: samples,
  remediatedShells: ["icamp"],
  effectivenessReviews: [{
    reviewId: "review-icamp-3",
    shellId: "icamp",
    observedAt: "2026-11-13T19:30:00.000Z",
    stableWindowHours: 2,
    recurrenceDetected: false,
    preventiveControlsEffective: true,
    ownerReviewed: true,
    independentlyVerified: true,
    reviewState: "EFFECTIVE"
  }],
  recurrenceAudits: [{
    auditId: "audit-all-shells-1",
    observedAt: "2026-11-13T19:40:00.000Z",
    allFiveShellsCovered: true,
    noUnresolvedRecurrence: true,
    preventiveControlsVerified: true,
    ownerAccepted: true,
    independentlyVerified: true,
    auditState: "VERIFIED"
  }]
});
assert.equal(
  verified.governanceState,
  "POST_RECERTIFICATION_STABILITY_VERIFIED"
);

const build392Open = {
  governanceState: "REMEDIATION_IN_PROGRESS"
} as unknown as Build392VisualGovernanceRemediation;
const held = assessBuild393PostRecertificationStability({
  build392: build392Open,
  stabilitySamples: samples
});
assert.equal(held.governanceState, "HOLD_BUILD392_NOT_STABLE");

const migration = source(
  "../../db/migrations/0156_master_post_recertification_visual_stability.sql"
);
for (const token of [
  "master_build393_visual_stability_samples",
  "master_build393_remediation_effectiveness_reviews",
  "master_build393_drift_recurrence_prevention_audits",
  "RECURRENT_DRIFT",
  "EFFECTIVE",
  "VERIFIED",
  "rosevear-master-instrument.v1",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source("../../docs/BUILD_393_POST_RECERTIFICATION_VISUAL_STABILITY.md");
for (const token of [
  "All five governed shells",
  "fresh effectiveness review",
  "after the newest stability sample",
  "owner acceptance plus independent verification",
  "Deployment GREEN cannot prove post-recertification visual stability"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 393 stability governance"));
assert.ok(masterPage.includes("Recurrence prevention"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build393_visual_stability_samples"',
  '"master_build393_remediation_effectiveness_reviews"',
  '"master_build393_drift_recurrence_prevention_audits"',
  '"0156_master_post_recertification_visual_stability.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-393-post-recertification-visual-stability.ts";
assert.equal(String(pkg.scripts["verify:build393"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 393 Post-Re-Certification Visual Stability Monitoring, Remediation Effectiveness & Cross-Shell Drift Recurrence Prevention Audit verification passed."
);
