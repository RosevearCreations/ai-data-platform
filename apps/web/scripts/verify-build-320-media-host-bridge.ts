import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  MEDIA_HOST_BRIDGE_VERSION,
  MediaHostBridgeError,
  createMediaHostTransferHandoff,
  evaluateMediaHostPolicy,
  mediaHostBridgeDescriptor,
  recordMediaLifecycleEvidence,
  registerMediaHostReference
} from "../lib/media-host-bridge";

const root = path.resolve(process.cwd());
const fixedNow = Date.parse("2026-11-08T04:00:00.000Z");

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

const host = {
  hostApplicationId: "rosevear.devilndove",
  hostEnvironment: "production" as const,
  platformTenantId: "tenant-rosevear",
  workspaceId: "workspace-operations",
  auditCorrelationId: "audit-build320-media-host"
};

function referenceInput() {
  return {
    sourceApplicationId: "devilndove",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "product-photo-320",
    sourceRecordVersion: "v1",
    updatedAt: "2026-11-08T03:45:00.000Z",
    assetKind: "photo",
    mediaType: "image",
    url: "https://assets.example.test/products/dovlin-320.webp",
    ownerKind: "product",
    ownerRecordId: "product-dovlin-320",
    altText: "Dovlin product image",
    caption: "Approved product photo reference",
    createdAt: "2026-11-08T03:30:00.000Z",
    mimeType: "image/webp",
    byteSize: 1_250_000,
    contentSha256: "a".repeat(64)
  };
}

function authorization(
  capability: "media.binary.download" | "media.binary.upload",
  sensitiveBinaryCopyAuthorized: boolean
) {
  return {
    capability,
    granted: true,
    grantId: "grant-build320-" + capability.replace(/[^a-z]+/g, "-"),
    subjectId: "owner-build320",
    hostApplicationId: host.hostApplicationId,
    hostEnvironment: host.hostEnvironment,
    platformTenantId: host.platformTenantId,
    workspaceId: host.workspaceId,
    dedupeSha256: "a".repeat(64),
    sensitiveBinaryCopyAuthorized,
    expiresAt: "2026-11-09T04:00:00.000Z",
    reviewAt: "2026-11-09T03:00:00.000Z"
  };
}

