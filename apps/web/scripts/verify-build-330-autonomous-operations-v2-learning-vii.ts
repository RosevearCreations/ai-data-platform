import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildProductionLearningVII,
  productionLearningVIIDescriptor,
  type ProductionLearningVIIInput
} from "../lib/production-learning-vii";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function baseInput(
  overrides: Partial<ProductionLearningVIIInput> = {}
): ProductionLearningVIIInput {
  return {
    installedHosts: 1,
    capabilities: {
      enabled: 1,
      used: 1,
      unusedEnabled: 0,
      highRiskUnused: 0,
      disabledUsed: 0
    },
    certification: {
      latestHosts: 1,
      liveCertified: 1,
      fixtureCertified: 0,
      failed: 0,
      blocked: 0,
      unhealthy: 0,
      degraded: 0,
      unknown: 0
    },
    lifecycle: {
      upgradeRuns: 1,
      applied: 1,
      failed: 0,
      rollbackPrepared: 0,
      rolledBack: 0
    },
    autonomy: {
      cycles: 1,
      completed: 1,
      blocked: 0,
      failed: 0,
      safeRecoveriesExecuted: 1,
      safeRecoveriesSucceeded: 1,
      safeRecoveriesFailed: 0
    },
    recovery: {
      total: 1,
      recovered: 1,
      failedAttempts: 0,
      approvalRequired: 0,
      exhausted: 0,
      notRetryable: 0
    },
    tenantIsolation: {
      livePass: 1,
      liveFail: 0,
      liveBlocked: 0
    },
    activity: {
      eventPublications: 1,
      workflowIntents: 1,
      liveSearchEvidencePass: 1
    },
    health: {
      connectorSucceeded: 1,
      connectorFailed: 0,
      offlineLivePass: 1,
      offlineLiveFail: 0,
      offlineLiveBlocked: 0,
      relayRuntimeEvidenceCount: 1
    },
    ownerPolicy: {
      globalPolicyConfigured: true,
      globalEmergencyStopEngaged: false,
      hostPolicies: 1,
      enabledHostPolicies: 1,
      hostKillSwitchesEngaged: 0,
      reservations24h: 1,
      policyEvents: 1
    },
    existingLearningFindings: [],
    ...overrides
  };
}

