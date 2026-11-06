import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMediaExchangeEnvelope,
  normalizeMediaReference,
  normalizeStableMediaUrl,
  safeMediaExchangeReviewReason
} from "../lib/media-asset-exchange-core";
import {
  validateCrossAppDataContractRecord
} from "../lib/cross-app-data-contract-registry";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 296 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const contentHash =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const photo = normalizeMediaReference({
    sourceApplicationId: "devilndove",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "product-54-photo-1",
    sourceRecordVersion: "v3",
    assetKind: "photo",
    mediaType: "image",
    url: "https://cdn.example.com/products/sweet-orange.webp",
    ownerKind: "product",
    ownerRecordId: "54",
    altText: "Sweet Orange soap product photo",
    caption: "Front product photo",
    createdAt: "2026-11-05T12:00:00.000Z",
    mimeType: "image/webp",
    byteSize: 84213,
    contentSha256: contentHash
  });

  ensure(
    photo.contractId === "rosevear.shared.media.v1",
    "Build 286 media contract reused"
  );
  ensure(
    photo.dedupeBasis === "content-sha256" &&
      photo.dedupeSha256 === contentHash,
    "content hash is preferred dedupe identity"
  );
  ensure(
    validateCrossAppDataContractRecord(
      photo.contractId,
      photo.portableRecord
    ).valid,
    "normalized media reference validates against Build 286"
  );

  const receipt = normalizeMediaReference({
    sourceApplicationId: "rosiedazzlers",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "job-882-receipt",
    assetKind: "receipt",
    mediaType: "document",
    url: "https://files.example.com/receipts/job-882.pdf",
    ownerKind: "job",
    ownerRecordId: "882",
    mimeType: "application/pdf"
  });
  const receiptAgain = normalizeMediaReference({
    sourceApplicationId: "icamp",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "reservation-882-receipt",
    assetKind: "document",
    mediaType: "document",
    url: "https://files.example.com/receipts/job-882.pdf",
    ownerKind: "reservation",
    ownerRecordId: "882"
  });

  ensure(
    receipt.dedupeBasis === "reference-url-sha256" &&
      receipt.dedupeSha256 === receiptAgain.dedupeSha256,
    "stable URL fallback converges on one canonical identity"
  );
  ensure(
    receipt.referenceSha256 !== receiptAgain.referenceSha256,
    "source-specific references remain distinct"
  );

  let secretUrlDenied = false;
  try {
    normalizeStableMediaUrl(
      "https://files.example.com/photo.jpg?token=secret-value"
    );
  } catch (error) {
    secretUrlDenied =
      error instanceof Error &&
      error.message === "media_url_secret_parameter_denied";
  }
  ensure(secretUrlDenied, "secret-like URL parameters fail closed");

  const prepared = buildMediaExchangeEnvelope({
    reference: photo,
    destinationApplicationId: "icamp",
    destinationTenantKey: "camp-rosevear"
  });
  ensure(
    prepared.envelope.transportState === "held" &&
      prepared.envelope.holdReason ===
        "media-exchange-not-authorized" &&
      prepared.envelope.binaryTransferRequested === false,
    "media exchange package remains held without binary transfer"
  );

  let sameApplicationDenied = false;
  try {
    buildMediaExchangeEnvelope({
      reference: photo,
      destinationApplicationId: "devilndove",
      destinationTenantKey: "rosevear-main"
    });
  } catch (error) {
    sameApplicationDenied =
      error instanceof Error &&
      error.message === "media_same_application_denied";
  }
  ensure(
    sameApplicationDenied,
    "same-application media package fails closed"
  );
  ensure(
    safeMediaExchangeReviewReason(
      "Owner reviewed the media reference package."
    ),
    "review reason is bounded"
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    navigation,
    operatorTools,
    docs,
    statusRaw,
    roadmap,
    packageRaw,
    ciDb,
    build295Verifier,
    ql337
  ] = await Promise.all([
    source("../../db/migrations/0099_shared_media_asset_exchange.sql"),
    source("lib/media-asset-exchange-core.ts"),
    source("lib/media-asset-exchange-database.ts"),
    source("app/api/media-asset-exchange/route.ts"),
    source("app/media-asset-exchange/page.tsx"),
    source("app/media-asset-exchange/MediaAssetExchangeConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_296_SHARED_MEDIA_ASSET_EXCHANGE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build296-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-295-shared-catalogue-exchange.ts"),
    source("lib/ql337-comms-broker-contract.ts")
  ]);

  for (const token of [
    "shared_media_assets",
    "shared_media_references",
    "shared_media_exchange_packages",
    "shared_media_exchange_reviews",
    "shared_media_exchange_audit",
    "media-exchange-not-authorized",
    "rosevear.shared.media.v1",
    "enable row level security"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const table of [
    "shared_media_assets",
    "shared_media_references",
    "shared_media_exchange_packages",
    "shared_media_exchange_reviews",
    "shared_media_exchange_audit"
  ]) {
    ensure(
      !migration.includes("grant update on app." + table),
      table + " has no UPDATE grant"
    );
    ensure(
      !migration.includes("grant delete on app." + table),
      table + " has no DELETE grant"
    );
  }

  ensure(
    !migration.includes("bytea") &&
      !migration.includes("large object") &&
      !migration.includes("binary_content"),
    "Build 296 does not persist binary file bodies"
  );

  for (const token of [
    "normalizeMediaReference",
    "buildMediaExchangeEnvelope",
    "normalizeStableMediaUrl",
    "validateCrossAppDataContractRecord",
    "rosevear.shared.media.v1",
    "media_url_secret_parameter_denied",
    "media_same_application_denied",
    "binaryTransferRequested: false",
    'transportState: "held"'
  ]) {
    ensure(core.includes(token), "core token " + token);
  }

  for (const token of [
    "requireWorkspaceAdmin",
    '"asset-created"',
    '"asset-reused"',
    '"reference-recorded"',
    'state: "held" as const',
    "media-exchange-not-authorized",
    'packageStateAfterReview: "held"',
    "binaryUploadPerformed: false",
    "binaryDownloadPerformed: false",
    "binaryTransferRequested: false",
    "outboundNetworkRequests: false"
  ]) {
    ensure(database.includes(token), "database boundary token " + token);
  }

  ensure(
    api.includes('"record-reference"') &&
      api.includes('"prepare-package"') &&
      api.includes('"review-package"') &&
      api.includes("status: 401") &&
      api.includes('"Cache-Control": "no-store"'),
    "authenticated media exchange API"
  );

  ensure(
    page.includes("Build 296") &&
      page.includes("stores metadata and stable HTTPS references only") &&
      page.includes("does not fetch or upload binary files") &&
      page.includes("do not resume QL-266"),
    "operator page explains reference-first boundary"
  );

  ensure(
    client.includes("Register media reference") &&
      client.includes("Prepare HELD media package") &&
      client.includes("Approve for future transport") &&
      client.includes("No upload occurred") &&
      client.includes("No binary transfer or external request occurred"),
    "operator controls preserve reference-only held exchange"
  );

  ensure(
    navigation.includes("/media-asset-exchange") &&
      operatorTools.includes("/media-asset-exchange"),
    "media asset exchange navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 296, "status build");
  ensure(
    status.media_asset_exchange.build286_contract_reused === true &&
      status.media_asset_exchange.source_application_authoritative === true &&
      status.media_asset_exchange.content_hash_dedupe_preferred === true &&
      status.media_asset_exchange.stable_url_hash_fallback === true &&
      status.media_asset_exchange.cross_tenant_dedupe === false,
    "reference and dedupe policy"
  );
  ensure(
    status.media_asset_exchange.binary_uploads_performed === false &&
      status.media_asset_exchange.binary_downloads_performed === false &&
      status.media_asset_exchange.remote_content_fetches === 0 &&
      status.media_asset_exchange.package_state === "held" &&
      status.media_asset_exchange.approval_releases_package === false &&
      status.media_asset_exchange.automatic_dispatch === false &&
      status.media_asset_exchange.outbound_network_requests === false &&
      status.media_asset_exchange.peer_application_writes === false &&
      status.media_asset_exchange.ql337_media_payload_enabled === false &&
      status.media_asset_exchange.external_requests === 0 &&
      status.media_asset_exchange.live_exchanges === 0,
    "no live media transport"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 297, "next build 297");

  ensure(
    docs.includes("does not store binary file bodies") &&
      docs.includes("does not download a file") &&
      docs.includes("Build 297 — Cross-App Notification & Consent Service"),
    "documentation preserves no-binary boundary and roadmap"
  );
  ensure(
    roadmap.includes("Build 296 — Shared Media & Asset Exchange") &&
      roadmap.includes("Build 297 — Cross-App Notification & Consent Service"),
    "roadmap continuity"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-296-shared-media-asset-exchange.ts"
    ),
    "Build 296 is in compact integration spine"
  );
  ensure(
    String(pkg.scripts.build).startsWith(
      "tsx scripts/verify-build-296-shared-media-asset-exchange.ts"
    ) &&
      String(pkg.scripts.build).includes(
        "verify-build-295-shared-catalogue-exchange.ts"
      ) &&
      String(pkg.scripts.build).includes(
        "verify-build-292a-ci-verification-consolidation.ts"
      ) &&
      String(pkg.scripts.build).includes("run-production-migrations.ts"),
    "Build 296 gates production before inherited safety and migrations"
  );

  for (const token of [
    "shared_media_assets",
    "shared_media_references",
    "shared_media_exchange_packages",
    "shared_media_exchange_reviews",
    "shared_media_exchange_audit",
    "0099_shared_media_asset_exchange.sql"
  ]) {
    ensure(ciDb.includes(token), "compact database gate token " + token);
  }

  ensure(
    build295Verifier.includes(
      'String(pkg.scripts.build).includes('
    ),
    "Build 295 inherited verifier is future-compatible"
  );

  ensure(
    !ql337.includes("mediaPayload") &&
      !ql337.includes("assetPayload") &&
      !ql337.includes("binaryPayload"),
    "Build 296 does not add media payloads to QL-337"
  );

  console.log(
    "Build 296 Shared Media & Asset Exchange verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
