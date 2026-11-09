import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  composeModuleHealthIntelligence,
  type ModuleHealthInventoryInput
} from "../lib/module-health-intelligence";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const inventory: ModuleHealthInventoryInput = {
  applications: [
    {
      sourceId: "yw",
      displayName: "Yard Workers",
      applicationState: {
        effectiveStatus: "AUTHORIZATION_HELD",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:yw-registry"
      },
      versionEvidence: { latestRelease: null },
      modules: [
        {
          moduleId: "routing",
          sourceReportedReadiness: {
            readinessState: "IN_PROGRESS",
            completionPercent: 60,
            evidenceURI: "urn:rosevear:evidence:yw-routing",
            freshness: "FRESH",
            observedAt: "2026-11-09T10:00:00.000Z",
            expiresAt: "2026-11-10T10:00:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: "yw::routing",
            evidenceState: "EVIDENCE_NOT_COMPLETE",
            completion: {
              percent: 60,
              blockedByUnknown: 0,
              blockedByStale: 0
            },
            counts: {
              failed: 0,
              criticalFailed: 0,
              unknown: 0,
              stale: 0
            }
          }
        }
      ]
    },
    {
      sourceId: "icamp",
      displayName: "iCamp",
      applicationState: {
        effectiveStatus: "CONNECTED",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:icamp-registry"
      },
      versionEvidence: {
        latestRelease: {
          deploymentStatus: "GREEN",
          freshness: "FRESH",
          evidenceURI: "urn:rosevear:evidence:icamp-release"
        }
      },
      modules: [
        {
          moduleId: "reservations",
          sourceReportedReadiness: {
            readinessState: "IN_PROGRESS",
            completionPercent: 82,
            evidenceURI: "urn:rosevear:evidence:icamp-reservations",
            freshness: "FRESH",
            observedAt: "2026-11-08T08:00:00.000Z",
            expiresAt: "2026-11-10T18:00:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: "icamp::reservations",
            evidenceState: "EVIDENCE_NOT_COMPLETE",
            completion: {
              percent: 82,
              blockedByUnknown: 0,
              blockedByStale: 0
            },
            counts: {
              failed: 0,
              criticalFailed: 0,
              unknown: 0,
              stale: 0
            }
          }
        }
      ]
    },
    {
      sourceId: "rosiedazzlers",
      displayName: "Rosie Dazzlers",
      applicationState: {
        effectiveStatus: "CONNECTED",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:rosie-registry"
      },
      versionEvidence: { latestRelease: null },
      modules: [
        {
          moduleId: "booking",
          sourceReportedReadiness: {
            readinessState: "BLOCKED",
            completionPercent: 70,
            evidenceURI: "urn:rosevear:evidence:rosie-booking",
            freshness: "FRESH",
            observedAt: "2026-11-09T14:00:00.000Z",
            expiresAt: "2026-11-10T14:00:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: "rosiedazzlers::booking",
            evidenceState: "EVIDENCE_NOT_COMPLETE",
            completion: {
              percent: 70,
              blockedByUnknown: 0,
              blockedByStale: 0
            },
            counts: {
              failed: 0,
              criticalFailed: 0,
              unknown: 0,
              stale: 0
            }
          }
        }
      ]
    },
    {
      sourceId: "devilndove",
      displayName: "Devil n Dove",
      applicationState: {
        effectiveStatus: "CONNECTED",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:dnd-registry"
      },
      versionEvidence: { latestRelease: null },
      modules: [
        {
          moduleId: "workshop",
          sourceReportedReadiness: {
            readinessState: "READY",
            completionPercent: 90,
            evidenceURI: "urn:rosevear:evidence:dnd-workshop",
            freshness: "FRESH",
            observedAt: "2026-11-09T15:00:00.000Z",
            expiresAt: "2026-11-10T15:00:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: "devilndove::workshop",
            evidenceState: "EVIDENCE_INCOMPLETE",
            completion: {
              percent: null,
              blockedByUnknown: 1,
              blockedByStale: 0
            },
            counts: {
              failed: 0,
              criticalFailed: 0,
              unknown: 1,
              stale: 0
            }
          }
        }
      ]
    },
    {
      sourceId: "ai-data-platform",
      displayName: "AI Data Platform",
      applicationState: {
        effectiveStatus: "CONNECTED",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:ai-data-registry"
      },
      versionEvidence: { latestRelease: null },
      modules: [
        {
          moduleId: "master-shell",
          sourceReportedReadiness: {
            readinessState: "ACCEPTED",
            completionPercent: 100,
            evidenceURI: "urn:rosevear:evidence:ai-data-master-shell",
            freshness: "FRESH",
            observedAt: "2026-11-09T15:30:00.000Z",
            expiresAt: "2026-11-10T15:30:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: "ai-data-platform::master-shell",
            evidenceState: "EVIDENCE_COMPLETE",
            completion: {
              percent: 100,
              blockedByUnknown: 0,
              blockedByStale: 0
            },
            counts: {
              failed: 0,
              criticalFailed: 0,
              unknown: 0,
              stale: 0
            }
          }
        }
      ]
    },
    {
      sourceId: "rosevear-ai-hub",
      displayName: "Rosevear AI Hub",
      applicationState: {
        effectiveStatus: "CONNECTED",
        freshness: "FRESH",
        evidenceURI: "urn:rosevear:evidence:hub-registry"
      },
      versionEvidence: { latestRelease: null },
      modules: [
        {
          moduleId: "windows-host",
          sourceReportedReadiness: {
            readinessState: "READY",
            completionPercent: 95,
            evidenceURI: "urn:rosevear:evidence:hub-host",
            freshness: "STALE",
            observedAt: "2026-11-07T12:00:00.000Z",
            expiresAt: "2026-11-09T12:00:00.000Z",
            verificationState: "independently-verified"
          },
          masterCompletion: {
            scopeKey: null,
            evidenceState: "UNSCOPED",
            completion: null,
            counts: null
          }
        }
      ]
    }
  ]
};

