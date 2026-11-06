import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  consentAllowsRequest,
  normalizeConsentEvidence,
  normalizeNotificationRequest,
  safeNotificationReviewReason
} from "../lib/notification-consent-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 297 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

async function main() {
  const consent = normalizeConsentEvidence({
    canonicalTenantKey: "rosevear-main",
    customerRecordId: "customer-42",
    channel: "email",
    state: "granted",
    basis: "customer opt-in",
    sourceApplicationId: "rosiedazzlers",
    sourceRecordId: "consent-42",
    observedAt: "2026-11-06T12:00:00.000Z"
  });

  const request = normalizeNotificationRequest({
    canonicalTenantKey: "rosevear-main",
    sourceApplicationId: "rosiedazzlers",
    sourceRecordId: "job-42-followup",
    customerRecordId: "customer-42",
    channel: "email",
    templateKey: "job-followup",
    consentBasis: "customer opt-in",
    requestedAt: "2026-11-06T12:05:00.000Z",
    contentSummary: "Follow-up message after a completed detailing job."
  });

  ensure(request.contractId === "rosevear.shared.notification.v1", "Build 286 notification contract reused");
  ensure(request.operatorApplicationId === "rosevear-comms-hub", "Comms Hub is preferred operator");
  ensure(consentAllowsRequest(consent, request).allowed, "granted consent permits review eligibility");
  ensure(!consentAllowsRequest(null, request).allowed, "missing consent fails closed");

  const revoked = normalizeConsentEvidence({
    canonicalTenantKey: "rosevear-main",
    customerRecordId: "customer-42",
    channel: "email",
    state: "revoked",
    basis: "customer opt-out",
    sourceApplicationId: "rosiedazzlers",
    sourceRecordId: "consent-43",
    observedAt: "2026-11-06T12:10:00.000Z"
  });
  ensure(!consentAllowsRequest(revoked, request).allowed, "revoked consent blocks approval eligibility");
  ensure(safeNotificationReviewReason("Owner reviewed the consent and request evidence."), "bounded review reason accepted");

  const [migration,core,database,api,page,client,navigation,docs,packageRaw,ciDb] = await Promise.all([
    source("../../db/migrations/0100_cross_app_notification_consent.sql"),
    source("lib/notification-consent-core.ts"),
    source("lib/notification-consent-database.ts"),
    source("app/api/notification-consent/route.ts"),
    source("app/notification-consent/page.tsx"),
    source("app/notification-consent/NotificationConsentConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_297_CROSS_APP_NOTIFICATION_CONSENT.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for (const token of [
    "notification_consent_evidence","notification_requests","notification_request_reviews",
    "notification_delivery_evidence","notification_consent_audit",
    "notification-dispatch-not-authorized","enable row level security"
  ]) ensure(migration.includes(token), "migration token " + token);

  for (const table of [
    "notification_consent_evidence","notification_requests","notification_request_reviews",
    "notification_delivery_evidence","notification_consent_audit"
  ]) {
    ensure(!migration.includes("grant update on app." + table), table + " has no UPDATE grant");
    ensure(!migration.includes("grant delete on app." + table), table + " has no DELETE grant");
  }

  for (const token of [
    "rosevear.shared.notification.v1","rosevear-comms-hub",
    "consentAllowsRequest","consent-not-granted","consent-expired"
  ]) ensure(core.includes(token), "core token " + token);

  for (const token of [
    "requireWorkspaceAdmin","notification_consent_not_granted",
    "request-approved-for-future-operator-handoff","dispatchOccurred:false",
    "outboundNetworkRequests: false","automaticDispatch: false","providerApiCalls: false"
  ]) ensure(database.includes(token), "database boundary token " + token);

  ensure(api.includes('"record-consent"') && api.includes('"prepare-request"') &&
    api.includes('"review-request"') && api.includes("status: 401"), "authenticated API actions");

  ensure(page.includes("Build 297") && page.includes("remain") &&
    page.includes("does not dispatch") && page.includes("does not resume QL-266"), "operator boundary copy");

  ensure(client.includes("Prepare held notification request") &&
    client.includes("Approve future handoff") &&
    client.includes("Rosevear Comms Hub"), "operator controls");

  ensure(navigation.includes('href: "/notification-consent"'), "navigation entry");
  ensure(docs.includes("Build 298") && docs.includes("no provider API call"), "build documentation and next build");
  ensure(packageRaw.includes("verify-build-297-cross-app-notification-consent.ts"), "build verification wired");
  for (const table of ["notification_consent_evidence","notification_requests","notification_request_reviews","notification_delivery_evidence","notification_consent_audit"]) {
    ensure(ciDb.includes('"' + table + '"'), "CI DB table " + table);
  }

  console.log("Build 297 verification passed: consent-aware notification requests remain held with no external dispatch.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
