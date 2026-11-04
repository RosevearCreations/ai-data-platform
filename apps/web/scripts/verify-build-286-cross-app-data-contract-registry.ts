import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCrossAppDataContractJsonSchema,
  buildCrossAppDataContractRegistry,
  evaluateCrossAppDataContractCompatibility,
  validateCrossAppDataContractRecord
} from "../lib/cross-app-data-contract-registry";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 286 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const registry = buildCrossAppDataContractRegistry(
    "2026-11-04T18:00:00.000Z"
  );

  ensure(
    registry.schema === "ai-data-platform.cross-app-data-contract-registry.v1" &&
      registry.build === 286,
    "registry identity"
  );
  ensure(registry.contracts.length === 11, "11 shared contracts");
  ensure(registry.peerApplications.length === 6, "six peer applications");
  ensure(
    registry.summary.sharedContracts === 11 &&
      registry.summary.reusableContractKinds === 11 &&
      registry.summary.existingBusinessContractsPreserved === 2 &&
      registry.summary.databaseMigrations === 0 &&
      registry.summary.automaticConnectionActivations === 0,
    "registry summary"
  );

  const expectedKinds = [
    "customer",
    "product",
    "service",
    "booking",
    "job",
    "staff",
    "equipment",
    "invoice",
    "media",
    "inventory",
    "notification"
  ];
  ensure(
    expectedKinds.every((kind) =>
      registry.contracts.some((contract) => contract.kind === kind)
    ),
    "all roadmap contract kinds"
  );
  ensure(
    new Set(registry.contracts.map((contract) => contract.contractId)).size === 11 &&
      new Set(registry.contracts.map((contract) => contract.schemaId)).size === 11 &&
      new Set(registry.contracts.map((contract) => contract.schemaFingerprint)).size === 11,
    "unique contract, schema and fingerprint identities"
  );

  for (const contract of registry.contracts) {
    ensure(contract.version === "1.0.0", contract.kind + " version");
    ensure(contract.majorVersion === 1, contract.kind + " major version");
    ensure(
      contract.compatibilityPolicy === "same-major-additive" &&
        contract.additionalProperties === false,
      contract.kind + " compatibility policy"
    );
    ensure(
      /^[0-9a-f]{64}$/.test(contract.schemaFingerprint),
      contract.kind + " SHA-256 fingerprint"
    );
    for (const common of [
      "sourceApplicationId",
      "sourceRecordId",
      "tenantKey",
      "updatedAt"
    ]) {
      ensure(
        contract.fields.some((field) => field.key === common && field.required),
        contract.kind + " common required field " + common
      );
    }

    const schema = buildCrossAppDataContractJsonSchema(contract.contractId);
    ensure(schema, contract.kind + " generated JSON Schema");
    ensure(
      schema.$id === contract.schemaId &&
        schema.additionalProperties === false &&
        Array.isArray(schema.required),
      contract.kind + " strict JSON Schema"
    );
  }

  const validCustomer = validateCrossAppDataContractRecord(
    "rosevear.shared.customer.v1",
    {
      sourceApplicationId: "rosiedazzlers",
      sourceRecordId: "customer-123",
      tenantKey: "rosevear-tenant-rosiedazzlers",
      updatedAt: "2026-11-04T18:00:00.000Z",
      displayName: "Sample Customer",
      tags: ["repeat"]
    }
  );
  ensure(validCustomer.valid, "valid customer record");

  const unknownField = validateCrossAppDataContractRecord(
    "rosevear.shared.customer.v1",
    {
      sourceApplicationId: "rosiedazzlers",
      sourceRecordId: "customer-123",
      tenantKey: "rosevear-tenant-rosiedazzlers",
      updatedAt: "2026-11-04T18:00:00.000Z",
      secretThing: "must fail"
    }
  );
  ensure(
    !unknownField.valid &&
      unknownField.errors.some((error) => error.includes("Unexpected field")),
    "unknown fields fail closed"
  );

  const missingRequired = validateCrossAppDataContractRecord(
    "rosevear.shared.product.v1",
    {
      sourceApplicationId: "devilndove",
      sourceRecordId: "product-1",
      tenantKey: "rosevear-tenant-devilndove",
      updatedAt: "2026-11-04T18:00:00.000Z"
    }
  );
  ensure(
    !missingRequired.valid &&
      missingRequired.errors.some((error) => error.includes("name")),
    "domain required fields fail closed"
  );

  const customerContract = registry.contracts.find(
    (contract) => contract.kind === "customer"
  );
  ensure(customerContract, "customer contract");

  const compatible = evaluateCrossAppDataContractCompatibility({
    contractId: customerContract.contractId,
    producerApplicationId: "rosiedazzlers",
    consumerApplicationId: "rosevear-comms-hub",
    producerVersion: "1.0.0",
    consumerVersion: "1.0.0",
    schemaId: customerContract.schemaId,
    schemaFingerprint: customerContract.schemaFingerprint
  });
  ensure(
    compatible.compatible &&
      compatible.code === "compatible" &&
      compatible.implementationVerified === false &&
      compatible.fieldMappingRequired === true,
    "structural compatibility does not infer implementation"
  );

  for (const [name, result, expected] of [
    [
      "unknown contract",
      evaluateCrossAppDataContractCompatibility({
        contractId: "rosevear.shared.unknown.v1",
        producerApplicationId: "rosiedazzlers",
        consumerApplicationId: "icamp",
        producerVersion: "1.0.0",
        consumerVersion: "1.0.0"
      }),
      "unknown-contract"
    ],
    [
      "same app",
      evaluateCrossAppDataContractCompatibility({
        contractId: customerContract.contractId,
        producerApplicationId: "icamp",
        consumerApplicationId: "icamp",
        producerVersion: "1.0.0",
        consumerVersion: "1.0.0"
      }),
      "same-application"
    ],
    [
      "future version",
      evaluateCrossAppDataContractCompatibility({
        contractId: customerContract.contractId,
        producerApplicationId: "icamp",
        consumerApplicationId: "yard-workers",
        producerVersion: "1.1.0",
        consumerVersion: "1.0.0"
      }),
      "future-version"
    ],
    [
      "fingerprint drift",
      evaluateCrossAppDataContractCompatibility({
        contractId: customerContract.contractId,
        producerApplicationId: "icamp",
        consumerApplicationId: "yard-workers",
        producerVersion: "1.0.0",
        consumerVersion: "1.0.0",
        schemaFingerprint: "0".repeat(64)
      }),
      "fingerprint-mismatch"
    ]
  ] as const) {
    ensure(!result.compatible && result.code === expected, name + " fails closed");
  }

  const [
    lib,
    api,
    page,
    client,
    navigation,
    operatorTools,
    appConnections,
    connectionValidation,
    packageJson,
    docs,
    statusRaw,
    roadmap,
    existingContracts
  ] = await Promise.all([
    source("lib/cross-app-data-contract-registry.ts"),
    source("app/api/data-contracts/route.ts"),
    source("app/data-contracts/page.tsx"),
    source("app/data-contracts/DataContractCompatibilityChecker.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("app/app-connections/page.tsx"),
    source("app/connection-validation/page.tsx"),
    source("package.json"),
    source("../../docs/BUILD_286_CROSS_APP_DATA_CONTRACT_REGISTRY.md"),
    source("../../docs/integration/ql266-ai-data-platform-build286-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("../../packages/contracts/src/index.ts")
  ]);

  for (const token of [
    "buildCrossAppDataContractRegistry",
    "evaluateCrossAppDataContractCompatibility",
    "validateCrossAppDataContractRecord",
    "buildCrossAppDataContractJsonSchema",
    "same-major-additive",
    "sha256",
    "unknownFieldsFailClosed: true",
    "appImplementationNotInferred: true",
    "fieldMappingRequiredBeforeExchange: true"
  ]) {
    ensure(lib.includes(token), "registry implementation token " + token);
  }

  ensure(
    api.includes('action === "compatibility"') &&
      api.includes('action === "validate-record"') &&
      api.includes("buildCrossAppDataContractJsonSchema") &&
      api.includes('status: 401') &&
      api.includes('"cache-control": "no-store"'),
    "authenticated no-store registry API"
  );
  ensure(
    page.includes("Cross-App Data Contract Registry") &&
      page.includes("Registry availability is not implementation evidence.") &&
      page.includes("Canonical v1 contracts") &&
      page.includes("Preserved separately"),
    "registry operator page"
  );
  ensure(
    client.includes("Check structural compatibility") &&
      client.includes("implementation verified: no") &&
      client.includes("field mapping still required: yes"),
    "compatibility operator control"
  );
  ensure(
    navigation.includes('href: "/data-contracts"') &&
      navigation.includes("customer, product, service, booking, job, staff, equipment, invoice, media, inventory and notification"),
    "application navigation"
  );
  ensure(
    operatorTools.includes('"/data-contracts"') &&
      operatorTools.includes("canonical shared schemas and structural compatibility"),
    "module operator tools"
  );
  ensure(
    appConnections.includes('href="/data-contracts"') &&
      connectionValidation.includes('href="/data-contracts"'),
    "cross-build navigation links"
  );
  ensure(
    packageJson.includes("verify-build-286-cross-app-data-contract-registry.ts"),
    "Build 286 verifier registered"
  );

  for (const legacy of [
    "rosie-dazzlers.competitive-intelligence.v1",
    "devil-n-dove.supplier-inventory.v1"
  ]) {
    ensure(
      existingContracts.includes(legacy) && docs.includes(legacy),
      "preserved existing business contract " + legacy
    );
  }

  ensure(
    docs.includes("Build 287 — Visual Field Mapping Studio") &&
      docs.includes("UNDER_REVIEW / REVIEW_DEFERRED / DISCONNECTED"),
    "documentation continuity and QL-266 boundary"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 286, "status build");
  ensure(
    status.cross_app_data_contract_registry.shared_contracts === 11 &&
      status.cross_app_data_contract_registry.peer_app_implementation_inferred === false &&
      status.cross_app_data_contract_registry.field_mapping_completed === false &&
      status.cross_app_data_contract_registry.database_migration === false &&
      status.cross_app_data_contract_registry.external_requests === 0 &&
      status.cross_app_data_contract_registry.live_exchanges === 0,
    "status contract boundary"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 287, "next build 287");
  ensure(
    roadmap.includes("Build 286 — Cross-App Data Contract Registry") &&
      roadmap.includes("Build 287 — Visual Field Mapping Studio"),
    "official roadmap continuity"
  );

  console.log("Build 286 Cross-App Data Contract Registry verification passed.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