async function main() {
  const healthy = buildProductionLearningVII(baseInput());
  assert.equal(healthy.overallState, "healthy");
  assert.equal(healthy.candidates.length, 0);
  assert.equal(
    healthy.roadmapRenewal.numberedNextBatchAuthorized,
    false
  );
  assert.equal(healthy.roadmapRenewal.nextBuildNumber, null);
  assert.equal(
    healthy.roadmapRenewal.candidatesAreUnnumbered,
    true
  );
  assert.equal(
    healthy.autonomousOperationsV2
      .automaticActionEnvelopeExpanded,
    false
  );
  assert.equal(
    healthy.autonomousOperationsV2
      .currentAutomaticActionEnvelope,
    "connector-health-get-head-only"
  );

  const noAdoption = buildProductionLearningVII(
    baseInput({
      installedHosts: 0,
      lifecycle: {
        upgradeRuns: 0,
        applied: 0,
        failed: 0,
        rollbackPrepared: 0,
        rolledBack: 0
      },
      activity: {
        eventPublications: 0,
        workflowIntents: 0,
        liveSearchEvidencePass: 0
      },
      health: {
        connectorSucceeded: 0,
        connectorFailed: 0,
        offlineLivePass: 0,
        offlineLiveFail: 0,
        offlineLiveBlocked: 0,
        relayRuntimeEvidenceCount: 0
      },
      ownerPolicy: {
        globalPolicyConfigured: false,
        globalEmergencyStopEngaged: true,
        hostPolicies: 0,
        enabledHostPolicies: 0,
        hostKillSwitchesEngaged: 0,
        reservations24h: 0,
        policyEvents: 0
      }
    })
  );
  assert.ok(
    noAdoption.candidates.some(
      item =>
        item.title ===
        "Establish genuine installed-host adoption evidence"
    )
  );

  const gap = buildProductionLearningVII(
    baseInput({
      capabilities: {
        enabled: 5,
        used: 2,
        unusedEnabled: 3,
        highRiskUnused: 1,
        disabledUsed: 1
      },
      certification: {
        latestHosts: 1,
        liveCertified: 0,
        fixtureCertified: 1,
        failed: 1,
        blocked: 0,
        unhealthy: 1,
        degraded: 0,
        unknown: 0
      },
      lifecycle: {
        upgradeRuns: 3,
        applied: 1,
        failed: 1,
        rollbackPrepared: 1,
        rolledBack: 0
      },
      autonomy: {
        cycles: 4,
        completed: 2,
        blocked: 1,
        failed: 1,
        safeRecoveriesExecuted: 2,
        safeRecoveriesSucceeded: 1,
        safeRecoveriesFailed: 1
      },
      recovery: {
        total: 4,
        recovered: 1,
        failedAttempts: 2,
        approvalRequired: 1,
        exhausted: 1,
        notRetryable: 1
      },
      tenantIsolation: {
        livePass: 0,
        liveFail: 1,
        liveBlocked: 0
      },
      activity: {
        eventPublications: 0,
        workflowIntents: 0,
        liveSearchEvidencePass: 0
      },
      health: {
        connectorSucceeded: 2,
        connectorFailed: 1,
        offlineLivePass: 0,
        offlineLiveFail: 1,
        offlineLiveBlocked: 0,
        relayRuntimeEvidenceCount: 0
      },
      ownerPolicy: {
        globalPolicyConfigured: true,
        globalEmergencyStopEngaged: false,
        hostPolicies: 0,
        enabledHostPolicies: 0,
        hostKillSwitchesEngaged: 0,
        reservations24h: 0,
        policyEvents: 2
      },
      existingLearningFindings: [
        {
          key: "measured-gap",
          category: "Operations",
          status: "gap",
          title: "Measured production gap",
          evidence: "A durable measured production gap remains.",
          action:
            "Resolve the measured gap before expanding the roadmap."
        }
      ]
    })
  );

  assert.equal(gap.overallState, "blocked");
  assert.ok(gap.candidates.length > 0);
  assert.ok(gap.candidates.length <= 12);
  assert.ok(
    gap.candidates.some(
      item => item.area === "capability-governance"
    )
  );
  assert.ok(
    gap.candidates.some(
      item => item.area === "tenant-isolation"
    )
  );
  assert.ok(
    gap.candidates.some(
      item =>
        item.title.includes("relay runtime health evidence")
    )
  );
  assert.ok(
    gap.candidates.every(
      item => !/^Build\s+\d+/i.test(item.title)
    )
  );

  assert.equal(
    productionLearningVIIDescriptor.candidateNumberingAutomatic,
    false
  );
  assert.equal(
    productionLearningVIIDescriptor.roadmapExtensionAutomatic,
    false
  );
  assert.equal(
    productionLearningVIIDescriptor.automaticActionEnvelopeExpanded,
    false
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    autonomousPage,
    productionLearningPage,
    navigation,
    docs,
    renewal,
    security,
    architecture,
    reviewSource,
    roadmap,
    packageRaw,
    ciDatabase
  ] = await Promise.all([
    source(
      "../../db/migrations/0113_autonomous_operations_v2_production_learning_vii.sql"
    ),
    source("lib/production-learning-vii.ts"),
    source("lib/production-learning-vii-database.ts"),
    source("app/api/production-learning-vii/route.ts"),
    source("app/production-learning-vii/page.tsx"),
    source(
      "app/production-learning-vii/ProductionLearningVIIConsole.tsx"
    ),
    source("app/autonomous-operations/page.tsx"),
    source("app/production-learning/page.tsx"),
    source("lib/application-navigation.ts"),
    source(
      "../../docs/BUILD_330_AUTONOMOUS_OPERATIONS_V2_PRODUCTION_LEARNING_VII.md"
    ),
    source("../../docs/ROADMAP_RENEWAL_AFTER_BUILD_330.md"),
    source("../../docs/SECURITY.md"),
    source("../../docs/ARCHITECTURE.md"),
    source(
      "../../docs/integration/ai-data-platform-build330-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for (const token of [
    "production_learning_vii_snapshots",
    "production_learning_vii_candidates",
    "candidate_count between 0 and 12",
    "numbered_build integer",
    "check (numbered_build is null)",
    "enable row level security",
    "revoke update, delete"
  ]) {
    assert.ok(
      migration.includes(token),
      "Build 330 migration missing " + token
    );
  }

  for (const token of [
    "buildProductionLearningVII",
    "installedHosts",
    "unusedEnabled",
    "liveCertified",
    "rollbackPrepared",
    "safeRecoveriesFailed",
    "failedAttempts",
    "tenantIsolation",
    "eventPublications",
    "workflowIntents",
    "liveSearchEvidencePass",
    "relayRuntimeEvidenceCount",
    "hostKillSwitchesEngaged",
    "finiteCandidateLimit: 12",
    "candidatesAreUnnumbered: true",
    "numberedNextBatchAuthorized: false",
    "nextBuildNumber: null",
    "automaticActionEnvelopeExpanded: false",
    "ql266Resumed: false"
  ]) {
    assert.ok(
      core.includes(token),
      "Build 330 core missing " + token
    );
  }

  for (const token of [
    "buildProductionLearningReview",
    "listAutonomousOperationsForUser",
    "listModuleSupervisorPoliciesForUser",
    "listModuleLifecycleForUser",
    "listCrossHostCertificationForUser",
    "listIntegrationRecoveryForUser",
    "event_bus_publications",
    "workflow_automation_action_intents",
    "workspace_connector_audit",
    "relayRuntimeEvidenceCount: 0",
    "refreshProductionLearningVII",
    "production_learning_vii_snapshots",
    "production_learning_vii_candidates"
  ]) {
    assert.ok(
      database.includes(token),
      "Build 330 database reconciliation missing " + token
    );
  }

  assert.ok(
    api.includes('"refresh-learning-vii"') &&
      api.includes("authentication_required") &&
      api.includes("Cache-Control")
  );

  for (const token of [
    "Build 330 · Autonomous Operations V2 · Production Learning VII",
    "Evidence-Driven Module Batch Closeout",
    "does not auto-create the next one",
    "/api/production-learning-vii"
  ]) {
    assert.ok(
      page.includes(token),
      "Build 330 page missing " + token
    );
  }

  for (const token of [
    "Installed hosts & capabilities",
    "Cross-host certification",
    "Lifecycle & autonomy",
    "Recovery & activity",
    "Connector, relay & offline health",
    "Owner policy usage",
    "Autonomous Operations V2 boundary",
    "Unnumbered evidence-backed candidates",
    "Numbered next batch authorized: <strong>No</strong>"
  ]) {
    assert.ok(
      client.includes(token),
      "Build 330 client missing " + token
    );
  }

  assert.ok(
    autonomousPage.includes(
      "Autonomous Operations V2 &amp; Production Learning VII"
    ) &&
      autonomousPage.includes(
        "Build 330 Autonomous Operations V2 boundary"
      ) &&
      autonomousPage.includes("Build 305") &&
      autonomousPage.includes("does not resume QL-266")
  );

  assert.ok(
    productionLearningPage.includes(
      "Build 330 · Production Learning VII renewal checkpoint"
    ) &&
      productionLearningPage.includes(
        'href="/production-learning-vii"'
      )
  );

  assert.ok(
    navigation.includes(
      'href: "/production-learning-vii"'
    ) &&
      navigation.includes(
        'label: "Production Learning VII"'
      )
  );

  for (const token of [
    "closes the finite Builds 306–330 module batch",
    "at most 12 candidates",
    "no automatically queued Build 331",
    "connector-health GET/HEAD",
    "dedicated relay runtime evidence as **0 / unproven**"
  ]) {
    assert.ok(
      docs.toLowerCase().includes(token.toLowerCase()),
      "Build 330 docs missing " + token
    );
  }

  for (const token of [
    "no automatically queued Build 331",
    "is not an approved build",
    "has no build number",
    "explicit owner authorization"
  ]) {
    assert.ok(
      renewal.toLowerCase().includes(token.toLowerCase()),
      "Build 330 renewal missing " + token
    );
  }

  assert.ok(
    security.includes(
      "Build 330 Autonomous Operations V2 and Production Learning VII security"
    ) &&
      security.includes(
        "does not widen the Build 305/325 automatic execution boundary"
      )
  );

  assert.ok(
    architecture.includes(
      "Build 330 — Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal"
    ) &&
      architecture.includes(
        "does not automatically create Build 331"
      )
  );

  const review = JSON.parse(reviewSource);
  assert.equal(review.build, 330);
  assert.equal(review.closedBatch, "306-330");
  assert.equal(
    review.reconciliation.activeVsUnusedCapabilities,
    true
  );
  assert.equal(
    review.reconciliation.eventWorkflowSearchActivity,
    true
  );
  assert.equal(
    review.autonomousOperationsV2.automaticActionEnvelopeExpanded,
    false
  );
  assert.equal(
    review.roadmapRenewal.finiteCandidateLimit,
    12
  );
  assert.equal(
    review.roadmapRenewal.candidatesUnnumbered,
    true
  );
  assert.equal(
    review.roadmapRenewal.automaticBuild331,
    false
  );
  assert.equal(review.nextBuildNumber, null);

  assert.ok(
    roadmap.includes(
      "Build 330 — Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal"
    ) &&
      roadmap.includes(
        "Build 330 must renew the roadmap from measured production evidence"
      )
  );

  const pkg = JSON.parse(packageRaw);
  const build = String(pkg.scripts.build);
  const build296 =
    "verify-build-296-shared-media-asset-exchange.ts";
  const build329 =
    "verify-build-329-cross-host-certification.ts";
  const build330 =
    "verify-build-330-autonomous-operations-v2-learning-vii.ts";
  const build295 =
    "verify-build-295-shared-catalogue-exchange.ts";
  const build292a =
    "verify-build-292a-ci-verification-consolidation.ts";
  const migrations = "run-production-migrations.ts";

  assert.ok(build.startsWith("tsx scripts/" + build296));
  assert.ok(build.indexOf(build330) > build.indexOf(build329));
  assert.ok(build.indexOf(build330) < build.indexOf(build295));
  assert.ok(build.indexOf(build330) < build.indexOf(build292a));
  assert.ok(build.indexOf(build330) < build.indexOf(migrations));
  assert.ok(build.endsWith("next build"));
  assert.ok(
    String(pkg.scripts["ci:spine"]).includes(build330)
  );
  assert.ok(
    String(pkg.scripts["verify:build330"]).includes(build330)
  );

  for (const table of [
    '"production_learning_vii_snapshots"',
    '"production_learning_vii_candidates"'
  ]) {
    assert.ok(
      ciDatabase.split(table).length >= 3,
      "Build 330 compact DB gate missing required + append-only " +
        table
    );
  }

  console.log(
    "Build 330 Autonomous Operations V2, Production Learning VII & Next Roadmap Renewal verification passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
