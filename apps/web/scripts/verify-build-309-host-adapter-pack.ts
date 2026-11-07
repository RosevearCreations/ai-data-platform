import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MODULE_HOST_ADAPTER_KINDS,
  MODULE_HOST_ADAPTER_PACK_SCHEMA,
  MODULE_HOST_ADAPTER_PACK_VERSION,
  MODULE_HOST_SCAFFOLD_SCHEMA,
  createModuleHostContext,
  generateModuleHostScaffold,
  listModuleHostAdapters,
  validateModuleOriginForHostAdapter
} from "../lib/module-host-adapter-pack";
import { validateUniversalHostContext } from "../lib/universal-module-contract";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function main() {
  assert.equal(
    MODULE_HOST_ADAPTER_PACK_SCHEMA,
    "rosevear.ai-data-platform.host-adapter-pack.v1"
  );
  assert.equal(MODULE_HOST_ADAPTER_PACK_VERSION, "1.0.0");
  assert.equal(
    MODULE_HOST_SCAFFOLD_SCHEMA,
    "rosevear.ai-data-platform.host-scaffold.v1"
  );

  const definitions = listModuleHostAdapters();
  assert.deepEqual(
    definitions.map((definition) => definition.kind),
    [...MODULE_HOST_ADAPTER_KINDS]
  );
  assert.equal(definitions.length, 5);

  for (const definition of definitions) {
    assert.equal(definition.credentialsInSourceAllowed, false);
    assert.equal(definition.mountGrantsAuthorization, false);
    assert.equal(definition.supportsCustomElement, true);
    assert.equal(definition.supportsIframeFallback, true);
    assert.equal(definition.customElementTag, "rosevear-ai-data-module");

    const scaffold = generateModuleHostScaffold({
      adapter: definition.kind,
      hostApplicationId: "sample.host",
      environment: "test",
      defaultSurface: "integration-health",
      requestedCapabilities: ["manifest.read", "integration-health.read"]
    });

    assert.equal(scaffold.schema, MODULE_HOST_SCAFFOLD_SCHEMA);
    assert.equal(scaffold.adapter.kind, definition.kind);
    assert.equal(scaffold.defaultSurface, "integration-health");
    assert.equal(scaffold.security.generatedCredentials, false);
    assert.equal(scaffold.security.credentialsEmbeddedInSource, false);
    assert.equal(scaffold.security.mountGrantsAuthorization, false);
    assert.ok(scaffold.files.length >= 4);

    const codeFiles = scaffold.files.filter(
      (file) => !file.path.toLowerCase().startsWith("readme")
    );

    for (const file of codeFiles) {
      assert.ok(
        !/(password|client_secret|private_key|bearer)\s*[:=]/i.test(
          file.content
        ),
        definition.kind + " scaffold embeds a forbidden credential field in " + file.path
      );
    }

    const merged = scaffold.files.map((file) => file.content).join("\n");
    assert.ok(merged.includes("/module-embed/"));
    assert.ok(merged.includes("hostOrigin"));
    assert.ok(merged.includes("auditCorrelationId"));
    assert.ok(merged.includes("allow-forms allow-scripts allow-same-origin"));
    assert.ok(merged.includes('referrerPolicy = "origin"'));
  }

  const react = generateModuleHostScaffold({
    adapter: "react",
    hostApplicationId: "sample.react",
    environment: "development",
    defaultSurface: "data-library"
  });
  assert.ok(
    react.files.some(
      (file) =>
        file.path === ".env.example" &&
        file.content.includes("VITE_AI_DATA_MODULE_ORIGIN=")
    )
  );

  const nextjs = generateModuleHostScaffold({
    adapter: "nextjs",
    hostApplicationId: "sample.nextjs",
    environment: "staging",
    defaultSurface: "app-connections"
  });
  assert.ok(
    nextjs.files.some(
      (file) =>
        file.path === ".env.example" &&
        file.content.includes("NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN=")
    )
  );

  const vanilla = generateModuleHostScaffold({
    adapter: "vanilla",
    hostApplicationId: "sample.vanilla",
    environment: "production",
    defaultSurface: "production-learning"
  });
  const vanillaContext = vanilla.files.find(
    (file) => file.path === "host-context.js"
  );
  assert.ok(vanillaContext);
  assert.ok(!vanillaContext.content.includes("input: {"));
  assert.ok(
    vanilla.files.some(
      (file) =>
        file.path === "config.example.js" &&
        file.content.includes("window.AI_DATA_MODULE_CONFIG")
    )
  );

  const electron = generateModuleHostScaffold({
    adapter: "electron",
    hostApplicationId: "sample.desktop",
    environment: "test",
    defaultSurface: "integration-certification"
  });
  const electronMerged = electron.files
    .map((file) => file.content)
    .join("\n");
  assert.ok(electronMerged.includes("contextIsolation: true"));
  assert.ok(electronMerged.includes("nodeIntegration: false"));
  assert.ok(electronMerged.includes("sandbox: true"));
  assert.ok(electronMerged.includes("contextBridge.exposeInMainWorld"));
  assert.ok(
    electron.files
      .filter((file) => file.path.includes("renderer"))
      .every((file) => !file.content.includes("process.env"))
  );

  const context = createModuleHostContext({
    hostApplicationId: "sample.host",
    environment: "test",
    hostInstanceId: "host_instance_001",
    subjectId: "subject_001",
    tenantId: "tenant_001",
    workspaceId: "workspace_001",
    auditCorrelationId: "audit_build309_001",
    requestedCapabilities: ["manifest.read"]
  });
  const validation = validateUniversalHostContext(context);
  assert.equal(validation.valid, true);

  assert.equal(
    validateModuleOriginForHostAdapter("https://module.example"),
    "https://module.example"
  );
  assert.throws(() => validateModuleOriginForHostAdapter("*"));
  assert.throws(() =>
    validateModuleOriginForHostAdapter("http://module.example")
  );

  assert.throws(() =>
    generateModuleHostScaffold({
      adapter: "react",
      hostApplicationId: "Invalid Host",
      environment: "test",
      defaultSurface: "data-library"
    })
  );

  assert.throws(() =>
    generateModuleHostScaffold({
      adapter: "react",
      hostApplicationId: "sample.host",
      environment: "test",
      defaultSurface: "unsupported-surface"
    })
  );

  const [
    packSource,
    cliSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/module-host-adapter-pack.ts"),
    source("scripts/generate-module-host-scaffold.ts"),
    source("app/api/module-host-adapters/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_309_HOST_ADAPTER_PACK_SCAFFOLD_GENERATOR.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build309-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    '"react"',
    '"nextjs"',
    '"vite"',
    '"vanilla"',
    '"electron"',
    "credentialsInSourceAllowed: false",
    "mountGrantsAuthorization: false",
    "contextIsolation: true",
    "nodeIntegration: false"
  ]) {
    assert.ok(packSource.includes(token), "Build 309 pack missing " + token);
  }

  for (const token of [
    "--adapter",
    "--app-id",
    "--environment",
    "--surface",
    "--out",
    "credential, password, cookie, token, API key or secret arguments",
    'flag: "wx"'
  ]) {
    assert.ok(cliSource.includes(token), "Build 309 CLI missing " + token);
  }

  for (const token of [
    "host-adapter-catalog.v1",
    "credentialArgumentsAccepted: false",
    "credentialsGenerated: false",
    "adapterPresenceGrantsAuthorization: false",
    "ql266ResumedByAdapterPack: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 309 API missing " + token);
  }

  for (const token of [
    '"host-adapter-pack-v1"',
    '"credential-free-scaffold-generator"',
    "adapterPresenceGrantsAuthorization: false",
    "scaffoldEmbedsCredentials: false"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 309 manifest missing " + token
    );
  }

  for (const token of [
    "Build 309",
    "React",
    "Next.js",
    "Vite",
    "vanilla browser JavaScript",
    "Electron",
    "Build 310"
  ]) {
    assert.ok(docs.includes(token), "Build 309 docs missing " + token);
  }

  for (const token of [
    '"build": 309',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"credentialsEmbeddedInSource": false',
    '"adapterPresenceGrantsAuthorization": false'
  ]) {
    assert.ok(review.includes(token), "Build 309 review missing " + token);
  }

  assert.ok(
    roadmap.includes("Build 309 — Host Adapter Pack & Module Scaffold Generator")
  );
  assert.ok(
    roadmap.includes("Build 310 — Authentication & User Context Bridge")
  );
  assert.ok(
    webPackage.includes("verify-build-309-host-adapter-pack.ts")
  );

  console.log(
    "Build 309 verification passed: React, Next.js, Vite, vanilla-browser and Electron host adapter scaffolds remain credential-free, use the secure Build 308 iframe boundary, preserve independent host-context validation and do not grant authorization, activate a connection or resume QL-266."
  );
}

void main();
