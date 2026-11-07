import {
  buildCrossAppDataContractRegistry
} from "./cross-app-data-contract-registry";
import {
  buildMappingSuggestionCandidates,
  buildWorkflowSuggestionCandidates,
  deterministicIntegrationSuggestionRanking,
  type ExistingWorkflowRuleEvidence,
  type IntegrationSuggestionCandidate,
  type WorkflowEventEvidence
} from "./integration-suggestions-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";
import {
  normalizeSourceSchemaFields
} from "./schema-drift-assistant";
import type {
  FieldMappingEntry
} from "./field-mapping-studio";
import type {
  WorkflowAutomationActionKind
} from "./workflow-automation-core";
import type {
  WebhookSourceApplication
} from "./webhook-gateway-core";

function jsonArray<T>(value:unknown):T[]{
  return Array.isArray(value)?value as T[]:[];
}

function nullableString(value:unknown){
  return value===null||value===undefined?null:String(value);
}

function appId(value:unknown){
  return String(value) as WebhookSourceApplication;
}

function environment(value:unknown){
  return value==="production"
    ?"production" as const
    :"nonproduction" as const;
}

export async function buildIntegrationSuggestionsForUser(
  userId:string,
  options:{workspaceId?:string|null}={}
){
  const workspaces=await listWorkspacesForUser(userId);
  const registry=buildCrossAppDataContractRegistry();
  const contractById=new Map(
    registry.contracts.map(contract=>[contract.contractId,contract])
  );

  const evidence=await withUserDatabase(userId,async(client)=>{
    const [profiles,eventGroups,rules]=await Promise.all([
      client.query(
        `select
           workspace_id,mapping_profile_id,application_id,contract_id,
           mapping_entries,source_schema_fields,review_status,revision,updated_at
         from app.workspace_field_mapping_profiles
         where source_schema_fields is not null
         order by updated_at desc
         limit 500`
      ),
      client.query(
        `select
           workspace_id,source_application_id,environment,tenant_id,event_type,
           count(*)::int as observed_count,
           max(published_at) as last_observed_at
         from app.event_bus_publications
         where published_at>=now()-interval '90 days'
         group by workspace_id,source_application_id,environment,tenant_id,event_type
         order by observed_count desc,last_observed_at desc
         limit 500`
      ),
      client.query(
        `select
           workspace_id,source_application_id,destination_application_id,
           environment,tenant_id,event_types,action_kind
         from app.workflow_automation_rules
         order by created_at desc
         limit 1000`
      )
    ]);

    return {
      profiles:profiles.rows,
      eventGroups:eventGroups.rows,
      rules:rules.rows
    };
  });

  const mappingCandidates=evidence.profiles.flatMap(row=>{
    const workspaceId=String(row.workspace_id);
    if(options.workspaceId&&workspaceId!==options.workspaceId) return [];
    const contract=contractById.get(String(row.contract_id));
    if(!contract) return [];
    let sourceSchemaFields;
    try{
      sourceSchemaFields=normalizeSourceSchemaFields(row.source_schema_fields);
    }catch{
      return [];
    }
    return buildMappingSuggestionCandidates({
      workspaceId,
      mappingProfileId:String(row.mapping_profile_id),
      applicationId:appId(row.application_id),
      contract,
      mappingEntries:jsonArray<FieldMappingEntry>(row.mapping_entries),
      sourceSchemaFields
    });
  });

  const events:WorkflowEventEvidence[]=evidence.eventGroups
    .map(row=>({
      workspaceId:String(row.workspace_id),
      sourceApplicationId:appId(row.source_application_id),
      environment:environment(row.environment),
      tenantId:nullableString(row.tenant_id),
      eventType:String(row.event_type),
      observedCount:Number(row.observed_count)||0,
      lastObservedAt:new Date(String(row.last_observed_at)).toISOString()
    }))
    .filter(item=>!options.workspaceId||item.workspaceId===options.workspaceId);

  const rules:ExistingWorkflowRuleEvidence[]=evidence.rules
    .map(row=>({
      workspaceId:String(row.workspace_id),
      sourceApplicationId:nullableString(row.source_application_id) as WebhookSourceApplication|null,
      destinationApplicationId:appId(row.destination_application_id),
      environment:environment(row.environment),
      tenantId:nullableString(row.tenant_id),
      eventTypes:jsonArray<unknown>(row.event_types).map(String),
      actionKind:String(row.action_kind) as WorkflowAutomationActionKind
    }))
    .filter(item=>!options.workspaceId||item.workspaceId===options.workspaceId);

  const workflowCandidates=buildWorkflowSuggestionCandidates(events,rules);
  const candidates:IntegrationSuggestionCandidate[]=[
    ...mappingCandidates,
    ...workflowCandidates
  ];
  const deterministicRanking=deterministicIntegrationSuggestionRanking(candidates);
  const workspaceById=new Map(workspaces.map(item=>[item.id,item]));

  return {
    schema:"ai-data-platform.integration-suggestions.v1" as const,
    build:303 as const,
    generatedAt:new Date().toISOString(),
    scope:{
      workspaceId:options.workspaceId??null,
      evidenceWindowDays:90 as const
    },
    workspaces:workspaces.map(item=>({
      id:item.id,
      name:item.name,
      role:item.role,
      canManage:item.role==="owner"||item.role==="admin"
    })),
    candidates:candidates.map(candidate=>({
      ...candidate,
      workspaceName:
        workspaceById.get(candidate.workspaceId)?.name??candidate.workspaceId
    })),
    deterministicRanking,
    summary:{
      workspaces:workspaces.length,
      mappingProfilesWithSchemaEvidence:evidence.profiles.filter(row=>
        !options.workspaceId||String(row.workspace_id)===options.workspaceId
      ).length,
      observedEventTypes:events.length,
      existingAutomationRules:rules.length,
      mappingCandidates:mappingCandidates.length,
      workflowCandidates:workflowCandidates.length,
      totalCandidates:candidates.length
    },
    policy:{
      schemaMetadataOnly:true,
      eventBodiesRead:false,
      credentialValuesRead:false,
      candidateSetDeterministic:true,
      aiMayRankOnlyKnownCandidateIds:true,
      aiMayNotInventMappings:true,
      aiMayNotInventWorkflowActions:true,
      suggestionPersistence:false,
      mappingMutation:false,
      workflowRuleMutation:false,
      automaticApproval:false,
      automaticActivation:false,
      destinationExecution:false,
      outboundNetworkDeliveryBySuggestionEngine:false,
      ql266Resumed:false
    }
  };
}
