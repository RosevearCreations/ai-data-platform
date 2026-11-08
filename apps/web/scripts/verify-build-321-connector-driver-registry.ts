import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildConnectorDriverRegistry,
  findConnectorDriver,
  moduleApiVersionCompatible,
  packageConnectorDriver,
  validateConnectorDriverRegistry
} from "../lib/connector-driver-registry";
import { listRegisteredConnectorManifests } from "../lib/connectors/registry";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function main() {
  assert.equal(moduleApiVersionCompatible("1.0.0"), true);
  assert.equal(moduleApiVersionCompatible("1.9.99"), true);
  assert.equal(moduleApiVersionCompatible("2.0.0"), false);
  assert.equal(moduleApiVersionCompatible("bad"), false);

  const manifests = listRegisteredConnectorManifests();
  assert.ok(manifests.length >= 1);

  const packageOnly = packageConnectorDriver({
    manifest: manifests[0]
  });
  assert.equal(packageOnly.validation.valid, true);
  assert.equal(packageOnly.installState, "available");
  assert.equal(packageOnly.compatibility.moduleApiCompatible, true);
  assert.equal(packageOnly.compatibility.minimumConnectorSdkVersion, 2);
  assert.equal(packageOnly.security.driverPresenceActivatesConnection, false);
  assert.equal(packageOnly.security.installStateActivatesConnection, false);
  assert.equal(packageOnly.security.enabledStateProvesLiveConnection, false);
  assert.equal(packageOnly.security.discoveryGrantsCapabilities, false);
  assert.equal(packageOnly.security.rawSecretValuesIncluded, false);
  assert.equal(
    packageOnly.security.externalHealthProbePerformedDuringDiscovery,
    false
  );
  assert.match(packageOnly.provenance.packageDigestSha256, /^[a-f0-9]{64}$/);
  assert.equal(packageOnly.provenance.signature, null);
  assert.equal(packageOnly.provenance.signatureStatus, "not-provided");
  assert.equal(packageOnly.provenance.signatureVerifiedByRegistry, false);

  const installedDisabled = buildConnectorDriverRegistry({
    installations: [
      {
        connectorKey: manifests[0].key,
        manifestVersion: manifests[0].manifestVersion,
        sdkVersion: manifests[0].sdkVersion,
        connectorVersion: manifests[0].version,
        enabled: false
      }
    ]
  });
  assert.equal(installedDisabled.summary.installed, 1);
  assert.equal(installedDisabled.summary.enabled, 0);
  assert.equal(
    findConnectorDriver(installedDisabled, manifests[0].key)?.installState,
    "installed-disabled"
  );

  const installedEnabled = buildConnectorDriverRegistry({
    installations: [
      {
        connectorKey: manifests[0].key,
        manifestVersion: manifests[0].manifestVersion,
        sdkVersion: manifests[0].sdkVersion,
        connectorVersion: manifests[0].version,
        enabled: true
      }
    ]
  });
  assert.equal(installedEnabled.summary.enabled, 1);
  const enabledDriver = findConnectorDriver(
    installedEnabled,
    manifests[0].key
  );
  assert.equal(enabledDriver?.installState, "installed-enabled");
  assert.equal(
    enabledDriver?.security.enabledStateProvesLiveConnection,
    false
  );

  const incompatible = buildConnectorDriverRegistry({
    installations: [
      {
        connectorKey: manifests[0].key,
        manifestVersion: manifests[0].manifestVersion,
        sdkVersion: manifests[0].sdkVersion,
        connectorVersion: "99.0.0",
        enabled: true
      }
    ]
  });
  assert.equal(incompatible.summary.incompatible, 1);
  assert.equal(
    findConnectorDriver(incompatible, manifests[0].key)?.installState,
    "installed-incompatible"
  );

  const registryValidation = validateConnectorDriverRegistry(
    installedEnabled.drivers
  );
  assert.equal(registryValidation.valid, true);
  assert.deepEqual(registryValidation.errors, []);

  const signedMetadata = packageConnectorDriver({
    manifest: manifests[0],
    signature: {
      algorithm: "ed25519",
      keyId: "release-key-build321",
      signatureBase64:
        "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ=="
    }
  });
  assert.equal(
    signedMetadata.provenance.signatureStatus,
    "metadata-present-unverified"
  );
  assert.equal(
    signedMetadata.provenance.signatureVerifiedByRegistry,
    false
  );

  const [
    driverSource,
    connectorDatabase,
    api,
    page,
    navigation,
    operatorTools,
    manifest,
    docs,
    review,
    roadmap,
    packageRaw
  ] = await Promise.all([
    source("lib/connector-driver-registry.ts"),
    source("lib/connector-database.ts"),
    source("app/api/module-connector-drivers/route.ts"),
    source("app/connectors/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_321_CONNECTOR_DRIVER_DYNAMIC_REGISTRY.md"),
    source("../../docs/integration/ai-data-platform-build321-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "validateConnectorManifest",
    "moduleApiVersionCompatible",
    "installed-disabled",
    "installed-enabled",
    "installed-incompatible",
    "trusted-built-in-registry",
    "metadata-present-unverified",
    "signatureVerifiedByRegistry: false",
    "driverPresenceActivatesConnection: false",
    "enabledStateProvesLiveConnection: false"
  ]) {
    assert.ok(driverSource.includes(token), "Build 321 driver source missing " + token);
  }

  assert.ok(
    connectorDatabase.includes("buildConnectorDriverRegistry") &&
      connectorDatabase.includes("driverRegistry")
  );

  for (const token of [
    "discoveryOnly: true",
    "packagePresenceActivatesConnection: false",
    "installedEnabledStateProvesLiveConnection: false",
    "healthContractsAreDeclarativeOnly: true",
    "authRequirementsAreReferenceOnly: true",
    "signedProvenanceVerifiedByDiscoveryRoute: false"
  ]) {
    assert.ok(api.includes(token), "Build 321 API missing " + token);
  }

  assert.ok(page.includes("Build 321 connector driver registry"));
  assert.ok(page.includes("/api/module-connector-drivers"));
  assert.ok(
    navigation.includes("connector driver registry") &&
      operatorTools.includes("connector driver registry")
  );

  for (const token of [
    '"connector-driver-registry-v1"',
    '"versioned-connector-driver-packages-v1"',
    '"connector-driver-install-state-v1"',
    '"connector-driver-provenance-v1"',
    "connectorDriverPresenceActivatesConnection: false",
    "connectorDriverInstallStateActivatesConnection: false",
    "connectorDriverDiscoveryGrantsCapabilities: false",
    "connectorDriverRegistryReadsRawSecrets: false"
  ]) {
    assert.ok(manifest.includes(token), "Build 321 manifest missing " + token);
  }

  for (const token of [
    "Build 321",
    "Connector driver manifest",
    "Semantic compatibility",
    "Install and disable state",
    "Package provenance",
    "Dynamic registry validation",
    "Build 322"
  ]) {
    assert.ok(docs.includes(token), "Build 321 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 321);
  assert.equal(
    reviewJson.security.driverPresenceActivatesConnection,
    false
  );
  assert.equal(
    reviewJson.security.signatureMetadataClaimedVerified,
    false
  );
  assert.equal(reviewJson.nextQueuedBuild, 322);

  assert.ok(
    roadmap.includes(
      "Build 321 — Connector Driver Packaging & Dynamic Module Registry"
    ) &&
      roadmap.includes(
        "Build 322 — Webhook, Callback & Inbound Endpoint Module"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-321-connector-driver-registry.ts"
      ),
      "Build 321 verifier missing from " + scriptName
    );
  }

  console.log(
    "Build 321 Connector Driver Packaging & Dynamic Module Registry verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
