import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  BUSINESS_INTEGRATION_CONTRACTS,
  BUSINESS_INTEGRATION_PACKAGE_TTL_MS,
  DEVIL_N_DOVE_INTEGRATION_SCHEMA_V1,
  PLATFORM_BUILD,
  PLATFORM_NAME,
  ROSIE_DAZZLERS_INTEGRATION_SCHEMA_V1,
  WORKSPACE_SLUGS,
  businessIntegrationFingerprint,
  businessIntegrationPackageId,
  validateBusinessIntegrationPackage
} from "../dist/index.js";

async function fixture(name) {
  return JSON.parse(
    await readFile(new URL("../fixtures/" + name, import.meta.url), "utf8")
  );
}

test("shared contracts expose the Build 022 platform baseline", () => {
  assert.equal(PLATFORM_NAME, "AI Data Platform");
  assert.equal(PLATFORM_BUILD, "022");
  assert.deepEqual(WORKSPACE_SLUGS, [
    "rosiedazzlers",
    "devilndove",
    "personal"
  ]);
});

test("standalone JSON schemas match executable v1 target contracts", async () => {
  const rosieSchema = await fixture(
    "../schemas/rosie-dazzlers.competitive-intelligence.v1.schema.json"
  );
  const devilSchema = await fixture(
    "../schemas/devil-n-dove.supplier-inventory.v1.schema.json"
  );
  assert.equal(
    rosieSchema.$id,
    BUSINESS_INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId
  );
  assert.equal(
    devilSchema.$id,
    BUSINESS_INTEGRATION_CONTRACTS["devil-n-dove"].schemaId
  );
});

test("schemas publish distinct v1 target contracts", () => {
  assert.equal(
    ROSIE_DAZZLERS_INTEGRATION_SCHEMA_V1.$id,
    BUSINESS_INTEGRATION_CONTRACTS["rosie-dazzlers"].schemaId
  );
  assert.equal(
    DEVIL_N_DOVE_INTEGRATION_SCHEMA_V1.$id,
    BUSINESS_INTEGRATION_CONTRACTS["devil-n-dove"].schemaId
  );
});

test("valid Rosie and Devil n Dove fixtures pass independent validation", async () => {
  for (const name of ["rosie-valid-v1.json", "devil-valid-v1.json"]) {
    const value = await fixture(name);
    const result = validateBusinessIntegrationPackage(value, {
      now: "2026-10-06T14:00:00.000Z"
    });
    assert.equal(result.valid, true, name);
    assert.equal(result.code, "valid", name);
  }
});

test("unsupported versions are rejected deterministically", async () => {
  const result = validateBusinessIntegrationPackage(
    await fixture("unsupported-version.json"),
    { now: "2026-10-06T14:00:00.000Z" }
  );
  assert.equal(result.valid, false);
  assert.equal(result.code, "unsupported-version");
});

test("tampering is rejected by canonical fingerprint verification", async () => {
  const value = await fixture("rosie-valid-v1.json");
  value.operations[0].values.priceMinimumCad = 109;
  const result = validateBusinessIntegrationPackage(value, {
    now: "2026-10-06T14:00:00.000Z"
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "fingerprint-mismatch");
});

test("duplicate package IDs are rejected before consumer mutation", async () => {
  const value = await fixture("devil-valid-v1.json");
  const result = validateBusinessIntegrationPackage(value, {
    now: "2026-10-06T14:00:00.000Z",
    seenPackageIds: new Set([value.packageId])
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "duplicate");
});

test("expired package handoff windows are rejected", async () => {
  const value = await fixture("rosie-valid-v1.json");
  const result = validateBusinessIntegrationPackage(value, {
    now: "2026-10-08T14:00:00.000Z"
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "expired");
});

test("stale source data is rejected even when package window is extended", async () => {
  const value = await fixture("rosie-valid-v1.json");
  value.expiresAt = "2027-01-01T00:00:00.000Z";
  const result = validateBusinessIntegrationPackage(value, {
    now: "2026-12-06T14:00:00.000Z"
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "stale");
});

test("unexpected target fields are rejected", async () => {
  const value = await fixture("rosie-valid-v1.json");
  value.operations[0].values.internalNotes = "must never cross the adapter";
  const result = validateBusinessIntegrationPackage(value, {
    now: "2026-10-06T14:00:00.000Z"
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "unexpected-field");
});

test("fixture fingerprint and package identity are reproducible", async () => {
  const value = await fixture("rosie-valid-v1.json");
  const fingerprint = businessIntegrationFingerprint({
    target: value.target,
    adapterContract: value.adapterContract,
    contractVersion: value.contractVersion,
    batchId: value.batchId,
    approvedAt: value.approvedAt,
    sourceDatasetUpdatedAt: value.sourceDatasetUpdatedAt,
    operations: value.operations
  });
  assert.equal(fingerprint, value.fingerprint);
  assert.equal(
    businessIntegrationPackageId({
      target: value.target,
      batchId: value.batchId,
      approvedAt: value.approvedAt,
      fingerprint
    }),
    value.packageId
  );
  assert.equal(BUSINESS_INTEGRATION_PACKAGE_TTL_MS, 24 * 60 * 60 * 1000);
});
