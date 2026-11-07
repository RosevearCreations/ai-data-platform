import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildAppConnectionRegistry } from "../lib/app-connection-registry";
import {
  assertSixAppCertificationShape,
  evaluateApplicationCertification,
  summarizeIntegrationCertification,
  type IntegrationCertificationEvidence
} from "../lib/integration-certification-core";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error("Build 304 verification failed: " + message);
}

async function source(relative: string) {
  return readFile(path.resolve(process.cwd(), relative), "utf8");
}

function passingEvidence(
  applicationId: IntegrationCertificationEvidence["applicationId"]
): IntegrationCertificationEvidence {
  return {
    applicationId,
    authentication: {
      acceptedVerified: 2,
      acceptedUnverified: 0,
      deniedAuthentication: 3
    },
    approvedExchange: {
      approvedHeldIntents: 1,
      invalidUnheldIntents: 0
    },
    eventHandling: {
      publishedFromAcceptedReceipt: 2,
      publicationReceiptMismatch: 0
    },
    failureRecovery: {
      heldReplayRoutes: 1,
      successfulSafeRecoveryAttempts: 1,
      invalidReleasedReplayRoutes: 0
    },
    tenantIsolation: {
      matchedTenantAccepted: 2,
      acceptedTenantMismatch: 0,
      tenantMismatchDenied: 1,
      uniqueCanonicalTenantKey: true
    }
  };
}

