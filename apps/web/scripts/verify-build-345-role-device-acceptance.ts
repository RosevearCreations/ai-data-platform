import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  composeRoleDeviceAcceptanceMatrix,
  roleDeviceCellKey,
  validateRoleDeviceAcceptanceEvidence,
  type RoleDeviceAcceptanceEvidence
} from "../lib/role-device-acceptance-core";

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const inventory = {
  applications: [
    {
      sourceId: "icamp" as const,
      displayName: "iCamp",
      modules: [{ moduleId: "reservations" }]
    },
    {
      sourceId: "yw" as const,
      displayName: "Yard Workers",
      modules: []
    }
  ]
};

function evidence(
  overrides: Partial<RoleDeviceAcceptanceEvidence> = {}
): RoleDeviceAcceptanceEvidence {
  return {
    acceptanceId: "acc_" + "a".repeat(20),
    sourceId: "icamp",
    moduleId: null,
    role: "customer",
    device: "mobile",
    recordVersion: 1,
    state: "ACCEPTED",
    evidenceURI: "urn:rosevear:evidence:role-device-acceptance",
    reviewer: "Independent reviewer",
    confidence: 0.95,
    observedAt: "2026-11-09T12:00:00.000Z",
    expiresAt: "2026-12-09T12:00:00.000Z",
    branch: "main",
    commitSha: "a".repeat(40),
    notes: "Observed on the stated role/device combination.",
    recordedAt: "2026-11-09T12:05:00.000Z",
    ...overrides
  };
}

assert.equal(
  roleDeviceCellKey({
    sourceId: "icamp",
    moduleId: null,
    role: "customer",
    device: "mobile"
  }),
  "icamp::*::customer::mobile"
);
assert.equal(
  validateRoleDeviceAcceptanceEvidence(evidence()).state,
  "ACCEPTED"
);
assert.throws(
  () =>
    validateRoleDeviceAcceptanceEvidence(
      evidence({ device: "watch" as never })
    ),
  /role_device_acceptance_device_invalid/
);
assert.throws(
  () =>
    validateRoleDeviceAcceptanceEvidence(
      evidence({
        observedAt: "2026-12-10T12:00:00.000Z",
        expiresAt: "2026-12-09T12:00:00.000Z"
      })
    ),
  /role_device_acceptance_time_invalid/
);

const acceptedCells = [
  "customer",
  "worker",
  "admin"
].flatMap((role) =>
  ["mobile", "tablet", "desktop"].map((device, index) =>
    evidence({
      acceptanceId: "acc_" + role + "_" + device,
      role: role as "customer" | "worker" | "admin",
      device: device as "mobile" | "tablet" | "desktop",
      recordVersion: 1,
      state: "ACCEPTED",
      evidenceURI:
        "urn:rosevear:evidence:" + role + "-" + device,
      observedAt: "2026-11-09T10:0" + index + ":00.000Z"
    })
  )
);

const model = composeRoleDeviceAcceptanceMatrix({
  inventory,
  evidence: [
    ...acceptedCells,
    evidence({
      acceptanceId: "acc_stale_worker_mobile",
      moduleId: "reservations",
      role: "worker",
      device: "mobile",
      state: "ACCEPTED",
      observedAt: "2026-10-01T12:00:00.000Z",
      expiresAt: "2026-11-01T12:00:00.000Z"
    }),
    evidence({
      acceptanceId: "acc_failed_admin_desktop",
      moduleId: "reservations",
      role: "admin",
      device: "desktop",
      state: "FAILED",
      evidenceURI: "urn:rosevear:evidence:admin-desktop-failed"
    })
  ],
  now: new Date("2026-11-09T16:00:00.000Z")
});

assert.equal(model.build, 345);
assert.deepEqual(model.dimensions.roles, ["customer", "worker", "admin"]);
assert.deepEqual(model.dimensions.devices, ["mobile", "tablet", "desktop"]);
assert.equal(model.dimensions.cellsPerScope, 9);
assert.equal(model.summary.applications, 2);
assert.equal(model.summary.scopes, 3);
assert.equal(model.summary.cells, 27);

const sourceScope = model.scopes.find(
  (scope) => scope.scopeKey === "icamp::*"
);
assert.ok(sourceScope);
assert.equal(sourceScope.overallState, "ACCEPTED");
assert.equal(sourceScope.summary.accepted, 9);
assert.equal(sourceScope.summary.acceptedPercent, 100);

const moduleScope = model.scopes.find(
  (scope) => scope.scopeKey === "icamp::reservations"
);
assert.ok(moduleScope);
assert.equal(moduleScope.overallState, "FAILED");
assert.equal(moduleScope.summary.failed, 1);
assert.equal(moduleScope.summary.stale, 1);
assert.equal(moduleScope.summary.acceptedPercent, null);

