import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MASTER_SECURITY_CERTIFICATION_DIMENSIONS,
  composeMasterSecurityCertificationModel,
  summarizeMasterSecurityAssertions,
  validateMasterSecurityAssertions,
  validateMasterSecurityCertificationRun,
  type MasterSecurityCertificationAssertion,
  type MasterSecurityCertificationRun
} from "../lib/master-security-certification-core";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const assertions = (
  outcome: "pass" | "fail" | "blocked" = "pass"
): MasterSecurityCertificationAssertion[] =>
  MASTER_SECURITY_CERTIFICATION_DIMENSIONS.map((dimension) => ({
    dimension,
    outcome,
    evidenceURI: "urn:rosevear:evidence:" + dimension,
    detail: "Independent evidence for " + dimension + "."
  }));

function run(
  sourceId: MasterSecurityCertificationRun["sourceId"],
  overrides: Partial<MasterSecurityCertificationRun> = {}
): MasterSecurityCertificationRun {
  const rows = overrides.assertions ?? assertions("pass");
  return {
    runId: "run_" + sourceId.replace(/[^a-z0-9]/g, "") + "a".repeat(16),
    sourceId,
    certificationVersion: 1,
    overallOutcome: summarizeMasterSecurityAssertions(rows).overallOutcome,
    reviewer: "Suite security reviewer",
    observedAt: "2026-11-09T20:00:00.000Z",
    expiresAt: "2026-12-09T20:00:00.000Z",
    branch: "main",
    commitSha: "a".repeat(40),
    notes: null,
    recordedAt: "2026-11-09T20:05:00.000Z",
    assertions: rows,
    ...overrides
  };
}

assert.deepEqual(MASTER_SECURITY_CERTIFICATION_DIMENSIONS, [
  "source-signing-trust",
  "role-authorization",
  "consent",
  "sensitive-data-handling",
  "audit-evidence",
  "fail-closed-controls"
]);

assert.equal(validateMasterSecurityAssertions(assertions()).length, 6);
assert.equal(summarizeMasterSecurityAssertions(assertions()).overallOutcome, "passed");
assert.equal(
  summarizeMasterSecurityAssertions(assertions("blocked")).overallOutcome,
  "blocked"
);
assert.equal(
  summarizeMasterSecurityAssertions(assertions("fail")).overallOutcome,
  "failed"
);
assert.equal(validateMasterSecurityCertificationRun(run("icamp")).sourceId, "icamp");

assert.throws(
  () =>
    validateMasterSecurityAssertions(
      assertions().slice(0, 5)
    ),
  /requires_six_dimensions/
);

const failedRows = assertions();
failedRows[1] = { ...failedRows[1], outcome: "fail" };
const blockedRows = assertions();
blockedRows[2] = { ...blockedRows[2], outcome: "blocked" };

const model = composeMasterSecurityCertificationModel({
  runs: [
    run("icamp"),
    run("yw", {
      assertions: failedRows,
      overallOutcome: "failed"
    }),
    run("rosiedazzlers", {
      assertions: blockedRows,
      overallOutcome: "blocked"
    }),
    run("devilndove", {
      observedAt: "2026-09-01T20:00:00.000Z",
      expiresAt: "2026-10-01T20:00:00.000Z"
    })
  ],
  now: new Date("2026-11-09T21:00:00.000Z")
});

assert.equal(model.build, 347);
assert.equal(model.summary.sources, 6);
assert.equal(model.summary.passed, 1);
assert.equal(model.summary.failed, 1);
assert.equal(model.summary.blocked, 1);
assert.equal(model.summary.stale, 1);
assert.equal(model.summary.unknown, 2);
assert.equal(model.summary.suiteEffectiveState, "FAIL");
assert.equal(model.policy.missingEvidenceMeansCertified, false);
assert.equal(model.policy.deploymentGreenImpliesCertification, false);
assert.equal(model.policy.signingSoftwareImpliesTrust, false);
assert.equal(model.policy.consentInferredFromMembership, false);
assert.equal(model.policy.peerWritePerformed, false);

const core = source("lib/master-security-certification-core.ts");
for (const token of [
  "MASTER_SECURITY_CERTIFICATION_BUILD = 347",
  '"source-signing-trust"',
  '"role-authorization"',
  '"consent"',
  '"sensitive-data-handling"',
  '"audit-evidence"',
  '"fail-closed-controls"',
  "deploymentGreenImpliesCertification: false",
  "signingSoftwareImpliesTrust: false",
  "consentInferredFromMembership: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source("../../db/migrations/0125_master_security_certification.sql");
for (const token of [
  "master_security_certification_runs",
  "master_security_certification_assertions",
  "enable row level security",
  "force row level security",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.equal(
  (migration.match(/create table if not exists app\.master_security_certification_runs/g) ?? []).length,
  1
);
assert.equal(
  (migration.match(/create table if not exists app\.master_security_certification_assertions/g) ?? []).length,
  1
);
assert.ok(!migration.includes("\\n"));

const database = source("lib/master-security-certification-database.ts");
for (const token of [
  "pg_advisory_xact_lock",
  "recordMasterSecurityCertification",
  "listMasterSecurityCertificationForUser",
  "master_security_certification_runs",
  "master_security_certification_assertions"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.master_security_certification",
  "delete from app.master_security_certification",
  "fetch("
]) {
  assert.ok(!database.includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/master-security-certification/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(api.includes("export async function POST(request: Request)"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/master-security-certification/page.tsx");
for (const token of [
  "Master Security, Authorization, Consent & Evidence Certification",
  "Security certification requires independent evidence.",
  "Six source security certifications",
  "Build 347 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/master-security-certification/MasterSecurityCertificationRecorder.tsx"
);
assert.ok(recorder.includes('fetch("/api/master-security-certification"'));
assert.ok(recorder.includes("Record security certification"));
assert.ok(recorder.includes('defaultValue="blocked"'));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/master-security-certification"'));

const tools = source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/master-security-certification"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/master-security-certification"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/master-security-certification"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(dbSpine.includes('"master_security_certification_runs"'));
assert.ok(dbSpine.includes('"master_security_certification_assertions"'));
assert.ok(dbSpine.includes('"0125_master_security_certification.sql"'));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 347 — Master Security, Authorization, Consent & Evidence Certification** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 348 — Six-Application Source Onboarding & Supervised Production Pilot"
  )
);

const docs = source("../../docs/BUILD_347_MASTER_SECURITY_CERTIFICATION.md");
assert.ok(docs.includes("workspace membership does not imply consent"));
assert.ok(docs.includes("Build 348 — Six-Application Source Onboarding & Supervised Production Pilot"));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build347-review.json")
);
assert.equal(review.build, 347);
assert.equal(review.sourceCount, 6);
assert.equal(review.dimensions.length, 6);
assert.equal(review.authority.deploymentGreenImpliesCertification, false);
assert.equal(review.nextQueuedBuild, 348);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-347-master-security-certification.ts";
assert.equal(pkg.scripts["verify:build347"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-346-relationship-certification.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-347-master-security-certification.ts"
    )
);

console.log("Build 347 master security certification verification passed.");
