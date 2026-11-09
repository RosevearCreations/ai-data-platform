import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildMasterApplicationInventoryReadModel,
  normalizeHostApplicationId,
  type MasterApplicationInventoryInput
} from "../lib/master-application-inventory-core";

const root = resolve(process.cwd());
const source = (path: string) =>
  readFileSync(resolve(root, path), "utf8");

assert.equal(normalizeHostApplicationId("yard-workers"), "yw");
assert.equal(normalizeHostApplicationId("YW"), "yw");
assert.equal(
  normalizeHostApplicationId("rosevear-ai-hub"),
  "rosevear-ai-hub"
);
assert.equal(normalizeHostApplicationId("unknown-host"), null);

const fixture: MasterApplicationInventoryInput = {
  registry: [
    {
      sourceId: "yw",
      environment: "production",
      declaredStatus: "CONNECTED",
      effectiveStatus: "CONNECTED",
      freshness: "FRESH",
      statusObservedAt: "2026-11-09T12:00:00.000Z",
      statusExpiresAt: "2026-11-09T15:00:00.000Z",
      evidenceURI: "urn:rosevear:evidence:yw-source",
      manifestURI: "urn:rosevear:evidence:yw-manifest",
      immutableRevision: "abc123",
      capabilityVersion: "1.2.3",
      approvedOrigin: "https://example.invalid",
      rolesAllowed: ["owner", "admin"],
      evidenceAuthority: "independent-source-verification"
    }
  ],
  moduleReadiness: [
    {
      sourceId: "yw",
      moduleId: "booking",
      readinessState: "ACCEPTED",
      completionPercent: 100,
      evidenceURI: "urn:rosevear:evidence:yw-booking",
      expiresAt: "2026-11-09T15:00:00.000Z",
      occurredAt: "2026-11-09T12:00:00.000Z",
      publishedAt: "2026-11-09T12:00:01.000Z",
      sourceRevision: "abc123",
      sourceSequence: 20,
      verificationState: "reported"
    },
    {
      sourceId: "yw",
      moduleId: "stale-module",
      readinessState: "READY",
      completionPercent: 80,
      evidenceURI: "urn:rosevear:evidence:yw-stale",
      expiresAt: "2026-11-09T12:30:00.000Z",
      occurredAt: "2026-11-09T11:00:00.000Z",
      publishedAt: "2026-11-09T11:00:01.000Z",
      sourceRevision: "abc122",
      sourceSequence: 19,
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
      sourceRevision: "abc123",
      sourceSequence: 21
    }
  ],
  requirements: [
    {
      requirementId: "req_booking_1",
      sourceId: "yw",
      moduleId: "booking",
      title: "Booking requirement",
      applicability: "required"
    },
    {
      requirementId: "req_reqonly_1",
      sourceId: "yw",
      moduleId: "requirements-only",
      title: "Requirement-only module",
      applicability: "unscoped"
    }
  ],
  completionScopes: [
    {
      sourceId: "yw",
      moduleId: "booking",
      scopeKey: "yw::booking",
      scopeVersion: 1,
      scopeDate: "2026-11-09",
      branch: "main",
      commitSha: "52e1b88f118f612dbfc681557163675095577ba8",
      denominatorHash: "a".repeat(64),
      completion: {
        percent: null,
        numerator: 0,
        denominator: 1,
        blockedByUnknown: 1,
        blockedByStale: 0
      },
      evidenceCoverage: {
        percent: 50,
        numerator: 1,
        denominator: 2,
        blockedByUnknown: 1,
        blockedByStale: 0
      },
      counts: {
        satisfied: 0,
        partial: 0,
        failed: 0,
        unknown: 1,
        stale: 0,
        criticalFailed: 0
      }
    }
  ],
  installedAiDataModules: [
    {
      sourceId: "yw",
      moduleHostInstanceId: "host-module-1",
      workspaceId: "workspace-1",
      hostApplicationId: "yard-workers",
      hostInstanceId: "yw-production",
      environment: "production",
      currentVersion: "1.0.0",
      lastKnownGoodVersion: "1.0.0",
      lifecycleState: "installed",
      installationEvidence: "urn:rosevear:evidence:installed-ai-data",
      observedAt: "2026-11-09T12:00:00.000Z",
      updatedAt: "2026-11-09T12:00:00.000Z"
    }
  ],
  unmappedHostInstances: 1,
  now: new Date("2026-11-09T13:00:00.000Z")
};

const model = buildMasterApplicationInventoryReadModel(fixture);
assert.equal(model.build, 339);
assert.equal(model.applications.length, 6);
assert.equal(model.policy.exactSixApplications, true);
assert.equal(
  model.policy.commsHubIsComplementaryControlPlaneNotChildApplication,
  true
);
assert.equal(model.summary.unmappedHostInstances, 1);

const yw = model.applications.find((item) => item.sourceId === "yw");
assert.ok(yw);
assert.equal(yw.applicationState.effectiveStatus, "CONNECTED");
assert.equal(yw.versionEvidence.immutableRevision, "abc123");
assert.equal(yw.versionEvidence.capabilityVersion, "1.2.3");
assert.equal(yw.versionEvidence.latestRelease?.deploymentStatus, "GREEN");
assert.equal(
  yw.capabilities.discoveryImpliesAuthorization,
  false
);
assert.equal(yw.capabilities.discoveryImpliesAcceptance, false);
assert.equal(yw.ownership.productOwner, null);
assert.deepEqual(yw.ownership.rolesAllowed, ["owner", "admin"]);

