import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  RELATIONSHIP_CERTIFICATION_DIMENSIONS,
  RELATIONSHIP_PATTERNS,
  composeRelationshipCertificationModel,
  summarizeRelationshipAssertions,
  validateRelationshipAssertions,
  validateRelationshipCertificationRun,
  validateRelationshipShape,
  type RelationshipCertificationAssertion,
  type RelationshipCertificationRun
} from "../lib/relationship-certification-core";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const assertions = (
  outcome: "pass" | "fail" | "blocked" = "pass"
): RelationshipCertificationAssertion[] =>
  RELATIONSHIP_CERTIFICATION_DIMENSIONS.map((dimension) => ({
    dimension,
    outcome,
    evidenceURI: "urn:rosevear:evidence:" + dimension,
    detail: "Independent evidence for " + dimension + "."
  }));

function run(
  overrides: Partial<RelationshipCertificationRun> = {}
): RelationshipCertificationRun {
  const rows = overrides.assertions ?? assertions("pass");
  return {
    runId: "run_" + "a".repeat(20),
    relationshipId: "icamp-to-ai-hub",
    certificationVersion: 1,
    pattern: "one-to-one",
    sourceIds: ["icamp"],
    destinationIds: ["rosevear-ai-hub"],
    overallOutcome: summarizeRelationshipAssertions(rows).overallOutcome,
    reviewer: "Suite reviewer",
    observedAt: "2026-11-09T15:00:00.000Z",
    expiresAt: "2026-12-09T15:00:00.000Z",
    branch: "main",
    commitSha: "a".repeat(40),
    notes: null,
    recordedAt: "2026-11-09T15:05:00.000Z",
    assertions: rows,
    ...overrides
  };
}

assert.deepEqual(RELATIONSHIP_PATTERNS, [
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many"
]);
assert.deepEqual(RELATIONSHIP_CERTIFICATION_DIMENSIONS, [
  "contract",
  "identity",
  "replay",
  "expiry",
  "audience",
  "tenant-isolation"
]);

assert.equal(
  validateRelationshipShape({
    relationshipId: "one-one",
    pattern: "one-to-one",
    sourceIds: ["icamp"],
    destinationIds: ["rosevear-ai-hub"]
  }).pattern,
  "one-to-one"
);
assert.equal(
  validateRelationshipShape({
    relationshipId: "one-many",
    pattern: "one-to-many",
    sourceIds: ["icamp"],
    destinationIds: ["yw", "rosiedazzlers"]
  }).pattern,
  "one-to-many"
);
assert.equal(
  validateRelationshipShape({
    relationshipId: "many-one",
    pattern: "many-to-one",
    sourceIds: ["yw", "rosiedazzlers"],
    destinationIds: ["ai-data-platform"]
  }).pattern,
  "many-to-one"
);
assert.equal(
  validateRelationshipShape({
    relationshipId: "many-many",
    pattern: "many-to-many",
    sourceIds: ["yw", "icamp"],
    destinationIds: ["ai-data-platform", "rosevear-ai-hub"]
  }).pattern,
  "many-to-many"
);

assert.throws(
  () =>
    validateRelationshipShape({
      relationshipId: "bad-cardinality",
      pattern: "one-to-many",
      sourceIds: ["icamp"],
      destinationIds: ["rosevear-ai-hub"]
    }),
  /relationship_certification_pattern_cardinality_mismatch/
);
assert.throws(
  () =>
    validateRelationshipShape({
      relationshipId: "self",
      pattern: "one-to-one",
      sourceIds: ["icamp"],
      destinationIds: ["icamp"]
    }),
  /relationship_certification_self_relationship_invalid/
);
assert.throws(
  () =>
    validateRelationshipAssertions(assertions("pass").slice(0, 5)),
  /relationship_certification_requires_six_dimensions/
);

const failedRows = assertions("pass").map((item) =>
  item.dimension === "audience" ? { ...item, outcome: "fail" as const } : item
);
const blockedRows = assertions("pass").map((item) =>
  item.dimension === "replay" ? { ...item, outcome: "blocked" as const } : item
);

assert.equal(
  summarizeRelationshipAssertions(assertions("pass")).overallOutcome,
  "passed"
);
assert.equal(
  summarizeRelationshipAssertions(failedRows).overallOutcome,
  "failed"
);
assert.equal(
  summarizeRelationshipAssertions(blockedRows).overallOutcome,
  "blocked"
);

const model = composeRelationshipCertificationModel({
  runs: [
    run(),
    run({
      runId: "run_" + "b".repeat(20),
      relationshipId: "icamp-to-many",
      pattern: "one-to-many",
      sourceIds: ["icamp"],
      destinationIds: ["yw", "rosiedazzlers"],
      assertions: blockedRows,
      overallOutcome: "blocked"
    }),
    run({
      runId: "run_" + "c".repeat(20),
      relationshipId: "many-to-data",
      pattern: "many-to-one",
      sourceIds: ["yw", "rosiedazzlers"],
      destinationIds: ["ai-data-platform"],
      assertions: failedRows,
      overallOutcome: "failed"
    }),
    run({
      runId: "run_" + "d".repeat(20),
      relationshipId: "many-many",
      pattern: "many-to-many",
      sourceIds: ["yw", "icamp"],
      destinationIds: ["ai-data-platform", "rosevear-ai-hub"],
      observedAt: "2026-09-01T15:00:00.000Z",
      expiresAt: "2026-10-01T15:00:00.000Z"
    })
  ],
  now: new Date("2026-11-09T18:00:00.000Z")
});

