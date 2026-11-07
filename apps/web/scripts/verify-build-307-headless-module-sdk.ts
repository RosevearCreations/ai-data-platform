import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  HEADLESS_MODULE_SDK_SCHEMA,
  HEADLESS_MODULE_SDK_VERSION,
  HeadlessModuleSdk,
  HeadlessModuleSdkError,
  createDeterministicTestAdapter,
  createDeterministicTestAuthorizer,
  createDeterministicTestInvoker
} from "../lib/headless-module-sdk";
import type { HostRuntimeContext } from "../lib/universal-module-contract";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function main() {
  const context: HostRuntimeContext = {
    hostContractVersion: 1,
    hostApplication: {
      id: "rosevear.icamp",
      environment: "test",
      instanceId: "icamp-build307-test"
    },
    subject: {
      id: "owner-build307-test"
    },
    tenancy: {
      tenantId: "tenant-build307",
      workspaceId: "workspace-build307"
    },
    requestedCapabilities: [
      "manifest.read",
      "integration-health.read",
      "data-contracts.read"
    ],
    featureFlags: [
      "secretless-discovery",
      "runtime-identity-v1",
      "headless-read-capabilities"
    ],
    auditCorrelationId: "audit-build307-cert-001",
    locale: "en-CA",
    timeZone: "America/Toronto",
    theme: "dark"
  };

  const adapter = createDeterministicTestAdapter({ context });
  let requestCounter = 0;
  const sdk = new HeadlessModuleSdk({
    adapter,
    authorizer: createDeterministicTestAuthorizer([
      "manifest.read",
      "integration-health.read"
    ]),
    invoker: createDeterministicTestInvoker({
      "manifest.read": (envelope) => ({
        accepted: true,
        requestId: envelope.requestId,
        host: envelope.runtimeIdentity.hostApplicationId
      }),
      "integration-health.read": () => ({
        state: "synthetic-test-only"
      })
    }),
    now: () => "2026-11-07T02:30:00.000Z",
    requestIdFactory: () =>
      "request_build307_" + String(++requestCounter).padStart(3, "0"),
    moduleInstanceIdFactory: () => "module_build307_test_001"
  });

  assert.equal(sdk.schema, HEADLESS_MODULE_SDK_SCHEMA);
  assert.equal(sdk.sdkVersion, HEADLESS_MODULE_SDK_VERSION);
  assert.equal(sdk.state.status, "idle");

  await assert.rejects(
    () =>
      sdk.invoke({
        capability: "manifest.read",
        operation: "manifest.get",
        payload: {}
      }),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "sdk_not_initialized" &&
      error.retryHint.strategy === "safe"
  );

  const identity = await sdk.initialize();
  assert.equal(identity.hostApplicationId, "rosevear.icamp");
  assert.equal(identity.tenantId, "tenant-build307");
  assert.equal(identity.workspaceId, "workspace-build307");
  assert.equal(identity.auditCorrelationId, "audit-build307-cert-001");
  assert.equal(identity.moduleInstanceId, "module_build307_test_001");
  assert.equal(sdk.state.status, "ready");
  assert.equal(adapter.lifecycleEvents.length, 1);
  assert.equal(adapter.lifecycleEvents[0]?.type, "initialized");

  const result = await sdk.invoke<{
    accepted: boolean;
    requestId: string;
    host: string;
  }>({
    capability: "manifest.read",
    operation: "manifest.get",
    payload: {
      includeCompatibility: true
    }
  });

  assert.equal(result.requestId, "request_build307_001");
  assert.equal(result.auditCorrelationId, "audit-build307-cert-001");
  assert.equal(result.capability, "manifest.read");
  assert.equal(result.operation, "manifest.get");
  assert.equal(result.result.accepted, true);
  assert.equal(result.result.host, "rosevear.icamp");

  assert.deepEqual(
    adapter.auditEvents
      .filter((event) => event.requestId === "request_build307_001")
      .map((event) => event.status),
    ["requested", "authorized", "succeeded"]
  );

  await assert.rejects(
    () =>
      sdk.invoke({
        capability: "data-contracts.read",
        operation: "contracts.list",
        payload: {}
      }),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "capability_denied" &&
      error.retryHint.strategy === "never"
  );

  assert.deepEqual(
    adapter.auditEvents
      .filter((event) => event.requestId === "request_build307_002")
      .map((event) => event.status),
    ["requested", "denied"]
  );

  await assert.rejects(
    () =>
      sdk.invoke({
        capability: "recovery-plan.read",
        operation: "recovery.plan",
        payload: {}
      }),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "capability_not_requested"
  );

  await assert.rejects(
    () =>
      sdk.invoke({
        capability: "peer.write",
        operation: "peer.write",
        payload: {}
      }),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "unsupported_capability"
  );

  await assert.rejects(
    () =>
      sdk.invoke({
        capability: "manifest.read",
        operation: "INVALID OPERATION",
        payload: {}
      }),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "operation_invalid"
  );

  await assert.rejects(
    () => sdk.initialize(),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "sdk_already_initialized"
  );

  await sdk.teardown();
  assert.equal(sdk.state.status, "idle");
  assert.equal(adapter.lifecycleEvents.at(-1)?.type, "teardown");

  await sdk.teardown();
  assert.equal(sdk.state.status, "idle");

  const badAdapter = createDeterministicTestAdapter({
    context: {
      ...context,
      requestedCapabilities: ["manifest.read"]
    }
  });
  badAdapter.contextProvider.getContext = () => ({
    ...context,
    authorization: "Bearer forbidden"
  });

  const invalidSdk = new HeadlessModuleSdk({
    adapter: badAdapter,
    authorizer: createDeterministicTestAuthorizer(["manifest.read"]),
    invoker: createDeterministicTestInvoker({
      "manifest.read": () => ({ ok: true })
    }),
    requestIdFactory: () => "request_build307_invalid",
    moduleInstanceIdFactory: () => "module_build307_invalid"
  });

  await assert.rejects(
    () => invalidSdk.initialize(),
    (error: unknown) =>
      error instanceof HeadlessModuleSdkError &&
      error.code === "host_context_invalid"
  );

  const [sdkSource, moduleContract, docs, review, roadmap, webPackage] =
    await Promise.all([
      source("lib/headless-module-sdk.ts"),
      source("lib/universal-module-contract.ts"),
      source(
        "../../docs/BUILD_307_HEADLESS_MODULE_SDK_HOST_ADAPTER_INTERFACE.md"
      ),
      source(
        "../../docs/integration/ql266-ai-data-platform-build307-review.json"
      ),
      source("../../docs/NEXT_BUILDS_306_330.md"),
      source("package.json")
    ]);

  for (const token of [
    "HeadlessModuleHostAdapter",
    "HeadlessModuleContextProvider",
    "HeadlessModuleCapabilityAuthorizer",
    "HeadlessModuleInvocationEnvelope",
    "HeadlessModuleSdkError",
    "createDeterministicTestAdapter",
    "createDeterministicTestAuthorizer",
    "createDeterministicTestInvoker"
  ]) {
    assert.ok(sdkSource.includes(token), "Build 307 SDK missing " + token);
  }

  assert.ok(
    sdkSource.includes("capability_not_requested") &&
      sdkSource.includes("capability_denied") &&
      sdkSource.includes("invocation_failed"),
    "Build 307 standardized error boundary is incomplete."
  );

  assert.ok(
    sdkSource.includes("auditCorrelationId") &&
      sdkSource.includes("requestId"),
    "Build 307 correlation/audit metadata is incomplete."
  );

  assert.ok(
    moduleContract.includes('"headless-module-sdk-v1"') &&
      moduleContract.includes("sdkRequiresIndependentAuthorization"),
    "Build 307 universal manifest feature/security declarations are missing."
  );

  for (const token of [
    "Build 307",
    "Headless Module SDK",
    "Host Adapter Interface",
    "separate module authorizer",
    "Mutating operations remain governed",
    "Build 308"
  ]) {
    assert.ok(docs.includes(token), "Build 307 docs missing " + token);
  }

  for (const token of [
    "\"build\": 307",
    "\"connectionState\": \"DISCONNECTED / HOLD\"",
    "\"ql266Resumed\": false",
    "\"peerWritesAuthorized\": false",
    "\"hostRequestedCapabilityIsAuthorization\": false"
  ]) {
    assert.ok(review.includes(token), "Build 307 review missing " + token);
  }

  assert.ok(
    roadmap.includes("Build 307 — Headless Module SDK & Host Adapter Interface")
  );
  assert.ok(
    roadmap.includes(
      "Build 308 — Embeddable Module Runtime Shell & Secure Mount Boundary"
    )
  );
  assert.ok(
    webPackage.includes("verify-build-307-headless-module-sdk.ts")
  );

  console.log(
    "Build 307 verification passed: framework-neutral headless SDK lifecycle, host adapter context, independent capability authorization, correlation/audit metadata, standardized fail-closed errors and deterministic certification adapter are enforced without activating peer writes or QL-266."
  );
}

void main();
