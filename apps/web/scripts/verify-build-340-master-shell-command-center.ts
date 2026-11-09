import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildMasterApplicationInventoryReadModel
} from "../lib/master-application-inventory-core";
import {
  composeMasterShellCommandCenter
} from "../lib/master-shell-command-center";
import type {
  IntegrationHealthCommandCenterModel
} from "../lib/integration-health-command-center";

const root = resolve(process.cwd());
const source = (path: string) =>
  readFileSync(resolve(root, path), "utf8");

const sourceIds = [
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
  "ai-data-platform",
  "rosevear-ai-hub"
] as const;

const registry = [
  {
    sourceId: "yw" as const,
    environment: "production" as const,
    declaredStatus: "CONNECTED",
    effectiveStatus: "CONNECTED",
    freshness: "FRESH" as const,
    statusObservedAt: "2026-11-09T12:00:00.000Z",
    statusExpiresAt: "2026-11-09T15:00:00.000Z",
    evidenceURI: "urn:rosevear:evidence:yw",
    manifestURI: "urn:rosevear:evidence:yw-manifest",
    immutableRevision: "yw-main-1",
    capabilityVersion: "1.0.0",
    approvedOrigin: "https://yw.example.invalid",
    rolesAllowed: ["owner"],
    evidenceAuthority: "independent-source-verification"
  },
  {
    sourceId: "icamp" as const,
    environment: "production" as const,
    declaredStatus: "AUTHORIZATION_HELD",
    effectiveStatus: "AUTHORIZATION_HELD",
    freshness: "FRESH" as const,
    statusObservedAt: "2026-11-09T12:00:00.000Z",
    statusExpiresAt: "2026-11-09T15:00:00.000Z",
    evidenceURI: "urn:rosevear:evidence:icamp",
    manifestURI: "urn:rosevear:evidence:icamp-manifest",
    immutableRevision: "icamp-main-1",
    capabilityVersion: "1.0.0",
    approvedOrigin: "https://icamp.example.invalid",
    rolesAllowed: ["owner"],
    evidenceAuthority: "operator-recorded"
  }
];

const partialInventory = buildMasterApplicationInventoryReadModel({
  registry,
  moduleReadiness: [
    {
      sourceId: "yw",
      moduleId: "booking",
      readinessState: "READY",
      completionPercent: 80,
      evidenceURI: "urn:rosevear:evidence:yw-booking",
      expiresAt: "2026-11-09T15:00:00.000Z",
      occurredAt: "2026-11-09T12:00:00.000Z",
      publishedAt: "2026-11-09T12:00:01.000Z",
      sourceRevision: "yw-main-1",
      sourceSequence: 10,
      verificationState: "reported"
    }
  ],
  releases: [
    {
      sourceId: "yw",
      releaseId: "build-550",
      branch: "main",
      deploymentStatus: "GREEN",
      evidenceURI: "urn:rosevear:evidence:yw-release",
      expiresAt: "2026-11-09T15:00:00.000Z",
      occurredAt: "2026-11-09T12:00:00.000Z",
      sourceRevision: "yw-main-1",
      sourceSequence: 11
    }
  ],
  requirements: [],
  completionScopes: [
    {
      sourceId: "yw",
      moduleId: null,
      scopeKey: "yw::*",
      scopeVersion: 1,
      scopeDate: "2026-11-09",
      branch: "main",
      commitSha: "67634008edcd6ed16185670c1982aad10995dca9",
      denominatorHash: "a".repeat(64),
      completion: {
        percent: 100,
        numerator: 2,
        denominator: 2,
        blockedByUnknown: 0,
        blockedByStale: 0
      },
      evidenceCoverage: {
        percent: 100,
        numerator: 14,
        denominator: 14,
        blockedByUnknown: 0,
        blockedByStale: 0
      },
      counts: {
        satisfied: 2,
        partial: 0,
        failed: 0,
        unknown: 0,
        stale: 0,
        criticalFailed: 0
      }
    }
  ],
  installedAiDataModules: [],
  unmappedHostInstances: 0,
  now: new Date("2026-11-09T13:00:00.000Z")
});

