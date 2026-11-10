import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { MasterProductionReadinessModel } from "../lib/master-production-readiness-core";
import {
  PRODUCTION_LEARNING_VIII_CANDIDATE_LIMIT,
  buildProductionLearningVIII
} from "../lib/production-learning-viii";
import { MASTER_SHELL_SOURCE_IDS } from "../lib/master-shell-contract-v1";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

type State = "ACCEPTED" | "READY_FOR_OWNER" | "HOLD" | "FAIL" | "STALE";

function readiness(states: State[]): MasterProductionReadinessModel {
  assert.equal(states.length, 6);
  const sources = MASTER_SHELL_SOURCE_IDS.map((sourceId, index) => ({
    sourceId,
    effectiveState: states[index],
    run: null
  }));

  const accepted = states.filter((state) => state === "ACCEPTED").length;
  const readyForOwner = states.filter(
    (state) => state === "READY_FOR_OWNER"
  ).length;
  const hold = states.filter((state) => state === "HOLD").length;
  const failed = states.filter((state) => state === "FAIL").length;
  const stale = states.filter((state) => state === "STALE").length;

  const suiteEffectiveState =
    failed > 0
      ? "FAIL"
      : stale > 0
        ? "STALE"
        : hold > 0
          ? "HOLD"
          : readyForOwner > 0
            ? "READY_FOR_OWNER"
            : accepted === 6
              ? "ACCEPTED"
              : "HOLD";

  return {
    schema: "ai-data-platform.master-production-readiness.v1",
    build: 349,
    generatedAt: "2026-11-10T01:00:00.000Z",
    dimensions: [
      "source-onboarding",
      "operational-recovery",
      "accessibility",
      "production-safeguards",
      "rollback"
    ],
    sources,
    summary: {
      sources: 6,
      accepted,
      readyForOwner,
      hold,
      failed,
      stale,
      suiteEffectiveState
    },
    policy: {
      exactSixSources: true,
      sourceOnboardingRequired: true,
      recoveryEvidenceRequired: true,
      accessibilityEvidenceRequired: true,
      productionSafeguardsRequired: true,
      rollbackEvidenceRequired: true,
      ownerAcceptanceExplicit: true,
      deploymentGreenImpliesAcceptance: false,
      build348OnboardedImpliesAcceptance: false,
      acceptanceActivatesConnection: false,
      sourceSpecificGatesRemainAuthoritative: true,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      automaticRollbackPerformed: false,
      automaticHoldRelease: false
    }
  } as MasterProductionReadinessModel;
}

const accepted = buildProductionLearningVIII({
  readiness: readiness([
    "ACCEPTED","ACCEPTED","ACCEPTED",
    "ACCEPTED","ACCEPTED","ACCEPTED"
  ]),
  generatedAt: new Date("2026-11-10T02:00:00.000Z")
});

assert.equal(accepted.build, 350);
assert.equal(accepted.closedBatch, "331-350");
assert.equal(accepted.summary.sources, 6);
assert.equal(accepted.summary.accepted, 6);
assert.equal(accepted.summary.unresolvedSources, 0);
assert.equal(accepted.summary.suiteAcceptance, "ACCEPTED");
assert.equal(accepted.candidates.length, 0);
assert.equal(accepted.roadmapRenewal.numberedBuilds351PlusAuthorized, false);
assert.equal(accepted.roadmapRenewal.nextBuildNumber, null);
assert.equal(accepted.roadmapRenewal.automaticRoadmapExtension, false);
assert.equal(accepted.roadmapRenewal.explicitOwnerAuthorizationRequired, true);
assert.equal(
  accepted.roadmapRenewal.separateAuthorizationAfterBuild350Required,
  true
);
assert.equal(accepted.acceptance.build349RemainsSourceOfTruth, true);
assert.equal(accepted.acceptance.build350CreatesOwnerAcceptance, false);
assert.equal(accepted.boundaries.roadmapAuthorized, false);

const unresolved = buildProductionLearningVIII({
  readiness: readiness([
    "ACCEPTED",
    "READY_FOR_OWNER",
    "HOLD",
    "FAIL",
    "STALE",
    "HOLD"
  ]),
  generatedAt: new Date("2026-11-10T02:00:00.000Z")
});

assert.equal(unresolved.summary.accepted, 1);
assert.equal(unresolved.summary.unresolvedSources, 5);
assert.equal(unresolved.summary.suiteAcceptance, "FAIL");
assert.ok(unresolved.candidates.length > 0);
assert.ok(unresolved.candidates.length <= PRODUCTION_LEARNING_VIII_CANDIDATE_LIMIT);
assert.ok(
  unresolved.candidates.some(
    (item) => item.title.includes("explicit owner review")
  )
);
assert.ok(
  unresolved.candidates.some(
    (item) => item.title.includes("failed production-readiness")
  )
);
assert.ok(
  unresolved.candidates.some(
    (item) => item.title.includes("expired production-readiness")
  )
);
assert.ok(
  unresolved.candidates.every(
    (item) => !/^Build\s+\d+/i.test(item.title)
  )
);

