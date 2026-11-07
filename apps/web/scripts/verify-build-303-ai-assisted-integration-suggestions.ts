import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildMappingSuggestionCandidates,
  buildWorkflowSuggestionCandidates,
  deterministicIntegrationSuggestionRanking,
  sanitizeIntegrationSuggestionRanking
} from "../lib/integration-suggestions-core";
import {
  buildCrossAppDataContractRegistry
} from "../lib/cross-app-data-contract-registry";

function ensure(value:unknown,message:string):asserts value{
  if(!value) throw new Error("Build 303 verification failed: "+message);
}
async function source(relative:string){
  return readFile(path.resolve(process.cwd(),relative),"utf8");
}

async function main(){
  const contract=buildCrossAppDataContractRegistry(
    "2026-11-07T00:00:00.000Z"
  ).contracts.find(item=>item.kind==="customer");
  ensure(contract,"customer contract");

  const mappingCandidates=buildMappingSuggestionCandidates({
    workspaceId:"workspace-1",
    mappingProfileId:"profile-1",
    applicationId:"rosiedazzlers",
    contract,
    mappingEntries:[
      {targetKey:"sourceApplicationId",sourcePath:"sourceApplicationId",transform:"copy"},
      {targetKey:"sourceRecordId",sourcePath:"id",transform:"copy"},
      {targetKey:"tenantKey",sourcePath:"tenantId",transform:"copy"},
      {targetKey:"updatedAt",sourcePath:"updatedAt",transform:"copy"}
    ],
    sourceSchemaFields:[
      {path:"sourceApplicationId",type:"string",required:true,enumValues:[]},
      {path:"id",type:"string",required:true,enumValues:[]},
      {path:"tenantId",type:"string",required:true,enumValues:[]},
      {path:"updatedAt",type:"date-time",required:true,enumValues:[]},
      {path:"customer.name",type:"string",required:true,enumValues:[]},
      {path:"customer.email",type:"string",required:false,enumValues:[]}
    ]
  });
  ensure(
    mappingCandidates.some(item=>
      item.targetKey==="displayName" &&
      item.sourcePath==="customer.name"
    ),
    "bounded semantic field mapping suggestion"
  );
  ensure(
    mappingCandidates.every(item=>item.kind==="field-mapping"),
    "mapping candidates are advisory candidate records"
  );

  const workflowCandidates=buildWorkflowSuggestionCandidates(
    [{
      workspaceId:"workspace-1",
      sourceApplicationId:"icamp",
      environment:"nonproduction",
      tenantId:"camp-rosevear",
      eventType:"booking.created",
      observedCount:8,
      lastObservedAt:"2026-11-07T00:00:00.000Z"
    }],
    []
  );
  ensure(
    workflowCandidates.some(item=>
      item.actionKind==="prepare-notification" &&
      item.destinationApplicationId==="rosevear-comms-hub"
    ),
    "event evidence yields governed workflow suggestion"
  );

  const all=[...mappingCandidates,...workflowCandidates];
  const fallback=deterministicIntegrationSuggestionRanking(all);
  ensure(
    fallback.mode==="deterministic-fallback" &&
    fallback.rankings.length>0,
    "deterministic fallback"
  );

  const known=all[0];
  ensure(known,"known candidate");
  const sanitized=sanitizeIntegrationSuggestionRanking(
    {
      summary:"Use the strongest supported candidate first.",
      rankings:[
        {
          candidateId:"invented-candidate-id",
          confidence:1,
          reason:"Invented candidate must be discarded."
        },
        {
          candidateId:known.candidateId,
          confidence:0.91,
          reason:"This candidate exists in the server-built set."
        }
      ]
    },
    all
  );
  ensure(
    sanitized.rankings.length===1 &&
    sanitized.rankings[0]?.candidateId===known.candidateId,
    "unknown AI candidate IDs are rejected"
  );

  const [
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
  ]=await Promise.all([
    source("lib/integration-suggestions-core.ts"),
    source("lib/integration-suggestions-database.ts"),
    source("app/api/integration-suggestions/route.ts"),
    source("app/integration-suggestions/page.tsx"),
    source("app/integration-suggestions/IntegrationSuggestionsWorkbench.tsx"),
    source("lib/application-navigation.ts"),
    source("../../docs/BUILD_303_AI_ASSISTED_INTEGRATION_SUGGESTIONS.md"),
    source("../../docs/SECURITY.md"),
    source("../../docs/ARCHITECTURE.md"),
    source("package.json"),
    source("scripts/verify-ci-integration-spine-database.ts")
  ]);

  for(const token of [
    "buildMappingSuggestionCandidates",
    "buildWorkflowSuggestionCandidates",
    "sanitizeIntegrationSuggestionRanking",
    "integrationSuggestionJsonSchema",
    "candidateId"
  ]) ensure(core.includes(token),"core token "+token);

  for(const token of [
    "workspace_field_mapping_profiles",
    "event_bus_publications",
    "workflow_automation_rules",
    "source_schema_fields",
    "published_at>=now()-interval '90 days'",
    "eventBodiesRead:false",
    "credentialValuesRead:false",
    "suggestionPersistence:false",
    "mappingMutation:false",
    "workflowRuleMutation:false",
    "automaticActivation:false",
    "destinationExecution:false",
    "ql266Resumed:false"
  ]) ensure(database.includes(token),"read-model boundary "+token);

  ensure(
    !database.includes("insert into") &&
    !database.includes("update app.") &&
    !database.includes("delete from"),
    "Build 303 read model has no persistence mutation"
  );

  for(const token of [
    "AI_GATEWAY_API_KEY",
    "ai-gateway.vercel.sh",
    "integrationSuggestionJsonSchema",
    "sanitizeIntegrationSuggestionRanking",
    "candidatePromptRecord",
    "event bodies",
    "credential values"
  ]) ensure(api.includes(token),"AI API boundary "+token);

  ensure(
    !api.includes("createWorkflowAutomationRule") &&
    !api.includes("saveFieldMapping") &&
    !api.includes("updateFieldMapping") &&
    !api.includes("publishWebhookReceiptToEventBus"),
    "AI route cannot mutate integration configuration"
  );

  ensure(
    page.includes("Build 303") &&
    page.includes("Suggestion, never activation.") &&
    page.includes("cannot invent new candidate IDs"),
    "operator page safety copy"
  );

  for(const token of [
    "Ask AI to rank authorized suggestions",
    "Review in Mapping Studio",
    "Review in Workflow Automation",
    "advisory only",
    "does not save field mappings"
  ]) ensure(client.includes(token),"workbench token "+token);

  ensure(
    nav.includes('href: "/integration-suggestions"') &&
    nav.includes('label: "Integration Suggestions"'),
    "navigation"
  );

  ensure(
    docs.includes("Build 304 — Six-App End-to-End Integration Certification Suite") &&
    docs.includes("Build 303 has no database migration") &&
    docs.includes("event bodies") &&
    docs.includes("Unknown or duplicated IDs are rejected"),
    "documentation"
  );

  ensure(
    security.includes("Build 303 AI-assisted integration suggestion security") &&
    security.includes("unknown or duplicate IDs"),
    "security documentation"
  );
  ensure(
    architecture.includes("Build 303 — AI-Assisted Integration Mapping & Workflow Suggestions") &&
    architecture.includes("no Build 303 persistence or migration"),
    "architecture documentation"
  );

  const pkg=JSON.parse(packageRaw);
  ensure(
    String(pkg.scripts.build).startsWith(
      "tsx scripts/verify-build-296-shared-media-asset-exchange.ts"
    ),
    "Build 296 remains leading production gate"
  );
  for(const verifier of [
    "verify-build-297-cross-app-notification-consent.ts",
    "verify-build-298-shared-task-work-queue-exchange.ts",
    "verify-build-299-shared-scheduling-calendar-exchange.ts",
    "verify-build-300-unified-integration-health-command-center.ts",
    "verify-build-301-self-healing-safe-retry.ts",
    "verify-build-302-cross-app-workflow-automation.ts",
    "verify-build-303-ai-assisted-integration-suggestions.ts"
  ]) ensure(
    String(pkg.scripts.build).includes(verifier),
    "production verifier "+verifier
  );

  ensure(
    String(pkg.scripts["ci:spine"]).includes(
      "verify-build-303-ai-assisted-integration-suggestions.ts"
    ),
    "Build 303 is in compact integration spine"
  );

  for(const migrationName of [
    "0099_shared_media_asset_exchange.sql",
    "0100_cross_app_notification_consent.sql",
    "0101_shared_task_work_queue_exchange.sql",
    "0102_shared_scheduling_calendar_exchange.sql",
    "0103_self_healing_connection_recovery.sql",
    "0104_cross_app_workflow_automation.sql"
  ]) ensure(ciDb.includes(migrationName),"inherited migration evidence "+migrationName);

  ensure(
    !ciDb.includes("0105_ai_assisted_integration_suggestions.sql"),
    "Build 303 intentionally adds no migration"
  );

  console.log(
    "Build 303 verification passed: AI may rank only server-built schema/event candidates and cannot persist, approve or activate integration changes."
  );
}

void main().catch((error:unknown)=>{
  console.error(error);
  process.exitCode=1;
});
