import { createHash } from "node:crypto";

import type {
  CrossAppDataContract,
  CrossAppDataContractField,
  CrossAppFieldType
} from "./cross-app-data-contract-registry";
import type {
  FieldMappingEntry,
  FieldMappingTransform
} from "./field-mapping-studio";
import type { SourceSchemaField } from "./schema-drift-assistant";
import type {
  WorkflowAutomationActionKind
} from "./workflow-automation-core";
import type { WebhookSourceApplication } from "./webhook-gateway-core";

export type IntegrationSuggestionKind="field-mapping"|"workflow-rule";

export type MappingSuggestionCandidate={
  candidateId:string;
  kind:"field-mapping";
  workspaceId:string;
  mappingProfileId:string;
  applicationId:WebhookSourceApplication;
  contractId:string;
  targetKey:string;
  targetLabel:string;
  targetType:CrossAppFieldType;
  sourcePath:string;
  sourceType:SourceSchemaField["type"];
  transform:FieldMappingTransform;
  requiredTarget:boolean;
  confidence:number;
  basis:string;
};

export type WorkflowSuggestionCandidate={
  candidateId:string;
  kind:"workflow-rule";
  workspaceId:string;
  sourceApplicationId:WebhookSourceApplication;
  destinationApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventType:string;
  observedCount:number;
  lastObservedAt:string;
  actionKind:WorkflowAutomationActionKind;
  actionConfig:Record<string,string>;
  confidence:number;
  basis:string;
};

export type IntegrationSuggestionCandidate=
  | MappingSuggestionCandidate
  | WorkflowSuggestionCandidate;

export type RankedIntegrationSuggestion={
  candidateId:string;
  confidence:number;
  reason:string;
};

export type IntegrationSuggestionRanking={
  mode:"gateway"|"deterministic-fallback";
  model:string;
  summary:string;
  rankings:RankedIntegrationSuggestion[];
  telemetry:{
    inputTokens:number;
    outputTokens:number;
    totalTokens:number;
    estimatedCostUsd:number|null;
    actualCostUsd:number|null;
  };
  warnings:string[];
};

export type MappingSuggestionInput={
  workspaceId:string;
  mappingProfileId:string;
  applicationId:WebhookSourceApplication;
  contract:CrossAppDataContract;
  mappingEntries:readonly FieldMappingEntry[];
  sourceSchemaFields:readonly SourceSchemaField[];
};

export type WorkflowEventEvidence={
  workspaceId:string;
  sourceApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventType:string;
  observedCount:number;
  lastObservedAt:string;
};

export type ExistingWorkflowRuleEvidence={
  workspaceId:string;
  sourceApplicationId:WebhookSourceApplication|null;
  destinationApplicationId:WebhookSourceApplication;
  environment:"nonproduction"|"production";
  tenantId:string|null;
  eventTypes:string[];
  actionKind:WorkflowAutomationActionKind;
};

const FIELD_ALIASES:Record<string,string[]>={
  sourceApplicationId:["sourceapp","sourceapplication","applicationid","app","appid"],
  sourceRecordId:["sourcerecord","recordid","id","externalid"],
  tenantKey:["tenant","tenantid","tenantkey","accountkey"],
  updatedAt:["updated","updatedat","modified","modifiedat","lastupdated"],
  displayName:["displayname","name","fullname","title"],
  email:["email","emailaddress"],
  phone:["phone","phonenumber","telephone","mobile"],
  addressText:["address","addresstext","serviceaddress","billingaddress"],
  tags:["tags","labels","categories"],
  sku:["sku","productcode","itemnumber","upc"],
  name:["name","title","displayname","productname","servicename"],
  description:["description","details","summary"],
  category:["category","type","kind"],
  status:["status","state"],
  priceCad:["price","pricecad","amount","unitprice"],
  imageUrl:["image","imageurl","photo","photourl"],
  startingPriceCad:["startingprice","startingpricecad","price","baseprice"],
  durationMinutes:["duration","durationminutes","minutes"],
  serviceAreas:["serviceareas","areas","regions"],
  customerRecordId:["customerid","customerrecordid","clientid"],
  serviceRecordId:["serviceid","servicerecordid"],
  bookingRecordId:["bookingid","bookingrecordid","reservationid"],
  startAt:["start","startat","starttime","scheduledat","appointmentat"],
  endAt:["end","endat","endtime"],
  locationText:["location","locationtext","address","site"],
  notes:["notes","note","comments"],
  scheduledStartAt:["scheduledstart","scheduledstartat","startat"],
  scheduledEndAt:["scheduledend","scheduledendat","endat"],
  assignedStaffRecordIds:["staffids","assignedstaff","assignedstaffrecordids"],
  role:["role","position"],
  active:["active","enabled","isactive"],
  skills:["skills","qualifications"],
  serialNumber:["serial","serialnumber"],
  assignedStaffRecordId:["staffid","assignedstaffrecordid"],
  serviceDueAt:["servicedue","servicedueat","maintenancedue"],
  currency:["currency","currencycode"],
  subtotal:["subtotal"],
  tax:["tax","taxtotal"],
  total:["total","grandtotal","amount"],
  dueAt:["due","dueat","duedate"],
  paidAt:["paid","paidat","paymentdate"],
  ownerKind:["ownerkind","recordtype"],
  ownerRecordId:["ownerid","ownerrecordid"],
  mediaType:["mediatype","type"],
  url:["url","link","href"],
  altText:["alt","alttext"],
  caption:["caption"],
  createdAt:["created","createdat"],
  productRecordId:["productid","productrecordid"],
  quantityOnHand:["quantity","quantityonhand","qty","stock"],
  unit:["unit","uom"],
  reorderPoint:["reorderpoint","minimumstock","minstock"],
  channel:["channel","deliverychannel"],
  templateKey:["template","templatekey"],
  consentBasis:["consent","consentbasis","permissionbasis"],
  scheduledAt:["scheduled","scheduledat"],
  sentAt:["sent","sentat"]
};