assert.equal(model.build, 346);
assert.equal(model.summary.relationships, 4);
assert.equal(model.summary.passed, 1);
assert.equal(model.summary.blocked, 1);
assert.equal(model.summary.failed, 1);
assert.equal(model.summary.stale, 1);
assert.equal(model.summary.patternCoverage, 4);
assert.equal(
  model.patterns.find((item) => item.pattern === "one-to-one")?.effectiveState,
  "PASS"
);
assert.equal(
  model.patterns.find((item) => item.pattern === "one-to-many")?.effectiveState,
  "BLOCKED"
);
assert.equal(
  model.patterns.find((item) => item.pattern === "many-to-one")?.effectiveState,
  "FAIL"
);
assert.equal(
  model.patterns.find((item) => item.pattern === "many-to-many")?.effectiveState,
  "STALE"
);
assert.equal(model.policy.missingPatternEvidenceMeansCertified, false);
assert.equal(model.policy.expiredEvidenceMeansCertified, false);
assert.equal(model.policy.deploymentGreenImpliesCertification, false);
assert.equal(model.policy.certificationIsActivation, false);

assert.equal(validateRelationshipCertificationRun(run()).overallOutcome, "passed");

const core = source("lib/relationship-certification-core.ts");
for (const token of [
  "RELATIONSHIP_CERTIFICATION_BUILD = 346",
  '"one-to-one"',
  '"one-to-many"',
  '"many-to-one"',
  '"many-to-many"',
  '"contract"',
  '"identity"',
  '"replay"',
  '"expiry"',
  '"audience"',
  '"tenant-isolation"',
  "deploymentGreenImpliesCertification: false",
  "build304PassImpliesRelationshipCertification: false",
  "certificationIsActivation: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source(
  "../../db/migrations/0124_master_relationship_integration_certification.sql"
);
for (const token of [
  "master_relationship_certification_runs",
  "master_relationship_certification_assertions",
  "cardinality(source_ids)",
  "cardinality(destination_ids)",
  "enable row level security",
  "force row level security",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const database = source("lib/relationship-certification-database.ts");
for (const token of [
  "pg_advisory_xact_lock",
  "recordRelationshipCertification",
  "listRelationshipCertificationForUser",
  "master_relationship_certification_runs",
  "master_relationship_certification_assertions",
  "validateRelationshipShape",
  "validateRelationshipAssertions"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.master_relationship_certification",
  "delete from app.master_relationship_certification",
  "fetch("
]) {
  assert.ok(!database.includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/relationship-certification/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(api.includes("export async function POST(request: Request)"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/relationship-certification/page.tsx");
for (const token of [
  "Relationship Integration Certification",
  "Four supported relationship patterns",
  "Certification is evidence, not activation.",
  "Missing relationship-pattern evidence",
  "Build 346 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/relationship-certification/RelationshipCertificationRecorder.tsx"
);
assert.ok(recorder.includes('fetch("/api/relationship-certification"'));
assert.ok(recorder.includes("Record certification run"));
assert.ok(recorder.includes('defaultValue="blocked"'));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/relationship-certification"'));

const tools = source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/relationship-certification"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/relationship-certification"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/relationship-certification"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(dbSpine.includes('"master_relationship_certification_runs"'));
assert.ok(dbSpine.includes('"master_relationship_certification_assertions"'));
assert.ok(
  dbSpine.includes('"0124_master_relationship_integration_certification.sql"')
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 345 — Role/Device Acceptance Matrix: Customer, Worker & Admin / Mobile, Tablet, Desktop** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 347 — Master Security, Authorization, Consent & Evidence Certification"
  )
);

const docs = source(
  "../../docs/BUILD_346_RELATIONSHIP_INTEGRATION_CERTIFICATION.md"
);
assert.ok(
  docs.includes(
    "A Build 304 PASS does not automatically certify a relationship pattern."
  )
);
assert.ok(
  docs.includes(
    "Build 347 — Master Security, Authorization, Consent & Evidence Certification"
  )
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build346-review.json")
);
assert.equal(review.build, 346);
assert.equal(review.patterns.length, 4);
assert.equal(review.dimensions.length, 6);
assert.equal(review.authority.certificationIsActivation, false);
assert.equal(review.nextQueuedBuild, 347);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-346-relationship-certification.ts";
assert.equal(pkg.scripts["verify:build346"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-345-role-device-acceptance.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-346-relationship-certification.ts"
    )
);

console.log(
  "Build 346 relationship integration certification verification passed."
);