async function main() {
  const registry = buildAppConnectionRegistry("2026-11-07T00:00:00.000Z");
  const applications = registry.peerApplications.map(item => item.id);
  ensure(applications.length === 6, "registry still contains exactly six peer apps");

  const passingAssertions = applications.flatMap(applicationId =>
    evaluateApplicationCertification(passingEvidence(applicationId))
  );
  assertSixAppCertificationShape(applications, passingAssertions);
  const passingSummary = summarizeIntegrationCertification(passingAssertions);
  ensure(
    passingSummary.checks === 30 &&
      passingSummary.passed === 30 &&
      passingSummary.failed === 0 &&
      passingSummary.blocked === 0 &&
      passingSummary.overallOutcome === "passed",
    "complete six-app PASS matrix"
  );

  const blocked = passingEvidence("icamp");
  blocked.authentication.acceptedVerified = 0;
  blocked.approvedExchange.approvedHeldIntents = 0;
  blocked.eventHandling.publishedFromAcceptedReceipt = 0;
  blocked.failureRecovery.heldReplayRoutes = 0;
  blocked.failureRecovery.successfulSafeRecoveryAttempts = 0;
  blocked.tenantIsolation.matchedTenantAccepted = 0;
  blocked.tenantIsolation.tenantMismatchDenied = 0;
  const blockedAssertions = evaluateApplicationCertification(blocked);
  ensure(
    blockedAssertions.every(item => item.outcome === "blocked"),
    "missing evidence blocks instead of passing"
  );

  const failed = passingEvidence("rosevear-comms-hub");
  failed.authentication.acceptedUnverified = 1;
  failed.approvedExchange.invalidUnheldIntents = 1;
  failed.eventHandling.publicationReceiptMismatch = 1;
  failed.failureRecovery.invalidReleasedReplayRoutes = 1;
  failed.tenantIsolation.acceptedTenantMismatch = 1;
  const failedAssertions = evaluateApplicationCertification(failed);
  ensure(
    failedAssertions.every(item => item.outcome === "fail"),
    "contradictory evidence fails closed"
  );

  const [
    migration,
    core,
    database,
    api,
    page,
    client,
    nav,
    docs,
    security,
    architecture,
    packageRaw,
    ciDb
  ] = await Promise.all([
    source("../../db/migrations/0105_six_app_integration_certification.sql"),
    source("lib/integration-certification-core.ts"),
    source("lib/integration-certification-database.ts"),
    source("app/api/integration-certification/route.ts"),
    source("app/integration-certification/page.tsx"),
    source("app/integration-certification/IntegrationCertificationConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_304_SIX_APP_INTEGRATION_CERTIFICATION.md"),
    source("../../docs/SECURITY.md"),
    source("../../docs/ARCHITECTURE.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for (const token of [
    "integration_certification_runs",
    "integration_certification_assertions",
    "applications_expected=6",
    "checks_expected=30",
    "overall_outcome in ('passed','failed','blocked')",
    "enable row level security",
    "generated_by=nullif(current_setting('app.user_id',true),'')",
    "revoke update, delete"
  ]) {
    ensure(migration.includes(token), "migration token " + token);
  }

  for (const token of [
    '"authentication"',
    '"approved-exchange"',
    '"event-handling"',
    '"failure-recovery"',
    '"tenant-isolation"',
    "accepted-identity-unverified",
    "approved-exchange-escaped-hold",
    "event-publication-receipt-mismatch",
    "recovery-route-escaped-hold",
    "tenant-mismatch-was-accepted",
    "integration_certification_requires_exactly_thirty_checks"
  ]) {
    ensure(core.includes(token), "fail-closed evaluator token " + token);
  }

  for (const token of [
    "webhook_request_audit",
    "webhook_receipts",
    "event_bus_publications",
    "workflow_automation_action_intents",
    "event_bus_replay_routes",
    "integration_recovery_attempts",
    "integration_v1_request_audit",
    "webhook_tenant_mismatch",
    "cross_tenant_denied",
    "runIntegrationCertification",
    "assertSixAppCertificationShape",
    "connectionActivated: false",
    "heldActionReleased: false",
    "replayExecuted: false",
    "destinationActionExecuted: false",
    "ql266Resumed: false"
  ]) {
    ensure(database.includes(token), "database evidence token " + token);
  }

  for (const forbidden of [
    "setWorkspaceConnectorEnabled(",
    "executeWorkspaceConnector(",
    "requestEventBusReplay(",
    "createWorkflowAutomationRule(",
    "reviewWorkflowAutomationRule(",
    "fetch("
  ]) {
    ensure(
      !database.includes(forbidden),
      "certification database must not execute integration mutation " + forbidden
    );
  }

  ensure(
    api.includes("runIntegrationCertification") &&
      api.includes("listIntegrationCertificationForUser") &&
      api.includes("authentication_required"),
    "authenticated certification API"
  );

  ensure(
    page.includes("Build 304") &&
      page.includes("Certification is evidence, not activation.") &&
      page.includes("Missing evidence is BLOCKED") &&
      page.includes("Contradictory evidence is FAIL"),
    "operator page explains certification semantics"
  );

  for (const token of [
    "Run certification suite",
    "Six applications · thirty evidence checks",
    "BLOCKED / not proven",
    "Authentication",
    "Approved exchange",
    "Event handling",
    "Failure recovery",
    "Tenant isolation",
    "does not mean a production"
  ]) {
    ensure(client.includes(token), "certification UI token " + token);
  }

  ensure(
    nav.includes('href: "/integration-certification"') &&
      nav.includes('label: "Integration Certification"'),
    "navigation"
  );

  ensure(
    docs.includes("6 applications × 5 dimensions = 30 assertions") &&
      docs.includes("Build 305 — Autonomous Operations V1, Owner Controls & Production Learning VI") &&
      docs.includes("A successful software release of Build 304 does not imply"),
    "Build 304 documentation and next build"
  );

  ensure(
    security.includes("Build 304 six-app integration certification security") &&
      security.includes("Missing runtime evidence is BLOCKED"),
    "security documentation"
  );

  ensure(
    architecture.includes("Build 304 — Six-App End-to-End Integration Certification Suite") &&
      architecture.includes("production deployment may be GREEN while"),
    "architecture documentation"
  );

  const pkg = JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith(
      "tsx scripts/verify-build-296-shared-media-asset-exchange.ts"
    ),
    "Build 296 remains leading production gate"
  );
  for (const verifier of [
    "verify-build-297-cross-app-notification-consent.ts",
    "verify-build-298-shared-task-work-queue-exchange.ts",
    "verify-build-299-shared-scheduling-calendar-exchange.ts",
    "verify-build-300-unified-integration-health-command-center.ts",
    "verify-build-301-self-healing-safe-retry.ts",
    "verify-build-302-cross-app-workflow-automation.ts",
    "verify-build-303-ai-assisted-integration-suggestions.ts",
    "verify-build-304-six-app-integration-certification.ts"
  ]) {
    ensure(
      String(pkg.scripts.build).includes(verifier),
      "production verifier " + verifier
    );
  }

  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-304-six-app-integration-certification.ts"
    ),
    "Build 304 is in compact integration spine"
  );

  for (const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql",
    "0103_self_healing_connection_recovery.sql",
    "0104_cross_app_workflow_automation.sql",
    "0105_six_app_integration_certification.sql"
  ]) {
    ensure(ciDb.includes(migrationName), "inherited migration evidence " + migrationName);
  }

  ensure(
    ciDb.includes('"integration_certification_runs"') &&
      ciDb.includes('"integration_certification_assertions"'),
    "compact DB gate includes Build 304 RLS/append-only tables"
  );

  console.log(
    "Build 304 verification passed: six apps × five dimensions fail closed; certification records evidence without activating or mutating integrations."
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
