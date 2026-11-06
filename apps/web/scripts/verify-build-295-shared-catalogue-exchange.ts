import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCatalogueExchangeEnvelope,
  normalizeCatalogueItem,
  safeCatalogueExchangeReviewReason
} from "../lib/catalogue-exchange-core";
import {
  validateCrossAppDataContractRecord
} from "../lib/cross-app-data-contract-registry";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 295 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const product = normalizeCatalogueItem({
    sourceApplicationId: "devilndove",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "product-54",
    sourceRecordVersion: "v3",
    itemKind: "product",
    updatedAt: "2026-11-05T12:00:00.000Z",
    sku: "SOAP-SWEET-ORANGE",
    name: "Sweet Orange Soap",
    description: "Small-batch soap.",
    category: "soap",
    status: "active",
    priceCad: "12.50"
  });

  ensure(
    product.contractId === "rosevear.shared.product.v1",
    "products use Build 286 product contract"
  );
  ensure(
    product.portableRecord.priceCad === 12.5,
    "product price normalized"
  );
  ensure(
    product.contentSha256.length === 64,
    "product content digest"
  );
  ensure(
    validateCrossAppDataContractRecord(
      product.contractId,
      product.portableRecord
    ).valid,
    "normalized product validates against Build 286"
  );

  const campsite = normalizeCatalogueItem({
    sourceApplicationId: "icamp",
    canonicalTenantKey: "camp-rosevear",
    sourceRecordId: "site-27",
    itemKind: "campsite",
    updatedAt: "2026-11-05T12:30:00.000Z",
    name: "Site 27",
    category: "",
    status: "available",
    priceCad: 68,
    serviceAreas: ["Camp Rosevear"]
  });

  ensure(
    campsite.contractId === "rosevear.shared.service.v1",
    "campground kinds use Build 286 service contract"
  );
  ensure(
    campsite.portableRecord.category === "campsite",
    "item kind provides portable service category fallback"
  );
  ensure(
    validateCrossAppDataContractRecord(
      campsite.contractId,
      campsite.portableRecord
    ).valid,
    "normalized campsite validates against Build 286"
  );

  const prepared = buildCatalogueExchangeEnvelope({
    item: product,
    destinationApplicationId: "icamp",
    destinationTenantKey: "camp-rosevear"
  });
  ensure(
    prepared.envelope.transportState === "held" &&
      prepared.envelope.holdReason ===
        "catalogue-exchange-not-authorized",
    "exchange packages remain held"
  );
  ensure(
    prepared.payloadSha256.length === 64,
    "package digest"
  );

  let sameApplicationDenied = false;
  try {
    buildCatalogueExchangeEnvelope({
      item: product,
      destinationApplicationId: "devilndove",
      destinationTenantKey: "rosevear-main"
    });
  } catch (error) {
    sameApplicationDenied =
      error instanceof Error &&
      error.message === "catalogue_same_application_denied";
  }
  ensure(
    sameApplicationDenied,
    "same-application exchange package fails closed"
  );
  ensure(
    safeCatalogueExchangeReviewReason(
      "Owner reviewed the normalized destination package."
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
    build294Verifier,
    ql337
  ] = await Promise.all([
    source("../../db/migrations/0098_shared_catalogue_exchange.sql"),
    source("lib/catalogue-exchange-core.ts"),
    source("lib/catalogue-exchange-database.ts"),
    source("app/api/catalogue-exchange/route.ts"),
    source("app/catalogue-exchange/page.tsx"),
    source("app/catalogue-exchange/CatalogueExchangeConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_295_SHARED_PRODUCT_SERVICE_CATALOGUE_EXCHANGE.md"),
    source("../../docs/integration/ql266-ai-data-platform-build295-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-294-shared-customer-contact-identity.ts"),
    source("lib/ql337-comms-broker-contract.ts")
  ]);

  for (const token of [
    "catalogue_exchange_items",
    "catalogue_exchange_packages",
    "catalogue_exchange_reviews",
    "catalogue_exchange_audit",
    "catalogue-exchange-not-authorized",
    "rosevear.shared.product.v1",
    "rosevear.shared.service.v1",
    "enable row level security"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const table of [
    "catalogue_exchange_items",
    "catalogue_exchange_packages",
    "catalogue_exchange_reviews",
    "catalogue_exchange_audit"
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

  for (const token of [
    "normalizeCatalogueItem",
    "buildCatalogueExchangeEnvelope",
    "validateCrossAppDataContractRecord",
    "rosevear.shared.product.v1",
    "rosevear.shared.service.v1",
    "catalogue_same_application_denied",
    "transportState: \"held\""
  ]) {
    ensure(core.includes(token), "core token " + token);
  }

  for (const token of [
    "requireWorkspaceAdmin",
    "state: \"held\" as const",
    "catalogue-exchange-not-authorized",
    "packageStateAfterReview: \"held\"",
    "automaticDispatch: false",
    "outboundNetworkRequests: false"
  ]) {
    ensure(database.includes(token), "database boundary token " + token);
  }

  ensure(
    api.includes('"record-item"') &&
      api.includes('"prepare-package"') &&
      api.includes('"review-package"') &&
      api.includes("status: 401") &&
      api.includes('"Cache-Control": "no-store"'),
    "authenticated catalogue exchange API"
  );

  ensure(
    page.includes("Build 295") &&
      page.includes("Catalogue items are normalized") &&
      page.includes("remain") &&
      page.includes("held") &&
      page.includes("does not resume QL-266"),
    "operator page explains held transport boundary"
  );

  ensure(
    client.includes("Normalize catalogue item") &&
      client.includes("Prepare HELD exchange package") &&
      client.includes("Approve for future transport") &&
      client.includes("No external request was made"),
    "operator controls preserve reviewed held exchange"
  );

  ensure(
    navigation.includes("/catalogue-exchange") &&
      operatorTools.includes("/catalogue-exchange"),
    "catalogue exchange navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 295, "status build");
  ensure(
    status.catalogue_exchange.build286_contracts_reused === true &&
      status.catalogue_exchange.source_application_authoritative === true &&
      status.catalogue_exchange.source_destination_must_differ === true &&
      status.catalogue_exchange.package_state === "held" &&
      status.catalogue_exchange.approval_releases_package === false,
    "catalogue contract and held-package policy"
  );
  ensure(
    status.catalogue_exchange.automatic_dispatch === false &&
      status.catalogue_exchange.outbound_network_requests === false &&
      status.catalogue_exchange.peer_application_writes === false &&
      status.catalogue_exchange.ql337_catalogue_payload_enabled === false &&
      status.catalogue_exchange.external_requests === 0 &&
      status.catalogue_exchange.live_exchanges === 0,
    "no live catalogue transport"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 296, "next build 296");

  ensure(
    docs.includes("Source application remains authoritative") ||
      docs.includes("source application remains authoritative"),
    "documentation preserves source authority"
  );
  ensure(
    docs.includes("does **not** dispatch") &&
      docs.includes("Build 296 — Shared Media & Asset Exchange"),
    "documentation preserves transport boundary and roadmap"
  );
  ensure(
    roadmap.includes("Build 295 — Shared Product, Service & Catalogue Exchange") &&
      roadmap.includes("Build 296 — Shared Media & Asset Exchange"),
    "roadmap continuity"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-295-shared-catalogue-exchange.ts"
    ),
    "Build 295 is in compact integration spine"
  );
  ensure(
    String(pkg.scripts.build).includes(
      "tsx scripts/verify-build-295-shared-catalogue-exchange.ts"
    ) &&
      String(pkg.scripts.build).includes(
        "verify-build-294-shared-customer-contact-identity.ts"
      ) &&
      String(pkg.scripts.build).includes(
        "verify-build-292a-ci-verification-consolidation.ts"
      ) &&
      String(pkg.scripts.build).includes("run-production-migrations.ts"),
    "Build 295 gates production before inherited safety and migrations"
  );

  for (const token of [
    "catalogue_exchange_items",
    "catalogue_exchange_packages",
    "catalogue_exchange_reviews",
    "catalogue_exchange_audit",
    "0098_shared_catalogue_exchange.sql"
  ]) {
    ensure(ciDb.includes(token), "compact database gate token " + token);
  }

  ensure(
    build294Verifier.includes(
      "verify-build-294-shared-customer-contact-identity.ts"
    ) ||
      build294Verifier.includes("Build 294"),
    "Build 294 inherited verifier remains present"
  );

  ensure(
    !ql337.includes("cataloguePayload") &&
      !ql337.includes("productPayload") &&
      !ql337.includes("servicePayload"),
    "Build 295 does not add catalogue payloads to QL-337"
  );

  console.log(
    "Build 295 Shared Product, Service & Catalogue Exchange verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
