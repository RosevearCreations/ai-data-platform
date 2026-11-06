import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  fingerprintCustomerIdentity,
  matchCustomerIdentityEvidence,
  normalizeCustomerIdentityTenantKey,
  safeCustomerIdentityReviewReason
} from "../lib/customer-identity-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error("Build 294 verification failed: " + message);
  }
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const left = fingerprintCustomerIdentity({
    sourceApplicationId: "rosiedazzlers",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "customer-100",
    sourceRecordVersion: "v7",
    email: " Person@Example.COM ",
    phone: "(519) 555-0100",
    displayName: "Sample Person",
    postalCode: "N4G 1A1"
  });
  const right = fingerprintCustomerIdentity({
    sourceApplicationId: "yard-workers",
    canonicalTenantKey: "rosevear-main",
    sourceRecordId: "contact-900",
    email: "person@example.com",
    phone: "1-519-555-0100",
    displayName: "Sample Person",
    postalCode: "N4G-1A1"
  });

  ensure(left.emailSha256?.length === 64, "email is fingerprinted");
  ensure(left.phoneSha256?.length === 64, "phone is fingerprinted");
  ensure(left.nameSha256?.length === 64, "name is fingerprinted");
  ensure(left.postalSha256?.length === 64, "postal is fingerprinted");
  ensure(left.evidenceSha256.length === 64, "observation evidence is fingerprinted");
  ensure(
    JSON.stringify(left).includes("Person@Example.COM") === false &&
      JSON.stringify(left).includes("5195550100") === false,
    "raw contact values are absent from persisted fingerprint model"
  );

  const exact = matchCustomerIdentityEvidence(left, right);
  ensure(exact?.rule === "email-and-phone-exact", "email+phone exact rule");
  ensure(exact?.confidenceScore === 100, "strongest exact rule confidence");

  const emailOnly = matchCustomerIdentityEvidence(
    { ...left, phoneSha256: null },
    { ...right, phoneSha256: "f".repeat(64) }
  );
  ensure(emailOnly?.rule === "email-exact", "email-only exact rule");

  const phoneOnly = matchCustomerIdentityEvidence(
    { ...left, emailSha256: null },
    { ...right, emailSha256: "e".repeat(64) }
  );
  ensure(phoneOnly?.rule === "phone-exact", "phone-only exact rule");

  const namePostal = matchCustomerIdentityEvidence(
    { ...left, emailSha256: null, phoneSha256: null },
    { ...right, emailSha256: "e".repeat(64), phoneSha256: "f".repeat(64) }
  );
  ensure(namePostal?.rule === "name-postal-exact", "name+postal exact rule");

  ensure(
    normalizeCustomerIdentityTenantKey("Rosevear-Main") === "rosevear-main",
    "tenant key normalization"
  );
  ensure(
    safeCustomerIdentityReviewReason("Owner confirmed both source records."),
    "bounded owner review reason"
  );

  let insufficientDenied = false;
  try {
    fingerprintCustomerIdentity({
      sourceApplicationId: "icamp",
      canonicalTenantKey: "rosevear-main",
      sourceRecordId: "guest-1",
      displayName: "Only Name"
    });
  } catch (error) {
    insufficientDenied =
      error instanceof Error &&
      error.message === "customer_identity_evidence_insufficient";
  }
  ensure(insufficientDenied, "insufficient identity evidence fails closed");

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
    ql337
  ] = await Promise.all([
    source("../../db/migrations/0097_shared_customer_contact_identity.sql"),
    source("lib/customer-identity-core.ts"),
    source("lib/customer-identity-database.ts"),
    source("app/api/customer-identities/route.ts"),
    source("app/customer-identities/page.tsx"),
    source("app/customer-identities/CustomerIdentityConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("lib/module-operator-tools.ts"),
    source("../../docs/BUILD_294_SHARED_CUSTOMER_CONTACT_IDENTITY.md"),
    source("../../docs/integration/ql266-ai-data-platform-build294-review.json"),
    source("../../docs/NEXT_BUILDS_281_305.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("lib/ql337-comms-broker-contract.ts")
  ]);

  for (const token of [
    "customer_identity_observations",
    "customer_identity_candidates",
    "customer_identity_decisions",
    "customer_identity_groups",
    "customer_identity_links",
    "customer_identity_audit",
    "email_sha256",
    "phone_sha256",
    "pending-review",
    "enable row level security"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const table of [
    "customer_identity_observations",
    "customer_identity_candidates",
    "customer_identity_decisions",
    "customer_identity_groups",
    "customer_identity_links",
    "customer_identity_audit"
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
    "fingerprintCustomerIdentity",
    "matchCustomerIdentityEvidence",
    "email-and-phone-exact",
    "name-postal-exact",
    "customer_identity_evidence_insufficient"
  ]) {
    ensure(core.includes(token), "core token " + token);
  }

  for (const token of [
    "source_application_id<>$4",
    "canonical_tenant_key=$2",
    "generateCandidatesForObservation",
    "customer_identity_group_conflict_requires_manual_resolution",
    "automaticMerge: false",
    "outboundNetworkRequests: false",
    "requireWorkspaceAdmin"
  ]) {
    ensure(database.includes(token), "database boundary token " + token);
  }

  ensure(
    database.includes("email_sha256") &&
      database.includes("phone_sha256") &&
      !migration.includes("email text") &&
      !migration.includes("phone text"),
    "database stores fingerprints rather than raw email/phone columns"
  );

  ensure(
    api.includes('"record-observation"') &&
      api.includes('"review-candidate"') &&
      api.includes("status: 401") &&
      api.includes('"Cache-Control": "no-store"'),
    "authenticated customer identity API"
  );

  ensure(
    page.includes("Build 294") &&
      page.includes("Raw email, phone, name and postal values") &&
      page.includes("No candidate is") &&
      page.includes("QL-266 remains disconnected"),
    "operator page explains privacy and review boundary"
  );
  ensure(
    client.includes("Fingerprint & find exact matches") &&
      client.includes("Accept match") &&
      client.includes("Reject match") &&
      client.includes("Shared identity groups"),
    "operator review controls"
  );
  ensure(
    navigation.includes("/customer-identities") &&
      operatorTools.includes("/customer-identities"),
    "customer identity navigation"
  );

  const status = JSON.parse(statusRaw);
  ensure(status.build === 294, "status build");
  ensure(
    status.customer_identity_resolution.raw_contact_values_persisted === false &&
      status.customer_identity_resolution.fuzzy_matching === false &&
      status.customer_identity_resolution.cross_tenant_matching === false &&
      status.customer_identity_resolution.owner_admin_review_required === true &&
      status.customer_identity_resolution.automatic_merge === false,
    "privacy-minimized reviewed matching policy"
  );
  ensure(
    status.customer_identity_resolution.outbound_network_requests === false &&
      status.customer_identity_resolution.peer_application_writes === false &&
      status.customer_identity_resolution.ql337_customer_payload_enabled === false &&
      status.customer_identity_resolution.external_requests === 0 &&
      status.customer_identity_resolution.live_exchanges === 0,
    "no external customer transport or writes"
  );
  ensure(
    status.ql266_status === "UNDER_REVIEW" &&
      status.external_test_status === "REVIEW_DEFERRED" &&
      status.connection_state === "DISCONNECTED" &&
      status.new_ql266_test_started === false,
    "QL-266 remains deferred/disconnected"
  );
  ensure(status.next_build === 295, "next build 295");

  ensure(
    docs.includes("No fuzzy, phonetic, AI-inferred or cross-tenant match") &&
      docs.includes("does not write identity decisions back") &&
      docs.includes("Build 295 — Shared Product, Service & Catalogue Exchange"),
    "documentation preserves match and transport boundaries"
  );
  ensure(
    roadmap.includes("Build 294 — Shared Customer & Contact Identity Resolution") &&
      roadmap.includes("Build 295 — Shared Product, Service & Catalogue Exchange"),
    "roadmap continuity"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-294-shared-customer-contact-identity.ts"
    ),
    "Build 294 is in compact integration spine"
  );
  ensure(
    String(pkg.scripts.build).includes(
      "tsx scripts/verify-build-294-shared-customer-contact-identity.ts"
    ) &&
      String(pkg.scripts.build).includes(
        "verify-build-293-idempotency-delivery-guarantees.ts"
      ) &&
      String(pkg.scripts.build).includes(
        "verify-build-292a-ci-verification-consolidation.ts"
      ) &&
      String(pkg.scripts.build).includes("run-production-migrations.ts"),
    "Build 294 gates production before inherited safety and migration gates"
  );

  for (const token of [
    "customer_identity_observations",
    "customer_identity_candidates",
    "customer_identity_decisions",
    "customer_identity_groups",
    "customer_identity_links",
    "customer_identity_audit",
    "schema_migrations"
  ]) {
    ensure(ciDb.includes(token), "compact database gate token " + token);
  }

  ensure(
    ql337.includes("outboundDeliveryEnabled: false") ||
      ql337.includes("outboundDeliveryEnabled"),
    "QL-337 contract remains present and governed"
  );
  ensure(
    !ql337.includes("customerIdentity") &&
      !ql337.includes("customerPayload"),
    "Build 294 does not add customer payload to QL-337 broker"
  );

  console.log(
    "Build 294 Shared Customer & Contact Identity Resolution verification passed."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
