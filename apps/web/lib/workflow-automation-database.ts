import { randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  normalizeWorkflowAutomationRuleInput,
  safeWorkflowAutomationReviewReason,
  workflowAutomationActionHref,
  workflowAutomationRuleFingerprint,
  workflowAutomationRuleMatches,
  type WorkflowAutomationActionKind,
  type WorkflowAutomationPublicationIdentity,
  type WorkflowAutomationRuleIdentity
} from "./workflow-automation-core";
import {
  listWorkspacesForUser,
  withUserDatabase
} from "./database";
import {
  WEBHOOK_SOURCE_APPLICATIONS,
  type WebhookSourceApplication
} from "./webhook-gateway-core";

export type WorkflowAutomationRuleState =
  | "draft"
  | "approved"
  | "rejected"
  | "disabled"
  | "superseded";

export interface WorkflowAutomationRuleRecord {
  ruleId:string;
  workspaceId:string;
  name:string;
  sourceApplicationId:WebhookSourceApplication|null;
  destinationApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventTypes:string[];
  actionKind:WorkflowAutomationActionKind;
  actionConfig:Record<string,unknown>;
  ruleFingerprintSha256:string;
  supersedesRuleId:string|null;
  createdBy:string;
  createdAt:Date;
  state:WorkflowAutomationRuleState;
  latestReview:null|{
    reviewId:string;
    decision:"approve"|"reject"|"disable";
    reason:string;
    reviewedBy:string;
    reviewedAt:Date;
  };
}

export interface WorkflowAutomationIntentRecord {
  intentId:string;
  workspaceId:string;
  ruleId:string;
  ruleReviewId:string;
  publicationId:string;
  sourceApplicationId:WebhookSourceApplication;
  destinationApplicationId:WebhookSourceApplication;
  eventId:string;
  eventType:string;
  actionKind:WorkflowAutomationActionKind;
  actionConfig:Record<string,unknown>;
  targetHref:string;
  state:"held";
  holdReason:"workflow-action-not-authorized";
  createdBy:string;
  createdAt:Date;
}

type PublicationForAutomation = WorkflowAutomationPublicationIdentity & {
  publicationId:string;
  eventId:string;
};

function object(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)
    ? value as Record<string,unknown>
    : {};
}

function stringArray(value:unknown){
  return Array.isArray(value)?value.map(String):[];
}

function nullableString(value:unknown){
  return value===null||value===undefined?null:String(value);
}

async function requireWorkspaceAdmin(client:PoolClient,workspaceId:string){
  const result=await client.query<{role:string}>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role=result.rows[0]?.role;
  if(role!=="owner"&&role!=="admin"){
    throw new Error("workspace_admin_required");
  }
}

