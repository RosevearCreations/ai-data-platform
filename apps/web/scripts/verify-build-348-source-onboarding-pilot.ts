import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  SOURCE_ONBOARDING_PREREQUISITES,
  composeSourceOnboardingModel,
  summarizeSourceOnboarding,
  validateSourceOnboardingAssertions,
  validateSourceOnboardingRun,
  type SourceOnboardingAssertion,
  type SourceOnboardingRun
} from "../lib/source-onboarding-pilot-core";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const assertions = (
  outcome: "pass" | "fail" | "blocked" = "pass"
): SourceOnboardingAssertion[] =>
  SOURCE_ONBOARDING_PREREQUISITES.map((prerequisite) => ({
    prerequisite,
    outcome,
    evidenceURI: "urn:rosevear:evidence:" + prerequisite,
    detail: "Independent evidence for " + prerequisite + "."
  }));

function run(
  sourceId: SourceOnboardingRun["sourceId"],
  overrides: Partial<SourceOnboardingRun> = {}
): SourceOnboardingRun {
  return {
    runId: "run-" + sourceId.replace(/[^a-z0-9]/g, "") + "-001",
    sourceId,
    onboardingVersion: 1,
    reviewer: "Suite onboarding reviewer",
    observedAt: "2026-11-09T22:00:00.000Z",
    expiresAt: "2026-12-09T22:00:00.000Z",
    branch: "main",
    commitSha: "a".repeat(40),
    notes: null,
    pilotOutcome: "not-run",
    pilotStartedAt: null,
    pilotEndedAt: null,
    pilotEvidenceURI: null,
    pilotDetail: null,
    recordedAt: "2026-11-09T22:05:00.000Z",
    assertions: assertions(),
    ...overrides
  };
}

assert.deepEqual(SOURCE_ONBOARDING_PREREQUISITES, [
  "original-source-owned-evidence",
  "source-registry-readiness",
  "security-certification",
  "recovery-readiness",
  "rollback-readiness",
  "owner-pilot-authorization"
]);

assert.equal(validateSourceOnboardingAssertions(assertions()).length, 6);
assert.equal(
  summarizeSourceOnboarding(assertions(), "not-run").effectiveState,
  "READY_FOR_PILOT"
);
assert.equal(
  summarizeSourceOnboarding(assertions("blocked"), "not-run").effectiveState,
  "HOLD"
);
assert.equal(
  summarizeSourceOnboarding(assertions("fail"), "not-run").effectiveState,
  "FAIL"
);

const pilotPass = run("icamp", {
  pilotOutcome: "pass",
  pilotStartedAt: "2026-11-09T22:10:00.000Z",
  pilotEndedAt: "2026-11-09T22:20:00.000Z",
  pilotEvidenceURI: "urn:rosevear:evidence:icamp-pilot",
  pilotDetail: "Supervised production pilot observed and independently reviewed."
});
assert.equal(validateSourceOnboardingRun(pilotPass).pilotOutcome, "pass");

const blockedPrerequisites = assertions();
blockedPrerequisites[2] = { ...blockedPrerequisites[2], outcome: "blocked" };
assert.throws(
  () =>
    validateSourceOnboardingRun(
      run("yw", {
        assertions: blockedPrerequisites,
        pilotOutcome: "pass",
        pilotStartedAt: "2026-11-09T22:30:00.000Z",
        pilotEndedAt: "2026-11-09T22:40:00.000Z",
        pilotEvidenceURI: "urn:rosevear:evidence:invalid-pilot",
        pilotDetail: "Pilot must not run while a prerequisite is blocked."
      })
    ),
  /pilot_prerequisites_invalid/
);

const failedPrerequisites = assertions();
failedPrerequisites[0] = { ...failedPrerequisites[0], outcome: "fail" };

const model = composeSourceOnboardingModel({
  runs: [
    pilotPass,
    run("yw", { assertions: blockedPrerequisites }),
    run("rosiedazzlers", { assertions: failedPrerequisites }),
    run("devilndove", {
      observedAt: "2026-09-01T22:00:00.000Z",
      expiresAt: "2026-10-01T22:00:00.000Z"
    })
  ],
  now: new Date("2026-11-09T23:00:00.000Z")
});

