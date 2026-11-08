import { createHash } from "node:crypto";

export const MODULE_LIFECYCLE_MANAGER_VERSION = "1.0.0" as const;
export const MODULE_UPGRADE_PLAN_SCHEMA =
  "rosevear.ai-data-platform.module-upgrade-plan.v1" as const;
export const MODULE_ROLLBACK_PLAN_SCHEMA =
  "rosevear.ai-data-platform.module-rollback-plan.v1" as const;

export type ModuleMigrationStep = {
  id: string;
  order: number;
  kind: "database" | "schema" | "configuration";
  prerequisites: string[];
  reversible: boolean;
  description: string;
};

export type ModuleUpgradePrerequisites = {
  databaseReady: boolean;
  schemaReady: boolean;
  backupVerified: boolean;
  hostContractVersion: number;
  protocolVersion: number;
  minimumHostContractVersion: number;
  minimumProtocolVersion: number;
};

export type ModuleUpgradePolicy = {
  allowBreakingCompatibilityBoundary: boolean;
  requireCanaryForBreakingUpgrade: boolean;
};

export type ModuleUpgradeCheck = {
  id:
    | "version-direction"
    | "compatibility-boundary"
    | "host-contract"
    | "protocol"
    | "database-prerequisite"
    | "schema-prerequisite"
    | "backup-prerequisite"
    | "migration-order"
    | "canary-policy";
  state: "pass" | "held";
  detail: string;
};

export type ModuleUpgradePlan = {
  schema: typeof MODULE_UPGRADE_PLAN_SCHEMA;
  managerVersion: typeof MODULE_LIFECYCLE_MANAGER_VERSION;
  fromVersion: string;
  targetVersion: string;
  lastKnownGoodVersion: string;
  canary: boolean;
  breakingCompatibilityBoundary: boolean;
  state: "ready-for-owner-approval" | "held";
  ownerApprovalRequired: true;
  automaticExecution: false;
  migrationPlanSha256: string;
  migrations: ModuleMigrationStep[];
  checks: ModuleUpgradeCheck[];
  rollback: {
    targetVersion: string;
    reverseMigrationIds: string[];
    manualRestoreRequired: boolean;
    blockedByIrreversibleMigrationIds: string[];
  };
};

export type ModuleRollbackPlan = {
  schema: typeof MODULE_ROLLBACK_PLAN_SCHEMA;
  managerVersion: typeof MODULE_LIFECYCLE_MANAGER_VERSION;
  currentVersion: string;
  targetVersion: string;
  state: "ready" | "held";
  reverseMigrationIds: string[];
  manualRestoreRequired: boolean;
  blockedByIrreversibleMigrationIds: string[];
  automaticExecution: false;
};

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
const MIGRATION_ID_PATTERN = /^[a-z][a-z0-9._-]{2,119}$/;

type Semver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? "null" : encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const object = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(object)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
      .join(",") +
    "}"
  );
}

export function moduleLifecycleSha256(value: unknown) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value), "utf8")
    .digest("hex");
}