const integrationHealth: IntegrationHealthCommandCenterModel = {
  generatedAt: "2026-11-09T13:00:00.000Z",
  evidenceScope:
    "authorized-database-and-registered-local-evidence-only",
  summary: {
    state: "critical",
    registeredPeers: 6,
    disconnectedPeers: 0,
    unmeasuredPeers: 6,
    staleCredentials: 1,
    webhookEndpoints: 2,
    webhookDenied24h: 3,
    queuedEvents: 4,
    deliveryFailures24h: 1,
    degradedServices: 2,
    databaseLatencyMs: 12,
    connectorAverageLatencyMs: 45,
    connectorMaxLatencyMs: 70
  },
  signals: [
    {
      id: "queues",
      label: "Event queues",
      state: "critical",
      value: "4 queued",
      detail: "1 delivery failure in 24h.",
      href: "/event-recovery"
    },
    {
      id: "credentials",
      label: "Credential references",
      state: "attention",
      value: "1 need attention",
      detail: "Reference-only credential metadata.",
      href: "/credential-vault"
    }
  ],
  peers: [],
  connectorLatency: [],
  credentials: [
    {
      workspaceId: "workspace-1",
      applicationId: "yw",
      environment: "production",
      label: "YW reference",
      riskState: "rotation-due",
      rotationDueAt: "2026-11-09T14:00:00.000Z",
      expiresAt: null
    }
  ],
  webhooks: [],
  queues: {
    heldRoutes: 3,
    pendingRoutes: 1,
    deliveryFailures24h: 1,
    deadLetters: 2,
    replayRequests: 0
  },
  degradedServices: [],
  policy: {
    readOnlyDashboard: true,
    externalHealthProbePerformed: false,
    remoteAvailabilityInferred: false,
    credentialValuesRead: false,
    automaticRecoveryTriggered: false,
    automaticConnectionActivation: false,
    ql266Resumed: false,
    legacyQl266PrerequisiteRetired: true
  }
};

const partial = composeMasterShellCommandCenter({
  inventory: partialInventory,
  integrationHealth,
  now: new Date("2026-11-09T13:00:00.000Z")
});

assert.equal(partial.build, 340);
assert.equal(partial.views.applications.length, 6);
assert.equal(partial.policy.exactSixApplications, true);
assert.equal(
  partial.views.management.portfolioCompletionPercent,
  null
);
assert.equal(
  partial.views.management.portfolioCompletionBlocked,
  true
);
assert.equal(
  partial.views.management.sourceWideCompletionScopes,
  1
);
assert.equal(
  partial.views.management.sourceWideCompletionCalculable,
  1
);
assert.equal(
  partial.views.management.sourceWideCompletionCoveragePercent,
  16.67
);
assert.equal(
  partial.views.it.security.criticalCredentialReferences,
  1
);
assert.equal(partial.views.it.security.state, "critical");
assert.ok(
  partial.attentionQueue.some(
    (item) =>
      item.id === "application:icamp" &&
      item.state === "held"
  )
);
assert.ok(
  partial.attentionQueue.some(
    (item) =>
      item.id === "it:queues" &&
      item.state === "critical"
  )
);
assert.ok(
  partial.attentionQueue.some(
    (item) =>
      item.id === "completion:rosiedazzlers" &&
      item.state === "unmeasured"
  )
);
assert.equal(partial.attentionQueue[0]?.state, "critical");
assert.equal(
  partial.policy.greenReleaseImpliesFunctionalAcceptance,
  false
);
assert.equal(
  partial.policy.sourceAcceptedImpliesMasterAcceptance,
  false
);
assert.equal(
  partial.policy.externalHealthProbePerformed,
  false
);
assert.equal(partial.policy.credentialValuesRead, false);

const allSixScopes = sourceIds.map((sourceId, index) => ({
  sourceId,
  moduleId: null,
  scopeKey: sourceId + "::*",
  scopeVersion: 1,
  scopeDate: "2026-11-09",
  branch: "main",
  commitSha: "67634008edcd6ed16185670c1982aad10995dca9",
  denominatorHash: String(index + 1).repeat(64).slice(0, 64),
  completion: {
    percent: index === 0 ? 50 : 100,
    numerator: index === 0 ? 1 : 2,
    denominator: 2,
    blockedByUnknown: 0,
    blockedByStale: 0
  },
  evidenceCoverage: {
    percent: 100,
    numerator: 14,
    denominator: 14,
    blockedByUnknown: 0,
    blockedByStale: 0
  },
  counts: {
    satisfied: index === 0 ? 1 : 2,
    partial: index === 0 ? 1 : 0,
    failed: 0,
    unknown: 0,
    stale: 0,
    criticalFailed: 0
  }
}));

const fullInventory = buildMasterApplicationInventoryReadModel({
  registry,
  moduleReadiness: [],
  releases: [],
  requirements: [],
  completionScopes: allSixScopes,
  installedAiDataModules: [],
  unmappedHostInstances: 0,
  now: new Date("2026-11-09T13:00:00.000Z")
});

const full = composeMasterShellCommandCenter({
  inventory: fullInventory,
  integrationHealth: {
    ...integrationHealth,
    summary: {
      ...integrationHealth.summary,
      state: "healthy",
      staleCredentials: 0,
      webhookDenied24h: 0,
      queuedEvents: 0,
      deliveryFailures24h: 0,
      degradedServices: 0
    },
    signals: [],
    credentials: [],
    queues: {
      heldRoutes: 0,
      pendingRoutes: 0,
      deliveryFailures24h: 0,
      deadLetters: 0,
      replayRequests: 0
    }
  },
  now: new Date("2026-11-09T13:00:00.000Z")
});

