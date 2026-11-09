import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildMasterShellSourceRegistryView,
  evaluateMasterShellSourceFreshness,
  MASTER_SHELL_SOURCE_STATES,
  masterShellSourceRegistrySummary,
  validateMasterShellSourceEvidence,
  validateMasterShellSourceTransition,
  type MasterShellSourceEvidence
} from "../lib/master-shell-source-registry-core";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

const empty = buildMasterShellSourceRegistryView({}, new Date("2026-11-09T02:00:00.000Z"));
assert.equal(empty.length, 6);
assert.deepEqual(
  empty.map((item) => item.sourceId),
  ["yw", "icamp", "rosiedazzlers", "devilndove", "ai-data-platform", "rosevear-ai-hub"]
);
assert.equal(empty.every((item) => item.effectiveStatus === "UNKNOWN"), true);
assert.equal(empty.some((item) => item.sourceId === ("rosevear-comms-hub" as never)), false);
assert.equal(masterShellSourceRegistrySummary(empty).unknown, 6);
assert.deepEqual([...MASTER_SHELL_SOURCE_STATES], [
  "UNKNOWN",
  "DISCOVERED",
  "CONFIGURED",
  "AUTHORIZATION_HELD",
  "TEST_VERIFIED",
  "CONNECTED",
  "STALE",
  "DEGRADED",
  "DISCONNECTED",
  "REVOKED",
  "ERROR"
]);

for (const [current, next] of [
  ["UNKNOWN", "DISCOVERED"],
  ["DISCOVERED", "CONFIGURED"],
  ["CONFIGURED", "AUTHORIZATION_HELD"],
  ["AUTHORIZATION_HELD", "TEST_VERIFIED"],
  ["TEST_VERIFIED", "CONNECTED"]
] as const) {
  assert.equal(validateMasterShellSourceTransition(current, next), true);
}
assert.throws(
  () => validateMasterShellSourceTransition("UNKNOWN", "CONFIGURED"),
  /master_shell_registry_transition_invalid/
);
assert.throws(
  () => validateMasterShellSourceTransition("CONFIGURED", "CONNECTED"),
  /master_shell_registry_transition_invalid/
);
assert.equal(
  validateMasterShellSourceTransition("CONNECTED", "DEGRADED"),
  true
);
assert.equal(
  validateMasterShellSourceTransition("DISCONNECTED", "DISCOVERED"),
  true
);

assert.deepEqual(
  evaluateMasterShellSourceFreshness(
    "CONNECTED",
    "2026-11-09T01:59:59.000Z",
    new Date("2026-11-09T02:00:00.000Z")
  ),
  { effectiveStatus: "STALE", freshness: "STALE" }
);
assert.deepEqual(
  evaluateMasterShellSourceFreshness(
    "DISCONNECTED",
    "2026-11-09T01:59:59.000Z",
    new Date("2026-11-09T02:00:00.000Z")
  ),
  { effectiveStatus: "DISCONNECTED", freshness: "STALE" }
);

const base: MasterShellSourceEvidence = {
  sourceId: "ai-data-platform",
  recordVersion: 1,
  environment: "production",
  declaredStatus: "DISCOVERED",
  statusObservedAt: "2026-11-09T01:00:00.000Z",
  statusExpiresAt: "2026-11-10T01:00:00.000Z",
  evidenceURI: "urn:rosevear:evidence:build336-discovery",
  manifestURI: null,
  immutableRevision: null,
  capabilityVersion: null,
  approvedOrigin: null,
  signerKeyId: null,
  signerFingerprint: null,
  rolesAllowed: [],
  holdReason: null,
  testEvidenceURI: null,
  connectionEvidenceURI: null,
  ownerAuthorized: false,
  independentTestVerified: false,
  independentConnectionVerified: false,
  evidenceAuthority: "operator-recorded"
};
assert.equal(validateMasterShellSourceEvidence(base).declaredStatus, "DISCOVERED");

