import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MASTER_PRODUCTION_READINESS_DIMENSIONS,
  composeMasterProductionReadinessModel,
  summarizeMasterProductionReadiness,
  validateMasterProductionReadinessAssertions,
  validateMasterProductionReadinessRun,
  type MasterOwnerDecision,
  type MasterProductionReadinessAssertion,
  type MasterProductionReadinessRun
} from "../lib/master-production-readiness-core";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const assertions = (
  outcome: "pass" | "fail" | "blocked" = "pass"
): MasterProductionReadinessAssertion[] =>
  MASTER_PRODUCTION_READINESS_DIMENSIONS.map((dimension) => ({
    dimension,
    outcome,
    evidenceURI: "urn:rosevear:evidence:" + dimension,
    detail: "Independent evidence for " + dimension + "."
  }));

function run(
  sourceId: MasterProductionReadinessRun["sourceId"],
  overrides: Partial<MasterProductionReadinessRun> = {}
): MasterProductionReadinessRun {
  return {
    runId: "run-" + sourceId.replace(/[^a-z0-9]/g, "") + "-349",
    sourceId,
    readinessVersion: 1,
    reviewer: "Master Shell readiness reviewer",
    observedAt: "2026-11-10T00:00:00.000Z",
    expiresAt: "2026-12-10T00:00:00.000Z",
    branch: "main",
    commitSha: "a".repeat(40),
    notes: null,
    ownerDecision: "not-reviewed",
    ownerDecisionEvidenceURI: null,
    ownerDecisionDetail: null,
    ownerDecidedAt: null,
    recordedAt: "2026-11-10T00:05:00.000Z",
    assertions: assertions(),
    ...overrides
  };
}

function ownerEvidence(decision: Exclude<MasterOwnerDecision, "not-reviewed">) {
  return {
    ownerDecision: decision,
    ownerDecisionEvidenceURI: "urn:rosevear:evidence:owner-" + decision,
    ownerDecisionDetail: "Explicit suite owner decision: " + decision + ".",
    ownerDecidedAt: "2026-11-10T00:04:00.000Z"
  };
}

assert.deepEqual(MASTER_PRODUCTION_READINESS_DIMENSIONS, [
  "source-onboarding",
  "operational-recovery",
  "accessibility",
  "production-safeguards",
  "rollback"
]);

assert.equal(validateMasterProductionReadinessAssertions(assertions()).length, 5);
assert.equal(
  summarizeMasterProductionReadiness(assertions(), "not-reviewed").effectiveState,
  "READY_FOR_OWNER"
);
assert.equal(
  summarizeMasterProductionReadiness(assertions(), "accepted").effectiveState,
  "ACCEPTED"
);
assert.equal(
  summarizeMasterProductionReadiness(assertions("blocked"), "not-reviewed").effectiveState,
  "HOLD"
);
assert.equal(
  summarizeMasterProductionReadiness(assertions("fail"), "not-reviewed").effectiveState,
  "FAIL"
);

assert.equal(
  validateMasterProductionReadinessRun(
    run("icamp", ownerEvidence("accepted"))
  ).ownerDecision,
  "accepted"
);

const blockedRows = assertions();
blockedRows[1] = { ...blockedRows[1], outcome: "blocked" };
assert.throws(
  () =>
    validateMasterProductionReadinessRun(
      run("yw", {
        ...ownerEvidence("accepted"),
        assertions: blockedRows
      })
    ),
  /acceptance_prerequisites_invalid/
);

assert.throws(
  () =>
    validateMasterProductionReadinessRun(
      run("yw", {
        ownerDecision: "not-reviewed",
        ownerDecisionEvidenceURI: "urn:rosevear:evidence:unexpected",
        ownerDecisionDetail: "Should not exist for unreviewed.",
        ownerDecidedAt: "2026-11-10T00:04:00.000Z"
      })
    ),
  /unreviewed_owner_evidence_must_be_empty/
);

const failedRows = assertions();
failedRows[0] = { ...failedRows[0], outcome: "fail" };

