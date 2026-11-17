import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { BUILD_405_APPLICATION_IDS } from "../lib/master-assurance-renewal-security-comms-recertification";
import { MASTER_COMPLETION_AXES } from "../lib/master-completion-core";
import {
  BUILD_413,
  BUILD_413_ACCEPTANCE_DIMENSIONS,
  BUILD_413_MIN_ADVANCEMENT_POINTS,
  evaluateBuild413Acceptance,
  type Build413AcceptanceEvidence,
  type Build413CompletionAdvancementEvidence,
  type Build413ThemeSelectionEvidence
} from "../lib/master-acceptance-advancement";

const observedAt = "2026-11-17T00:00:00.000Z";
const expiresAt = "2026-11-17T01:00:00.000Z";
const hash = "a".repeat(64);

const acceptance: Build413AcceptanceEvidence[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    BUILD_413_ACCEPTANCE_DIMENSIONS.map((dimension) => ({
      evidenceId: "b413-accept-" + appId + "-" + dimension.toLowerCase(),
      appId,
      dimension,
      state: "PASS",
      acceptancePercent: 95,
      criticalFailureCount: 0,
      evidenceDigest: "sha256:" + "b".repeat(64),
      observedAt,
      expiresAt,
      ownerReviewed: true,
      independentlyVerified: true
    }))
  );

const completion: Build413CompletionAdvancementEvidence[] =
  BUILD_405_APPLICATION_IDS.flatMap((appId) =>
    MASTER_COMPLETION_AXES.map((axis, index) => {
      const baselinePercent = index === 0 ? 95 : 70;
      const targetPercent = Math.min(100, baselinePercent + 10);
      return {
        evidenceId: "b413-progress-" + appId + "-" + axis,
        appId,
        axis,
        baselinePercent,
        targetPercent,
        observedPercent: targetPercent,
        denominatorHash: hash,
        baselineDenominatorHash: hash,
        evidenceDigest: "sha256:" + "c".repeat(64),
        observedAt,
        expiresAt,
        ownerReviewed: true,
        independentlyVerified: true,
        state: "ADVANCED" as const
      };
    })
  );

const themes: Build413ThemeSelectionEvidence[] = [
  {
    selectionId: "theme-ai-data",
    moduleId: "ai-data-platform",
    profileId: "night-ops",
    backgroundSlot: "data-grid-01",
    semanticStatusMeaningImmutable: true,
    securityStateVisible: true,
    ownerUserId: "owner",
    selectedAt: observedAt
  },
  {
    selectionId: "theme-ai-hub",
    moduleId: "rosevear-ai-hub",
    profileId: "copper-workshop",
    backgroundSlot: "automation-workshop-01",
    semanticStatusMeaningImmutable: true,
    securityStateVisible: true,
    ownerUserId: "owner",
    selectedAt: observedAt
  },
  {
    selectionId: "theme-comms",
    moduleId: "rosevear-comms-hub",
    profileId: "meadow-grid",
    backgroundSlot: "comms-grid-01",
    semanticStatusMeaningImmutable: true,
    securityStateVisible: true,
    ownerUserId: "owner",
    selectedAt: observedAt
  }
];

const assessment = evaluateBuild413Acceptance({
  build412: { governanceState: "SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED" },
  acceptanceEvidence: acceptance,
  completionEvidence: completion,
  themeSelections: themes,
  nowIso: "2026-11-17T00:30:00.000Z"
});

assert.equal(BUILD_413, 413);
assert.equal(BUILD_413_MIN_ADVANCEMENT_POINTS, 10);
assert.equal(BUILD_405_APPLICATION_IDS.length, 7);
assert.equal(BUILD_413_ACCEPTANCE_DIMENSIONS.length, 5);
assert.equal(MASTER_COMPLETION_AXES.length, 7);
assert.equal(assessment.counts.requiredAcceptanceEvidence, 35);
assert.equal(assessment.counts.requiredCompletionAdvancementEvidence, 49);
assert.equal(assessment.counts.serverModules, 3);
assert.equal(assessment.counts.themeProfiles, 3);
assert.equal(
  assessment.governanceState,
  "SEVEN_APPLICATION_ACCEPTANCE_AND_ADVANCEMENT_ASSURED"
);
assert.equal(assessment.policy.deploymentGreenMayAdvance, false);
assert.equal(assessment.policy.missingEvidenceMayAdvance, false);
assert.equal(assessment.policy.staleEvidenceMayAdvance, false);
assert.equal(assessment.policy.denominatorMustRemainLocked, true);
assert.equal(assessment.policy.semanticStatusMeaningImmutable, true);
assert.equal(assessment.policy.themeMayHideSecurityState, false);

