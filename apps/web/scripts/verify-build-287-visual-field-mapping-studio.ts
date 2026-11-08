import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCrossAppDataContractRegistry } from "../lib/cross-app-data-contract-registry";
import {
  fieldMappingSchemaCurrent,
  normalizeFieldMappingEntries,
  validateFieldMappingEntries
} from "../lib/field-mapping-studio";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 287 verification failed: " + message);
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
  const registry = buildCrossAppDataContractRegistry(
    "2026-11-04T23:30:00.000Z"
  );
  ensure(registry.contracts.length === 11, "11 canonical contracts");
  ensure(registry.peerApplications.length === 6, "six peer applications");

  const contract = registry.contracts.find(
    (item) => item.contractId === "rosevear.shared.customer.v1"
  );
  ensure(contract, "customer contract exists");

  const completeInput = contract.fields
    .filter((field) => field.required)
    .map((field) => ({
      targetKey: field.key,
      sourcePath: "source." + field.key,
      transform: "copy"
    }));
  const complete = normalizeFieldMappingEntries(completeInput, contract);
  const completeValidation = validateFieldMappingEntries(complete, contract);
  ensure(completeValidation.valid, "complete mapping valid");
  ensure(completeValidation.completeForReview, "required coverage review gate");
  ensure(
    completeValidation.mappedRequiredTargets ===
      completeValidation.requiredTargets,
    "all required targets mapped"
  );

  const incomplete = normalizeFieldMappingEntries(
    completeInput.slice(0, Math.max(0, completeInput.length - 1)),
    contract
  );
  const incompleteValidation = validateFieldMappingEntries(incomplete, contract);
  ensure(!incompleteValidation.completeForReview, "incomplete mapping not reviewable");

  expectThrow(
    () =>
      normalizeFieldMappingEntries(
        [
          completeInput[0],
          {
            ...completeInput[0],
            sourcePath: "source.duplicate"
          }
        ],
        contract
      ),
    "duplicate canonical target fails closed"
  );
  expectThrow(
    () =>
      normalizeFieldMappingEntries(
        [
          {
            targetKey: "notARealTarget",
            sourcePath: "source.field",
            transform: "copy"
          }
        ],
        contract
      ),
    "unknown canonical target fails closed"
  );
  expectThrow(
    () =>
      normalizeFieldMappingEntries(
        [
          {
            targetKey: contract.fields[0].key,
            sourcePath: "../../secret",
            transform: "copy"
          }
        ],
        contract
      ),
    "invalid source path fails closed"
  );

  ensure(
    fieldMappingSchemaCurrent(contract.schemaFingerprint, contract.contractId),
    "current schema fingerprint recognized"
  );
  ensure(
    !fieldMappingSchemaCurrent("0".repeat(64), contract.contractId),
    "stale schema fingerprint detected"
  );

  const [
    migration,
    model,
    database,
    api,
    page,
    client,
    navigation,
    operatorTools,
    dataContracts,
    packageJson,
    docs,
    statusRaw,
    roadmap
  ] = await Promise.all([
    source("../../db/migrations/0090_visual_field_mapping_studio.sql"),
    source("lib/field-mapping-studio.ts"),
    source("lib/field-mapping-database.ts"),
    source("app/api/field-mappings/route.ts"),
    source("app/field-mappings/page.tsx"),
    source("app/field-mappings/FieldMappingStudio.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/data-contracts/page.tsx"),
    source("package.json"),
    source("../../docs/BUILD_287_VISUAL_FIELD_MAPPING_STUDIO.md"),
    source("../../docs/integration/ql266-ai-data-platform-build287-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md")
  ]);

  for (const token of [
    "workspace_field_mapping_profiles",
    "workspace_field_mapping_profile_events",
    "enable row level security",
    "wm.role in ('owner','admin')",
    "grant select, insert, update on app.workspace_field_mapping_profiles",
    "grant select, insert on app.workspace_field_mapping_profile_events"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }
  ensure(!migration.toLowerCase().includes("grant delete"), "no delete grant");

  for (const token of [
    "normalizeFieldMappingEntries",
    "validateFieldMappingEntries",
    "fieldMappingSchemaCurrent",
    "FIELD_MAPPING_TRANSFORMS"
  ]) {
    ensure(model.includes(token), "mapping model token " + token);
  }

  for (const token of [
    "listFieldMappingStudioForUser",
    "saveFieldMappingProfile",
    "reviewedMappingsRequiredBeforeExchange: true",
    "sourceValuesStored: false",
    "rawSecretsStored: false",
    "automaticConnectionActivation: false",
    "liveExchangeAuthorized: false",
    "ql266Resumed: false"
  ]) {
    ensure(database.includes(token), "database service token " + token);
  }

  ensure(
    api.includes('action !== "save"') &&
      api.includes('action !== "review"') &&
      api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"'),
    "authenticated no-store save/review API"
  );
  ensure(
    page.includes("Visual Field Mapping Studio") &&
      page.includes("Reviewed mapping is configuration evidence, not a live connection.") &&
      page.includes("retired QL-266 review hold is historical only"),
    "operator page and safety boundary"
  );
  for (const token of [
    "Source field path",
    "Save draft",
    "Save & mark reviewed",
    "Required coverage",
    "Visual mapping canvas",
    "No mapping profiles exist yet"
  ]) {
    ensure(client.includes(token), "mapping UI token " + token);
  }
  ensure(
    navigation.includes('href: "/field-mappings"') &&
      operatorTools.includes('href: "/field-mappings"') &&
      dataContracts.includes('href="/field-mappings"'),
    "cross-navigation to mapping studio"
  );
  ensure(
    packageJson.includes("verify-build-287-visual-field-mapping-studio.ts"),
    "Build 287 verifier registered"
  );
  ensure(
    docs.includes("0090_visual_field_mapping_studio.sql") &&
      docs.includes("Build 288 — Schema Drift Detection & Mapping Repair Assistant") &&
      docs.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "documentation and next-build continuity"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 287, "status build");
  ensure(
    status.visual_field_mapping_studio.peer_applications_selectable === 6 &&
      status.visual_field_mapping_studio.canonical_contracts === 11 &&
      status.visual_field_mapping_studio.persisted_mapping_profiles === true &&
      status.visual_field_mapping_studio.required_field_coverage_gate === true &&
      status.visual_field_mapping_studio.schema_fingerprint_pinned === true &&
      status.visual_field_mapping_studio.source_values_stored === false &&
      status.visual_field_mapping_studio.raw_secrets_stored === false &&
      status.visual_field_mapping_studio.external_requests === 0 &&
      status.visual_field_mapping_studio.live_exchanges === 0,
    "status mapping and safety evidence"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 288, "next build 288");
  ensure(
    roadmap.includes("Build 287 — Visual Field Mapping Studio") &&
      roadmap.includes("Build 288 — Schema Drift Detection & Mapping Repair Assistant"),
    "official roadmap continuity"
  );

  console.log("Build 287 Visual Field Mapping Studio verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