const booking = yw.modules.find((item) => item.moduleId === "booking");
assert.ok(booking);
assert.equal(
  booking.sourceReportedReadiness.readinessState,
  "ACCEPTED"
);
assert.equal(booking.sourceReportedReadiness.freshness, "FRESH");
assert.equal(
  booking.sourceReportedReadiness.masterAcceptanceInferred,
  false
);
assert.equal(booking.masterCompletion.evidenceState, "EVIDENCE_INCOMPLETE");
assert.equal(booking.masterCompletion.completion?.percent, null);
assert.equal(
  booking.masterCompletion.productionAcceptanceInferred,
  false
);
assert.ok(
  booking.inventoryOrigins.includes("source-readiness-event")
);
assert.ok(
  booking.inventoryOrigins.includes("master-completion-requirement")
);
assert.ok(
  booking.inventoryOrigins.includes("master-completion-scope")
);
assert.equal(booking.cataloguePresenceImpliesAcceptance, false);

const stale = yw.modules.find(
  (item) => item.moduleId === "stale-module"
);
assert.ok(stale);
assert.equal(stale.sourceReportedReadiness.freshness, "STALE");

const requirementOnly = yw.modules.find(
  (item) => item.moduleId === "requirements-only"
);
assert.ok(requirementOnly);
assert.equal(
  requirementOnly.sourceReportedReadiness.readinessState,
  "UNKNOWN"
);
assert.equal(
  requirementOnly.sourceReportedReadiness.freshness,
  "UNMEASURED"
);

const installed = yw.modules.find(
  (item) => item.moduleId === "rosevear.ai-data-platform"
);
assert.ok(installed);
assert.ok(
  installed.inventoryOrigins.includes("installed-ai-data-module")
);
assert.deepEqual(
  installed.versionEvidence.installedAiDataModuleVersion,
  ["1.0.0"]
);
assert.equal(
  installed.versionEvidence.installedVersionProvesSourceModuleAcceptance,
  false
);
assert.ok(installed.capabilityEvidence.declaredCapabilities.length > 0);
assert.equal(
  installed.capabilityEvidence.acceptedCapabilitiesInferred,
  false
);

const icamp = model.applications.find(
  (item) => item.sourceId === "icamp"
);
assert.ok(icamp);
assert.equal(icamp.applicationState.effectiveStatus, "UNKNOWN");
assert.equal(icamp.applicationState.freshness, "UNMEASURED");
assert.equal(icamp.modules.length, 0);

const database = source(
  "lib/master-application-inventory-database.ts"
);
for (const token of [
  "listMasterApplicationInventoryForUser",
  "master_shell_source_registry_evidence",
  "master_shell_source_updates",
  "module.readiness.changed",
  "release.promoted",
  "module_host_instances",
  "listMasterCompletionForUser",
  "buildMasterApplicationInventoryReadModel"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("insert into"));
assert.ok(!database.includes("update app."));
assert.ok(!database.includes("delete from"));
assert.ok(!database.includes("fetch("));

const api = source(
  "app/api/master-application-inventory/route.ts"
);
for (const token of [
  "authentication_required",
  "api.master-application-inventory.get",
  "Cache-Control",
  "listMasterApplicationInventoryForUser"
]) {
  assert.ok(api.includes(token), "API token " + token);
}
assert.ok(!api.includes("export async function POST"));

const page = source("app/master-application-inventory/page.tsx");
for (const token of [
  "Applications, Modules, Capabilities &amp; Readiness",
  "Inventory is not acceptance.",
  "Source-reported completion",
  "suite completion",
  "catalogue presence implies acceptance"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
const operatorTools = source("lib/module-operator-tools.ts");
const completionPage = source("app/master-completion/page.tsx");
assert.ok(
  navigation.includes('href: "/master-application-inventory"')
);
assert.ok(
  operatorTools.includes('"/master-application-inventory"')
);
assert.ok(
  completionPage.includes('href="/master-application-inventory"')
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build339-review.json")
);
assert.equal(review.build, 339);
assert.equal(review.applications.exactSixSources, true);
assert.equal(
  review.modules.cataloguePresenceImpliesAcceptance,
  false
);
assert.equal(
  review.capabilities.discoveryImpliesAuthorization,
  false
);
assert.equal(
  review.versions.greenReleaseImpliesFunctionalAcceptance,
  false
);
assert.equal(review.persistence.newInventoryTable, false);
assert.equal(review.nextQueuedBuild, 340);

const docs = source(
  "../../docs/BUILD_339_APPLICATION_MODULE_INVENTORY_READ_MODELS.md"
);
assert.ok(
  docs.includes(
    "Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics"
  )
);
assert.ok(docs.includes("Build 339 adds **no new inventory persistence table**"));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 340 — Master Shell Command Center V1: Applications, IT, Management & Statistics"
  )
);

const previousVerifier = source(
  "scripts/verify-build-338-master-completion-requirements.ts"
);
assert.ok(
  previousVerifier.includes(
    "Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring** — Production"
  )
);

const response = source(
  "../../docs/MASTER_SHELL_AI_DATA_PLATFORM_IMPLEMENTATION_RESPONSE.md"
);
const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  response.includes(
    "Build 339 contribution — application/module inventory read models"
  )
);
assert.ok(
  architecture.includes(
    "Build 339 — Application & Module Inventory, Capability and Readiness Read Models"
  )
);
assert.ok(
  security.includes("Build 339 inventory/readiness security")
);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-339-application-module-inventory.ts";
assert.equal(pkg.scripts["verify:build339"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-338-master-completion-requirements.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-339-application-module-inventory.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-339-application-module-inventory.ts"
  ) < String(pkg.scripts.build).indexOf(
    "run-production-migrations.ts"
  )
);

console.log(
  "Build 339 Application & Module Inventory, Capability and Readiness Read Models verification passed."
);
