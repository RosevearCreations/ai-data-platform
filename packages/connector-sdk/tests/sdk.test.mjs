import assert from "node:assert/strict";
import test from "node:test";

import {
  assertConnectorCapability,
  defineConnector,
  normalizeConnectorConfig,
  validateConnectorManifest,
  validateConnectorSecretReferences
} from "../dist/index.js";

const manifest = {
  manifestVersion: 1,
  sdkVersion: 1,
  key: "example.no-secret-normalizer",
  version: "1.0.0",
  displayName: "Example no-secret normalizer",
  description: "Build 029 SDK acceptance connector.",
  capabilities: ["import", "enrichment"],
  configSchema: [{
    key: "case",
    label: "Text case",
    description: "Case transform.",
    type: "string",
    required: true,
    defaultValue: "preserve",
    allowedValues: ["preserve", "lower", "upper"]
  }],
  secrets: [],
  limits: { maxExecutionMs: 2000, maxInputBytes: 20000, maxOutputBytes: 20000 }
};

test("valid v1 connector manifest passes compatibility validation", () => {
  assert.deepEqual(validateConnectorManifest(manifest), { valid: true, errors: [] });
});

test("incompatible SDK versions fail closed", () => {
  const result = validateConnectorManifest({ ...manifest, sdkVersion: 99 });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /incompatible/i);
});

test("config schema normalizes defaults and rejects unknown fields", () => {
  assert.deepEqual(normalizeConnectorConfig(manifest, {}), { case: "preserve" });
  assert.throws(
    () => normalizeConnectorConfig(manifest, { case: "upper", token: "secret" }),
    /unknown_field/
  );
});

test("capability grants are narrower than manifest capabilities", () => {
  assert.doesNotThrow(() => assertConnectorCapability(manifest, ["import"], "import"));
  assert.throws(
    () => assertConnectorCapability(manifest, ["import"], "enrichment"),
    /not_granted/
  );
  assert.throws(
    () => assertConnectorCapability(manifest, ["import"], "export"),
    /unsupported/
  );
});

test("secret references cannot smuggle raw values or arbitrary environment names", () => {
  const secretManifest = {
    ...manifest,
    key: "example.secret",
    secrets: [{
      key: "api-token",
      label: "API token",
      description: "Example.",
      required: true,
      environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
    }]
  };
  assert.deepEqual(
    validateConnectorSecretReferences(secretManifest, {
      "api-token": {
        kind: "environment",
        environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
      }
    }),
    {
      "api-token": {
        kind: "environment",
        environmentVariable: "EXAMPLE_CONNECTOR_API_TOKEN"
      }
    }
  );
  assert.throws(
    () => validateConnectorSecretReferences(secretManifest, {
      "api-token": { kind: "environment", environmentVariable: "DATABASE_URL" }
    }),
    /reference_invalid/
  );
  assert.throws(
    () => validateConnectorSecretReferences(secretManifest, {
      "api-token": { value: "do-not-store-me" }
    }),
    /reference_invalid/
  );
});

test("defineConnector rejects an invalid manifest before registration", () => {
  assert.throws(
    () => defineConnector({ ...manifest, version: "latest" }, async () => ({
      output: {},
      summary: {}
    })),
    /Invalid connector manifest/
  );
});