const changedDenominator = completion.map((item, index) =>
  index === 0 ? { ...item, denominatorHash: "d".repeat(64) } : item
);
const held = evaluateBuild413Acceptance({
  build412: { governanceState: "SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED" },
  acceptanceEvidence: acceptance,
  completionEvidence: changedDenominator,
  themeSelections: themes,
  nowIso: "2026-11-17T00:30:00.000Z"
});
assert.equal(held.governanceState, "COMPLETION_ADVANCEMENT_NOT_PROVEN");

const stale = evaluateBuild413Acceptance({
  build412: { governanceState: "SECURITY_INCIDENT_FUSION_AND_RECOVERY_ASSURED" },
  acceptanceEvidence: acceptance,
  completionEvidence: completion,
  themeSelections: themes,
  nowIso: "2026-11-17T02:00:00.000Z"
});
assert.equal(stale.governanceState, "ACCEPTANCE_EVIDENCE_STALE");

const root = path.resolve(process.cwd(), "../..");
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const migration = source("db/migrations/0176_master_acceptance_advancement.sql");
for (const token of [
  "master_build413_acceptance_evidence",
  "master_build413_completion_advancement_evidence",
  "master_build413_theme_selection_events",
  "force row level security",
  "master_b413_theme_owner_insert",
  "ai_data_protected_runtime",
  "revoke update,delete",
  "baseline_percent + 10",
  "denominator_hash = baseline_denominator_hash"
]) assert.ok(migration.includes(token), "migration token missing: " + token);

const page = source("apps/web/app/acceptance-advancement/page.tsx");
for (const token of [
  "Build 413 · Seven-Application Acceptance",
  "Role, Device, Accessibility, Performance &amp; UX Advancement",
  "Evidence advancement is not simulated.",
  "Yard Workers and iCamp futuristic acceptance panels",
  "ServerShellThemeAcceptancePanel"
]) assert.ok(page.includes(token), "page token missing: " + token);

const themePanel = source("apps/web/components/server-shell-theme-acceptance-panel.tsx");
for (const token of [
  "Night Ops",
  "Copper Workshop",
  "Meadow Grid",
  "security and health status meaning stays fixed",
  "/api/acceptance-advancement/theme"
]) assert.ok(themePanel.includes(token), "theme panel token missing: " + token);

const route = source("apps/web/app/api/acceptance-advancement/theme/route.ts");
assert.ok(route.includes("recordBuild413ThemeSelection"));
assert.ok(route.includes("status: 201"));

const database = source("apps/web/lib/build413-acceptance-database.ts");
assert.ok(database.includes("current_master_sysop_role()"));
assert.ok(database.includes("master_build413_theme_selection_events"));
assert.ok(database.includes('role !== "owner"'));

const manifest = JSON.parse(
  source(".github/rosevear-build413-acceptance-advancement.v1.json")
);
assert.equal(manifest.build, 413);
assert.equal(manifest.applications.length, 7);
assert.equal(manifest.acceptanceDimensions.length, 5);
assert.equal(manifest.completionAxes.length, 7);
assert.equal(manifest.policy.minimumAdvancementPoints, 10);
assert.equal(manifest.policy.deploymentGreenMayAdvance, false);

const overlay = source("docs/SERVER_SHELL_CONVERGENCE_410_414.md");
assert.ok(overlay.includes("Implemented in Build 413"));

console.log(
  "Build 413 Seven-Application Role/Device/Accessibility/Performance/UX Acceptance & +10-Point Evidence Advancement verification passed."
);