async function main() {
  assert.equal(MEDIA_HOST_BRIDGE_VERSION, "1.0.0");

  const registration = registerMediaHostReference({
    host,
    reference: referenceInput()
  });

  assert.equal(registration.policy.status, "eligible");
  assert.equal(registration.ownership.declared, true);
  assert.equal(registration.ownership.ownerKind, "product");
  assert.equal(registration.preview.mode, "reference-only");
  assert.equal(registration.preview.contentFetchedByBridge, false);
  assert.equal(registration.security.rawBinaryAccepted, false);
  assert.equal(registration.checksum.dedupeBasis, "content-sha256");
  assert.equal(registration.checksum.dedupeSha256, "a".repeat(64));
  assert.match(registration.correlationSha256, /^[a-f0-9]{64}$/);

  const fallback = registerMediaHostReference({
    host,
    reference: {
      ...referenceInput(),
      sourceRecordId: "product-photo-321",
      contentSha256: null
    }
  });
  assert.equal(fallback.checksum.dedupeBasis, "reference-url-sha256");
  assert.equal(fallback.policy.contentChecksumPresent, false);

  const reviewRequired = registerMediaHostReference({
    host,
    reference: {
      ...referenceInput(),
      sourceRecordId: "product-photo-322",
      mimeType: null,
      byteSize: null
    }
  });
  assert.equal(reviewRequired.policy.status, "review-required");

  const blocked = registerMediaHostReference({
    host,
    reference: {
      ...referenceInput(),
      sourceRecordId: "product-photo-323",
      mimeType: "video/mp4"
    }
  });
  assert.equal(blocked.policy.status, "blocked");

  const noGrant = createMediaHostTransferHandoff(
    registration,
    {
      handoffId: "handoff-build320-no-grant",
      direction: "download",
      sensitiveBinary: false,
      authorization: null,
      createdAt: "2026-11-08T03:50:00.000Z"
    },
    fixedNow
  );
  assert.equal(noGrant.state, "held");
  assert.equal(noGrant.holdReason, "binary-transfer-not-authorized");
  assert.equal(noGrant.security.binaryTransferPerformed, false);

  const sensitiveDenied = createMediaHostTransferHandoff(
    registration,
    {
      handoffId: "handoff-build320-sensitive-held",
      direction: "download",
      sensitiveBinary: true,
      authorization: authorization("media.binary.download", false),
      createdAt: "2026-11-08T03:51:00.000Z"
    },
    fixedNow
  );
  assert.equal(sensitiveDenied.state, "held");
  assert.equal(
    sensitiveDenied.holdReason,
    "sensitive-binary-copy-not-authorized"
  );

  const authorized = createMediaHostTransferHandoff(
    registration,
    {
      handoffId: "handoff-build320-authorized",
      direction: "download",
      sensitiveBinary: true,
      authorization: authorization("media.binary.download", true),
      createdAt: "2026-11-08T03:52:00.000Z"
    },
    fixedNow
  );
  assert.equal(authorized.state, "authorized-for-host-transfer");
  assert.equal(authorized.holdReason, null);
  assert.equal(authorized.security.binaryTransferPerformed, false);
  assert.match(authorized.idempotencyKeySha256, /^[a-f0-9]{64}$/);

  const repeat = createMediaHostTransferHandoff(
    registration,
    {
      handoffId: "handoff-build320-authorized-repeat",
      direction: "download",
      sensitiveBinary: true,
      authorization: authorization("media.binary.download", true),
      createdAt: "2026-11-08T03:53:00.000Z"
    },
    fixedNow
  );
  assert.equal(
    repeat.idempotencyKeySha256,
    authorized.idempotencyKeySha256
  );

  const upload = createMediaHostTransferHandoff(
    registration,
    {
      handoffId: "handoff-build320-upload",
      direction: "upload",
      sensitiveBinary: false,
      authorization: authorization("media.binary.upload", false),
      createdAt: "2026-11-08T03:54:00.000Z"
    },
    fixedNow
  );
  assert.equal(upload.state, "authorized-for-host-transfer");
  assert.equal(upload.direction, "upload");

  assert.throws(
    () =>
      createMediaHostTransferHandoff(
        registration,
        {
          handoffId: "handoff-build320-wrong-scope",
          direction: "download",
          sensitiveBinary: false,
          authorization: {
            ...authorization("media.binary.download", false),
            workspaceId: "workspace-other"
          },
          createdAt: "2026-11-08T03:55:00.000Z"
        },
        fixedNow
      ),
    (error: unknown) =>
      error instanceof MediaHostBridgeError &&
      error.code === "authorization_scope_mismatch"
  );

  const lifecycle = recordMediaLifecycleEvidence(
    registration,
    {
      evidenceId: "evidence-build320-retention",
      retentionState: "retain-until",
      retainUntil: "2027-11-08T04:00:00.000Z",
      deletionState: "not-requested",
      observedAt: "2026-11-08T03:56:00.000Z",
      reason: "Asset remains inside the approved retention period."
    }
  );
  assert.equal(lifecycle.retentionState, "retain-until");
  assert.equal(
    lifecycle.security.binaryDeletionPerformedByBridge,
    false
  );
  assert.match(lifecycle.evidenceSha256, /^[a-f0-9]{64}$/);

  const deletedEvidence = recordMediaLifecycleEvidence(
    registration,
    {
      evidenceId: "evidence-build320-deleted",
      retentionState: "expired-review-required",
      deletionState: "deleted",
      sourceReceiptId: "source-delete-receipt-320",
      observedAt: "2026-11-08T03:57:00.000Z",
      reason: "Source system reported deletion with receipt evidence."
    }
  );
  assert.equal(deletedEvidence.deletionState, "deleted");
  assert.equal(
    deletedEvidence.sourceReceiptId,
    "source-delete-receipt-320"
  );

  assert.throws(
    () =>
      recordMediaLifecycleEvidence(registration, {
        evidenceId: "evidence-build320-no-receipt",
        retentionState: "expired-review-required",
        deletionState: "deleted",
        observedAt: "2026-11-08T03:58:00.000Z",
        reason: "Deletion without source receipt must fail closed."
      }),
    (error: unknown) =>
      error instanceof MediaHostBridgeError &&
      error.code === "lifecycle_evidence_invalid"
  );

  const descriptor = mediaHostBridgeDescriptor();
  assert.equal(descriptor.sourceBuild, 296);
  assert.equal(descriptor.rawBinaryAccepted, false);
  assert.equal(descriptor.binaryTransferPerformedByBridge, false);
  assert.equal(
    descriptor.sensitiveBinaryCopyRequiresExplicitAuthorization,
    true
  );

  const [
    bridgeSource,
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
    source("lib/media-host-bridge.ts"),
    source("app/api/module-media-assets/route.ts"),
    source("app/media-asset-exchange/page.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_320_SHARED_MEDIA_FILE_ASSET_HOST_BRIDGE.md"),
    source("../../docs/integration/ai-data-platform-build320-review.json"),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "normalizeMediaReference",
    "contentChecksumPreferred: true",
    "stableUrlFallbackAllowed: true",
    "automaticSensitiveContentRendering: false",
    "media.binary.download",
    "media.binary.upload",
    "sensitiveBinaryCopyAuthorized",
    "binaryTransferPerformed: false",
    "binaryDeletionPerformedByBridge: false"
  ]) {
    assert.ok(bridgeSource.includes(token), "Build 320 bridge missing " + token);
  }

  for (const token of [
    "sourceBuild296RemainsAuthoritative: true",
    "previewReferencesDoNotFetchContent: true",
    "uploadDownloadHandoffsDoNotTransferBytes: true",
    "sensitiveBinaryRequiresExplicitGrant: true",
    "directBinaryTransferAvailableFromDiscoveryRoute: false"
  ]) {
    assert.ok(api.includes(token), "Build 320 API missing " + token);
  }

  assert.ok(page.includes("Build 320 media host bridge"));
  assert.ok(page.includes("/api/module-media-assets"));
  assert.ok(
    navigation.includes("media host bridge") &&
      operatorTools.includes("media host bridge")
  );

  for (const token of [
    '"media-host-bridge-v1"',
    '"media-reference-registration-v1"',
    '"media-transfer-handoff-v1"',
    '"media-lifecycle-evidence-v1"',
    "mediaHostBridgeAcceptsRawBinary: false",
    "mediaHostBridgeTransfersBinary: false",
    "mediaHostBridgeSensitiveCopyRequiresExplicitAuthorization: true",
    "mediaHostBridgeDeletesSourceContent: false"
  ]) {
    assert.ok(manifest.includes(token), "Build 320 manifest missing " + token);
  }

  for (const token of [
    "Build 320",
    "Media reference registration",
    "Checksum and deduplication",
    "Host download/upload handoff contracts",
    "Retention and deletion-state evidence",
    "Build 321"
  ]) {
    assert.ok(docs.includes(token), "Build 320 docs missing " + token);
  }

  const reviewJson = JSON.parse(review);
  assert.equal(reviewJson.build, 320);
  assert.equal(reviewJson.security.rawBinaryAccepted, false);
  assert.equal(
    reviewJson.security.sensitiveBinaryCopyRequiresExplicitAuthorization,
    true
  );
  assert.equal(reviewJson.nextQueuedBuild, 321);

  assert.ok(
    roadmap.includes("Build 320 — Shared Media, File & Asset Host Bridge") &&
      roadmap.includes(
        "Build 321 — Connector Driver Packaging & Dynamic Module Registry"
      )
  );

  const pkg = JSON.parse(packageRaw);
  for (const scriptName of ["build", "test", "ci:spine"]) {
    assert.ok(
      String(pkg.scripts[scriptName]).includes(
        "verify-build-320-media-host-bridge.ts"
      ),
      "Build 320 verifier missing from " + scriptName
    );
  }

  const sample = registerMediaHostReference({
    host,
    reference: referenceInput()
  });
  assert.equal(evaluateMediaHostPolicy(sample.reference).status, "eligible");

  console.log(
    "Build 320 Shared Media, File & Asset Host Bridge verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
