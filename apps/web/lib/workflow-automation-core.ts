import { createHash } from "node:crypto";

import {
  WEBHOOK_SOURCE_APPLICATIONS,
  safeWebhookEventType,
  safeWebhookTenantId,
  type WebhookSourceApplication
} from "./webhook-gateway-core";

export const WORKFLOW_AUTOMATION_ACTION_KINDS = [
  "prepare-shared-task",
  "prepare-notification",
  "prepare-schedule",
  "review-event-recovery",
  "review-integration-recovery"
] as const;

export type WorkflowAutomationActionKind =
  (typeof WORKFLOW_AUTOMATION_ACTION_KINDS)[number];

export type WorkflowAutomationRuleInput = {
  workspaceId:string;
  name:string;
  sourceApplicationId:WebhookSourceApplication|null;
  destinationApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventTypes:string[];
  actionKind:WorkflowAutomationActionKind;
  actionConfig:Record<string,unknown>;
  supersedesRuleId:string|null;
};

export type WorkflowAutomationPublicationIdentity = {
  workspaceId:string;
  sourceApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventType:string;
  publishedAt:Date;
};

export type WorkflowAutomationRuleIdentity = {
  workspaceId:string;
  sourceApplicationId:WebhookSourceApplication|null;
  destinationApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventTypes:string[];
  actionKind:WorkflowAutomationActionKind;
  approvedAt:Date;
};

function boundedText(value:unknown,min:number,max:number,code:string){
  const normalized=typeof value==="string"?value.trim():"";
  if(
    normalized.length<min ||
    normalized.length>max ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) throw new Error(code);
  return normalized;
}

export function normalizeWorkflowAutomationApplication(
  value:unknown,
  code:string,
  nullable=false
):WebhookSourceApplication|null{
  if(nullable&&(value===null||value===undefined||value==="")) return null;
  if(
    typeof value!=="string" ||
    !WEBHOOK_SOURCE_APPLICATIONS.includes(value as WebhookSourceApplication)
  ) throw new Error(code);
  return value as WebhookSourceApplication;
}

export function normalizeWorkflowAutomationEventTypes(value:unknown){
  if(!Array.isArray(value)||value.length<1||value.length>50){
    throw new Error("workflow_automation_event_types_invalid");
  }
  const normalized=value.map(item=>String(item).trim());
  if(
    new Set(normalized).size!==normalized.length ||
    normalized.some(item=>!safeWebhookEventType(item))
  ) throw new Error("workflow_automation_event_types_invalid");
  return normalized.sort();
}

export function normalizeWorkflowAutomationTenant(value:unknown){
  if(value===null||value===undefined||value==="") return null;
  if(typeof value!=="string"||!safeWebhookTenantId(value)){
    throw new Error("workflow_automation_tenant_invalid");
  }
  return value;
}

export function normalizeWorkflowAutomationActionKind(
  value:unknown
):WorkflowAutomationActionKind{
  if(
    typeof value!=="string" ||
    !WORKFLOW_AUTOMATION_ACTION_KINDS.includes(
      value as WorkflowAutomationActionKind
    )
  ) throw new Error("workflow_automation_action_kind_invalid");
  return value as WorkflowAutomationActionKind;
}

export function normalizeWorkflowAutomationConfig(
  kind:WorkflowAutomationActionKind,
  value:unknown
){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error("workflow_automation_action_config_invalid");
  }
  const source=value as Record<string,unknown>;
  const config:Record<string,string>={};

  if(kind==="prepare-shared-task"){
    config.title=boundedText(source.title,3,160,"workflow_automation_task_title_invalid");
    config.priority=boundedText(source.priority??"normal",3,16,"workflow_automation_task_priority_invalid");
    if(!["low","normal","high","urgent"].includes(config.priority)){
      throw new Error("workflow_automation_task_priority_invalid");
    }
  }else if(kind==="prepare-notification"){
    config.subject=boundedText(source.subject,3,160,"workflow_automation_notification_subject_invalid");
    config.channel=boundedText(source.channel??"email",3,20,"workflow_automation_notification_channel_invalid");
    if(!["email","sms","in-app"].includes(config.channel)){
      throw new Error("workflow_automation_notification_channel_invalid");
    }
  }else if(kind==="prepare-schedule"){
    config.title=boundedText(source.title,3,160,"workflow_automation_schedule_title_invalid");
    config.itemType=boundedText(source.itemType??"event",3,30,"workflow_automation_schedule_item_type_invalid");
    if(!["appointment","booking","job","maintenance","event","hold"].includes(config.itemType)){
      throw new Error("workflow_automation_schedule_item_type_invalid");
    }
  }else if(kind==="review-event-recovery"){
    config.reason=boundedText(
      source.reason??"Review event recovery evidence",
      8,240,"workflow_automation_recovery_reason_invalid"
    );
  }else{
    config.reason=boundedText(
      source.reason??"Review integration recovery evidence",
      8,240,"workflow_automation_recovery_reason_invalid"
    );
  }

  const encoded=JSON.stringify(config);
  if(Buffer.byteLength(encoded,"utf8")>4096){
    throw new Error("workflow_automation_action_config_too_large");
  }
  return config;
}