async function appendAutomationAudit(
  client:PoolClient,
  input:{
    workspaceId:string;
    userId:string;
    action:
      | "rule-created"
      | "rule-approved"
      | "rule-rejected"
      | "rule-disabled"
      | "action-intent-created"
      | "publication-evaluated-no-match";
    ruleId?:string|null;
    reviewId?:string|null;
    publicationId?:string|null;
    intentId?:string|null;
    details?:Record<string,unknown>;
  }
){
  await client.query(
    `insert into app.workflow_automation_audit (
      audit_id,workspace_id,actor_user_id,action,rule_id,review_id,
      publication_id,intent_id,details
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      randomUUID(),
      input.workspaceId,
      input.userId,
      input.action,
      input.ruleId??null,
      input.reviewId??null,
      input.publicationId??null,
      input.intentId??null,
      JSON.stringify(input.details??{})
    ]
  );
}

function ruleRow(row:Record<string,unknown>):WorkflowAutomationRuleRecord{
  const reviewDecision=nullableString(row.review_decision) as
    | "approve"
    | "reject"
    | "disable"
    | null;
  const latestReview=reviewDecision?{
    reviewId:String(row.review_id),
    decision:reviewDecision,
    reason:String(row.review_reason),
    reviewedBy:String(row.reviewed_by),
    reviewedAt:new Date(String(row.reviewed_at))
  }:null;

  let state:WorkflowAutomationRuleState="draft";
  if(Boolean(row.superseded_by_approved)) state="superseded";
  else if(reviewDecision==="approve") state="approved";
  else if(reviewDecision==="reject") state="rejected";
  else if(reviewDecision==="disable") state="disabled";

  return {
    ruleId:String(row.rule_id),
    workspaceId:String(row.workspace_id),
    name:String(row.name),
    sourceApplicationId:nullableString(row.source_application_id) as WebhookSourceApplication|null,
    destinationApplicationId:String(row.destination_application_id) as WebhookSourceApplication,
    environment:row.environment==="production"?"production":"nonproduction",
    tenantId:nullableString(row.tenant_id),
    eventTypes:stringArray(row.event_types),
    actionKind:String(row.action_kind) as WorkflowAutomationActionKind,
    actionConfig:object(row.action_config),
    ruleFingerprintSha256:String(row.rule_fingerprint_sha256),
    supersedesRuleId:nullableString(row.supersedes_rule_id),
    createdBy:String(row.created_by),
    createdAt:new Date(String(row.created_at)),
    state,
    latestReview
  };
}

function intentRow(row:Record<string,unknown>):WorkflowAutomationIntentRecord{
  return {
    intentId:String(row.intent_id),
    workspaceId:String(row.workspace_id),
    ruleId:String(row.rule_id),
    ruleReviewId:String(row.rule_review_id),
    publicationId:String(row.publication_id),
    sourceApplicationId:String(row.source_application_id) as WebhookSourceApplication,
    destinationApplicationId:String(row.destination_application_id) as WebhookSourceApplication,
    eventId:String(row.event_id),
    eventType:String(row.event_type),
    actionKind:String(row.action_kind) as WorkflowAutomationActionKind,
    actionConfig:object(row.action_config),
    targetHref:String(row.target_href),
    state:"held",
    holdReason:"workflow-action-not-authorized",
    createdBy:String(row.created_by),
    createdAt:new Date(String(row.created_at))
  };
}

async function selectRules(client:PoolClient){
  return client.query(`
    select r.*,
      lr.review_id,
      lr.decision as review_decision,
      lr.reason as review_reason,
      lr.reviewed_by,
      lr.reviewed_at,
      exists (
        select 1
        from app.workflow_automation_rules child
        join lateral (
          select rv.decision
          from app.workflow_automation_rule_reviews rv
          where rv.rule_id=child.rule_id
          order by rv.reviewed_at desc,rv.review_id desc
          limit 1
        ) child_review on true
        where child.supersedes_rule_id=r.rule_id
          and child_review.decision='approve'
      ) as superseded_by_approved
    from app.workflow_automation_rules r
    left join lateral (
      select rv.review_id,rv.decision,rv.reason,rv.reviewed_by,rv.reviewed_at
      from app.workflow_automation_rule_reviews rv
      where rv.rule_id=r.rule_id
      order by rv.reviewed_at desc,rv.review_id desc
      limit 1
    ) lr on true
    order by r.created_at desc,r.rule_id desc
  `);
}

async function approvedRulesForPublication(
  client:PoolClient,
  publication:PublicationForAutomation
){
  const result=await client.query(`
    select r.*,
      lr.review_id,
      lr.reviewed_at
    from app.workflow_automation_rules r
    join lateral (
      select rv.review_id,rv.decision,rv.reviewed_at
      from app.workflow_automation_rule_reviews rv
      where rv.rule_id=r.rule_id
      order by rv.reviewed_at desc,rv.review_id desc
      limit 1
    ) lr on lr.decision='approve'
    where r.workspace_id=$1
      and r.environment=$2
      and (r.source_application_id is null or r.source_application_id=$3)
      and r.destination_application_id<>$3
      and (r.tenant_id is null or r.tenant_id is not distinct from $4)
      and not exists (
        select 1
        from app.workflow_automation_rules child
        join lateral (
          select rv2.decision
          from app.workflow_automation_rule_reviews rv2
          where rv2.rule_id=child.rule_id
          order by rv2.reviewed_at desc,rv2.review_id desc
          limit 1
        ) child_review on true
        where child.supersedes_rule_id=r.rule_id
          and child_review.decision='approve'
      )
    order by r.created_at,r.rule_id
  `,[
    publication.workspaceId,
    publication.environment,
    publication.sourceApplicationId,
    publication.tenantId
  ]);
  return result.rows;
}

export async function evaluateWorkflowAutomationForPublication(
  client:PoolClient,
  userId:string,
  publication:PublicationForAutomation
){
  const candidates=await approvedRulesForPublication(client,publication);
  const created:WorkflowAutomationIntentRecord[]=[];

  for(const row of candidates){
    const identity:WorkflowAutomationRuleIdentity={
      workspaceId:String(row.workspace_id),
      sourceApplicationId:nullableString(row.source_application_id) as WebhookSourceApplication|null,
      destinationApplicationId:String(row.destination_application_id) as WebhookSourceApplication,
      environment:row.environment==="production"?"production":"nonproduction",
      tenantId:nullableString(row.tenant_id),
      eventTypes:stringArray(row.event_types),
      actionKind:String(row.action_kind) as WorkflowAutomationActionKind,
      approvedAt:new Date(String(row.reviewed_at))
    };
    if(!workflowAutomationRuleMatches(identity,publication)) continue;

    const intentId=randomUUID();
    const result=await client.query(
      `insert into app.workflow_automation_action_intents (
        intent_id,workspace_id,rule_id,rule_review_id,publication_id,
        source_application_id,destination_application_id,event_id,event_type,
        action_kind,action_config,target_href,state,hold_reason,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,
        'held','workflow-action-not-authorized',$13
      )
      on conflict (rule_id,publication_id) do nothing
      returning *`,
      [
        intentId,
        publication.workspaceId,
        row.rule_id,
        row.review_id,
        publication.publicationId,
        publication.sourceApplicationId,
        row.destination_application_id,
        publication.eventId,
        publication.eventType,
        row.action_kind,
        JSON.stringify(object(row.action_config)),
        workflowAutomationActionHref(
          String(row.action_kind) as WorkflowAutomationActionKind
        ),
        userId
      ]
    );
    if(result.rows[0]){
      const intent=intentRow(result.rows[0]);
      created.push(intent);
      await appendAutomationAudit(client,{
        workspaceId:publication.workspaceId,
        userId,
        action:"action-intent-created",
        ruleId:intent.ruleId,
        reviewId:intent.ruleReviewId,
        publicationId:publication.publicationId,
        intentId:intent.intentId,
        details:{
          actionKind:intent.actionKind,
          destinationApplicationId:intent.destinationApplicationId,
          state:"held",
          holdReason:"workflow-action-not-authorized",
          destinationActionExecuted:false,
          outboundNetworkDelivery:false
        }
      });
    }
  }

  if(created.length===0){
    const alreadyAudited=await client.query(
      `select audit_id
       from app.workflow_automation_audit
       where publication_id=$1
         and action='publication-evaluated-no-match'
       limit 1`,
      [publication.publicationId]
    );
    if(!alreadyAudited.rows[0]){
      await appendAutomationAudit(client,{
        workspaceId:publication.workspaceId,
        userId,
        action:"publication-evaluated-no-match",
        publicationId:publication.publicationId,
        details:{
          eventType:publication.eventType,
          sourceApplicationId:publication.sourceApplicationId,
          destinationActionExecuted:false
        }
      });
    }
  }

  return created;
}

export async function listWorkflowAutomationForUser(userId:string){
  const workspaces=await listWorkspacesForUser(userId);
  const state=await withUserDatabase(userId,async(client)=>{
    const [rulesResult,intentsResult,publicationsResult]=await Promise.all([
      selectRules(client),
      client.query(
        `select * from app.workflow_automation_action_intents
         order by created_at desc,intent_id desc
         limit 500`
      ),
      client.query(
        `select publication_id,workspace_id,source_application_id,environment,
                tenant_id,event_id,event_type,published_at
         from app.event_bus_publications
         order by published_at desc
         limit 200`
      )
    ]);
    return {
      rules:rulesResult.rows.map(ruleRow),
      intents:intentsResult.rows.map(intentRow),
      publications:publicationsResult.rows.map(row=>({
        publicationId:String(row.publication_id),
        workspaceId:String(row.workspace_id),
        sourceApplicationId:String(row.source_application_id) as WebhookSourceApplication,
        environment:row.environment==="production"?"production" as const:"nonproduction" as const,
        tenantId:nullableString(row.tenant_id),
        eventId:String(row.event_id),
        eventType:String(row.event_type),
        publishedAt:new Date(String(row.published_at))
      }))
    };
  });

  return {
    workspaces,
    applications:[...WEBHOOK_SOURCE_APPLICATIONS],
    actionKinds:[
      "prepare-shared-task",
      "prepare-notification",
      "prepare-schedule",
      "review-event-recovery",
      "review-integration-recovery"
    ] as const,
    ...state,
    summary:{
      rules:state.rules.length,
      approvedRules:state.rules.filter(item=>item.state==="approved").length,
      draftRules:state.rules.filter(item=>item.state==="draft").length,
      disabledRules:state.rules.filter(item=>item.state==="disabled").length,
      heldActionIntents:state.intents.length
    },
    policy:{
      reviewedRulesOnly:true,
      exactEventTypeMatching:true,
      futureEventsOnlyAfterApproval:true,
      actionIntentsHeld:true,
      automaticDestinationExecution:false,
      outboundNetworkDelivery:false,
      credentialMutation:false,
      connectionActivation:false,
      trustMutation:false,
      ql266Resumed:false
    }
  };
}

export async function createWorkflowAutomationRule(
  userId:string,
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
){
  const normalized=normalizeWorkflowAutomationRuleInput(input);
  const fingerprint=workflowAutomationRuleFingerprint(normalized);

  return withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,normalized.workspaceId);

    if(normalized.supersedesRuleId){
      const predecessor=await client.query(
        `select workspace_id from app.workflow_automation_rules
         where rule_id=$1 limit 1`,
        [normalized.supersedesRuleId]
      );
      if(!predecessor.rows[0]){
        throw new Error("workflow_automation_supersedes_rule_not_found");
      }
      if(String(predecessor.rows[0].workspace_id)!==normalized.workspaceId){
        throw new Error("workflow_automation_supersedes_workspace_mismatch");
      }
    }

    const ruleId=randomUUID();
    const result=await client.query(
      `insert into app.workflow_automation_rules (
        rule_id,workspace_id,name,source_application_id,destination_application_id,
        environment,tenant_id,event_types,action_kind,action_config,
        rule_fingerprint_sha256,supersedes_rule_id,created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11,$12,$13
      )
      on conflict (rule_fingerprint_sha256) do nothing
      returning rule_id`,
      [
        ruleId,
        normalized.workspaceId,
        normalized.name,
        normalized.sourceApplicationId,
        normalized.destinationApplicationId,
        normalized.environment,
        normalized.tenantId,
        JSON.stringify(normalized.eventTypes),
        normalized.actionKind,
        JSON.stringify(normalized.actionConfig),
        fingerprint,
        normalized.supersedesRuleId,
        userId
      ]
    );
    if(!result.rows[0]){
      throw new Error("workflow_automation_duplicate_rule");
    }

    await appendAutomationAudit(client,{
      workspaceId:normalized.workspaceId,
      userId,
      action:"rule-created",
      ruleId,
      details:{
        ruleFingerprintSha256:fingerprint,
        actionKind:normalized.actionKind,
        destinationApplicationId:normalized.destinationApplicationId,
        state:"draft",
        destinationActionExecuted:false
      }
    });
    return {ruleId,state:"draft" as const,ruleFingerprintSha256:fingerprint};
  });
}

export async function reviewWorkflowAutomationRule(
  userId:string,
  input:{
    ruleId:string;
    decision:"approve"|"reject"|"disable";
    reason:string;
  }
){
  if(!safeWorkflowAutomationReviewReason(input.reason)){
    throw new Error("workflow_automation_review_reason_invalid");
  }
  if(!["approve","reject","disable"].includes(input.decision)){
    throw new Error("workflow_automation_review_decision_invalid");
  }

  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(
      `select * from app.workflow_automation_rules where rule_id=$1 limit 1`,
      [input.ruleId]
    );
    const row=result.rows[0];
    if(!row) throw new Error("workflow_automation_rule_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);

    const reviewId=randomUUID();
    await client.query(
      `insert into app.workflow_automation_rule_reviews (
        review_id,workspace_id,rule_id,decision,reason,reviewed_by
      ) values ($1,$2,$3,$4,$5,$6)`,
      [
        reviewId,
        workspaceId,
        input.ruleId,
        input.decision,
        input.reason.trim(),
        userId
      ]
    );
    await appendAutomationAudit(client,{
      workspaceId,
      userId,
      action:
        input.decision==="approve"
          ?"rule-approved"
          :input.decision==="reject"
            ?"rule-rejected"
            :"rule-disabled",
      ruleId:input.ruleId,
      reviewId,
      details:{
        decision:input.decision,
        destinationActionExecuted:false,
        activationScope:"future-matching-publications-only"
      }
    });

    return {
      reviewId,
      ruleId:input.ruleId,
      decision:input.decision,
      destinationActionExecuted:false
    };
  });
}

export async function evaluateRecentWorkflowAutomation(
  userId:string
){
  return withUserDatabase(userId,async(client)=>{
    const publications=await client.query(
      `select publication_id,workspace_id,source_application_id,environment,
              tenant_id,event_id,event_type,published_at
       from app.event_bus_publications
       order by published_at desc
       limit 200`
    );
    let evaluated=0;
    let intentsCreated=0;
    for(const row of publications.rows){
      const workspaceId=String(row.workspace_id);
      const member=await client.query<{role:string}>(
        `select role from app.workspace_members
         where workspace_id=$1
           and user_id=nullif(current_setting('app.user_id',true),'')
         limit 1`,
        [workspaceId]
      );
      if(!["owner","admin"].includes(member.rows[0]?.role??"")) continue;

      const created=await evaluateWorkflowAutomationForPublication(
        client,
        userId,
        {
          publicationId:String(row.publication_id),
          workspaceId,
          sourceApplicationId:String(row.source_application_id) as WebhookSourceApplication,
          environment:row.environment==="production"?"production":"nonproduction",
          tenantId:nullableString(row.tenant_id),
          eventId:String(row.event_id),
          eventType:String(row.event_type),
          publishedAt:new Date(String(row.published_at))
        }
      );
      evaluated++;
      intentsCreated+=created.length;
    }
    return {evaluated,intentsCreated};
  });
}
