import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  normalizeWorkflowAutomationRuleInput,
  workflowAutomationRuleFingerprint,
  workflowAutomationRuleMatches
} from "../lib/workflow-automation-core";

function ensure(value:unknown,message:string):asserts value{
  if(!value) throw new Error("Build 302 verification failed: "+message);
}
async function source(relative:string){
  return readFile(path.resolve(process.cwd(),relative),"utf8");
}

async function main(){
  const normalized=normalizeWorkflowAutomationRuleInput({
    workspaceId:"workspace-1",
    name:"Booking created follow-up",
    sourceApplicationId:"icamp",
    destinationApplicationId:"rosevear-comms-hub",
    environment:"nonproduction",
    tenantId:"camp-rosevear",
    eventTypes:["booking.created"],
    actionKind:"prepare-shared-task",
    actionConfig:{title:"Follow up booking",priority:"high"}
  });
  ensure(
    normalized.actionKind==="prepare-shared-task" &&
    normalized.actionConfig.priority==="high",
    "rule normalization"
  );

  const fingerprintA=workflowAutomationRuleFingerprint(normalized);
  const fingerprintB=workflowAutomationRuleFingerprint(normalized);
  ensure(
    fingerprintA===fingerprintB && /^[a-f0-9]{64}$/.test(fingerprintA),
    "deterministic rule fingerprint"
  );

  const approvedAt=new Date("2026-11-06T12:00:00.000Z");
  const rule={
    workspaceId:"workspace-1",
    sourceApplicationId:"icamp" as const,
    destinationApplicationId:"rosevear-comms-hub" as const,
    environment:"nonproduction" as const,
    tenantId:"camp-rosevear",
    eventTypes:["booking.created"],
    actionKind:"prepare-shared-task" as const,
    approvedAt
  };
  ensure(
    workflowAutomationRuleMatches(rule,{
      workspaceId:"workspace-1",
      sourceApplicationId:"icamp",
      environment:"nonproduction",
      tenantId:"camp-rosevear",
      eventType:"booking.created",
      publishedAt:new Date("2026-11-06T12:00:01.000Z")
    }),
    "approved rule matches future exact event"
  );
  ensure(
    !workflowAutomationRuleMatches(rule,{
      workspaceId:"workspace-1",
      sourceApplicationId:"icamp",
      environment:"nonproduction",
      tenantId:"camp-rosevear",
      eventType:"booking.created",
      publishedAt:new Date("2026-11-06T11:59:59.000Z")
    }),
    "pre-approval publication cannot match"
  );
  ensure(
    !workflowAutomationRuleMatches(rule,{
      workspaceId:"workspace-1",
      sourceApplicationId:"yard-workers",
      environment:"nonproduction",
      tenantId:"camp-rosevear",
      eventType:"booking.created",
      publishedAt:new Date("2026-11-06T12:01:00.000Z")
    }),
    "wrong source cannot match"
  );

  let sameAppDenied=false;
  try{
    normalizeWorkflowAutomationRuleInput({
      workspaceId:"workspace-1",
      name:"Unsafe same app",
      sourceApplicationId:"icamp",
      destinationApplicationId:"icamp",
      environment:"nonproduction",
      eventTypes:["booking.created"],
      actionKind:"prepare-shared-task",
      actionConfig:{title:"Follow up booking",priority:"normal"}
    });
  }catch(error){
    sameAppDenied=error instanceof Error&&error.message==="workflow_automation_self_action_denied";
  }
  ensure(sameAppDenied,"same-app automation fails closed");

  const [
    migration,
    core,
    database,
    eventBus,
    api,
    page,
    client,
    navigation,
    docs,
    packageRaw,
    ciDb,
    build301
  ]=await Promise.all([
    source("../../db/migrations/0104_cross_app_workflow_automation.sql"),
    source("lib/workflow-automation-core.ts"),
    source("lib/workflow-automation-database.ts"),
    source("lib/event-bus-database.ts"),
    source("app/api/workflow-automation/route.ts"),
    source("app/workflow-automation/page.tsx"),
    source("app/workflow-automation/WorkflowAutomationBuilder.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_302_CROSS_APP_WORKFLOW_AUTOMATION.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts"),
    source("scripts/verify-build-301-self-healing-safe-retry.ts")
  ]);

  for(const token of [
    "workflow_automation_rules",
    "workflow_automation_rule_reviews",
    "workflow_automation_action_intents",
    "workflow_automation_audit",
    "workflow-action-not-authorized",
    "state='held'",
    "enable row level security",
    "revoke update, delete on"
  ]) ensure(migration.includes(token),"migration token "+token);

  ensure(
    migration.includes("unique (rule_id,publication_id)") &&
    migration.includes("decision in ('approve','reject','disable')"),
    "idempotent match and reviewed lifecycle constraints"
  );

  for(const token of [
    "future-matching-publications-only",
    "destinationActionExecuted:false",
    "automaticDestinationExecution:false",
    "outboundNetworkDelivery:false",
    "credentialMutation:false",
    "connectionActivation:false",
    "trustMutation:false",
    "ql266Resumed:false"
  ]) ensure(database.includes(token),"database boundary "+token);

  ensure(
    database.includes("workflowAutomationRuleMatches(identity,publication)") &&
    database.includes("on conflict (rule_id,publication_id) do nothing") &&
    database.includes("reviewed_at") &&
    core.includes("publication.publishedAt.getTime()<rule.approvedAt.getTime()"),
    "reviewed future-event matching"
  );

  ensure(
    eventBus.includes("evaluateWorkflowAutomationForPublication") &&
    eventBus.includes("automationIntents"),
    "event-bus publication evaluates workflow automation"
  );

  ensure(
    !database.includes("createSharedTask") &&
    !database.includes("createNotification") &&
    !database.includes("createSharedScheduleItem") &&
    !database.includes("requestEventBusReplay(") &&
    !database.includes("setWorkspaceConnectorEnabled("),
    "automation evaluator cannot execute destination actions"
  );

  for(const token of [
    '"create-rule"',
    '"review-rule"',
    '"evaluate-recent"',
    "authentication_required"
  ]) ensure(api.includes(token),"API token "+token);

  ensure(
    page.includes("Build 302") &&
    page.includes("held action intent") &&
    page.includes("Rules do not call destination APIs"),
    "operator execution-boundary copy"
  );

  for(const token of [
    "Create draft rule",
    "Approve future matches",
    "Disable rule",
    "Evaluate recent publications",
    "Open governed destination workbench",
    "Automatic destination execution"
  ]) ensure(client.includes(token),"builder UI token "+token);

  ensure(
    navigation.includes('href: "/workflow-automation"') &&
    navigation.includes('label: "Workflow Automation"'),
    "navigation"
  );

  ensure(
    docs.includes("Build 303") &&
    docs.includes("held action intent") &&
    docs.includes("future matching") &&
    docs.includes("does not automatically"),
    "documentation and roadmap handoff"
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
    "verify-build-301-self-healing-safe-retry.ts",
    "verify-build-302-cross-app-workflow-automation.ts"
  ]) ensure(String(pkg.scripts.build).includes(verifier),"production verifier "+verifier);

  ensure(
    String(pkg.scripts["ci:spine"]).includes("verify-build-302-cross-app-workflow-automation.ts"),
    "Build 302 is in compact integration spine"
  );

  for(const table of [
    "workflow_automation_rules",
    "workflow_automation_rule_reviews",
    "workflow_automation_action_intents",
    "workflow_automation_audit"
  ]) ensure(ciDb.includes('"'+table+'"'),"compact DB table "+table);

  for(const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql",
    "0103_self_healing_connection_recovery.sql",
    "0104_cross_app_workflow_automation.sql"
  ]) ensure(ciDb.includes(migrationName),"migration evidence "+migrationName);

  ensure(build301.includes("Build 301 verification passed"),"Build 301 inherited verifier remains present");

  console.log(
    "Build 302 verification passed: reviewed future-event rules create idempotent held action intents without executing destination actions."
  );
}

void main().catch((error:unknown)=>{
  console.error(error);
  process.exitCode=1;
});
