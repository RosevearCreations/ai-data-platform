import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Build390ThemeAdoptionCertification } from "../lib/master-theme-adoption-certification";
import {
  BUILD_391_THEME_VERSION,
  assessBuild391ThemeDriftGovernance
} from "../lib/master-theme-drift-governance";
import {
  BUILD_392,
  BUILD_392_THEME_VERSION,
  assessBuild392VisualGovernanceRemediation
} from "../lib/master-visual-governance-remediation";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

assert.equal(BUILD_392, 392);
assert.equal(BUILD_392_THEME_VERSION, "rosevear-master-instrument.v1");

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
  observedAt: "2026-11-13T18:20:00.000Z",
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
    observedAt: "2026-11-13T18:20:00.000Z",
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: true
  },
  {
    observationId: "icamp-responsive",
    shellId: "icamp" as const,
    observedAt: "2026-11-13T18:20:00.000Z",
    desktopAccepted: true,
    tabletAccepted: true,
    mobileAccepted: true
  }
];

const build391Drift = assessBuild391ThemeDriftGovernance({
  build390: certified390,
  themeObservations: themeObservations.map((item) =>
    item.shellId === "icamp"
      ? { ...item, themeVersion: "rosevear-master-instrument.v0" }
      : item
  ),
  responsiveObservations
});
assert.equal(build391Drift.governanceState, "THEME_DRIFT_DETECTED");

const missingRoute = assessBuild392VisualGovernanceRemediation({
  build391: build391Drift,
  now: "2026-11-13T19:00:00.000Z"
});
assert.equal(missingRoute.governanceState, "EXCEPTION_ROUTING_REQUIRED");
assert.deepEqual(missingRoute.missingRoutedShells, ["icamp"]);

const routedException = {
  exceptionId: "exception-icamp-1",
  shellId: "icamp" as const,
  source: "THEME_DRIFT" as const,
  detectedAt: "2026-11-13T18:20:00.000Z",
  dueAt: "2026-11-13T20:20:00.000Z",
  ownerAssigned: true,
  routingState: "ROUTED" as const,
  remediationState: "IN_REMEDIATION" as const
};

const inProgress = assessBuild392VisualGovernanceRemediation({
  build391: build391Drift,
  exceptions: [routedException],
  now: "2026-11-13T19:00:00.000Z"
});
assert.equal(inProgress.governanceState, "REMEDIATION_IN_PROGRESS");

const breached = assessBuild392VisualGovernanceRemediation({
  build391: build391Drift,
  exceptions: [routedException],
  now: "2026-11-13T21:00:00.000Z"
});
assert.equal(breached.governanceState, "REMEDIATION_SLA_BREACH");
assert.deepEqual(breached.overdueShells, ["icamp"]);

const resolvedException = {
  ...routedException,
  remediationState: "RESOLVED" as const
};
const needsRecertification = assessBuild392VisualGovernanceRemediation({
  build391: build391Drift,
  exceptions: [resolvedException],
  now: "2026-11-13T19:00:00.000Z"
});
assert.equal(needsRecertification.governanceState, "RECERTIFICATION_REQUIRED");

const recertified = assessBuild392VisualGovernanceRemediation({
  build391: build391Drift,
  exceptions: [resolvedException],
  recertificationAudits: [{
    auditId: "audit-icamp-1",
    exceptionId: resolvedException.exceptionId,
    shellId: "icamp",
    observedAt: "2026-11-13T18:50:00.000Z",
    themeVersion: BUILD_392_THEME_VERSION,
    themeContractRestored: true,
    responsiveParityRestored: true,
    ownerAccepted: true,
    independentlyVerified: true,
    recertificationState: "RECERTIFIED"
  }],
  now: "2026-11-13T19:00:00.000Z"
});
assert.equal(recertified.governanceState, "VISUAL_GOVERNANCE_RECERTIFIED");

const build391Closed = assessBuild391ThemeDriftGovernance({
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
const stable = assessBuild392VisualGovernanceRemediation({
  build391: build391Closed,
  now: "2026-11-13T19:00:00.000Z"
});
assert.equal(stable.governanceState, "VISUAL_GOVERNANCE_STABLE");

const migration = source(
  "../../db/migrations/0155_master_visual_governance_remediation_recertification.sql"
);
for (const token of [
  "master_build392_visual_governance_exceptions",
  "master_build392_remediation_sla_events",
  "master_build392_recertification_audits",
  "RECERTIFIED",
  "rosevear-master-instrument.v1",
  "force row level security",
  "ai_data_protected_runtime",
  "revoke update,delete"
]) assert.ok(migration.includes(token), "migration token " + token);

const docs = source("../../docs/BUILD_392_VISUAL_GOVERNANCE_REMEDIATION_RECERTIFICATION.md");
for (const token of [
  "Every shell detected by Build 391",
  "explicit SLA breach",
  "responsive parity is restored",
  "owner accepts the remediation",
  "Deployment success cannot resolve a visual exception"
]) assert.ok(docs.includes(token), "documentation token " + token);

const masterPage = source("app/master-suite/page.tsx");
assert.ok(masterPage.includes("Build 392 remediation governance"));
assert.ok(masterPage.includes("Re-certification gate"));

const spine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"master_build392_visual_governance_exceptions"',
  '"master_build392_remediation_sla_events"',
  '"master_build392_recertification_audits"',
  '"0155_master_visual_governance_remediation_recertification.sql"'
]) assert.ok(spine.includes(token), "spine token " + token);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-392-visual-governance-remediation-recertification.ts";
assert.equal(String(pkg.scripts["verify:build392"]), command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));

console.log(
  "Build 392 Visual-Governance Exception Routing, Remediation SLA Tracking & Cross-Shell Re-Certification Audit verification passed."
);