const configured: MasterShellSourceEvidence = {
  ...base,
  recordVersion: 2,
  declaredStatus: "CONFIGURED",
  evidenceURI: "urn:rosevear:evidence:build336-configured",
  manifestURI: "https://example.invalid/master-shell-manifest.json",
  immutableRevision: "af06517da3ca712d",
  capabilityVersion: "1.0.0",
  approvedOrigin: "https://example.invalid"
};
assert.equal(
  validateMasterShellSourceEvidence(configured).declaredStatus,
  "CONFIGURED"
);

const held: MasterShellSourceEvidence = {
  ...configured,
  recordVersion: 3,
  declaredStatus: "AUTHORIZATION_HELD",
  holdReason: "Independent source authorization is not yet accepted."
};
assert.equal(
  validateMasterShellSourceEvidence(held).declaredStatus,
  "AUTHORIZATION_HELD"
);

const testVerified: MasterShellSourceEvidence = {
  ...configured,
  recordVersion: 4,
  declaredStatus: "TEST_VERIFIED",
  evidenceURI: "urn:rosevear:evidence:build336-test",
  signerKeyId: "source-key-build336",
  signerFingerprint: "abcdef0123456789abcdef0123456789",
  rolesAllowed: ["rosevear-suite-owner"],
  testEvidenceURI: "urn:rosevear:evidence:build336-independent-test",
  ownerAuthorized: true,
  independentTestVerified: true,
  evidenceAuthority: "independent-source-verification"
};
assert.equal(
  validateMasterShellSourceEvidence(testVerified).declaredStatus,
  "TEST_VERIFIED"
);

const connected: MasterShellSourceEvidence = {
  ...testVerified,
  recordVersion: 5,
  declaredStatus: "CONNECTED",
  connectionEvidenceURI:
    "urn:rosevear:evidence:build336-independent-connection",
  independentConnectionVerified: true
};
assert.equal(
  validateMasterShellSourceEvidence(connected).declaredStatus,
  "CONNECTED"
);

assert.throws(
  () =>
    validateMasterShellSourceEvidence({
      ...testVerified,
      evidenceAuthority: "operator-recorded"
    }),
  /master_shell_registry_independent_test_required/
);
assert.throws(
  () =>
    validateMasterShellSourceEvidence({
      ...connected,
      independentConnectionVerified: false
    }),
  /master_shell_registry_independent_connection_required/
);
assert.throws(
  () =>
    validateMasterShellSourceEvidence({
      ...held,
      ownerAuthorized: true
    }),
  /master_shell_registry_hold_cannot_be_authorized/
);

const staleView = buildMasterShellSourceRegistryView(
  { "ai-data-platform": connected },
  new Date("2026-11-11T01:00:00.000Z")
).find((item) => item.sourceId === "ai-data-platform");
assert.equal(staleView?.declaredStatus, "CONNECTED");
assert.equal(staleView?.effectiveStatus, "STALE");
assert.equal(staleView?.freshness, "STALE");
assert.equal(staleView?.contractRecordReady, true);

const migration = source("../../db/migrations/0118_master_shell_source_registry.sql");
for (const token of [
  "master_shell_source_registry_evidence",
  "'yw','icamp','rosiedazzlers','devilndove'",
  "'ai-data-platform','rosevear-ai-hub'",
  "enable row level security",
  "master_shell_registry_suite_admin_select",
  "master_shell_registry_suite_admin_insert",
  "grant select, insert",
  "revoke update, delete"
]) {
  assert.ok(migration.includes(token), "migration token " + token);
}
assert.ok(!migration.includes("grant update"));
assert.ok(!migration.includes("grant delete"));

const database = source("lib/master-shell-source-registry-database.ts");
for (const token of [
  "listMasterShellSourceRegistryForUser",
  "recordMasterShellSourceRegistryEvidence",
  "recordOperatorMasterShellSourceEvidence",
  "pg_advisory_xact_lock",
  "distinct on (source_id)",
  "operatorCanCreateTestVerified: false",
  "operatorCanCreateConnected: false",
  "master_shell_registry_independent_source_ingestion_required"
]) {
  assert.ok(database.includes(token), "database token " + token);
}