assert.equal(model.build, 348);
assert.equal(model.summary.sources, 6);
assert.equal(model.summary.onboarded, 1);
assert.equal(model.summary.hold, 2);
assert.equal(model.summary.failed, 1);
assert.equal(model.summary.stale, 1);
assert.equal(model.summary.readyForPilot, 1);
assert.equal(model.policy.oneSourcePilotAtATime, true);
assert.equal(model.policy.missingEvidenceRetainsHold, true);
assert.equal(model.policy.onboardingIsConnectionActivation, false);
assert.equal(model.policy.deploymentGreenImpliesOnboarded, false);

const core = source("lib/source-onboarding-pilot-core.ts");
for (const token of [
  "SOURCE_ONBOARDING_BUILD = 348",
  '"original-source-owned-evidence"',
  '"source-registry-readiness"',
  '"security-certification"',
  '"recovery-readiness"',
  '"rollback-readiness"',
  '"owner-pilot-authorization"',
  "oneSourcePilotAtATime: true",
  "missingEvidenceRetainsHold: true",
  "onboardingIsConnectionActivation: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source("../../db/migrations/0126_master_source_onboarding_pilot.sql");
for (const token of [
  "master_source_onboarding_runs",
  "master_source_onboarding_assertions",
  "pilot_started_at",
  "pilot_ended_at",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.equal(
  (migration.match(/create table if not exists app\.master_source_onboarding_runs/g) ?? []).length,
  1
);
assert.equal(
  (migration.match(/create table if not exists app\.master_source_onboarding_assertions/g) ?? []).length,
  1
);
assert.ok(!migration.includes("\\n"));

const database = source("lib/source-onboarding-pilot-database.ts");
for (const token of [
  "recordSourceOnboardingRun",
  "listSourceOnboardingForUser",
  "master-source-onboarding-pilot",
  "source_onboarding_pilot_window_overlap",
  "TEST_VERIFIED",
  "CONNECTED",
  "source_onboarding_security_pass_not_supported",
  "listMasterSecurityCertificationForUser",
  "listMasterShellSourceRegistryForUser"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.master_source_onboarding",
  "delete from app.master_source_onboarding",
  "fetch("
]) {
  assert.ok(!database.includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/source-onboarding-pilot/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(api.includes("export async function POST(request: Request)"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/source-onboarding-pilot/page.tsx");
for (const token of [
  "Six-Application Source Onboarding & Supervised Production Pilot",
  "Incomplete independent evidence keeps the source on HOLD.",
  "Supervised onboarding queue",
  "Build 348 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/source-onboarding-pilot/SourceOnboardingPilotRecorder.tsx"
);
assert.ok(recorder.includes('fetch("/api/source-onboarding-pilot"'));
assert.ok(recorder.includes("Record onboarding evidence"));
assert.ok(recorder.includes('defaultValue="not-run"'));
assert.ok(recorder.includes('defaultValue="blocked"'));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/source-onboarding-pilot"'));

const tools = source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/source-onboarding-pilot"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/source-onboarding-pilot"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/source-onboarding-pilot"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(dbSpine.includes('"master_source_onboarding_runs"'));
assert.ok(dbSpine.includes('"master_source_onboarding_assertions"'));
assert.ok(dbSpine.includes('"0126_master_source_onboarding_pilot.sql"'));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 347 — Master Security, Authorization, Consent & Evidence Certification** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 348 — Six-Application Source Onboarding & Supervised Production Pilot** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback"
  )
);

const docs = source("../../docs/BUILD_348_SOURCE_ONBOARDING_SUPERVISED_PILOT.md");
assert.ok(docs.includes("one supervised pilot window is permitted at a time"));
assert.ok(docs.includes("does not activate a connection"));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build348-review.json")
);
assert.equal(review.build, 348);
assert.equal(review.sourceCount, 6);
assert.equal(review.prerequisites.length, 6);
assert.equal(review.controls.oneSourcePilotAtATime, true);
assert.equal(review.authority.onboardingIsConnectionActivation, false);
assert.equal(review.nextQueuedBuild, 349);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-348-source-onboarding-pilot.ts";
assert.equal(pkg.scripts["verify:build348"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-347-master-security-certification.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-348-source-onboarding-pilot.ts"
    )
);

console.log("Build 348 source onboarding supervised pilot verification passed.");
