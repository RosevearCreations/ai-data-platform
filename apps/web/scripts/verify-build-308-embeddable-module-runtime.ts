import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  EMBEDDED_MODULE_REFERRER_POLICY,
  EMBEDDED_MODULE_RUNTIME_SCHEMA,
  EMBEDDED_MODULE_RUNTIME_VERSION,
  EMBEDDED_MODULE_SANDBOX,
  EmbeddedModuleRuntimeController,
  EmbeddedModuleRuntimeError,
  createEmbeddedMountDescriptor,
  normalizeTrustedOrigin,
  parseConfiguredEmbedHostOrigins,
  resolveEmbeddedSurface,
  validateEmbeddedHostMessage,
  validateEmbeddedModuleMessage,
  type EmbeddedFramePort,
  type EmbeddedMountDescriptor
} from "../lib/embedded-module-runtime";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function main() {
  assert.equal(
    normalizeTrustedOrigin("https://host.example"),
    "https://host.example"
  );
  assert.equal(
    normalizeTrustedOrigin("http://localhost:3000"),
    "http://localhost:3000"
  );

  for (const invalid of [
    "*",
    "http://host.example",
    "https://user:pass@host.example",
    "https://host.example/path",
    "https://host.example/?x=1"
  ]) {
    assert.throws(
      () => normalizeTrustedOrigin(invalid),
      EmbeddedModuleRuntimeError
    );
  }

  assert.deepEqual(
    parseConfiguredEmbedHostOrigins(
      "https://one.example, https://two.example, https://one.example"
    ),
    ["https://one.example", "https://two.example"]
  );

  assert.equal(resolveEmbeddedSurface("data-library").route, "/data-library");
  assert.throws(
    () => resolveEmbeddedSurface("admin-secrets"),
    (error: unknown) =>
      error instanceof EmbeddedModuleRuntimeError &&
      error.code === "invalid_surface"
  );

  const descriptor = createEmbeddedMountDescriptor({
    moduleOrigin: "https://module.example",
    hostOrigin: "https://host.example",
    surfaceId: "integration-health",
    runtimeInstanceId: "embed_build308_runtime_001",
    auditCorrelationId: "audit_build308_runtime_001"
  });

  assert.equal(descriptor.schema, EMBEDDED_MODULE_RUNTIME_SCHEMA);
  assert.equal(descriptor.runtimeVersion, EMBEDDED_MODULE_RUNTIME_VERSION);
  assert.equal(descriptor.surface.id, "integration-health");
  assert.equal(descriptor.iframe.sandbox, EMBEDDED_MODULE_SANDBOX);
  assert.equal(
    descriptor.iframe.referrerPolicy,
    EMBEDDED_MODULE_REFERRER_POLICY
  );
  assert.equal(descriptor.security.wildcardOriginsAllowed, false);
  assert.equal(descriptor.security.rawHostSecretsAccepted, false);
  assert.equal(descriptor.security.mountGrantsAuthorization, false);
  assert.match(
    descriptor.iframe.src,
    /^https:\/\/module\.example\/module-embed\/integration-health\?/
  );
  assert.ok(!descriptor.iframe.src.includes("token="));
  assert.ok(!descriptor.iframe.src.includes("password="));

  const events: Array<{
    action: string;
    descriptor?: EmbeddedMountDescriptor;
  }> = [];

  const port: EmbeddedFramePort = {
    mount(value) {
      events.push({ action: "mount", descriptor: value });
    },
    navigate(value) {
      events.push({ action: "navigate", descriptor: value });
    },
    reload(value) {
      events.push({ action: "reload", descriptor: value });
    },
    unmount() {
      events.push({ action: "unmount" });
    }
  };

  const runtime = new EmbeddedModuleRuntimeController({
    port,
    moduleOrigin: "https://module.example",
    hostOrigin: "https://host.example",
    runtimeInstanceId: "embed_build308_runtime_001",
    auditCorrelationId: "audit_build308_runtime_001"
  });

  assert.equal(runtime.state, "idle");
  await assert.rejects(
    () => runtime.reload(),
    (error: unknown) =>
      error instanceof EmbeddedModuleRuntimeError &&
      error.code === "runtime_not_mounted"
  );

  await runtime.mount("data-library");
  assert.equal(runtime.state, "mounted");
  assert.equal(runtime.descriptor?.surface.id, "data-library");

  await runtime.navigate("production-learning");
  assert.equal(runtime.state, "mounted");
  assert.equal(runtime.descriptor?.surface.id, "production-learning");

  await runtime.reload();
  assert.equal(runtime.state, "mounted");

  await runtime.unmount();
  assert.equal(runtime.state, "unmounted");
  assert.equal(runtime.descriptor, null);
  assert.deepEqual(
    events.map((entry) => entry.action),
    ["mount", "navigate", "reload", "unmount"]
  );

  const hostMessage = validateEmbeddedHostMessage({
    expectedHostOrigin: "https://host.example",
    eventOrigin: "https://host.example",
    runtimeInstanceId: "embed_build308_runtime_001",
    auditCorrelationId: "audit_build308_runtime_001",
    value: {
      schema: "rosevear.ai-data-platform.embed-host-message.v1",
      type: "surface.navigate",
      runtimeInstanceId: "embed_build308_runtime_001",
      auditCorrelationId: "audit_build308_runtime_001",
      surfaceId: "integration-certification"
    }
  });
  assert.equal(hostMessage.type, "surface.navigate");

  assert.throws(
    () =>
      validateEmbeddedHostMessage({
        expectedHostOrigin: "https://host.example",
        eventOrigin: "https://evil.example",
        runtimeInstanceId: "embed_build308_runtime_001",
        auditCorrelationId: "audit_build308_runtime_001",
        value: {
          schema: "rosevear.ai-data-platform.embed-host-message.v1",
          type: "runtime.ping",
          runtimeInstanceId: "embed_build308_runtime_001",
          auditCorrelationId: "audit_build308_runtime_001"
        }
      }),
    (error: unknown) =>
      error instanceof EmbeddedModuleRuntimeError &&
      error.code === "invalid_origin"
  );

  assert.throws(
    () =>
      validateEmbeddedHostMessage({
        expectedHostOrigin: "https://host.example",
        eventOrigin: "https://host.example",
        runtimeInstanceId: "embed_build308_runtime_001",
        auditCorrelationId: "audit_build308_runtime_001",
        value: {
          schema: "rosevear.ai-data-platform.embed-host-message.v1",
          type: "runtime.ping",
          runtimeInstanceId: "embed_build308_runtime_001",
          auditCorrelationId: "audit_build308_runtime_001",
          token: "must-not-pass"
        }
      }),
    (error: unknown) =>
      error instanceof EmbeddedModuleRuntimeError &&
      error.code === "invalid_message"
  );

  const moduleMessage = validateEmbeddedModuleMessage({
    expectedModuleOrigin: "https://module.example",
    eventOrigin: "https://module.example",
    runtimeInstanceId: "embed_build308_runtime_001",
    auditCorrelationId: "audit_build308_runtime_001",
    value: {
      schema: "rosevear.ai-data-platform.embed-module-message.v1",
      type: "runtime.ready",
      runtimeInstanceId: "embed_build308_runtime_001",
      auditCorrelationId: "audit_build308_runtime_001",
      surfaceId: "data-library"
    }
  });
  assert.equal(moduleMessage.type, "runtime.ready");

  const [
    elementSource,
    bridgeSource,
    pageSource,
    apiSource,
    shellSource,
    nextConfig,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/embedded-module-element.ts"),
    source("app/module-embed/[surface]/EmbeddedModuleBridge.tsx"),
    source("app/module-embed/[surface]/page.tsx"),
    source("app/api/module-embed-config/route.ts"),
    source("app/application-shell.tsx"),
    source("next.config.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_308_EMBEDDABLE_MODULE_RUNTIME_SHELL.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build308-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "registerAiDataPlatformModuleElement",
    "EMBEDDED_MODULE_ELEMENT_TAG",
    "event.source !== this.frame.contentWindow",
    "postMessage(",
    "descriptor.moduleOrigin",
    "disconnectedCallback"
  ]) {
    assert.ok(elementSource.includes(token), "Build 308 element missing " + token);
  }

  for (const token of [
    "event.source !== window.parent",
    "window.parent.postMessage(message, hostOrigin)",
    "validateEmbeddedHostMessage",
    "runtime.reload",
    "encodeURIComponent(message.surfaceId)",
    "router.replace"
  ]) {
    assert.ok(bridgeSource.includes(token), "Build 308 bridge missing " + token);
  }

  for (const token of [
    "parseConfiguredEmbedHostOrigins",
    "allowedHosts.has(hostOrigin)",
    "referer !== hostOrigin",
    "EmbeddedModuleBridge",
    "DataLibraryPage",
    "IntegrationCertificationPage"
  ]) {
    assert.ok(pageSource.includes(token), "Build 308 page missing " + token);
  }

  assert.ok(
    shellSource.includes('pathname.startsWith("/module-embed/")'),
    "Embedded surfaces must bypass normal application chrome."
  );

  for (const token of [
    "frame-ancestors ",
    "AI_DATA_EMBED_ALLOWED_HOST_ORIGINS",
    'value === "*"',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]) {
    assert.ok(nextConfig.includes(token), "Build 308 CSP missing " + token);
  }

  for (const token of [
    "module-embed-config.v1",
    "wildcardOriginAllowed: false",
    "rawHostSecretsAccepted: false",
    "ql266ResumedByMount: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 308 config API missing " + token);
  }

  for (const token of [
    '"embedded-runtime-shell-v1"',
    '"secure-postmessage-boundary"',
    "embeddedMountGrantsPlatformAuthority: false",
    "embeddedRuntimeInheritsRawHostSecrets: false",
    "wildcardEmbedOriginsAllowed: false",
    "frameAncestorsDefaultSelfOnly: true"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 308 universal manifest missing " + token
    );
  }

  for (const token of [
    "Build 308",
    "Web Component",
    "frame-ancestors",
    "AI_DATA_EMBED_ALLOWED_HOST_ORIGINS",
    "A mounted UI is not permission",
    "Build 309"
  ]) {
    assert.ok(docs.includes(token), "Build 308 docs missing " + token);
  }

  for (const token of [
    '"build": 308',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"wildcardOriginAllowed": false',
    '"rawHostSecretsAccepted": false',
    '"mountGrantsPlatformAuthority": false'
  ]) {
    assert.ok(review.includes(token), "Build 308 review missing " + token);
  }

  assert.ok(
    roadmap.includes(
      "Build 308 — Embeddable Module Runtime Shell & Secure Mount Boundary"
    )
  );
  assert.ok(
    roadmap.includes("Build 309 — Host Adapter Pack & Module Scaffold Generator")
  );
  assert.ok(
    webPackage.includes("verify-build-308-embeddable-module-runtime.ts")
  );

  console.log(
    "Build 308 verification passed: custom-element and iframe-compatible embedded runtime, strict surface routing, exact-origin/source postMessage boundary, CSP frame-ancestor restrictions and deterministic mount/reload/unmount recovery are enforced without inheriting raw host secrets, granting authorization or resuming QL-266."
  );
}

void main();