const model = composeMasterProductionReadinessModel({
  runs: [
    run("icamp", ownerEvidence("accepted")),
    run("yw"),
    run("rosiedazzlers", { assertions: blockedRows }),
    run("devilndove", { assertions: failedRows }),
    run("ai-data-platform", {
      observedAt: "2026-09-01T00:00:00.000Z",
      expiresAt: "2026-10-01T00:00:00.000Z"
    })
  ],
  now: new Date("2026-11-10T01:00:00.000Z")
});

assert.equal(model.build, 349);
assert.equal(model.summary.sources, 6);
assert.equal(model.summary.accepted, 1);
assert.equal(model.summary.readyForOwner, 1);
assert.equal(model.summary.hold, 2);
assert.equal(model.summary.failed, 1);
assert.equal(model.summary.stale, 1);
assert.equal(model.summary.suiteEffectiveState, "FAIL");
assert.equal(model.policy.ownerAcceptanceExplicit, true);
assert.equal(model.policy.deploymentGreenImpliesAcceptance, false);
assert.equal(model.policy.acceptanceActivatesConnection, false);
assert.equal(model.policy.automaticRollbackPerformed, false);

const core = source("lib/master-production-readiness-core.ts");
for (const token of [
  "MASTER_PRODUCTION_READINESS_BUILD = 349",
  '"source-onboarding"',
  '"operational-recovery"',
  '"accessibility"',
  '"production-safeguards"',
  '"rollback"',
  "ownerAcceptanceExplicit: true",
  "deploymentGreenImpliesAcceptance: false",
  "acceptanceActivatesConnection: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source("../../db/migrations/0127_master_production_readiness.sql");
for (const token of [
  "master_production_readiness_runs",
  "master_production_readiness_assertions",
  "owner_decision",
  "enable row level security",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.equal(
  (migration.match(/create table if not exists app\.master_production_readiness_runs/g) ?? []).length,
  1
);
assert.equal(
  (migration.match(/create table if not exists app\.master_production_readiness_assertions/g) ?? []).length,
  1
);
assert.ok(!migration.includes("\\n"));

const database = source("lib/master-production-readiness-database.ts");
for (const token of [
  "recordMasterProductionReadinessRun",
  "listMasterProductionReadinessForUser",
  "requireSuiteOwner",
  "source-onboarding",
  "ONBOARDED",
  "master_production_readiness_onboarding_pass_not_supported",
  "master_production_readiness_acceptance_onboarding_required"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.master_production_readiness",
  "delete from app.master_production_readiness",
  "fetch("
]) {
  assert.ok(!database.includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/master-production-readiness/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(api.includes("export async function POST(request: Request)"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/master-production-readiness/page.tsx");
for (const token of [
  "Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback",
  "Owner acceptance is explicit and separate from deployment.",
  "Production readiness and owner acceptance",
  "Build 349 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/master-production-readiness/MasterProductionReadinessRecorder.tsx"
);
assert.ok(recorder.includes('fetch("/api/master-production-readiness"'));
assert.ok(recorder.includes("Record production readiness"));
assert.ok(recorder.includes('defaultValue="not-reviewed"'));
assert.ok(recorder.includes('defaultValue="blocked"'));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-production-readiness"'));

const tools = source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/master-production-readiness"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/master-production-readiness"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/master-production-readiness"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(dbSpine.includes('"master_production_readiness_runs"'));
assert.ok(dbSpine.includes('"master_production_readiness_assertions"'));
assert.ok(dbSpine.includes('"0127_master_production_readiness.sql"'));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 348 — Six-Application Source Onboarding & Supervised Production Pilot** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 350 — Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal"
  )
);

const docs = source("../../docs/BUILD_349_MASTER_PRODUCTION_READINESS.md");
assert.ok(docs.includes("Only an authenticated suite **owner**"));
assert.ok(docs.includes("activate a source connection"));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build349-review.json")
);
assert.equal(review.build, 349);
assert.equal(review.sourceCount, 6);
assert.equal(review.dimensions.length, 5);
assert.equal(review.controls.explicitOwnerOnlyDecision, true);
assert.equal(review.authority.deploymentGreenImpliesAcceptance, false);
assert.equal(review.nextQueuedBuild, 350);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-349-master-production-readiness.ts";
assert.equal(pkg.scripts["verify:build349"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-348-source-onboarding-pilot.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-349-master-production-readiness.ts"
    )
);

console.log("Build 349 master production readiness verification passed.");