const core = source("lib/production-learning-viii.ts");
for (const token of [
  "PRODUCTION_LEARNING_VIII_BUILD = 350",
  "closedBatch: \"331-350\"",
  "finiteCandidateLimit:",
  "candidatesAreUnnumbered: true",
  "numberedBuilds351PlusAuthorized: false",
  "nextBuildNumber: null",
  "automaticRoadmapExtension: false",
  "explicitOwnerAuthorizationRequired: true",
  "build350CreatesOwnerAcceptance: false",
  "roadmapAuthorized: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source("../../db/migrations/0128_production_learning_viii.sql");
for (const token of [
  "production_learning_viii_snapshots",
  "production_learning_viii_candidates",
  "candidate_count between 0 and 12",
  "numbered_build integer",
  "check (numbered_build is null)",
  "force row level security",
  "grant select,insert",
  "revoke update,delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.equal(
  (migration.match(/create table if not exists app\.production_learning_viii_snapshots/g) ?? []).length,
  1
);
assert.equal(
  (migration.match(/create table if not exists app\.production_learning_viii_candidates/g) ?? []).length,
  1
);
assert.ok(!migration.includes("\\n"));

const database = source("lib/production-learning-viii-database.ts");
for (const token of [
  "listMasterProductionReadinessForUser",
  "buildLiveProductionLearningVIIIForUser",
  "listProductionLearningVIIIForUser",
  "refreshProductionLearningVIII",
  "production-learning-viii:",
  "production_learning_viii_snapshots",
  "production_learning_viii_candidates",
  "numbered_build"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
for (const forbidden of [
  "update app.production_learning_viii",
  "delete from app.production_learning_viii",
  "fetch("
]) {
  assert.ok(!database.includes(forbidden), "forbidden database token " + forbidden);
}

const api = source("app/api/production-learning-viii/route.ts");
assert.ok(api.includes('"refresh-learning-viii"'));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("Cache-Control"));

const page = source("app/production-learning-viii/page.tsx");
for (const token of [
  "Build 350 · Production Learning VIII · Master Shell closeout",
  "Master Shell Acceptance & Next Roadmap Renewal",
  "not new roadmap authorization",
  "Build 350 authority boundary"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const client = source(
  "app/production-learning-viii/ProductionLearningVIIIConsole.tsx"
);
for (const token of [
  "Master Shell acceptance",
  "sources accepted",
  "sources unresolved",
  "unnumbered renewal candidates",
  "Build 351+ authorized",
  "Record Production Learning VIII snapshot",
  "Current Build 349 outcomes",
  "Unnumbered renewal candidates",
  "next build number is"
]) {
  assert.ok(
    client.toLowerCase().includes(token.toLowerCase()),
    "client token " + token
  );
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/production-learning-viii"'));

const tools = source("lib/module-operator-tools.ts");
assert.ok(tools.includes('"/production-learning-viii"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/production-learning-viii"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/production-learning-viii"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
for (const token of [
  '"production_learning_viii_snapshots"',
  '"production_learning_viii_candidates"',
  '"0128_production_learning_viii.sql"'
]) {
  assert.ok(dbSpine.includes(token), "db spine token " + token);
}

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 349 — Master Shell Production Readiness, Recovery, Owner Acceptance & Rollback** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 350 — Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal** — current build"
  )
);
assert.ok(roadmap.includes("no automatically authorized Build 351"));

const docs = source(
  "../../docs/BUILD_350_PRODUCTION_LEARNING_VIII_MASTER_SHELL_ACCEPTANCE.md"
);
assert.ok(docs.includes("no automatically authorized Build 351"));
assert.ok(docs.includes("numberedBuilds351PlusAuthorized = false"));

const renewal = source("../../docs/ROADMAP_RENEWAL_AFTER_BUILD_350.md");
for (const token of [
  "no automatically queued Build 351",
  "is not an approved build",
  "has no build number",
  "separate explicit owner authorization"
]) {
  assert.ok(
    renewal.toLowerCase().includes(token.toLowerCase()),
    "renewal token " + token
  );
}

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build350-review.json")
);
assert.equal(review.build, 350);
assert.equal(review.closedBatch, "331-350");
assert.equal(review.sourceCount, 6);
assert.equal(review.roadmapRenewal.finiteCandidateLimit, 12);
assert.equal(review.roadmapRenewal.automaticBuild351, false);
assert.equal(review.roadmapRenewal.nextBuildNumber, null);
assert.equal(
  review.roadmapRenewal.explicitOwnerAuthorizationRequired,
  true
);

const pkg = JSON.parse(source("package.json"));
const command = "tsx scripts/verify-build-350-production-learning-viii.ts";
assert.equal(pkg.scripts["verify:build350"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-349-master-production-readiness.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-350-production-learning-viii.ts"
    )
);

console.log(
  "Build 350 Production Learning VIII, Master Shell Acceptance & Next Roadmap Renewal verification passed."
);