export function parseModuleSemver(value: unknown): Semver {
  const text = String(value ?? "").trim();
  const match = SEMVER_PATTERN.exec(text);
  if (!match) {
    throw new Error("module_lifecycle_semver_invalid");
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}

export function compareModuleSemver(left: string, right: string) {
  const a = parseModuleSemver(left);
  const b = parseModuleSemver(right);
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

export function isBreakingModuleUpgrade(
  fromVersion: string,
  targetVersion: string
) {
  return (
    parseModuleSemver(fromVersion).major !==
    parseModuleSemver(targetVersion).major
  );
}

function normalizeMigrationStep(value: ModuleMigrationStep) {
  const id = String(value.id ?? "").trim();
  if (!MIGRATION_ID_PATTERN.test(id)) {
    throw new Error("module_lifecycle_migration_id_invalid");
  }
  if (!Number.isInteger(value.order) || value.order < 1 || value.order > 1000000) {
    throw new Error("module_lifecycle_migration_order_invalid");
  }
  if (
    value.kind !== "database" &&
    value.kind !== "schema" &&
    value.kind !== "configuration"
  ) {
    throw new Error("module_lifecycle_migration_kind_invalid");
  }
  if (!Array.isArray(value.prerequisites) || value.prerequisites.length > 50) {
    throw new Error("module_lifecycle_migration_prerequisites_invalid");
  }
  const prerequisites = [...new Set(value.prerequisites.map(String))];
  const description = String(value.description ?? "").trim();
  if (description.length < 3 || description.length > 500) {
    throw new Error("module_lifecycle_migration_description_invalid");
  }
  return Object.freeze({
    id,
    order: value.order,
    kind: value.kind,
    prerequisites,
    reversible: value.reversible === true,
    description
  });
}

export function normalizeModuleMigrationPlan(
  values: ModuleMigrationStep[]
): ModuleMigrationStep[] {
  if (!Array.isArray(values) || values.length > 100) {
    throw new Error("module_lifecycle_migration_plan_invalid");
  }

  const normalized = values.map(normalizeMigrationStep);
  if (
    new Set(normalized.map((item) => item.id)).size !== normalized.length ||
    new Set(normalized.map((item) => item.order)).size !== normalized.length
  ) {
    throw new Error("module_lifecycle_migration_plan_duplicate");
  }

  const sorted = [...normalized].sort((a, b) => a.order - b.order);
  const byId = new Map(sorted.map((item) => [item.id, item]));

  for (const step of sorted) {
    for (const prerequisite of step.prerequisites) {
      const required = byId.get(prerequisite);
      if (!required || required.order >= step.order) {
        throw new Error("module_lifecycle_migration_order_dependency_invalid");
      }
    }
  }

  return sorted;
}

function rollbackFor(
  lastKnownGoodVersion: string,
  migrations: ModuleMigrationStep[]
) {
  const irreversible = migrations
    .filter((item) => !item.reversible)
    .map((item) => item.id);
  return {
    targetVersion: lastKnownGoodVersion,
    reverseMigrationIds: [...migrations]
      .reverse()
      .filter((item) => item.reversible)
      .map((item) => item.id),
    manualRestoreRequired: irreversible.length > 0,
    blockedByIrreversibleMigrationIds: irreversible
  };
}

function pass(id: ModuleUpgradeCheck["id"], detail: string): ModuleUpgradeCheck {
  return { id, state: "pass", detail };
}

function held(id: ModuleUpgradeCheck["id"], detail: string): ModuleUpgradeCheck {
  return { id, state: "held", detail };
}

export function buildModuleUpgradePlan(input: {
  currentVersion: string;
  targetVersion: string;
  lastKnownGoodVersion: string;
  canary: boolean;
  prerequisites: ModuleUpgradePrerequisites;
  policy: ModuleUpgradePolicy;
  migrations: ModuleMigrationStep[];
}): ModuleUpgradePlan {
  parseModuleSemver(input.currentVersion);
  parseModuleSemver(input.targetVersion);
  parseModuleSemver(input.lastKnownGoodVersion);

  const migrations = normalizeModuleMigrationPlan(input.migrations);
  const breaking = isBreakingModuleUpgrade(
    input.currentVersion,
    input.targetVersion
  );
  const checks: ModuleUpgradeCheck[] = [];

  checks.push(
    compareModuleSemver(input.currentVersion, input.targetVersion) < 0
      ? pass("version-direction", "Target version is newer than the installed version.")
      : held("version-direction", "Upgrade target must be newer than the installed version.")
  );

  checks.push(
    !breaking || input.policy.allowBreakingCompatibilityBoundary
      ? pass(
          "compatibility-boundary",
          breaking
            ? "Owner policy explicitly permits this breaking compatibility boundary."
            : "Upgrade remains within the current major compatibility boundary."
        )
      : held(
          "compatibility-boundary",
          "Breaking compatibility boundary requires explicit owner policy."
        )
  );

  checks.push(
    input.prerequisites.hostContractVersion >=
      input.prerequisites.minimumHostContractVersion
      ? pass("host-contract", "Host contract satisfies the target minimum.")
      : held("host-contract", "Host contract is below the target minimum.")
  );

  checks.push(
    input.prerequisites.protocolVersion >=
      input.prerequisites.minimumProtocolVersion
      ? pass("protocol", "Host protocol satisfies the target minimum.")
      : held("protocol", "Host protocol is below the target minimum.")
  );

  checks.push(
    input.prerequisites.databaseReady
      ? pass("database-prerequisite", "Database prerequisite evidence is present.")
      : held("database-prerequisite", "Database prerequisite evidence is missing.")
  );

  checks.push(
    input.prerequisites.schemaReady
      ? pass("schema-prerequisite", "Schema prerequisite evidence is present.")
      : held("schema-prerequisite", "Schema prerequisite evidence is missing.")
  );

  checks.push(
    input.prerequisites.backupVerified
      ? pass("backup-prerequisite", "Rollback backup prerequisite is verified.")
      : held("backup-prerequisite", "Rollback backup prerequisite is not verified.")
  );

  checks.push(
    pass(
      "migration-order",
      migrations.length
        ? "Migration dependencies are unique and ordered before dependent steps."
        : "No migrations are required for this upgrade."
    )
  );

  checks.push(
    breaking &&
      input.policy.requireCanaryForBreakingUpgrade &&
      !input.canary
      ? held(
          "canary-policy",
          "Owner policy requires a canary host for breaking upgrades."
        )
      : pass(
          "canary-policy",
          input.canary
            ? "Upgrade is staged as a canary host."
            : "Owner policy does not require a canary for this upgrade."
        )
  );

  const rollback = rollbackFor(input.lastKnownGoodVersion, migrations);
  const migrationPlanSha256 = moduleLifecycleSha256({
    currentVersion: input.currentVersion,
    targetVersion: input.targetVersion,
    migrations
  });

  return Object.freeze({
    schema: MODULE_UPGRADE_PLAN_SCHEMA,
    managerVersion: MODULE_LIFECYCLE_MANAGER_VERSION,
    fromVersion: input.currentVersion,
    targetVersion: input.targetVersion,
    lastKnownGoodVersion: input.lastKnownGoodVersion,
    canary: input.canary === true,
    breakingCompatibilityBoundary: breaking,
    state: checks.some((item) => item.state === "held")
      ? ("held" as const)
      : ("ready-for-owner-approval" as const),
    ownerApprovalRequired: true as const,
    automaticExecution: false as const,
    migrationPlanSha256,
    migrations,
    checks,
    rollback
  });
}

export function buildModuleRollbackPlan(input: {
  currentVersion: string;
  lastKnownGoodVersion: string;
  migrations: ModuleMigrationStep[];
}): ModuleRollbackPlan {
  parseModuleSemver(input.currentVersion);
  parseModuleSemver(input.lastKnownGoodVersion);
  const migrations = normalizeModuleMigrationPlan(input.migrations);
  const rollback = rollbackFor(input.lastKnownGoodVersion, migrations);
  const sameVersion = input.currentVersion === input.lastKnownGoodVersion;

  return Object.freeze({
    schema: MODULE_ROLLBACK_PLAN_SCHEMA,
    managerVersion: MODULE_LIFECYCLE_MANAGER_VERSION,
    currentVersion: input.currentVersion,
    targetVersion: input.lastKnownGoodVersion,
    state:
      sameVersion || rollback.manualRestoreRequired
        ? ("held" as const)
        : ("ready" as const),
    reverseMigrationIds: rollback.reverseMigrationIds,
    manualRestoreRequired: rollback.manualRestoreRequired,
    blockedByIrreversibleMigrationIds:
      rollback.blockedByIrreversibleMigrationIds,
    automaticExecution: false as const
  });
}

export const moduleLifecycleManagerDescriptor = Object.freeze({
  version: MODULE_LIFECYCLE_MANAGER_VERSION,
  schemas: {
    upgradePlan: MODULE_UPGRADE_PLAN_SCHEMA,
    rollbackPlan: MODULE_ROLLBACK_PLAN_SCHEMA
  },
  safeguards: {
    ownerApprovalRequired: true,
    breakingUpgradeNeedsOwnerPolicy: true,
    migrationOrderingProtected: true,
    databasePrerequisiteRequired: true,
    schemaPrerequisiteRequired: true,
    backupPrerequisiteRequired: true,
    canarySupported: true,
    lastKnownGoodPreserved: true,
    automaticExecution: false
  }
});