const model = composeModuleHealthIntelligence({
  inventory,
  now: new Date("2026-11-09T16:00:00.000Z"),
  stuckAfterHours: 24
});

assert.equal(model.build, 344);
assert.equal(model.summary.applications, 6);
assert.equal(model.summary.modules, 6);
assert.equal(model.summary.hold, 1);
assert.equal(model.summary.blocked, 1);
assert.equal(model.summary.stale, 1);
assert.equal(model.summary.stuckCandidates, 1);
assert.equal(model.summary.evidenceBlocked, 1);
assert.equal(model.summary.healthySignals, 1);

const byKey = new Map(
  model.applications.flatMap((app) =>
    app.modules.map((module) => [
      module.sourceId + "::" + module.moduleId,
      module
    ] as const)
  )
);
assert.equal(byKey.get("yw::routing")?.healthState, "HOLD");
assert.equal(
  byKey.get("icamp::reservations")?.healthState,
  "STUCK_CANDIDATE"
);
assert.equal(
  byKey.get("rosiedazzlers::booking")?.healthState,
  "BLOCKED"
);
assert.equal(
  byKey.get("devilndove::workshop")?.healthState,
  "EVIDENCE_BLOCKED"
);
assert.equal(
  byKey.get("ai-data-platform::master-shell")?.healthState,
  "HEALTHY_SIGNAL"
);
assert.equal(
  byKey.get("rosevear-ai-hub::windows-host")?.healthState,
  "STALE"
);
assert.equal(model.policy.stuckCandidateIsSourceTruth, false);
assert.equal(model.policy.holdAutomaticallyReleased, false);
assert.equal(model.policy.automaticRecoveryPerformed, false);
assert.equal(model.policy.missingEvidenceMeansHealthy, false);

assert.throws(
  () =>
    composeModuleHealthIntelligence({
      inventory,
      stuckAfterHours: 0
    }),
  /module_health_stuck_threshold_invalid/
);

const core = source("lib/module-health-intelligence.ts");
for (const token of [
  "MODULE_HEALTH_INTELLIGENCE_BUILD = 344",
  "DEFAULT_STUCK_AFTER_HOURS = 24",
  "STUCK_CANDIDATE",
  "EVIDENCE_BLOCKED",
  "SOURCE_AUTHORIZATION_HELD",
  "SOURCE_REPORTED_BLOCKED",
  "MASTER_COMPLETION_EVIDENCE_BLOCKED",
  "stuckCandidateIsSourceTruth: false",
  "holdAutomaticallyReleased: false",
  "automaticRecoveryPerformed: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}
assert.ok(!core.includes("fetch("));

const database = source("lib/module-health-intelligence-database.ts");
assert.ok(database.includes("listMasterApplicationInventoryForUser"));
assert.ok(!database.includes("insert into"));
assert.ok(!database.includes("update app."));
assert.ok(!database.includes("delete from"));

const api = source("app/api/module-health-intelligence/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(!api.includes("export async function POST"));
assert.ok(api.includes("authentication_required"));

const page = source("app/module-health-intelligence/page.tsx");
for (const token of [
  "Module Health &",
  "Stuck is a review candidate, not source truth.",
  "STUCK_CANDIDATE",
  "Read-only intelligence."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/module-health-intelligence"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/module-health-intelligence"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/module-health-intelligence"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/module-health-intelligence"'));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 343 — Cross-Application Interaction Trace, Dependency Graph & Failure Propagation** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 345 — Role/Device Acceptance Matrix: Customer, Worker & Admin / Mobile, Tablet, Desktop"
  )
);

const docs = source(
  "../../docs/BUILD_344_MODULE_HEALTH_STUCK_STATE_BLOCKER_INTELLIGENCE.md"
);
assert.ok(docs.includes("Stuck candidates are derived review intelligence"));
assert.ok(docs.includes("Build 345 — Role/Device Acceptance Matrix"));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build344-review.json")
);
assert.equal(review.build, 344);
assert.equal(review.authority.readOnly, true);
assert.equal(review.authority.automaticRecoveryAllowed, false);
assert.equal(review.inference.stuckCandidateIsSourceTruth, false);
assert.equal(review.nextQueuedBuild, 345);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-344-module-health-intelligence.ts";
assert.equal(pkg.scripts["verify:build344"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-343-cross-application-interaction-trace.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-344-module-health-intelligence.ts"
    )
);

console.log(
  "Build 344 Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence verification passed."
);