export function normalizeWorkflowAutomationRuleInput(
  input:{
    workspaceId:unknown;
    name:unknown;
    sourceApplicationId?:unknown;
    destinationApplicationId:unknown;
    environment:unknown;
    tenantId?:unknown;
    eventTypes:unknown;
    actionKind:unknown;
    actionConfig:unknown;
    supersedesRuleId?:unknown;
  }
):WorkflowAutomationRuleInput{
  const workspaceId=boundedText(
    input.workspaceId,1,160,"workflow_automation_workspace_invalid"
  );
  const name=boundedText(input.name,3,160,"workflow_automation_name_invalid");
  const sourceApplicationId=normalizeWorkflowAutomationApplication(
    input.sourceApplicationId,
    "workflow_automation_source_application_invalid",
    true
  );
  const destinationApplicationId=normalizeWorkflowAutomationApplication(
    input.destinationApplicationId,
    "workflow_automation_destination_application_invalid"
  );
  if(!destinationApplicationId){
    throw new Error("workflow_automation_destination_application_invalid");
  }
  if(sourceApplicationId&&sourceApplicationId===destinationApplicationId){
    throw new Error("workflow_automation_self_action_denied");
  }
  const environment=
    input.environment==="production"
      ?"production"
      :input.environment==="nonproduction"
        ?"nonproduction"
        :null;
  if(!environment) throw new Error("workflow_automation_environment_invalid");
  const tenantId=normalizeWorkflowAutomationTenant(input.tenantId);
  const eventTypes=normalizeWorkflowAutomationEventTypes(input.eventTypes);
  const actionKind=normalizeWorkflowAutomationActionKind(input.actionKind);
  const actionConfig=normalizeWorkflowAutomationConfig(actionKind,input.actionConfig);
  const supersedesRuleId=
    input.supersedesRuleId===null ||
    input.supersedesRuleId===undefined ||
    input.supersedesRuleId===""
      ?null
      :boundedText(
        input.supersedesRuleId,1,160,"workflow_automation_supersedes_rule_invalid"
      );

  return {
    workspaceId,
    name,
    sourceApplicationId,
    destinationApplicationId,
    environment,
    tenantId,
    eventTypes,
    actionKind,
    actionConfig,
    supersedesRuleId
  };
}

export function workflowAutomationRuleFingerprint(
  input:WorkflowAutomationRuleInput
){
  return createHash("sha256")
    .update(JSON.stringify({
      workspaceId:input.workspaceId,
      name:input.name,
      sourceApplicationId:input.sourceApplicationId,
      destinationApplicationId:input.destinationApplicationId,
      environment:input.environment,
      tenantId:input.tenantId,
      eventTypes:input.eventTypes,
      actionKind:input.actionKind,
      actionConfig:input.actionConfig,
      supersedesRuleId:input.supersedesRuleId
    }))
    .digest("hex");
}

export function workflowAutomationRuleMatches(
  rule:WorkflowAutomationRuleIdentity,
  publication:WorkflowAutomationPublicationIdentity
){
  if(rule.workspaceId!==publication.workspaceId) return false;
  if(rule.environment!==publication.environment) return false;
  if(rule.sourceApplicationId&&rule.sourceApplicationId!==publication.sourceApplicationId){
    return false;
  }
  if(rule.destinationApplicationId===publication.sourceApplicationId) return false;
  if(rule.tenantId!==null&&rule.tenantId!==publication.tenantId) return false;
  if(!rule.eventTypes.includes(publication.eventType)) return false;
  if(publication.publishedAt.getTime()<rule.approvedAt.getTime()) return false;
  return true;
}

export function workflowAutomationActionHref(
  kind:WorkflowAutomationActionKind
){
  if(kind==="prepare-shared-task") return "/shared-task-exchange";
  if(kind==="prepare-notification") return "/notification-consent";
  if(kind==="prepare-schedule") return "/shared-scheduling";
  if(kind==="review-event-recovery") return "/event-recovery";
  return "/integration-recovery";
}

export function safeWorkflowAutomationReviewReason(value:unknown){
  if(typeof value!=="string") return false;
  const normalized=value.trim();
  return normalized.length>=8 &&
    normalized.length<=500 &&
    !/[\u0000-\u001f\u007f]/.test(normalized);
}