function normalized(value:string){
  return value
    .replace(/\[\d+\]/g,"")
    .replace(/([a-z0-9])([A-Z])/g,"$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}

function compact(value:string){
  return normalized(value).replace(/\s+/g,"");
}

function leaf(path:string){
  const parts=path.replace(/\[\d+\]/g,"").split(".");
  return parts.at(-1)??path;
}

function tokens(value:string){
  return new Set(normalized(value).split(" ").filter(Boolean));
}

function overlap(left:string,right:string){
  const a=tokens(left),b=tokens(right);
  if(!a.size||!b.size) return 0;
  let hits=0;
  for(const item of a) if(b.has(item)) hits++;
  return hits/Math.max(a.size,b.size);
}

function aliasScore(target:CrossAppDataContractField,sourcePath:string){
  const sourceLeaf=compact(leaf(sourcePath));
  const targetKey=compact(target.key);
  const targetLabel=compact(target.label);
  if(sourceLeaf===targetKey||sourceLeaf===targetLabel) return 0.99;
  if(
    (FIELD_ALIASES[target.key]??[]).some(alias=>sourceLeaf===compact(alias))
  ) return 0.95;
  const tokenScore=Math.max(
    overlap(target.key,leaf(sourcePath)),
    overlap(target.label,leaf(sourcePath))
  );
  if(tokenScore>=1) return 0.92;
  if(tokenScore>=0.66) return 0.84;
  if(
    sourceLeaf.length>=4 &&
    (targetKey.includes(sourceLeaf)||sourceLeaf.includes(targetKey))
  ) return 0.79;
  return 0;
}

function transformFor(
  sourceType:SourceSchemaField["type"],
  targetType:CrossAppFieldType
):FieldMappingTransform|null{
  if(sourceType===targetType) return "copy";
  if(sourceType==="string"&&targetType==="number") return "number";
  if(sourceType==="string"&&targetType==="boolean") return "boolean";
  if(sourceType==="string"&&targetType==="date-time") return "iso-date-time";
  if(sourceType==="string"&&targetType==="string-array") return "split-comma";
  if(sourceType==="string-array"&&targetType==="string") return "join-comma";
  return null;
}

function candidateId(kind:IntegrationSuggestionKind,parts:string[]){
  return createHash("sha256")
    .update([kind,...parts].join("\u001f"))
    .digest("hex")
    .slice(0,24);
}

export function buildMappingSuggestionCandidates(
  input:MappingSuggestionInput
):MappingSuggestionCandidate[]{
  const mappedTargets=new Set(input.mappingEntries.map(item=>item.targetKey));
  const usedSources=new Set(input.mappingEntries.map(item=>item.sourcePath));
  const candidates:MappingSuggestionCandidate[]=[];

  for(const target of input.contract.fields){
    if(mappedTargets.has(target.key)) continue;

    const ranked=input.sourceSchemaFields
      .filter(source=>!usedSources.has(source.path))
      .map(source=>{
        const transform=transformFor(source.type,target.type);
        if(!transform) return null;
        const semantic=aliasScore(target,source.path);
        if(semantic<0.79) return null;
        const score=Math.min(
          0.99,
          semantic+(target.required?0.01:0)
        );
        return {source,transform,score};
      })
      .filter((value):value is NonNullable<typeof value>=>Boolean(value))
      .sort((a,b)=>b.score-a.score||a.source.path.localeCompare(b.source.path))
      .slice(0,3);

    for(const item of ranked){
      candidates.push({
        candidateId:candidateId("field-mapping",[
          input.workspaceId,
          input.mappingProfileId,
          target.key,
          item.source.path,
          item.transform
        ]),
        kind:"field-mapping",
        workspaceId:input.workspaceId,
        mappingProfileId:input.mappingProfileId,
        applicationId:input.applicationId,
        contractId:input.contract.contractId,
        targetKey:target.key,
        targetLabel:target.label,
        targetType:target.type,
        sourcePath:item.source.path,
        sourceType:item.source.type,
        transform:item.transform,
        requiredTarget:target.required,
        confidence:Number(item.score.toFixed(2)),
        basis:
          item.score>=0.96
            ?"Source field name is an exact or approved semantic alias for the canonical target."
            :item.score>=0.9
              ?"Source and canonical field names strongly align and their types are compatible."
              :"Source and canonical field names are similar and require operator review."
      });
    }
  }

  return candidates
    .sort((a,b)=>
      Number(b.requiredTarget)-Number(a.requiredTarget) ||
      b.confidence-a.confidence ||
      a.targetKey.localeCompare(b.targetKey)
    )
    .slice(0,120);
}

function actionConfigFor(
  actionKind:WorkflowAutomationActionKind,
  eventType:string
):Record<string,string>{
  const readable=eventType.replace(/[._:-]+/g," ").trim();
  if(actionKind==="prepare-notification"){
    return {subject:"Review "+readable,channel:"in-app"};
  }
  if(actionKind==="prepare-schedule"){
    return {title:"Review "+readable,itemType:"event"};
  }
  if(actionKind==="review-event-recovery"){
    return {reason:"Review event recovery evidence for "+eventType};
  }
  if(actionKind==="review-integration-recovery"){
    return {reason:"Review integration recovery evidence for "+eventType};
  }
  return {title:"Follow up "+readable,priority:"normal"};
}

function workflowActions(eventType:string):WorkflowAutomationActionKind[]{
  const value=eventType.toLowerCase();
  if(/(fail|error|degrad|unhealthy|retry|recover|timeout)/.test(value)){
    return ["review-integration-recovery"];
  }
  if(/(booking|reservation|appointment|schedule)/.test(value)){
    return ["prepare-notification","prepare-shared-task","prepare-schedule"];
  }
  if(/(invoice|payment|paid|overdue|customer|guest|lead)/.test(value)){
    return ["prepare-notification","prepare-shared-task"];
  }
  if(/(job|task|work|order|service|maintenance)/.test(value)){
    return ["prepare-shared-task"];
  }
  if(/(created|updated|changed|completed|cancelled|canceled)/.test(value)){
    return ["prepare-shared-task"];
  }
  return [];
}

function workflowDestination(
  source:WebhookSourceApplication,
  actionKind:WorkflowAutomationActionKind
):WebhookSourceApplication{
  if(actionKind==="review-integration-recovery"){
    return source==="rosevear-ai-hub"
      ?"rosevear-comms-hub"
      :"rosevear-ai-hub";
  }
  return source==="rosevear-comms-hub"
    ?"rosevear-ai-hub"
    :"rosevear-comms-hub";
}

function ruleAlreadyExists(
  candidate:{
    workspaceId:string;
    sourceApplicationId:WebhookSourceApplication;
    destinationApplicationId:WebhookSourceApplication;
    environment:"nonproduction"|"production";
    tenantId:string|null;
    eventType:string;
    actionKind:WorkflowAutomationActionKind;
  },
  rules:readonly ExistingWorkflowRuleEvidence[]
){
  return rules.some(rule=>
    rule.workspaceId===candidate.workspaceId &&
    (rule.sourceApplicationId===null||
      rule.sourceApplicationId===candidate.sourceApplicationId) &&
    rule.destinationApplicationId===candidate.destinationApplicationId &&
    rule.environment===candidate.environment &&
    (rule.tenantId===null||rule.tenantId===candidate.tenantId) &&
    rule.eventTypes.includes(candidate.eventType) &&
    rule.actionKind===candidate.actionKind
  );
}

export function buildWorkflowSuggestionCandidates(
  events:readonly WorkflowEventEvidence[],
  existingRules:readonly ExistingWorkflowRuleEvidence[]
):WorkflowSuggestionCandidate[]{
  const candidates:WorkflowSuggestionCandidate[]=[];

  for(const evidence of events){
    for(const actionKind of workflowActions(evidence.eventType)){
      const destinationApplicationId=workflowDestination(
        evidence.sourceApplicationId,
        actionKind
      );
      const identity={
        workspaceId:evidence.workspaceId,
        sourceApplicationId:evidence.sourceApplicationId,
        destinationApplicationId,
        environment:evidence.environment,
        tenantId:evidence.tenantId,
        eventType:evidence.eventType,
        actionKind
      };
      if(ruleAlreadyExists(identity,existingRules)) continue;

      const frequencyBoost=Math.min(0.08,Math.log10(Math.max(1,evidence.observedCount))*0.04);
      const semanticBase=
        actionKind==="review-integration-recovery"
          ?0.9
          :actionKind==="prepare-schedule"
            ?0.83
            :0.86;
      const confidence=Math.min(0.97,semanticBase+frequencyBoost);
      candidates.push({
        candidateId:candidateId("workflow-rule",[
          evidence.workspaceId,
          evidence.sourceApplicationId,
          destinationApplicationId,
          evidence.environment,
          evidence.tenantId??"",
          evidence.eventType,
          actionKind
        ]),
        kind:"workflow-rule",
        workspaceId:evidence.workspaceId,
        sourceApplicationId:evidence.sourceApplicationId,
        destinationApplicationId,
        environment:evidence.environment,
        tenantId:evidence.tenantId,
        eventType:evidence.eventType,
        observedCount:evidence.observedCount,
        lastObservedAt:evidence.lastObservedAt,
        actionKind,
        actionConfig:actionConfigFor(actionKind,evidence.eventType),
        confidence:Number(confidence.toFixed(2)),
        basis:
          actionKind==="review-integration-recovery"
            ?"Observed event naming indicates failure/recovery evidence appropriate for governed integration review."
            :`Observed ${evidence.observedCount} event(s) of this type; the action is a reviewed, held workflow suggestion only.`
      });
    }
  }

  return candidates
    .sort((a,b)=>
      b.confidence-a.confidence ||
      b.observedCount-a.observedCount ||
      b.lastObservedAt.localeCompare(a.lastObservedAt)
    )
    .slice(0,120);
}

export function deterministicIntegrationSuggestionRanking(
  candidates:readonly IntegrationSuggestionCandidate[]
):IntegrationSuggestionRanking{
  const rankings=[...candidates]
    .sort((a,b)=>b.confidence-a.confidence||a.candidateId.localeCompare(b.candidateId))
    .slice(0,24)
    .map(candidate=>({
      candidateId:candidate.candidateId,
      confidence:candidate.confidence,
      reason:candidate.basis
    }));

  return {
    mode:"deterministic-fallback",
    model:"none",
    summary:
      "Suggestions are ranked from existing schema compatibility and observed event evidence. AI Gateway ranking is optional and cannot introduce candidates.",
    rankings,
    telemetry:{
      inputTokens:0,
      outputTokens:0,
      totalTokens:0,
      estimatedCostUsd:0,
      actualCostUsd:null
    },
    warnings:[]
  };
}

function clean(value:unknown,max:number){
  return typeof value==="string"
    ?value.replace(/\s+/g," ").trim().slice(0,max)
    :"";
}

export function sanitizeIntegrationSuggestionRanking(
  raw:unknown,
  candidates:readonly IntegrationSuggestionCandidate[]
){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    throw new Error("integration_suggestion_ai_response_invalid");
  }
  const source=raw as Record<string,unknown>;
  const summary=clean(source.summary,500);
  const allowed=new Map(candidates.map(item=>[item.candidateId,item]));
  const seen=new Set<string>();
  const rankings=(Array.isArray(source.rankings)?source.rankings:[])
    .slice(0,48)
    .map(value=>{
      if(!value||typeof value!=="object"||Array.isArray(value)) return null;
      const row=value as Record<string,unknown>;
      const candidateId=clean(row.candidateId,64);
      if(!allowed.has(candidateId)||seen.has(candidateId)) return null;
      const confidence=
        typeof row.confidence==="number"&&Number.isFinite(row.confidence)
          ?Math.max(0,Math.min(1,row.confidence))
          :allowed.get(candidateId)!.confidence;
      const reason=clean(row.reason,360);
      if(!reason) return null;
      seen.add(candidateId);
      return {
        candidateId,
        confidence:Number(confidence.toFixed(2)),
        reason
      };
    })
    .filter((value):value is RankedIntegrationSuggestion=>Boolean(value))
    .slice(0,24);

  if(!summary||!rankings.length){
    throw new Error("integration_suggestion_ai_response_empty");
  }
  return {summary,rankings};
}

export function integrationSuggestionJsonSchema(candidateIds:readonly string[]){
  if(!candidateIds.length){
    throw new Error("integration_suggestion_candidates_required");
  }
  return {
    type:"object",
    additionalProperties:false,
    required:["summary","rankings"],
    properties:{
      summary:{type:"string",minLength:1,maxLength:500},
      rankings:{
        type:"array",
        minItems:1,
        maxItems:Math.min(24,candidateIds.length),
        items:{
          type:"object",
          additionalProperties:false,
          required:["candidateId","confidence","reason"],
          properties:{
            candidateId:{type:"string",enum:[...candidateIds]},
            confidence:{type:"number",minimum:0,maximum:1},
            reason:{type:"string",minLength:1,maxLength:360}
          }
        }
      }
    }
  } as const;
}
