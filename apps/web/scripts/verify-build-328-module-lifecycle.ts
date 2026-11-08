import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildModuleRollbackPlan,
  buildModuleUpgradePlan,
  compareModuleSemver,
  moduleLifecycleManagerDescriptor,
  moduleLifecycleSha256
} from "../lib/module-lifecycle-manager";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const prerequisites = {
  databaseReady: true,
  schemaReady: true,
  backupVerified: true,
  hostContractVersion: 1,
  protocolVersion: 1,
  minimumHostContractVersion: 1,
  minimumProtocolVersion: 1
};

const migrations = [
  {
    id: "db.prepare-v2",
    order: 10,
    kind: "database" as const,
    prerequisites: [],
    reversible: true,
    description: "Prepare version-two database compatibility."
  },
  {
    id: "schema.activate-v2",
    order: 20,
    kind: "schema" as const,
    prerequisites: ["db.prepare-v2"],
    reversible: true,
    description: "Activate version-two schema compatibility."
  }
];

async function main() {
  assert.equal(compareModuleSemver("1.0.0", "1.0.1"), -1);
  assert.equal(compareModuleSemver("1.1.0", "1.0.9"), 1);
  assert.equal(compareModuleSemver("1.0.0", "1.0.0"), 0);

  const safe = buildModuleUpgradePlan({
    currentVersion: "1.0.0",
    targetVersion: "1.1.0",
    lastKnownGoodVersion: "1.0.0",
    canary: false,
    prerequisites,
    policy: {
      allowBreakingCompatibilityBoundary: false,
      requireCanaryForBreakingUpgrade: true
    },
    migrations
  });
  assert.equal(safe.state, "ready-for-owner-approval");
  assert.equal(safe.ownerApprovalRequired, true);
  assert.equal(safe.automaticExecution, false);
  assert.equal(safe.breakingCompatibilityBoundary, false);
  assert.equal(safe.rollback.targetVersion, "1.0.0");
  assert.deepEqual(safe.rollback.reverseMigrationIds, [
    "schema.activate-v2",
    "db.prepare-v2"
  ]);
  assert.equal(safe.rollback.manualRestoreRequired, false);

  const breakingHeld = buildModuleUpgradePlan({
    currentVersion: "1.9.0",
    targetVersion: "2.0.0",
    lastKnownGoodVersion: "1.9.0",
    canary: true,
    prerequisites,
    policy: {
      allowBreakingCompatibilityBoundary: false,
      requireCanaryForBreakingUpgrade: true
    },
    migrations
  });
  assert.equal(breakingHeld.state, "held");
  assert.ok(
    breakingHeld.checks.some(
      (item) =>
        item.id === "compatibility-boundary" &&
        item.state === "held"
    )
  );

  const breakingNeedsCanary = buildModuleUpgradePlan({
    currentVersion: "1.9.0",
    targetVersion: "2.0.0",
    lastKnownGoodVersion: "1.9.0",
    canary: false,
    prerequisites,
    policy: {
      allowBreakingCompatibilityBoundary: true,
      requireCanaryForBreakingUpgrade: true
    },
    migrations
  });
  assert.equal(breakingNeedsCanary.state, "held");
  assert.ok(
    breakingNeedsCanary.checks.some(
      (item) =>
        item.id === "canary-policy" &&
        item.state === "held"
    )
  );

  const breakingCanary = buildModuleUpgradePlan({
    currentVersion: "1.9.0",
    targetVersion: "2.0.0",
    lastKnownGoodVersion: "1.9.0",
    canary: true,
    prerequisites,
    policy: {
      allowBreakingCompatibilityBoundary: true,
      requireCanaryForBreakingUpgrade: true
    },
    migrations
  });
  assert.equal(
    breakingCanary.state,
    "ready-for-owner-approval"
  );

  const prerequisiteHeld = buildModuleUpgradePlan({
    currentVersion: "1.0.0",
    targetVersion: "1.0.1",
    lastKnownGoodVersion: "1.0.0",
    canary: false,
    prerequisites: {
      ...prerequisites,
      databaseReady: false,
      backupVerified: false
    },
    policy: {
      allowBreakingCompatibilityBoundary: false,
      requireCanaryForBreakingUpgrade: true
    },
    migrations: []
  });
  assert.equal(prerequisiteHeld.state, "held");
  assert.ok(
    prerequisiteHeld.checks.some(
      (item) =>
        item.id === "database-prerequisite" &&
        item.state === "held"
    )
  );
  assert.ok(
    prerequisiteHeld.checks.some(
      (item) =>
        item.id === "backup-prerequisite" &&
        item.state === "held"
    )
  );

  const downgrade = buildModuleUpgradePlan({
    currentVersion: "1.1.0",
    targetVersion: "1.0.9",
    lastKnownGoodVersion: "1.0.0",
    canary: false,
    prerequisites,
    policy: {
      allowBreakingCompatibilityBoundary: false,
      requireCanaryForBreakingUpgrade: false
    },
    migrations: []
  });
  assert.equal(downgrade.state, "held");

  assert.throws(
    () =>
      buildModuleUpgradePlan({
        currentVersion: "1.0.0",
        targetVersion: "1.0.1",
        lastKnownGoodVersion: "1.0.0",
        canary: false,
        prerequisites,
        policy: {
          allowBreakingCompatibilityBoundary: false,
          requireCanaryForBreakingUpgrade: false
        },
        migrations: [
          {
            id: "schema.second",
            order: 10,
            kind: "schema",
            prerequisites: ["db.later"],
            reversible: true,
            description: "Invalid dependency order."
          },
          {
            id: "db.later",
            order: 20,
            kind: "database",
            prerequisites: [],
            reversible: true,
            description: "Later prerequisite."
          }
        ]
      }),
    /module_lifecycle_migration_order_dependency_invalid/
  );

  const rollback = buildModuleRollbackPlan({
    currentVersion: "1.1.0",
    lastKnownGoodVersion: "1.0.0",
    migrations
  });
  assert.equal(rollback.state, "ready");
  assert.equal(rollback.automaticExecution, false);
  assert.deepEqual(rollback.reverseMigrationIds, [
    "schema.activate-v2",
    "db.prepare-v2"
  ]);

  const irreversibleRollback = buildModuleRollbackPlan({
    currentVersion: "2.0.0",
    lastKnownGoodVersion: "1.9.0",
    migrations: [
      ...migrations,
      {
        id: "configuration.irreversible",
        order: 30,
        kind: "configuration",
        prerequisites: ["schema.activate-v2"],
        reversible: false,
        description: "Requires owner-supervised restoration."
      }
    ]
  });
  assert.equal(irreversibleRollback.state, "held");
  assert.equal(irreversibleRollback.manualRestoreRequired, true);
  assert.deepEqual(
    irreversibleRollback.blockedByIrreversibleMigrationIds,
    ["configuration.irreversible"]
  );

  assert.equal(
    moduleLifecycleSha256({ b: 2, a: 1 }),
    moduleLifecycleSha256({ a: 1, b: 2 })
  );

  assert.equal(
    moduleLifecycleManagerDescriptor.safeguards.ownerApprovalRequired,
    true
  );
  assert.equal(
    moduleLifecycleManagerDescriptor.safeguards
      .breakingUpgradeNeedsOwnerPolicy,
    true
  );
  assert.equal(
    moduleLifecycleManagerDescriptor.safeguards.automaticExecution,
    false
  );

  const [
    coreSource,
    databaseSource,
    apiSource,
    pageSource,
    uiSource,
    navigationSource,
    toolsSource,
    migrationSource,
    docsSource,
    reviewSource,
    roadmapSource,
    packageRaw
  ] = await Promise.all([
    source("lib/module-lifecycle-manager.ts"),
    source("lib/module-lifecycle-database.ts"),
    source("app/api/module-lifecycle/route.ts"),
    source("app/module-lifecycle/page.tsx"),
    source("app/module-lifecycle/ModuleLifecycleConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../db/migrations/0111_module_versioning_upgrade_rollback.sql"),
    source("../../docs/BUILD_328_MODULE_VERSIONING_SAFE_UPGRADE_ROLLBACK.md"),
    source("../../docs/integration/ai-data-platform-build328-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "MODULE_UPGRADE_PLAN_SCHEMA",
    "buildModuleUpgradePlan",
    "buildModuleRollbackPlan",
    "breakingCompatibilityBoundary",
    "database-prerequisite",
    "schema-prerequisite",
    "backup-prerequisite",
    "migration-order",
    "canary-policy",
    "lastKnownGoodVersion",
    "automaticExecution: false"
  ]) {
    assert.ok(
      coreSource.includes(token),
      "Build 328 lifecycle core missing " + token
    );
  }

  for (const token of [
    "registerInstalledModuleHost",
    "prepareModuleUpgrade",
    "decideModuleUpgrade",
    "recordModuleUpgradeOutcome",
    "prepareModuleRollback",
    "recordModuleRollbackCompleted",
    "confirmModuleStableVersion",
    "enrolled_host_contract_version",
    "module_upgrade_events",
    "for update"
  ]) {
    assert.ok(
      databaseSource.includes(token),
      "Build 328 lifecycle database missing " + token
    );
  }

  for (const token of [
    '"register-installed"',
    '"prepare-upgrade"',
    '"owner-decision"',
    '"record-outcome"',
    '"prepare-rollback"',
    '"record-rollback"',
    '"confirm-stable"',
    "authentication_required",
    "Cache-Control"
  ]) {
    assert.ok(
      apiSource.includes(token),
      "Build 328 lifecycle API missing " + token
    );
  }

  for (const token of [
    "Module Lifecycle &amp; Upgrade Orchestration",
    "Breaking upgrades remain fail closed.",
    "/api/module-lifecycle"
  ]) {
    assert.ok(
      pageSource.includes(token),
      "Build 328 lifecycle page missing " + token
    );
  }

  for (const token of [
    "Installed-version inventory",
    "Safe staged upgrade",
    "Owner decision & evidence",
    "Prepare staged upgrade",
    "Prepare rollback",
    "Confirm stable version"
  ]) {
    assert.ok(
      uiSource.includes(token),
      "Build 328 lifecycle UI missing " + token
    );
  }

  assert.ok(
    navigationSource.includes('href: "/module-lifecycle"') &&
      navigationSource.includes('label: "Module Lifecycle"')
  );
  assert.ok(
    toolsSource.includes('href: "/module-lifecycle"') &&
      toolsSource.includes('label: "Module lifecycle"')
  );

  for (const token of [
    "module_host_instances",
    "module_upgrade_runs",
    "module_upgrade_events",
    "last_known_good_version",
    "rollback-ready",
    "upgrade-failed",
    "stable-version-confirmed",
    "enable row level security",
    "revoke update, delete on app.module_upgrade_events"
  ]) {
    assert.ok(
      migrationSource.includes(token),
      "Build 328 migration missing " + token
    );
  }

  for (const token of [
    "generated package is preparation evidence",
    "installed-version inventory",
    "breaking major compatibility boundary",
    "last-known-good",
    "automatic",
    "0111_module_versioning_upgrade_rollback.sql",
    "Build 329"
  ]) {
    assert.ok(
      docsSource.toLowerCase().includes(token.toLowerCase()),
      "Build 328 docs missing " + token
    );
  }

  const review = JSON.parse(reviewSource);
  assert.equal(review.build, 328);
  assert.equal(review.capabilities.canaryHostSupport, true);
  assert.equal(review.capabilities.failedUpgradeEvidence, true);
  assert.equal(review.security.automaticHostUpgrade, false);
  assert.equal(
    review.security.breakingUpgradeWithoutOwnerPolicy,
    false
  );
  assert.equal(review.nextQueuedBuild, 329);

  assert.ok(
    roadmapSource.includes(
      "Build 328 — Module Versioning, Safe Upgrade, Rollback & Migration Orchestration"
    )
  );
  assert.ok(
    roadmapSource.includes(
      "Build 329 — Cross-Host Observability, Compatibility Matrix & Universal Certification Suite"
    )
  );

  const pkg = JSON.parse(packageRaw);
  assert.ok(
    pkg.scripts["verify:build328"].includes(
      "verify-build-328-module-lifecycle.ts"
    )
  );
  assert.ok(
    pkg.scripts["ci:promotion"].includes(
      "verify-build-328-module-lifecycle.ts"
    )
  );
  assert.ok(
    pkg.scripts["ci:spine"].includes(
      "verify-build-328-module-lifecycle.ts"
    )
  );

  console.log(
    "Build 328 Module Versioning, Safe Upgrade, Rollback & Migration Orchestration verification passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