const emptyScope = model.scopes.find(
  (scope) => scope.scopeKey === "yw::*"
);
assert.ok(emptyScope);
assert.equal(emptyScope.overallState, "UNKNOWN");
assert.equal(emptyScope.summary.unknown, 9);
assert.equal(emptyScope.summary.acceptedPercent, null);

assert.equal(model.policy.missingEvidenceMeansAccepted, false);
assert.equal(model.policy.implementationImpliesAcceptance, false);
assert.equal(model.policy.automatedTestingImpliesAcceptance, false);
assert.equal(model.policy.deploymentGreenImpliesAcceptance, false);

const core = source("lib/role-device-acceptance-core.ts");
for (const token of [
  "ROLE_DEVICE_ACCEPTANCE_BUILD = 345",
  '"customer"',
  '"worker"',
  '"admin"',
  '"mobile"',
  '"tablet"',
  '"desktop"',
  "implementationImpliesAcceptance: false",
  "automatedTestingImpliesAcceptance: false",
  "missingEvidenceMeansAccepted: false"
]) {
  assert.ok(core.includes(token), "core token " + token);
}

const migration = source(
  "../../db/migrations/0123_master_role_device_acceptance_matrix.sql"
);
for (const token of [
  "master_role_device_acceptance_evidence",
  "role_name in ('customer','worker','admin')",
  "device_class in ('mobile','tablet','desktop')",
  "enable row level security",
  "force row level security",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}

const database = source("lib/role-device-acceptance-database.ts");
for (const token of [
  "listMasterApplicationInventoryForUser",
  "pg_advisory_xact_lock",
  "recordRoleDeviceAcceptanceEvidence",
  "record_version desc",
  "master_role_device_acceptance_evidence"
]) {
  assert.ok(database.includes(token), "database token " + token);
}
assert.ok(!database.includes("update app.master_role_device"));
assert.ok(!database.includes("delete from app.master_role_device"));

const api = source("app/api/role-device-acceptance/route.ts");
assert.ok(api.includes("export async function GET()"));
assert.ok(api.includes("export async function POST(request: Request)"));
assert.ok(api.includes("authentication_required"));
assert.ok(api.includes("MAX_BODY_BYTES"));

const page = source("app/role-device-acceptance/page.tsx");
for (const token of [
  "Role / Device Acceptance Matrix",
  "Nine independent acceptance cells per scope.",
  "Customer, Worker and Admin",
  "Mobile, Tablet and Desktop",
  "Acceptance remains independent evidence."
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/role-device-acceptance/RoleDeviceAcceptanceRecorder.tsx"
);
assert.ok(recorder.includes('fetch("/api/role-device-acceptance"'));
assert.ok(recorder.includes("Record acceptance evidence"));

const navigation = source("lib/application-navigation.ts");
assert.ok(navigation.includes('href: "/role-device-acceptance"'));

const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(operatorTools.includes('"/role-device-acceptance"'));

const shell = source("app/application-shell.tsx");
assert.ok(shell.includes('href="/role-device-acceptance"'));

const commandCenter = source("app/master-shell-command-center/page.tsx");
assert.ok(commandCenter.includes('href="/role-device-acceptance"'));

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(dbSpine.includes('"master_role_device_acceptance_evidence"'));
assert.ok(
  dbSpine.includes('"0123_master_role_device_acceptance_matrix.sql"')
);

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 344 — Module Health, Stuck-State, Staleness, HOLD & Blocker Intelligence** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 345 — Role/Device Acceptance Matrix: Customer, Worker & Admin / Mobile, Tablet, Desktop** — Production"
  )
);
assert.ok(
  roadmap.includes(
    "Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification"
  )
);

const docs = source(
  "../../docs/BUILD_345_ROLE_DEVICE_ACCEPTANCE_MATRIX.md"
);
assert.ok(
  docs.includes(
    "Implementation and automated testing do not satisfy a role/device cell."
  )
);
assert.ok(
  docs.includes(
    "Build 346 — One-to-One, One-to-Many, Many-to-One & Many-to-Many Integration Certification"
  )
);

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build345-review.json")
);
assert.equal(review.build, 345);
assert.equal(review.matrix.cellsPerScope, 9);
assert.equal(review.separation.implementationImpliesAcceptance, false);
assert.equal(review.separation.automatedTestingImpliesAcceptance, false);
assert.equal(review.nextQueuedBuild, 346);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-345-role-device-acceptance.ts";
assert.equal(pkg.scripts["verify:build345"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-344-module-health-intelligence.ts"
  ) <
    String(pkg.scripts.build).indexOf(
      "verify-build-345-role-device-acceptance.ts"
    )
);

console.log(
  "Build 345 Role/Device Acceptance Matrix verification passed."
);
