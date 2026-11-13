import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build390ThemeAdoptionCertification } from "../lib/master-theme-adoption-certification";
import {
  BUILD_391,
  BUILD_391_THEME_VERSION,
  assessBuild391ThemeDriftGovernance
} from "../lib/master-theme-drift-governance";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_391, 391);
assert.equal(BUILD_391_THEME_VERSION, "rosevear-master-instrument.v1");

const certified390 = {
  certificationState: "CERTIFIED"
} as unknown as Build390ThemeAdoptionCertification;

const themeObservations = [
  "ai-data-platform",
  "rosevear-comms-hub",
  "rosevear-ai-hub",
  "yw",
  "icamp"
].map((shellId) => ({
  observationId: "theme-" + shellId,
  shellId: shellId as
    | "ai-data-platform"
    | "rosevear-comms-hub"
    | "rosevear-ai-hub"
    | "yw"
    | "icamp",
  observedAt: "2026-11-13T17:20:00.000Z",
  themeVersion: BUILD_391_THEME_VERSION,
  navigationAccepted: true,
  instrumentKpisAccepted: true,
  semanticStatusesAccepted: true,
  authorityBoundaryPreserved: true,
  independentlyObserved: true
}));

const responsiveObservations = [
  {
    observationId: "yw-responsive",
    shellId: "yw" as const,
    observedAt: "2026-11-13T17:20:00.000Z",
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: true
  },
  {
    observationId: "icamp-responsive",
    shellId: "icamp" as const,
    observedAt: "2026-11-13T17:20:00.000Z",
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: true
  }
];

const closed = assessBuild391ThemeDriftGovernance({
  build390: certified390,
  themeObservations,
  responsiveObservations,
  closureReview: {
    aiDataPlatformAcknowledged: true,
    commsHubAcknowledged: true,
    aiHubAcknowledged: true,
    ownerAccepted: true,
    independentlyVerified: true
  }
});
assert.equal(closed.governanceState, "VISUAL_GOVERNANCE_CLOSED_VERIFIED");
assert.equal(closed.driftedShells.length, 0);
assert.equal(closed.responsiveRegressionShells.length, 0);
assert.equal(closed.ywIcampResponsiveParity, true);

const drifted = assessBuild391ThemeDriftGovernance({
  build390: certified390,
  themeObservations: themeObservations.map((item) =>
    item.shellId === "icamp"
      ? { ...item, themeVersion: "rosevear-master-instrument.v0" }
      : item
  ),
  responsiveObservations,
  closureReview: {
    aiDataPlatformAcknowledged: true,
    commsHubAcknowledged: true,
    aiHubAcknowledged: true,
    ownerAccepted: true,
    independentlyVerified: true
  }
});
assert.equal(drifted.governanceState, "THEME_DRIFT_DETECTED");
assert.deepEqual(drifted.driftedShells, ["icamp"]);

const responsiveRegression = assessBuild391ThemeDriftGovernance({
  build390: certified390,
  themeObservations,
  responsiveObservations: responsiveObservations.map((item) =>
    item.shellId === "yw" ? { ...item, mobileAccepted: false } : item
  )
});
assert.equal(
  responsiveRegression.governanceState,
  "RESPONSIVE_PARITY_REGRESSION"
);
assert.deepEqual(responsiveRegression.responsiveRegressionShells, ["yw"]);

const migration = source(
  "../../db/migrations/0154_master_theme_drift_governance_closure.sql"
);
for (const token of [
  "master_build391_theme_drift_observations",
  "master_build391_responsive_parity_regressions",
  "master_build391_visual_governance_closure_audits",
  "CLOSED_VERIFIED",
  "rosevear-master-instrument.v1",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source("../../docs/BUILD_391_MASTER_THEME_DRIFT_GOVERNANCE_CLOSURE.md");
for (const token of [
  "all five governed shells",
  "desktop, tablet and mobile",
  "all acknowledge closure",
  "owner accepts closure",
  "Deployment GREEN cannot manufacture visual acceptance"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Theme governance"));
assert.ok(masterPage.includes("Responsive parity"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build391_theme_drift_observations"',
  '"master_build391_responsive_parity_regressions"',
  '"master_build391_visual_governance_closure_audits"',
  '"0154_master_theme_drift_governance_closure.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-391-master-theme-drift-governance-closure.ts";
assert.equal(String(pkg.scripts["verify:build391"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 391 Cross-Shell Theme Drift Monitoring, Responsive-Parity Regression Detection & Master Visual-Governance Closure Audit verification passed."
);
