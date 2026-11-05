import { readFile } from "node:fs/promises";
import path from "node:path";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 292A verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

function commandCount(value: string) {
  return value
    .split("&&")
    .map((item) => item.trim())
    .filter(Boolean).length;
}

async function main() {
  const [
    webPackageRaw,
    rootPackageRaw,
    workflow,
    runner,
    impact,
    dbGate,
    docs,
    evidenceRaw,
    build292EvidenceRaw,
    roadmap
  ] = await Promise.all([
    source("package.json"),
    source("../../package.json"),
    source("../../.github/workflows/verify.yml"),
    source("scripts/ci-suite-runner.mjs"),
    source("scripts/ci-detect-legacy-impact.mjs"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("../../docs/BUILD_292A_CI_VERIFICATION_CONSOLIDATION.md"),
    source("../../docs/integration/build292a-ci-verification-consolidation.json"),
    source("../../docs/integration/ql266-ai-data-platform-build292-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  const webPackage = JSON.parse(webPackageRaw);
  const rootPackage = JSON.parse(rootPackageRaw);
  const scripts = webPackage.scripts as Record<string, string>;

  ensure(commandCount(scripts.test) >= 268, "historical application verifier audit preserved");
  ensure(commandCount(scripts["db:verify"]) >= 75, "historical database verifier audit preserved");
  ensure(
    scripts["ci:legacy"] === "pnpm test && pnpm db:verify",
    "legacy audit groups the preserved exhaustive chains"
  );

  ensure(commandCount(scripts["ci:spine"]) >= 15, "compact integration spine retains the original 15 gates and may grow with current builds");
  for (let build = 281; build <= 292; build += 1) {
    ensure(
      scripts["ci:spine"].includes("verify-build-" + build + "-"),
      "integration spine includes Build " + build
    );
  }
  ensure(
    scripts["ci:spine"].includes("verify-production-build-migrations.ts") &&
      scripts["ci:spine"].includes("verify-ql246-independent-six-app-source-proof.mjs") &&
      scripts["ci:spine"].includes("verify-ql253-six-app-origin-pin-test-review.mjs"),
    "production migration and QL boundary checks remain in compact spine"
  );
  ensure(
    scripts["ci:db-core"] ===
      "tsx scripts/verify-isolation.ts && tsx scripts/verify-ci-integration-spine-database.ts",
    "compact database gate preserves isolation and current integration schema"
  );

  ensure(
    scripts.build.includes("tsx scripts/verify-build-292-event-replay-dlq.ts") &&
      scripts.build.includes("tsx scripts/verify-build-292a-ci-verification-consolidation.ts") &&
      scripts.build.includes("tsx scripts/run-production-migrations.ts") &&
      scripts.build.endsWith("next build"),
    "production web build remains fail-closed on Build 292, Build 292A and migrations as newer gates are prepended"
  );
  ensure(
    rootPackage.scripts.verify === "pnpm ci:promotion" &&
      rootPackage.scripts["ci:promotion"] ===
        "node apps/web/scripts/ci-suite-runner.mjs promotion" &&
      rootPackage.scripts["ci:legacy"] ===
        "node apps/web/scripts/ci-suite-runner.mjs legacy",
    "root verify points to authoritative compact suite"
  );

  ensure(
    workflow.includes("pull_request:") &&
      workflow.includes("      - main") &&
      !workflow.includes("\n  push:") &&
      !workflow.includes("      - dev"),
    "GitHub workflow has one main PR promotion trigger and no duplicate dev/main push triggers"
  );
  ensure(
    workflow.includes("workflow_dispatch:") &&
      workflow.includes("schedule:") &&
      workflow.includes('cron: "17 7 * * 0"'),
    "manual and weekly legacy audit paths exist"
  );
  ensure(
    workflow.includes("run: pnpm ci:promotion") &&
      workflow.includes("run: pnpm ci:legacy") &&
      workflow.includes("ci-detect-legacy-impact.mjs"),
    "workflow uses grouped promotion and conditional legacy suites"
  );

  for (const token of [
    '["pnpm", ["typecheck"], "workspace typecheck"]',
    '["pnpm", ["lint"], "workspace lint"]',
    '"connector SDK build + tests"',
    '"current integration spine"',
    '"core database + integration schema"',
    '"production-equivalent web build"',
    '"historical application verifier audit"',
    '"historical database verifier audit"',
    'GITHUB_STEP_SUMMARY'
  ]) {
    ensure(runner.includes(token), "suite runner token " + token);
  }

  ensure(
    impact.includes('eventName === "schedule"') &&
      impact.includes('eventName === "workflow_dispatch"') &&
      impact.includes("historical build verifier changed") &&
      impact.includes("previously committed migration changed") &&
      impact.includes("impact detection failed closed"),
    "legacy impact detection is targeted and fail-closed"
  );

  for (const token of [
    "requiredTables",
    "relrowsecurity",
    "ai_data_runtime",
    "UPDATE','DELETE",
    "0096_event_idempotency_delivery_guarantees.sql"
  ]) {
    ensure(dbGate.includes(token), "database gate token " + token);
  }

  const evidence = JSON.parse(evidenceRaw);
  ensure(
    evidence.historical_baseline.historical_verifier_invocations === 343,
    "343-script historical baseline recorded"
  );
  ensure(
    evidence.historical_baseline.github_workflow_runs_per_standard_promotion === 3 &&
      evidence.consolidated_model.github_workflow_runs_per_standard_promotion === 1 &&
      evidence.consolidated_model.workflow_run_reduction_percent === 67,
    "promotion workflow reduction recorded"
  );
  ensure(
    evidence.consolidated_model.production_build_fail_closed === true &&
      evidence.consolidated_model.production_migrations_required === true,
    "production fail-closed evidence"
  );
  ensure(
    evidence.ql266_status === "UNDER_REVIEW" &&
      evidence.external_test_status === "REVIEW_DEFERRED" &&
      evidence.connection_state === "DISCONNECTED" &&
      evidence.external_requests === 0 &&
      evidence.live_exchanges === 0,
    "QL-266 remains deferred and disconnected"
  );

  const build292 = JSON.parse(build292EvidenceRaw);
  ensure(
    build292.ql266_status === "UNDER_REVIEW" &&
      build292.external_test_status === "REVIEW_DEFERRED" &&
      build292.connection_state === "DISCONNECTED",
    "Build 292 integration boundary remains unchanged"
  );

  ensure(
    docs.includes("343 historical verifier invocations") &&
      docs.includes("after Build 292A: **1**") &&
      docs.includes("reduction: **67%**") &&
      docs.includes("Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees"),
    "consolidation documentation and next build"
  );
  ensure(
    roadmap.includes("Build 292A — CI Verification Consolidation & Promotion Run Reduction") &&
      roadmap.includes("Build 293 — Idempotency, Duplicate Prevention & Delivery Guarantees"),
    "roadmap preserves 292A and resumes at 293"
  );

  console.log(
    "Build 292A CI Verification Consolidation & Promotion Run Reduction verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