const api = source("app/api/master-shell-registry/route.ts");
for (const token of [
  "authentication_required",
  "record-operator-evidence",
  "MAX_BODY_BYTES",
  "api.master-shell-registry.get",
  "api.master-shell-registry.post",
  "testVerifiedOrConnectedCreated: false",
  "Cache-Control"
]) {
  assert.ok(api.includes(token), "API token " + token);
}

const page = source("app/master-shell-registry/page.tsx");
for (const token of [
  "Freshness &amp; Source State Machine",
  "Missing evidence is",
  "Six-source registry",
  "UNKNOWN → DISCOVERED → CONFIGURED → AUTHORIZATION_HELD",
  "TEST_VERIFIED → CONNECTED",
  "Legacy app registry"
]) {
  assert.ok(page.includes(token), "page token " + token);
}

const recorder = source(
  "app/master-shell-registry/RegistryEvidenceRecorder.tsx"
);
assert.ok(!recorder.includes('"TEST_VERIFIED",'));
assert.ok(!recorder.includes('"CONNECTED",'));
assert.ok(
  recorder.includes(
    "Build 337 must provide independently"
  )
);

const navigation = source("lib/application-navigation.ts");
const operatorTools = source("lib/module-operator-tools.ts");
assert.ok(navigation.includes('href: "/master-shell-registry"'));
assert.ok(operatorTools.includes('"/master-shell-registry"'));

const contractPage = source("app/master-shell-contracts/page.tsx");
assert.ok(contractPage.includes('href="/master-shell-registry"'));

const review = JSON.parse(
  source("../../docs/integration/ai-data-platform-build336-review.json")
);
assert.equal(review.build, 336);
assert.equal(review.exactSixSourceIds.length, 6);
assert.equal(review.persistence.appendOnlyRuntime, true);
assert.equal(review.persistence.seedConnectedRows, 0);
assert.equal(review.safety.operatorCanCreateConnected, false);
assert.equal(review.nextQueuedBuild, 337);

const docs = source(
  "../../docs/BUILD_336_SIX_SOURCE_REGISTRY_FRESHNESS_STATE_MACHINE.md"
);
assert.ok(
  docs.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization"
  )
);
assert.ok(docs.includes("operator API **cannot create TEST_VERIFIED or CONNECTED**"));

const roadmap = source("../../docs/NEXT_BUILDS_331_350.md");
assert.ok(
  roadmap.includes(
    "Build 335 — Master Shell Contract V1, Correlation IDs & Standard Event Envelope** — Production."
  )
);
assert.ok(
  roadmap.includes(
    "Build 336 — Six-Source Registry, Freshness & Source State Machine** — current build"
  )
);
assert.ok(
  roadmap.includes(
    "Build 337 — Read-Only Source Update Ingestion & Provenance Normalization"
  )
);

const architecture = source("../../docs/ARCHITECTURE.md");
const security = source("../../docs/SECURITY.md");
assert.ok(
  architecture.includes(
    "Build 336 — Six-Source Registry, Freshness & Source State Machine"
  )
);
assert.ok(
  security.includes("Build 336 Master Shell source-registry security")
);

const dbSpine = source("scripts/verify-ci-integration-spine-database.ts");
assert.ok(
  (dbSpine.match(/master_shell_source_registry_evidence/g) ?? []).length >= 2
);

const pkg = JSON.parse(source("package.json"));
const command =
  "tsx scripts/verify-build-336-master-shell-source-registry.ts";
assert.equal(pkg.scripts["verify:build336"], command);
assert.ok(String(pkg.scripts.build).includes(command));
assert.ok(String(pkg.scripts["ci:spine"]).includes(command));
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-335-master-shell-contract-v1.ts"
  ) < String(pkg.scripts.build).indexOf(
    "verify-build-336-master-shell-source-registry.ts"
  )
);
assert.ok(
  String(pkg.scripts.build).indexOf(
    "verify-build-336-master-shell-source-registry.ts"
  ) < String(pkg.scripts.build).indexOf("run-production-migrations.ts")
);

console.log(
  "Build 336 Six-Source Registry, Freshness & Source State Machine verification passed."
);
