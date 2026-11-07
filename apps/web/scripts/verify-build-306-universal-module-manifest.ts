import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AI_DATA_MODULE_ID,
  AI_DATA_MODULE_VERSION,
  MODULE_FEATURE_FLAGS,
  MODULE_HEADLESS_CAPABILITIES,
  UNIVERSAL_HOST_CONTRACT_VERSION,
  UNIVERSAL_MODULE_MANIFEST,
  UNIVERSAL_MODULE_PROTOCOL_VERSION,
  UniversalHostContractError,
  createModuleRuntimeIdentity,
  validateUniversalHostContext
} from "../lib/universal-module-contract";

async function main() {
  const root = path.resolve(process.cwd());
  
  async function source(relativePath: string) {
    return readFile(path.join(root, relativePath), "utf8");
  }
  
  const validHost = {
    hostContractVersion: 1 as const,
    hostApplication: {
      id: "rosevear.icamp",
      environment: "test" as const,
      instanceId: "icamp-test-01"
    },
    subject: {
      id: "owner-test-subject"
    },
    tenancy: {
      tenantId: "tenant-test",
      workspaceId: "workspace-test"
    },
    requestedCapabilities: [
      "manifest.read",
      "integration-health.read"
    ] as const,
    featureFlags: [
      "secretless-discovery",
      "runtime-identity-v1"
    ] as const,
    auditCorrelationId: "audit-build306-test-001",
    locale: "en-CA",
    timeZone: "America/Toronto",
    theme: "dark" as const
  };
  
  assert.equal(UNIVERSAL_MODULE_MANIFEST.manifestVersion, 1);
  assert.equal(UNIVERSAL_MODULE_MANIFEST.module.id, AI_DATA_MODULE_ID);
  assert.equal(UNIVERSAL_MODULE_MANIFEST.module.version, AI_DATA_MODULE_VERSION);
  assert.equal(
    UNIVERSAL_MODULE_MANIFEST.protocol.version,
    UNIVERSAL_MODULE_PROTOCOL_VERSION
  );
  assert.equal(UNIVERSAL_HOST_CONTRACT_VERSION, 1);
  assert.ok(MODULE_HEADLESS_CAPABILITIES.includes("manifest.read"));
  assert.ok(MODULE_FEATURE_FLAGS.includes("fail-closed-host-validation"));
  assert.equal(
    UNIVERSAL_MODULE_MANIFEST.security.discoveryActivatesConnection,
    false
  );
  assert.equal(
    UNIVERSAL_MODULE_MANIFEST.security.discoveryGrantsCapabilities,
    false
  );
  assert.equal(
    UNIVERSAL_MODULE_MANIFEST.security.rawSecretsAcceptedInHostContext,
    false
  );
  assert.equal(
    UNIVERSAL_MODULE_MANIFEST.security.ql266ResumedByDiscovery,
    false
  );
  
  const accepted = validateUniversalHostContext(validHost);
  assert.equal(accepted.valid, true);
  
  const identity = createModuleRuntimeIdentity(validHost, {
    moduleInstanceId: "module_build306_test_001",
    createdAt: "2026-11-07T01:00:00.000Z"
  });
  assert.equal(identity.moduleId, "rosevear.ai-data-platform");
  assert.equal(identity.hostApplicationId, "rosevear.icamp");
  assert.equal(identity.hostEnvironment, "test");
  assert.equal(identity.hostInstanceId, "icamp-test-01");
  assert.equal(identity.tenantId, "tenant-test");
  assert.equal(identity.workspaceId, "workspace-test");
  assert.equal(identity.authenticatedSubjectId, "owner-test-subject");
  assert.equal(identity.auditCorrelationId, "audit-build306-test-001");
  
  const unsupportedCapability = validateUniversalHostContext({
    ...validHost,
    requestedCapabilities: ["peer.write"]
  });
  assert.equal(unsupportedCapability.valid, false);
  assert.ok(
    unsupportedCapability.errors.some((error) =>
      error.includes("unsupported value: peer.write")
    )
  );
  
  const unsupportedEnvironment = validateUniversalHostContext({
    ...validHost,
    hostApplication: {
      ...validHost.hostApplication,
      environment: "live"
    }
  });
  assert.equal(unsupportedEnvironment.valid, false);
  
  const unsupportedVersion = validateUniversalHostContext({
    ...validHost,
    hostContractVersion: 2
  });
  assert.equal(unsupportedVersion.valid, false);
  
  const extraField = validateUniversalHostContext({
    ...validHost,
    connectionState: "CONNECTED"
  });
  assert.equal(extraField.valid, false);
  
  const secretBearingHost = validateUniversalHostContext({
    ...validHost,
    authorization: "Bearer should-never-be-here"
  });
  assert.equal(secretBearingHost.valid, false);
  assert.ok(
    secretBearingHost.errors.some((error) =>
      error.includes("Raw secret-like fields are forbidden")
    )
  );
  
  assert.throws(
    () =>
      createModuleRuntimeIdentity({
        ...validHost,
        requestedCapabilities: ["peer.write"]
      }),
    UniversalHostContractError
  );
  
  const [route, docs, review, roadmap, webPackage] = await Promise.all([
    source("app/api/module-manifest/route.ts"),
    source("../../docs/BUILD_306_UNIVERSAL_MODULE_MANIFEST_HOST_CONTRACT_RUNTIME_IDENTITY.md"),
    source("../../docs/integration/ql266-ai-data-platform-build306-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);
  
  for (const token of [
    "UNIVERSAL_MODULE_MANIFEST",
    "no-store",
    "x-rosevear-module-protocol"
  ]) {
    assert.ok(route.includes(token), "module manifest route missing " + token);
  }
  
  for (const token of [
    "Build 306",
    "Universal Module Manifest",
    "Host Contract",
    "Runtime Identity",
    "discovery is not authorization",
    "Build 307"
  ]) {
    assert.ok(docs.includes(token), "Build 306 docs missing " + token);
  }
  
  for (const token of [
    "\"build\": 306",
    "\"connectionState\": \"DISCONNECTED / HOLD\"",
    "\"ql266Resumed\": false",
    "\"peerWritesAuthorized\": false"
  ]) {
    assert.ok(review.includes(token), "Build 306 review missing " + token);
  }
  
  assert.ok(
    roadmap.includes(
      "Build 306 — Universal Module Manifest, Host Contract & Runtime Identity"
    )
  );
  assert.ok(
    roadmap.includes("Build 307 — Headless Module SDK & Host Adapter Interface")
  );
  assert.ok(
    webPackage.includes("verify-build-306-universal-module-manifest.ts")
  );
  
  console.log(
    "Build 306 verification passed: universal manifest discovery is secretless and non-authorizing; host contract/runtime identity validation fails closed for unsupported, malformed or secret-bearing host input."
  );
}

void main();
