import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  connectorFailureClassification,
  credentialRecoveryClassification,
  eventFailureClassification,
  SAFE_CONNECTOR_RECOVERY_COOLDOWN_SECONDS,
  SAFE_CONNECTOR_RECOVERY_MAX_ATTEMPTS,
  stableRecoverySourceKey
} from "../lib/integration-recovery-core";

function ensure(value:unknown,message:string):asserts value{
  if(!value) throw new Error("Build 301 verification failed: "+message);
}
async function source(relative:string){
  return readFile(path.resolve(process.cwd(),relative),"utf8");
}

async function main(){
  const timeout=connectorFailureClassification({
    status:"failed",
    errorCode:"connector_request_timeout",
    transportKind:"http"
  });
  ensure(
    timeout.classification==="safe-bounded-retry" &&
    timeout.autoExecutionAllowed===true &&
    timeout.maxAttempts===3 &&
    timeout.cooldownSeconds===300,
    "transient HTTP connector failure is bounded-safe"
  );

  const rateLimit=connectorFailureClassification({
    status:"failed",
    errorCode:"connector_http_status_429",
    transportKind:"http"
  });
  ensure(rateLimit.classification==="safe-bounded-retry","HTTP 429 is retryable");

  const serverError=connectorFailureClassification({
    status:"failed",
    errorCode:"connector_http_status_503",
    transportKind:"http"
  });
  ensure(serverError.classification==="safe-bounded-retry","HTTP 5xx is retryable");

  const authFailure=connectorFailureClassification({
    status:"failed",
    errorCode:"connector_http_status_401",
    transportKind:"http"
  });
  ensure(
    authFailure.classification==="owner-approval-required" &&
    authFailure.autoExecutionAllowed===false,
    "authentication failure cannot auto-retry"
  );

  const localFailure=connectorFailureClassification({
    status:"failed",
    errorCode:"connector_request_failed",
    transportKind:"local"
  });
  ensure(localFailure.classification==="owner-approval-required","local transport cannot use HTTP health auto-retry");

  ensure(
    eventFailureClassification("transient").classification==="owner-approval-required" &&
    eventFailureClassification("permanent").classification==="not-retryable",
    "event replay remains owner-controlled"
  );
  ensure(
    credentialRecoveryClassification("rotation-due").classification==="owner-approval-required",
    "credential remediation remains owner-controlled"
  );
  ensure(
    SAFE_CONNECTOR_RECOVERY_MAX_ATTEMPTS===3 &&
    SAFE_CONNECTOR_RECOVERY_COOLDOWN_SECONDS===300,
    "global recovery bounds"
  );
  ensure(
    stableRecoverySourceKey({
      workspaceId:"workspace-1",
      sourceKind:"connector-audit",
      sourceId:"audit-1",
      action:"connector-health-retry"
    })===stableRecoverySourceKey({
      workspaceId:"workspace-1",
      sourceKind:"connector-audit",
      sourceId:"audit-1",
      action:"connector-health-retry"
    }),
    "recovery source fingerprint is deterministic"
  );

  const [
    migration,
    core,
    database,
    sandbox,
    api,
    page,
    client,
    navigation,
    docs,
    packageRaw,
    ciDb,
    build300
  ]=await Promise.all([
    source("../../db/migrations/0103_self_healing_connection_recovery.sql"),
    source("lib/integration-recovery-core.ts"),
    source("lib/integration-recovery-database.ts"),
    source("lib/connectors/sandbox.ts"),
    source("app/api/integration-recovery/route.ts"),
    source("app/integration-recovery/page.tsx"),
    source("app/integration-recovery/IntegrationRecoveryConsole.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_301_SELF_HEALING_CONNECTION_RECOVERY.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-300-unified-integration-health-command-center.ts")
  ]);

  for(const token of [
    "integration_recovery_plans",
    "integration_recovery_attempts",
    "integration_recovery_decisions",
    "integration_recovery_audit",
    "safe-bounded-retry",
    "owner-approval-required",
    "auto_execution_allowed",
    "max_attempts",
    "cooldown_seconds",
    "enable row level security"
  ]) ensure(migration.includes(token),"migration token "+token);

  for(const table of [
    "integration_recovery_plans",
    "integration_recovery_attempts",
    "integration_recovery_decisions",
    "integration_recovery_audit"
  ]){
    ensure(
      migration.includes("revoke update, delete on") &&
      migration.includes("grant select, insert on"),
      "append-only recovery grants"
    );
    ensure(ciDb.includes('"'+table+'"'),"CI DB table "+table);
  }

  for(const token of [
    "connector_request_timeout",
    "connector_http_status_(408|429|5\\d\\d)",
    "safe-bounded-retry",
    "owner-approval-required"
  ]) ensure(core.includes(token),"classification token "+token);

  ensure(
    sandbox.includes("executeConnectorHealthBoundary") &&
    sandbox.includes('manifest.transport.kind !== "http"') &&
    sandbox.includes("http.health()"),
    "health-only connector boundary"
  );
  ensure(
    sandbox.includes("createExecutionHttpClient") &&
    sandbox.includes("validateConnectorSecretReferences"),
    "existing SDK transport and secret-reference boundary retained"
  );

  for(const token of [
    "scanIntegrationRecoveryPlans",
    "runSafeRecoveryCycle",
    "executeSafeRecoveryPlan",
    "integration_recovery_retry_limit_reached",
    "integration_recovery_cooldown_active",
    "executeConnectorHealthBoundary",
    "consequentialActionExecuted:false",
    "credentialMutationAutomatic:false",
    "eventReplayAutomatic:false",
    "connectionActivationAutomatic:false",
    "outboundMutationAutomatic:false",
    "ql266Resumed:false"
  ]) ensure(database.includes(token),"database recovery boundary "+token);

  ensure(
    !database.includes("requestEventBusReplay(") &&
    !database.includes("setWorkspaceConnectorEnabled("),
    "consequential recovery is not silently executed"
  );

  ensure(
    api.includes('"scan"') &&
    api.includes('"run-safe-cycle"') &&
    api.includes('"execute-safe-plan"') &&
    api.includes('"decision"') &&
    api.includes("status:401"),
    "authenticated recovery API"
  );

  ensure(
    page.includes("Build 301") &&
    page.includes("GET/HEAD connector health retries") &&
    page.includes("never auto-executed") &&
    page.includes("Legacy QL-266 status is historical"),
    "operator safety boundary copy"
  );

  for(const token of [
    "Scan recovery evidence",
    "Run bounded safe retries",
    "Run this safe health retry",
    "Approve for owner workbench",
    "Maximum recovery cycles"
  ]) ensure(client.includes(token),"recovery UI token "+token);

  ensure(navigation.includes('href: "/integration-recovery"'),"navigation entry");
  ensure(
    docs.includes("Build 302") &&
    docs.includes("maximum recovery cycles per plan: **3**") &&
    docs.includes("event-bus replay") &&
    docs.includes("never auto-executed"),
    "documentation and next build"
  );

  const pkg=JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith("tsx scripts/verify-build-296-shared-media-asset-exchange.ts"),
    "Build 296 remains leading production gate"
  );
  for(const verifier of [
    "verify-build-297-cross-app-notification-consent.ts",
    "verify-build-298-shared-task-work-queue-exchange.ts",
    "verify-build-299-shared-scheduling-calendar-exchange.ts",
    "verify-build-300-unified-integration-health-command-center.ts",
    "verify-build-301-self-healing-safe-retry.ts"
  ]) ensure(String(pkg.scripts.build).includes(verifier),"production verifier "+verifier);
  ensure(
    String(pkg.scripts["ci:spine"]).includes("verify-build-301-self-healing-safe-retry.ts"),
    "Build 301 is in compact integration spine"
  );

  for(const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql",
    "0103_self_healing_connection_recovery.sql"
  ]) ensure(ciDb.includes(migrationName),"CI migration evidence "+migrationName);

  ensure(build300.includes("Build 300 verification passed"),"Build 300 inherited verifier remains present");

  console.log("Build 301 verification passed: only bounded GET/HEAD health recovery may auto-retry; consequential recovery remains owner-controlled.");
}

void main().catch((error:unknown)=>{
  console.error(error);
  process.exitCode=1;
});
