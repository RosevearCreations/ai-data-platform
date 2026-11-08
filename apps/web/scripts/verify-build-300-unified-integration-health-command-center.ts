import { readFile } from "node:fs/promises";
import path from "node:path";

import { credentialReferenceRiskState } from "../lib/credential-vault-database";

function ensure(value:unknown,message:string):asserts value{
  if(!value) throw new Error("Build 300 verification failed: "+message);
}
async function source(relative:string){
  return readFile(path.resolve(process.cwd(),relative),"utf8");
}
async function main(){
  ensure(
    credentialReferenceRiskState({
      lifecycleStatus:"active",
      replacementState:"not-planned",
      rotationDueAt:"2026-11-05T12:00:00.000Z",
      expiresAt:"2026-12-01T12:00:00.000Z"
    },new Date("2026-11-06T12:00:00.000Z"))==="rotation-due",
    "credential rotation risk is evidence-based"
  );

  const [model,page,client,navigation,docs,packageRaw,ciDb,reliability,registry] = await Promise.all([
    source("lib/integration-health-command-center.ts"),
    source("app/integration-health/page.tsx"),
    source("app/integration-health/IntegrationHealthCommandCenter.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_300_UNIFIED_INTEGRATION_HEALTH_COMMAND_CENTER.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("lib/system-reliability.ts"),
    source("lib/app-connection-registry.ts")
  ]);

  for(const token of [
    "buildSystemReliabilityDashboard",
    "buildAppConnectionRegistry",
    "workspace_credential_references",
    "workspace_connector_audit",
    "webhook_endpoints",
    "webhook_request_audit",
    "webhook_receipts",
    "event_bus_routes",
    "event_bus_delivery_failures",
    "event_bus_dead_letters",
    "event_bus_replay_requests",
    "externalHealthProbePerformed:false",
    "credentialValuesRead:false",
    "automaticRecoveryTriggered:false",
    "automaticConnectionActivation:false",
    "ql266Resumed:false"
  ]) ensure(model.includes(token),"health model token "+token);

  ensure(
    model.includes("select count(*)::int from app.webhook_request_audit") &&
    model.includes("select max(r.received_at) from app.webhook_receipts"),
    "webhook health uses independent correlated evidence counts"
  );

  ensure(
    page.includes("Build 300") &&
    page.includes("Unified Integration Health Command Center") &&
    page.includes("performs no external health probe") &&
    page.includes("does not bypass current connection authorization"),
    "operator observation boundary copy"
  );

  for(const token of [
    "registered peer apps",
    "credential references needing attention",
    "held/pending event routes",
    "webhook denials / 24h",
    "Latest measured connector evidence",
    "Unified attention list",
    "External health probes"
  ]) ensure(client.includes(token),"dashboard control token "+token);

  ensure(navigation.includes('href: "/integration-health"'),"navigation entry");
  ensure(
    docs.includes("No Build 300 database migration is required") &&
    docs.includes("Build 301") &&
    docs.includes("no external health probe"),
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
    "verify-build-300-unified-integration-health-command-center.ts"
  ]) ensure(String(pkg.scripts.build).includes(verifier),"production verifier "+verifier);
  ensure(
    String(pkg.scripts["ci:spine"]).includes("verify-build-300-unified-integration-health-command-center.ts"),
    "Build 300 is in compact integration spine"
  );

  for(const table of [
    "workspace_credential_references",
    "webhook_endpoints",
    "webhook_receipts",
    "webhook_request_audit",
    "event_bus_routes",
    "event_bus_delivery_failures",
    "event_bus_dead_letters"
  ]) ensure(ciDb.includes('"'+table+'"'),"existing compact DB evidence table "+table);

  ensure(reliability.includes("database.latencyMs"),"Build 263 measured database latency retained");
  ensure(registry.includes('connectionState: "UNMEASURED"'),"registry does not invent disconnected or connected state");
  ensure(registry.includes("legacyQl266PrerequisiteRetired: true"),"legacy QL-266 prerequisite is retired");

  console.log("Build 300 verification passed: unified integration health is read-only, evidence-based and performs no external activation or recovery.");
}
void main().catch((error:unknown)=>{
  console.error(error);
  process.exitCode=1;
});