assert.equal(
  full.views.management.portfolioCompletionBlocked,
  false
);
assert.equal(
  full.views.management.portfolioCompletionNumerator,
  11
);
assert.equal(
  full.views.management.portfolioCompletionDenominator,
  12
);
assert.equal(
  full.views.management.portfolioCompletionPercent,
  91.67
);
assert.equal(
  full.views.management.sourceWideCompletionCoveragePercent,
  100
);
assert.equal(
  full.views.management.sourceWideCalculableCoveragePercent,
  100
);

const command = source("lib/master-shell-command-center.ts");
for (const token of [
  "composeMasterShellCommandCenter",
  "buildMasterShellCommandCenter",
  "listMasterApplicationInventoryForUser",
  "buildIntegrationHealthCommandCenter",
  "portfolioPercentageRequiresAllSixCalculable",
  "missingEvidenceRemainsUnknownOrUnmeasured",
  "greenReleaseImpliesFunctionalAcceptance",
  "sourceAcceptedImpliesMasterAcceptance"
]) {
  assert.ok(command.includes(token), "command token " + token);
}
assert.ok(!command.includes("insert into"));
assert.ok(!command.includes("update app."));
assert.ok(!command.includes("delete from"));

const api = source("app/api/master-shell-command-center/route.ts");
assert.ok(api.includes("api.master-shell-command-center.get"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("Cache-Control"));
assert.ok(!api.includes("export async function POST"));
assert.ok(!api.includes("export async function PUT"));
assert.ok(!api.includes("export async function DELETE"));

const page = source("app/master-shell-command-center/page.tsx");
for (const token of [
  "Master Shell Command Center V1",
  "Applications",
  "I.T. / Security",
  "Management",
  "Statistics",
  "Evidence first.",
  "Portfolio completion",
  "UNAVAILABLE"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
const operatorTools = source("lib/module-operator-tools.ts");
const inventoryPage = source("app/master-application-inventory/page.tsx");
assert.ok(
  navigation.includes('href: "/master-shell-command-center"')
);
assert.ok(
  operatorTools.includes('"/master-shell-command-center"')
);
assert.ok(
  inventoryPage.includes('href="/master-shell-command-center"')
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build340-review.json")
);
assert.equal(review.build, 340);
assert.equal(review.views.applications, true);
assert.equal(review.views.itSecurity, true);
assert.equal(review.views.management, true);
assert.equal(review.views.statistics, true);
assert.equal(
  review.management.portfolioPercentageRequiresAllSixCalculable,
  true
);
assert.equal(
  review.management.partialPortfolioAverageAllowed,
  false
);
assert.equal(review.persistence.newDatabaseMigration, false);
assert.equal(review.persistence.newCommandCenterTable, false);
assert.deepEqual(review.surfaces.apiMethods, ["GET"]);
assert.equal(review.nextQueuedBuild, 341);

const docs = source(
  "../../docs/BUILD_340_MASTER_SHELL_COMMAND_CENTER_V1.md"
);
assert.ok(
  docs.includes(
    "Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation"
  )
);
assert.ok(
  docs.includes(
    "all six applications have an approved source-wide Master Completion scope"
  )
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 341 — Outer Sysop Navigation, Ree/Jack Context Handoff, Role & Tenant Isolation"
  )
);

const previousVerifier = source(
  "scripts/verify-build-339-application-module-inventory.ts"
);
assert.ok(
  previousVerifier.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models** — Production"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
const architecture = source("../../docs/ARCHITECTURE.md");
const securityDoc = source("../../docs/SECURITY.md");
assert.ok(
  response.includes(
    "Build 340 contribution — Master Shell Command Center V1"
  )
);
assert.ok(
  architecture.includes(
    "Build 340 — Master Shell Command Center V1"
  )
);
assert.ok(
  securityDoc.includes(
    "Build 340 Master Shell Command Center security boundary"
  )
);

const pkg = JSON.parse(source("package.json"));
const verifyCommand =
  "tsx scripts/verify-build-340-master-shell-command-center.ts";
assert.equal(pkg.scripts["verify:build340"], verifyCommand);
assert.ok(String(pkg.scripts.build).includes(verifyCommand));
assert.ok(String(pkg.scripts["ci:spine"]).includes(verifyCommand));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-339-application-module-inventory.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-340-master-shell-command-center.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-340-master-shell-command-center.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 340 Master Shell Command Center V1 verification passed."
);
