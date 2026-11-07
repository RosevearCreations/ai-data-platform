import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCrossAppDataContractRegistry
} from "../lib/cross-app-data-contract-registry";
import {
  createHostSchemaDescriptor,
  resolveUniversalDataContract,
  UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION
} from "../lib/universal-data-contract-resolver";
import {
  canonicalRosevearCommsValue,
  inspectQl365dSourceSigner
} from "../lib/ql365d-comms-source-runtime";
import {
  buildAndSignQl365dSourceHealthContract,
  signQl365dDiscoveryManifest
} from "../lib/ql365d-source-contract";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function main() {
  assert.equal(UNIVERSAL_DATA_CONTRACT_RESOLVER_VERSION, "1.0.0");

  const customer = buildCrossAppDataContractRegistry().contracts.find(
    (contract) => contract.kind === "customer"
  );
  assert.ok(customer);

  const sourceFields = customer.fields.map((field) => ({
    path: field.key,
    type: field.type,
    required: field.required,
    enumValues: field.enumValues ? [...field.enumValues] : []
  }));

  const descriptor = createHostSchemaDescriptor({
    hostApplicationId: "icamp",
    hostEnvironment: "test",
    schemaId: "icamp.customer.v1",
    schemaVersion: "1.0.0",
    fields: sourceFields
  });

  assert.match(descriptor.sourceFingerprint, /^[0-9a-f]{64}$/);
  assert.match(descriptor.evidenceFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(descriptor.discovery.readOnly, true);
  assert.equal(descriptor.discovery.rawRecordContentsRequired, false);
  assert.equal(descriptor.discovery.rawRecordContentsIncluded, false);
  assert.equal(descriptor.discovery.discoveryGrantsAuthorization, false);
  assert.equal(descriptor.discovery.discoveryActivatesConnection, false);

  const unresolved = resolveUniversalDataContract({
    descriptor,
    contractId: customer.contractId,
    consumerApplicationId: "rosevear-comms-hub"
  });

  assert.equal(unresolved.compatibility.compatible, true);
  assert.equal(unresolved.compatibility.implementationVerified, false);
  assert.equal(unresolved.security.rawRecordsInspected, false);
  assert.equal(unresolved.security.mappingSuggestionsAutoApproved, false);
  assert.equal(unresolved.security.contractCompatibilityAuthorizesExchange, false);
  assert.equal(unresolved.security.liveExchangeAuthorized, false);
  assert.ok(unresolved.mappingSuggestions.length >= 4);
  assert.ok(
    unresolved.mappingSuggestions.every(
      (suggestion) => suggestion.autoApproved === false
    )
  );
  assert.ok(
    unresolved.requiredFieldDiagnostics.some(
      (diagnostic) => diagnostic.blocking
    )
  );

  const reviewedMappings = unresolved.mappingSuggestions.map((suggestion) => ({
    targetKey: suggestion.targetKey,
    sourcePath: suggestion.sourcePath,
    transform: suggestion.transform
  }));
  const resolved = resolveUniversalDataContract({
    descriptor,
    contractId: customer.contractId,
    consumerApplicationId: "rosevear-comms-hub",
    mappingEntries: reviewedMappings
  });

  assert.equal(resolved.mappingValidation.valid, true);
  assert.equal(resolved.mappingValidation.completeForReview, true);
  assert.ok(
    resolved.requiredFieldDiagnostics.every(
      (diagnostic) => diagnostic.mapped && !diagnostic.blocking
    )
  );

  const changedFields = sourceFields.map((field) =>
    field.path === "sourceRecordId"
      ? { ...field, path: "sourceRecordKey" }
      : field
  );
  const changedDescriptor = createHostSchemaDescriptor({
    hostApplicationId: "icamp",
    hostEnvironment: "test",
    schemaId: "icamp.customer.v1",
    schemaVersion: "1.1.0",
    fields: changedFields
  });
  const drifted = resolveUniversalDataContract({
    descriptor: changedDescriptor,
    contractId: customer.contractId,
    consumerApplicationId: "rosevear-comms-hub",
    mappingEntries: reviewedMappings,
    previous: {
      canonicalFingerprint: customer.schemaFingerprint,
      sourceSchemaVersion: descriptor.schemaVersion,
      sourceSchemaFields: descriptor.fields
    }
  });

  assert.equal(drifted.drift?.driftState, "drift-detected");
  assert.ok(
    drifted.drift?.sourceChanges.some(
      (change) =>
        change.kind === "api-version-changed" ||
        change.kind === "removed" ||
        change.kind === "added"
    )
  );
  assert.ok((drifted.drift?.blockingChanges ?? 0) > 0);

  assert.throws(
    () =>
      createHostSchemaDescriptor({
        hostApplicationId: "icamp",
        hostEnvironment: "test",
        schemaId: "icamp.customer.v1",
        schemaVersion: "1.0.0",
        fields: []
      }),
    /at least one structural field/
  );

  const syntheticSigner = generateKeyPairSync("ed25519");
  const publicPem = syntheticSigner.publicKey.export({
    format: "pem",
    type: "spki"
  }).toString();
  const privatePem = syntheticSigner.privateKey.export({
    format: "pem",
    type: "pkcs8"
  }).toString();
  const spki = createHash("sha256")
    .update(
      syntheticSigner.publicKey.export({
        format: "der",
        type: "spki"
      })
    )
    .digest("hex");

  assert.equal(
    inspectQl365dSourceSigner({
      QL256_SIGNER_PRIVATE_KEY_PEM: privatePem,
      QL256_SIGNER_PUBLIC_KEY_PEM: publicPem,
      QL256_SIGNER_SPKI_SHA256: spki,
      QL256_SIGNER_KEY_ID: "synthetic-build315-source",
      QL256_SIGNER_STATUS: "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED"
    }).ready,
    false
  );

  const signerReady = inspectQl365dSourceSigner({
    QL256_SIGNER_PRIVATE_KEY_PEM: privatePem,
    QL256_SIGNER_PUBLIC_KEY_PEM: publicPem,
    QL256_SIGNER_SPKI_SHA256: spki,
    QL256_SIGNER_KEY_ID: "synthetic-build315-source",
    QL256_SIGNER_STATUS: "SIGNER_EXISTS_CUSTODY_VERIFIED"
  });
  assert.equal(signerReady.ready, true);
  if (signerReady.ready) {
    assert.equal(signerReady.spkiSha256, spki);
  }

  const unsignedManifest = JSON.parse(
    await source("public/.well-known/rosevear-integration-manifest.json")
  );
  const signerEnv = {
    QL256_SIGNER_PRIVATE_KEY_PEM: privatePem,
    QL256_SIGNER_PUBLIC_KEY_PEM: publicPem,
    QL256_SIGNER_SPKI_SHA256: spki,
    QL256_SIGNER_KEY_ID: "synthetic-build315-source",
    QL256_SIGNER_STATUS: "SIGNER_EXISTS_CUSTODY_VERIFIED"
  };
  const signedManifest = signQl365dDiscoveryManifest(
    unsignedManifest,
    signerEnv
  );
  assert.equal(signedManifest.signature.state, "SIGNED");
  assert.equal(
    signedManifest.signature.key_id,
    "synthetic-build315-source"
  );
  const { signature: manifestEnvelope, ...manifestPayload } = signedManifest;
  assert.equal(
    verify(
      null,
      Buffer.from(canonicalRosevearCommsValue(manifestPayload)),
      syntheticSigner.publicKey,
      Buffer.from(manifestEnvelope.value!, "base64url")
    ),
    true
  );

  const contract = buildAndSignQl365dSourceHealthContract(
    {
      sourceCommitSha: "c".repeat(40),
      manifest: signedManifest,
      sourceOrigin: "https://ai-data-platform.example.test",
      issuedAt: "2026-11-07T18:00:00.000Z",
      expiresAt: "2026-11-07T19:00:00.000Z"
    },
    signerEnv
  );
  assert.equal(
    contract.payload.schema,
    "rosevear.hub.ql363.six-source-health-contract.v1"
  );
  assert.equal(contract.payload.sourceId, "ai-data-platform");
  assert.equal(contract.payload.tenantBoundary, "no_customer_tenant");
  assert.equal(contract.payload.method, "GET");
  assert.equal(contract.payload.path, "/api/integration/v1/shell/health");
  assert.equal(contract.payload.redirects, "DENY");
  assert.equal(contract.payload.maxResponseBytes, 4096);
  assert.equal(contract.payload.persistentConnectionAllowed, false);
  assert.equal(contract.connected, false);
  assert.equal(
    verify(
      null,
      Buffer.from(canonicalRosevearCommsValue(contract.payload)),
      syntheticSigner.publicKey,
      Buffer.from(contract.signature, "base64url")
    ),
    true
  );

  const [
    resolverSource,
    apiSource,
    manifestSource,
    moduleManifestSource,
    routeSource,
    sourceRuntime,
    sourceContract,
    migration,
    databaseVerifier,
    docs,
    ql266Review,
    attachment,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/universal-data-contract-resolver.ts"),
    source("app/api/module-data-contracts/route.ts"),
    source("public/.well-known/rosevear-integration-manifest.json"),
    source("lib/universal-module-contract.ts"),
    source("app/api/integration/v1/shell/health/route.ts"),
    source("lib/ql365d-comms-source-runtime.ts"),
    source("lib/ql365d-source-contract.ts"),
    source("../../db/migrations/0107_ql365d_ai_data_platform_source_attachment.sql"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("../../docs/BUILD_315_UNIVERSAL_DATA_CONTRACT_RESOLVER.md"),
    source("../../docs/integration/ql266-ai-data-platform-build315-review.json"),
    source("../../docs/integration/ql365d-ai-data-platform-attachment-status.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "normalizeSourceSchemaFields",
    "sourceSchemaFingerprint",
    "evaluateCrossAppDataContractCompatibility",
    "validateFieldMappingEntries",
    "analyzeSchemaDrift",
    "rawRecordContentsRequired: false",
    "autoApproved: false",
    "liveExchangeAuthorized: false"
  ]) {
    assert.ok(resolverSource.includes(token), "Build 315 resolver missing " + token);
  }

  for (const token of [
    "rawRecordContentsAcceptedForDiscovery: false",
    "mappingProfileSuggestions: true",
    "requiredFieldDiagnostics: true",
    "driftDetectionIntegration: true",
    "connectionActivatedByDiscovery: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 315 API missing " + token);
  }

  const publicManifest = JSON.parse(manifestSource);
  assert.equal(publicManifest.source_id, "ai-data-platform");
  assert.equal(publicManifest.source_app_id, "ai-data-platform");
  assert.equal(publicManifest.source_role, "support_broker");
  assert.equal(publicManifest.repository, "RosevearCreations/ai-data-platform");
  assert.equal(publicManifest.audience, "rosevear-master");
  assert.equal(publicManifest.tenant_boundary, "no_customer_tenant");
  assert.match(publicManifest.source_revision, /^[0-9a-f]{40}$/);
  assert.equal(
    publicManifest.signature.state,
    "AWAITING_INDEPENDENT_SOURCE_SIGNER"
  );
  assert.equal(publicManifest.connection_state, "DISCONNECTED / HOLD");

  for (const token of [
    '"host-schema-discovery-v1"',
    '"universal-data-contract-resolver-v1"',
    '"mapping-profile-suggestions-v1"',
    '"schema-drift-integration-v1"',
    "schemaDiscoveryRequiresRawRecords: false",
    "schemaDiscoveryGrantsPlatformAuthority: false",
    "mappingSuggestionAutoApproved: false",
    "contractCompatibilityAuthorizesExchange: false"
  ]) {
    assert.ok(
      moduleManifestSource.includes(token),
      "Build 315 module manifest missing " + token
    );
  }

  assert.ok(
    routeSource.includes("QL365D_AI_DATA_PLATFORM_SOURCE_ADAPTERS") &&
      routeSource.includes('sourceId: "ai-data-platform"') &&
      routeSource.includes('repository: "ai-data-platform"'),
    "QL-365D health route is not wired to source adapters"
  );

  for (const token of [
    "approveOriginalQl365dSourceGet",
    "claimQl365dSourceOperation",
    "signQl365dSourceReceipt",
    "verifyOwnerApproval",
    "source_owner",
    "master_owner",
    "source_signer",
    "SIGNER_EXISTS_CUSTODY_VERIFIED",
    "on conflict do nothing",
    "originalIssuerVerified: true",
    "SOURCE_ID"
  ]) {
    assert.ok(
      sourceRuntime.includes(token),
      "QL-365D source runtime missing " + token
    );
  }
  assert.ok(
    !sourceRuntime.includes("SIGNER_EXISTS_CUSTODY_NOT_VERIFIED\" ||"),
    "unverified signer custody must not be treated as usable"
  );

  for (const token of [
    "signQl365dDiscoveryManifest",
    "buildAndSignQl365dSourceHealthContract",
    "rosevear.hub.ql363.six-source-health-contract.v1",
    "HEALTH_METADATA_ONLY_NO_CUSTOMERS_OR_DEVICES",
    "maxResponseBytes: 4096",
    "persistentConnectionAllowed: false",
    "inspectQl365dSourceSigner"
  ]) {
    assert.ok(
      sourceContract.includes(token),
      "QL-365D source contract builder missing " + token
    );
  }

  for (const token of [
    "rosevear_comms_authority_pins",
    "rosevear_comms_source_authorizations",
    "rosevear_comms_operation_claims",
    "force row level security",
    "independently_verified = true",
    "custody_verified = true",
    "grant select, insert on",
    "revoke update, delete on"
  ]) {
    assert.ok(migration.includes(token), "QL-365D migration missing " + token);
  }

  assert.ok(
    databaseVerifier.includes(
      "0107_ql365d_ai_data_platform_source_attachment.sql"
    ) &&
      databaseVerifier.includes("rosevear_comms_operation_claims:INSERT"),
    "compact database gate must certify QL-365D migration and grants"
  );

  for (const token of [
    "Build 315",
    "Raw business records are neither required nor accepted",
    "Mapping suggestions",
    "Drift integration",
    "QL-365D Comms attachment closure work",
    "SIGNER_EXISTS_CUSTODY_VERIFIED",
    "DISCONNECTED / HOLD",
    "Build 316"
  ]) {
    assert.ok(docs.includes(token), "Build 315 docs missing " + token);
  }

  const ql = JSON.parse(ql266Review);
  assert.equal(ql.build, 315);
  assert.equal(ql.connected, false);
  assert.equal(ql.connectionState, "DISCONNECTED / HOLD");
  assert.equal(ql.commsAttachment.runtimeAdaptersWired, true);
  assert.equal(ql.commsAttachment.manifestSigned, false);
  assert.equal(ql.commsAttachment.genuinePrivateTestRun, false);

  const sourceStatus = JSON.parse(attachment);
  assert.equal(sourceStatus.sourceId, "ai-data-platform");
  assert.equal(sourceStatus.repository, "RosevearCreations/ai-data-platform");
  assert.equal(sourceStatus.sourceRuntime.durableOneUseClaimRequired, true);
  assert.equal(
    sourceStatus.sourceRuntime.existingSourceSignerCustodyState,
    "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED"
  );
  assert.equal(sourceStatus.evidence.syntheticHandlerCertification, true);
  assert.equal(sourceStatus.evidence.genuinePrivateTestVerified, false);
  assert.equal(sourceStatus.connectionState, "DISCONNECTED / HOLD");

  assert.ok(
    roadmap.includes(
      "Build 315 — Universal Data Contract Resolver & Host Schema Discovery"
    ) &&
      roadmap.includes("Build 316 — Cross-App Search & Linked Record Explorer")
  );

  const pkg = JSON.parse(webPackage);
  assert.ok(
    String(pkg.scripts.build).includes(
      "node --test scripts/ql364-source-health.test.mjs"
    ) &&
      String(pkg.scripts.build).includes(
        "verify-build-315-universal-data-contract-resolver.ts"
      )
  );

  console.log(
    "Build 315 verification passed: host schema discovery is structural/read-only, canonical compatibility and mapping suggestions remain non-authorizing, drift/required-field diagnostics reuse Builds 286-288, and the QL-365D AI Data Platform source route is wired to cryptographic owner verification, RLS-protected evidence, append-only replay claims and custody-gated source signing while genuine connection state remains DISCONNECTED / HOLD."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
