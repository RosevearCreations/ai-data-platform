import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildProductionLearningVReview } from "../lib/production-learning-v";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 280 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const baseline = {
    schema: "ai-data-platform.production-evidence-baseline.v1" as const,
    generatedAt: "2026-11-03T12:00:00.000Z",
    batch: "273-280" as const,
    state: "attention" as const,
    counts: {
      total: 3,
      active: 2,
      validated: 0,
      historical: 1,
      criticalReliability: 1,
      attentionItems: 1
    },
    items: [
      {
        id: "learning:provider",
        source: "production-learning" as const,
        disposition: "active" as const,
        status: "gap",
        title: "Provider authorization missing",
        evidence: "Provider execution remains blocked by explicit authorization.",
        action: "Retain blocker until authorization exists.",
        owner: "operations" as const,
        href: "/remote-execution",
        targetBuild: 275 as const
      },
      {
        id: "learning:reliability",
        source: "production-learning" as const,
        disposition: "active" as const,
        status: "action",
        title: "Reliability review",
        evidence: "A current measured recovery gap remains.",
        action: "Review measured recovery evidence.",
        owner: "platform" as const,
        href: "/system-reliability",
        targetBuild: 279 as const
      },
      {
        id: "learning:old-build-only",
        source: "production-learning" as const,
        disposition: "historical" as const,
        status: "healthy",
        title: "Old build-only note",
        evidence: "No fresh evidence reactivates this item.",
        action: "Historical context only.",
        owner: "platform" as const,
        href: "/production-learning",
        targetBuild: null
      }
    ],
    exitCriteria: [
      {
        build: 274 as const,
        title: "Guided Adoption",
        criterion: "Real activity exists.",
        currentEvidence: "1 workspace active.",
        met: true,
        href: "/first-evidence"
      },
      {
        build: 275 as const,
        title: "Provider Pilot",
        criterion: "Provider evidence or explicit blocker.",
        currentEvidence: "0 provider runs.",
        met: false,
        href: "/remote-execution"
      },
      {
        build: 276 as const,
        title: "Consumer Acceptance",
        criterion: "Acknowledgement evidence exists.",
        currentEvidence: "1 acknowledgement.",
        met: true,
        href: "/integration-delivery"
      },
      {
        build: 277 as const,
        title: "Retention",
        criterion: "No unresolved cleanup failure.",
        currentEvidence: "0 failures.",
        met: true,
        href: "/retention"
      },
      {
        build: 278 as const,
        title: "Least Privilege",
        criterion: "No unresolved permission drift.",
        currentEvidence: "0 stale grants.",
        met: true,
        href: "/adoption"
      },
      {
        build: 279 as const,
        title: "Reliability",
        criterion: "Legacy aggregate criterion.",
        currentEvidence: "1 critical signal.",
        met: false,
        href: "/system-reliability"
      }
    ]
  };

  const reliabilityTrend = {
    schema: "ai-data-platform.reliability-trend-review.v1" as const,
    build: 279 as const,
    generatedAt: "2026-11-03T12:00:00.000Z",
    baseline: {
      snapshots: 1,
      generatedAt: "2026-10-01T00:00:00.000Z",
      comparable: true
    },
    totals: {
      currentCriticalSignals: 1,
      currentExceptions: 1,
      recurringPatterns: 1,
      unclassifiedCriticalConditions: 0,
      recoveryActionsMissing: 0
    },
    metrics: [],
    failurePatterns: [],
    exitCriterion: {
      met: true,
      label:
        "A durable baseline exists, critical conditions are classified and recurring patterns have recovery actions.",
      evidence:
        "1 baseline snapshot; 0 unclassified critical conditions; 0 recovery actions missing."
    },
    boundaries: {
      syntheticIncidentsCreated: false as const,
      retriesAutomaticallyExecuted: false as const,
      automaticRemediation: false as const,
      evidenceOnly: true as const
    }
  };

  const result = buildProductionLearningVReview({
    baseline,
    reliabilityTrend,
    findings: [
      {
        key: "provider",
        category: "Remote",
        status: "gap" as const,
        title: "Provider authorization missing",
        evidence: "Provider execution remains blocked by explicit authorization.",
        action: "Retain blocker until authorization exists.",
        owner: "operations" as const
      }
    ]
  });

  ensure(result.schema === "ai-data-platform.production-learning-v.v1", "schema");
  ensure(result.build === 280, "build");
  ensure(result.criteria.length === 7, "Build 273–279 reconciliation");
  ensure(
    result.criteria.some((item) => item.build === 275 && item.state === "blocked"),
    "explicit blocker classification"
  );
  ensure(
    result.criteria.some((item) => item.build === 279 && item.state === "closed"),
    "Build 279 dedicated exit criterion"
  );
  ensure(result.summary.historicalRemoved === 1, "historical removal");
  ensure(
    result.findings.some((item) => item.state === "historical-removed"),
    "historical item state"
  );
  ensure(result.renewalCandidates.length >= 1, "measured renewal candidates");
  ensure(result.roadmapRenewal.numberedNextBatchAuthorized === false, "no automatic next batch");
  ensure(result.roadmapRenewal.nextBuildNumber === null, "no numbered next build");
  ensure(result.ownerAcceptance.productionAcceptedAutomatically === false, "no automatic owner acceptance");
  ensure(result.exitCriterion.met === true, "Build 280 reconciliation criterion");

  const [model, adapter, owner, learning, api, nav, pkg, doc, statusRaw, queue] =
    await Promise.all([
      source("lib/production-learning-v.ts"),
      source("lib/production-learning-v-database.ts"),
      source("app/owner-acceptance/page.tsx"),
      source("app/production-learning/page.tsx"),
      source("app/api/owner-acceptance/production-learning-v/route.ts"),
      source("lib/application-navigation.ts"),
      source("package.json"),
      source("../../docs/BUILD_280_PRODUCTION_LEARNING_V_OWNER_ACCEPTANCE_NEXT_BATCH_RENEWAL.md"),
      source("../../docs/integration/ql266-ai-data-platform-build280-review.json"),
      source("../../docs/NEXT_BUILDS_273_280.md")
    ]);

  ensure(
    model.includes("historical-removed") &&
      model.includes("numberedNextBatchAuthorized: false") &&
      model.includes("nextBuildNumber: null"),
    "Production Learning V model boundaries"
  );
  ensure(
    adapter.includes("buildProductionEvidenceBaseline") &&
      adapter.includes("buildReliabilityTrendReview") &&
      adapter.includes("buildProductionLearningReview"),
    "current evidence composition"
  );
  const ownerNormalized = owner.replace(/\\s+/g, " ");
  ensure(
    owner.includes("Build 280") &&
      owner.includes("Production Learning V, Owner Acceptance &amp; Next-Batch Renewal") &&
      ownerNormalized.includes("not a current prerequisite"),
    "Build 280 owner acceptance page"
  );
  ensure(
    owner.includes("Owner Acceptance, Legacy Cleanup &amp; Production Learning IV") &&
      owner.includes("Historical checkpoint"),
    "Build 272 historical verifier compatibility"
  );
  ensure(
    learning.includes("Production Learning V") &&
      learning.includes("Production Learning IV") &&
      learning.includes("No speculative Build 273+ queue"),
    "Production Learning renewal continuity"
  );
  ensure(
    api.includes("buildProductionLearningVReviewForUser") &&
      api.includes("status: 401"),
    "authenticated Build 280 API"
  );
  ensure(
    !nav.includes('href: "/owner-acceptance"') &&
      nav.includes("Production Learning"),
    "navigation guidance"
  );
  ensure(
    pkg.includes("verify-build-280-production-learning-v-owner-acceptance.ts"),
    "verifier registered"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 280, "status build");
  ensure(
    status.owner_acceptance.production_accepted_automatically === false &&
      status.owner_acceptance.explicit_owner_decision_required === true,
    "owner acceptance boundary"
  );
  ensure(
    status.roadmap_renewal.automatic_numbered_next_batch === false &&
      status.roadmap_renewal.next_build_number === null &&
      status.roadmap_renewal.owner_authorization_required === true,
    "next-batch renewal boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED",
    "QL-266 boundary"
  );
  ensure(status.new_ql266_test_started === false, "no QL-266 restart");
  ensure(status.next_build === null, "no automatic Build 281");

  ensure(
    doc.includes("does not automatically create a numbered Builds 281+ queue") &&
      doc.includes("explicit owner authorization"),
    "Build 280 documentation"
  );
  ensure(
    queue.includes("Build 280 — Production Learning V, Owner Acceptance & Next-Batch Renewal") &&
      queue.includes("numbered Builds 281+ remain unassigned"),
    "batch closure documentation"
  );

  console.log(
    "Build 280 Production Learning V, owner acceptance and next-batch renewal verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
