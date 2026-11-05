import { readFile } from "node:fs/promises";
import path from "node:path";

import { getCrossAppDataContract } from "../lib/cross-app-data-contract-registry";
import type { FieldMappingEntry } from "../lib/field-mapping-studio";
import {
  analyzeSchemaDrift,
  applyDeterministicRepairSuggestions,
  normalizeSourceSchemaFields,
  sourceSchemaFingerprint
} from "../lib/schema-drift-assistant";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 288 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

function expectThrow(operation: () => unknown, message: string) {
  let threw = false;
  try {
    operation();
  } catch {
    threw = true;
  }
  ensure(threw, message);
}

async function main() {
  const contract = getCrossAppDataContract("rosevear.shared.customer.v1");
  ensure(contract, "customer contract");

  const sourceV1 = normalizeSourceSchemaFields([
    { path: "customer.id", type: "string", required: true },
    { path: "customer.updatedAt", type: "date-time", required: true },
    { path: "customer.tenantKey", type: "string", required: true },
    { path: "customer.applicationId", type: "string", required: true },
    { path: "customer.email", type: "string", required: false },
    {
      path: "customer.status",
      type: "string",
      required: false,
      enumValues: ["active", "inactive"]
    }
  ]);
  const sourceV2 = normalizeSourceSchemaFields([
    { path: "customer.id", type: "string", required: true },
    { path: "customer.updatedAt", type: "date-time", required: true },
    { path: "customer.tenantKey", type: "string", required: true },
    { path: "customer.applicationId", type: "string", required: true },
    { path: "customer.emailAddress", type: "string", required: false },
    {
      path: "customer.status",
      type: "string",
      required: false,
      enumValues: ["active", "inactive", "archived"]
    }
  ]);

  ensure(
    /^[0-9a-f]{64}$/.test(sourceSchemaFingerprint(sourceV1)),
    "source schema SHA-256 fingerprint"
  );
  expectThrow(
    () =>
      normalizeSourceSchemaFields([
        { path: "customer.id", type: "string" },
        { path: "customer.id", type: "string" }
      ]),
    "duplicate source paths fail closed"
  );
  expectThrow(
    () =>
      normalizeSourceSchemaFields([
        { path: "../../secret", type: "string" }
      ]),
    "invalid source paths fail closed"
  );

  const mappings: FieldMappingEntry[] = [
    {
      targetKey: "sourceApplicationId",
      sourcePath: "customer.applicationId",
      transform: "copy"
    },
    {
      targetKey: "sourceRecordId",
      sourcePath: "customer.id",
      transform: "copy"
    },
    {
      targetKey: "tenantKey",
      sourcePath: "customer.tenantKey",
      transform: "copy"
    },
    {
      targetKey: "updatedAt",
      sourcePath: "customer.updatedAt",
      transform: "copy"
    },
    {
      targetKey: "email",
      sourcePath: "customer.email",
      transform: "copy"
    },
    {
      targetKey: "status",
      sourcePath: "customer.status",
      transform: "copy"
    }
  ];

  const baseline = analyzeSchemaDrift({
    mappingEntries: mappings,
    profileCanonicalFingerprint: contract.schemaFingerprint,
    profileSourceSchemaVersion: null,
    profileSourceSchemaFields: null,
    currentSourceSchemaVersion: "v1",
    currentSourceSchemaFields: sourceV1,
    currentContract: contract
  });
  ensure(
    baseline.driftState === "baseline-required",
    "first source snapshot requires baseline review"
  );

  const clean = analyzeSchemaDrift({
    mappingEntries: mappings,
    profileCanonicalFingerprint: contract.schemaFingerprint,
    profileSourceSchemaVersion: "v1",
    profileSourceSchemaFields: sourceV1,
    currentSourceSchemaVersion: "v1",
    currentSourceSchemaFields: sourceV1,
    currentContract: contract
  });
  ensure(clean.driftState === "clean", "unchanged source/canonical schema clean");
  ensure(!clean.affectedMappings.length, "clean scan has no affected mappings");

  const drift = analyzeSchemaDrift({
    mappingEntries: mappings,
    profileCanonicalFingerprint: contract.schemaFingerprint,
    profileSourceSchemaVersion: "v1",
    profileSourceSchemaFields: sourceV1,
    currentSourceSchemaVersion: "v2",
    currentSourceSchemaFields: sourceV2,
    currentContract: contract
  });
  ensure(drift.driftState === "drift-detected", "source drift detected");
  ensure(
    drift.sourceChanges.some((change) => change.kind === "api-version-changed") &&
      drift.sourceChanges.some(
        (change) => change.kind === "removed" && change.field === "customer.email"
      ) &&
      drift.sourceChanges.some(
        (change) => change.kind === "enum-changed" && change.field === "customer.status"
      ),
    "API, removed-field and enum changes detected"
  );
  ensure(
    drift.affectedMappings.some(
      (item) =>
        item.targetKey === "email" &&
        item.reasons.includes("source-field-missing")
    ),
    "removed source field identifies affected mapping"
  );

  const renameSourceV2 = normalizeSourceSchemaFields([
    ...sourceV1.filter((field) => field.path !== "customer.email"),
    { path: "customer.contact_email", type: "string", required: false }
  ]);
  const renameMapping: FieldMappingEntry[] = [
    ...mappings.filter((entry) => entry.targetKey !== "email"),
    {
      targetKey: "email",
      sourcePath: "customer.email",
      transform: "copy"
    }
  ];
  const exactLeafV2 = normalizeSourceSchemaFields([
    ...sourceV1.filter((field) => field.path !== "customer.email"),
    { path: "account.email", type: "string", required: false }
  ]);
  const rename = analyzeSchemaDrift({
    mappingEntries: renameMapping,
    profileCanonicalFingerprint: contract.schemaFingerprint,
    profileSourceSchemaVersion: "v1",
    profileSourceSchemaFields: sourceV1,
    currentSourceSchemaVersion: "v2",
    currentSourceSchemaFields: exactLeafV2,
    currentContract: contract
  });
  const suggestion = rename.repairSuggestions.find(
    (item) => item.kind === "replace-source" && item.targetKey === "email"
  );
  ensure(
    suggestion?.actionable &&
      suggestion.confidence === "deterministic" &&
      suggestion.toSourcePath === "account.email",
    "unique exact-leaf rename becomes deterministic suggestion"
  );
  const repaired = applyDeterministicRepairSuggestions(
    renameMapping,
    rename.repairSuggestions
  );
  ensure(
    repaired.some(
      (entry) =>
        entry.targetKey === "email" && entry.sourcePath === "account.email"
    ),
    "deterministic repair suggestion applied to draft entries"
  );
  ensure(renameSourceV2.length === sourceV1.length, "alternate source fixture valid");

  const [
    migration,
    analysis,
    database,
    api,
    page,
    client,
    mappingDb,
    navigation,
    operatorTools,
    packageJson,
    docs,
    statusRaw,
    roadmap
  ] = await Promise.all([
    source("../../db/migrations/0091_schema_drift_mapping_repair.sql"),
    source("lib/schema-drift-assistant.ts"),
    source("lib/schema-drift-database.ts"),
    source("app/api/schema-drift/route.ts"),
    source("app/schema-drift/page.tsx"),
    source("app/schema-drift/SchemaDriftRepairAssistant.tsx"),
    source("lib/field-mapping-database.ts"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("package.json"),
    source("../../docs/BUILD_288_SCHEMA_DRIFT_MAPPING_REPAIR.md"),
    source("../../docs/integration/ql266-ai-data-platform-build288-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  for (const token of [
    "workspace_field_mapping_drift_scans",
    "workspace_field_mapping_repair_sessions",
    "workspace_field_mapping_drift_events",
    "source_schema_fingerprint",
    "enable row level security",
    "wm.role in ('owner','admin')"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }
  ensure(!migration.toLowerCase().includes("grant delete"), "no delete grant");

  for (const token of [
    "normalizeSourceSchemaFields",
    "sourceSchemaFingerprint",
    "analyzeSchemaDrift",
    "applyDeterministicRepairSuggestions",
    "api-version-changed",
    "enum-changed",
    "canonical-fingerprint-changed"
  ]) {
    ensure(analysis.includes(token), "analysis token " + token);
  }

  for (const token of [
    "listSchemaDriftAssistantForUser",
    "recordSchemaDriftScan",
    "prepareSchemaDriftRepair",
    "applySchemaDriftRepairToDraft",
    "driftMustBeClearBeforeDelivery: true",
    "repairsApplyToDraftOnly: true",
    "reviewedMappingNeverAutoApproved: true",
    "liveExchangeAuthorized: false",
    "ql266Resumed: false"
  ]) {
    ensure(database.includes(token), "database service token " + token);
  }

  ensure(
    api.includes('action === "scan"') &&
      api.includes('action === "prepare-repair"') &&
      api.includes('action === "apply-repair-to-draft"') &&
      api.includes('action === "cancel-repair"') &&
      api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"'),
    "authenticated drift/repair API"
  );
  ensure(
    page.includes("Schema Drift Detection & Mapping Repair Assistant") &&
      page.includes("Drift repair never auto-approves a mapping.") &&
      page.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "operator page safety boundary"
  );
  for (const token of [
    "Run drift scan",
    "Prepare repair draft",
    "Apply repair to mapping draft",
    "source changes",
    "canonical changes",
    "affected mappings"
  ]) {
    ensure(client.includes(token), "operator UI token " + token);
  }

  ensure(
    mappingDb.includes("source_schema_version=case") &&
      mappingDb.includes("source_schema_fingerprint=case") &&
      mappingDb.includes("source_schema_fields=case"),
    "mapping edits invalidate source pins while unchanged review preserves them"
  );
  ensure(
    navigation.includes('href: "/schema-drift"') &&
      operatorTools.includes('href: "/schema-drift"'),
    "schema drift navigation"
  );
  ensure(
    packageJson.includes("verify-build-288-schema-drift-mapping-repair.ts"),
    "Build 288 verifier registered"
  );
  ensure(
    docs.includes("0091_schema_drift_mapping_repair.sql") &&
      docs.includes("Build 289 — Rosevear Shared Connector SDK 2.0") &&
      docs.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "documentation and next build continuity"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 288, "status build");
  ensure(
    status.schema_drift_mapping_repair.source_schema_fingerprinting === true &&
      status.schema_drift_mapping_repair.canonical_schema_drift_detection === true &&
      status.schema_drift_mapping_repair.enum_change_detection === true &&
      status.schema_drift_mapping_repair.api_version_change_detection === true &&
      status.schema_drift_mapping_repair.affected_mapping_detection === true &&
      status.schema_drift_mapping_repair.deterministic_repair_suggestions === true &&
      status.schema_drift_mapping_repair.repairs_apply_to_draft_only === true &&
      status.schema_drift_mapping_repair.auto_approval === false &&
      status.schema_drift_mapping_repair.external_requests === 0 &&
      status.schema_drift_mapping_repair.live_exchanges === 0,
    "status drift and repair boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 289, "next build 289");
  ensure(
    roadmap.includes("Build 288 — Schema Drift Detection & Mapping Repair Assistant") &&
      roadmap.includes("Build 289 — Rosevear Shared Connector SDK 2.0"),
    "official roadmap continuity"
  );

  console.log("Build 288 Schema Drift Detection & Mapping Repair verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
