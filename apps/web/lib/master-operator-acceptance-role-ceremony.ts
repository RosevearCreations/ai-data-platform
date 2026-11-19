import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_423 = 423 as const;
export const BUILD_423_SCHEMA = "rosevear.ai-data-platform.build423-operator-acceptance-role-separation-production-ceremony.v1" as const;
export const BUILD_423_ROLES = ["OWNER","OPERATOR","ADMIN","WORKER","CUSTOMER"] as const;
export const BUILD_423_WORKFLOWS = ["PRODUCTION_CHANGE","REBOOT_OR_RESTART","RECOVERY_OR_ROLLBACK","EXTERNAL_MESSAGE","FINANCIAL_OR_DATA_EXPORT"] as const;
export const BUILD_423_ROLE_MATRIX = {
  "ai-data-platform":["OWNER","OPERATOR"],
  "rosevear-ai-hub":["OWNER","OPERATOR"],
  "rosevear-comms-hub":["OWNER","OPERATOR"],
  yw:["OWNER","ADMIN","WORKER","CUSTOMER"],
  icamp:["OWNER","ADMIN","WORKER","CUSTOMER"],
  devilndove:["OWNER","ADMIN","WORKER","CUSTOMER"],
  rosiedazzlers:["OWNER","ADMIN","WORKER","CUSTOMER"]
} as const;
export type Build423ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build423Role=(typeof BUILD_423_ROLES)[number];
export type Build423Workflow=(typeof BUILD_423_WORKFLOWS)[number];

export type Build423RoleAcceptanceEvidence={
  evidenceId:string;appId:Build423ApplicationId;role:Build423Role;state:"PASS"|"PARTIAL"|"FAILED";
  acceptancePercent:number;criticalFailureCount:number;evidenceDigest:string;observedAt:string;expiresAt:string;
  sourceOwned:boolean;ownerReviewed:boolean;independentlyVerified:boolean;
};
export type Build423WorkflowCeremonyReceipt={
  receiptId:string;appId:Build423ApplicationId;workflow:Build423Workflow;state:"PASS"|"HOLD"|"FAILED";
  requesterRole:Build423Role;approverRole:Build423Role;executorRole:Build423Role;
  requesterIdHash:string;approverIdHash:string;executorIdHash:string;
  explicitApproval:boolean;authoritySeparated:boolean;ownerGatePreserved:boolean;sourceAuthorityPreserved:boolean;
  rollbackOrAbortAvailable:boolean;evidenceDigest:string;observedAt:string;expiresAt:string;
  sourceOwned:boolean;ownerReviewed:boolean;independentlyVerified:boolean;
};
export type Build423TelemetryReceipt={
  receiptId:string;appId:Build423ApplicationId;eventId:string;nonce:string;sourceCommit:string;
  state:"HEALTHY"|"DEGRADED"|"UNHEALTHY"|"UNKNOWN";eventKind:string;issuedAt:string;expiresAt:string;
  sourceSignatureVerified:boolean;sourceCommitVerified:boolean;privacyBoundaryVerified:boolean;antiReplayVerified:boolean;
  transportVerified:boolean;independentSignerPinVerified:boolean;ownerReviewed:boolean;
};
const digest=(v:string)=>/^sha256:[a-f0-9]{64}$/.test(v);
const iso=(v:string)=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const fresh=(o:string,e:string,now:number)=>iso(o)&&iso(e)&&Date.parse(o)<=now&&Date.parse(e)>now&&Date.parse(e)>Date.parse(o);
const hash=(v:string)=>/^[a-f0-9]{64}$/.test(v);
function latest<T extends {observedAt?:string;issuedAt?:string}>(items:readonly T[],key:(v:T)=>string){
 const out=new Map<string,T>();
 for(const item of [...items].sort((a,b)=>(b.observedAt??b.issuedAt??"").localeCompare(a.observedAt??a.issuedAt??""))){
  const k=key(item);if(!out.has(k))out.set(k,item);
 }
 return out;
}
export function validateBuild423RoleAcceptance(item:Build423RoleAcceptanceEvidence,nowIso:string){
 const roles=BUILD_423_ROLE_MATRIX[item.appId] as readonly string[];
 return BUILD_405_APPLICATION_IDS.includes(item.appId)&&roles.includes(item.role)&&item.state==="PASS"&&
  Number.isFinite(item.acceptancePercent)&&item.acceptancePercent>=90&&item.acceptancePercent<=100&&item.criticalFailureCount===0&&
  digest(item.evidenceDigest)&&item.sourceOwned&&item.ownerReviewed&&item.independentlyVerified&&fresh(item.observedAt,item.expiresAt,Date.parse(nowIso));
}
export function validateBuild423Ceremony(item:Build423WorkflowCeremonyReceipt,nowIso:string){
 const roles=BUILD_423_ROLE_MATRIX[item.appId] as readonly string[];
 const highRisk=["PRODUCTION_CHANGE","REBOOT_OR_RESTART","RECOVERY_OR_ROLLBACK","FINANCIAL_OR_DATA_EXPORT"].includes(item.workflow);
 const identitiesSeparate=item.requesterIdHash!==item.approverIdHash&&hash(item.requesterIdHash)&&hash(item.approverIdHash)&&hash(item.executorIdHash);
 return BUILD_405_APPLICATION_IDS.includes(item.appId)&&BUILD_423_WORKFLOWS.includes(item.workflow)&&item.state==="PASS"&&
  roles.includes(item.requesterRole)&&roles.includes(item.approverRole)&&roles.includes(item.executorRole)&&identitiesSeparate&&
  item.explicitApproval&&item.authoritySeparated&&item.sourceAuthorityPreserved&&item.rollbackOrAbortAvailable&&
  (!highRisk||item.ownerGatePreserved)&&digest(item.evidenceDigest)&&item.sourceOwned&&item.ownerReviewed&&item.independentlyVerified&&
  fresh(item.observedAt,item.expiresAt,Date.parse(nowIso));
}
export function validateBuild423Telemetry(item:Build423TelemetryReceipt,nowIso:string){
 return BUILD_405_APPLICATION_IDS.includes(item.appId)&&/^[A-Za-z0-9_-]{16,80}$/.test(item.eventId)&&/^[a-f0-9]{32}$/.test(item.nonce)&&
  /^[a-f0-9]{40}$/.test(item.sourceCommit)&&item.sourceSignatureVerified&&item.sourceCommitVerified&&item.privacyBoundaryVerified&&
  item.antiReplayVerified&&item.transportVerified&&item.independentSignerPinVerified&&item.ownerReviewed&&fresh(item.issuedAt,item.expiresAt,Date.parse(nowIso));
}
export function evaluateBuild423(input:{roles?:readonly Build423RoleAcceptanceEvidence[];ceremonies?:readonly Build423WorkflowCeremonyReceipt[];telemetry?:readonly Build423TelemetryReceipt[];nowIso:string;}){
 const roleMap=latest(input.roles??[],x=>x.appId+"::"+x.role);
 const ceremonyMap=latest(input.ceremonies??[],x=>x.appId+"::"+x.workflow);
 const telemetryMap=latest(input.telemetry??[],x=>x.appId);
 const requiredRoles=BUILD_405_APPLICATION_IDS.flatMap(appId=>(BUILD_423_ROLE_MATRIX[appId] as readonly Build423Role[]).map(role=>appId+"::"+role));
 const requiredCeremonies=BUILD_405_APPLICATION_IDS.flatMap(appId=>BUILD_423_WORKFLOWS.map(workflow=>appId+"::"+workflow));
 const missingRoles=requiredRoles.filter(k=>!roleMap.has(k));
 const invalidRoles=requiredRoles.filter(k=>{const v=roleMap.get(k);return Boolean(v&&!validateBuild423RoleAcceptance(v,input.nowIso));});
 const missingCeremonies=requiredCeremonies.filter(k=>!ceremonyMap.has(k));
 const invalidCeremonies=requiredCeremonies.filter(k=>{const v=ceremonyMap.get(k);return Boolean(v&&!validateBuild423Ceremony(v,input.nowIso));});
 const missingTelemetry=BUILD_405_APPLICATION_IDS.filter(appId=>!telemetryMap.has(appId));
 const invalidTelemetry=BUILD_405_APPLICATION_IDS.filter(appId=>{const v=telemetryMap.get(appId);return Boolean(v&&!validateBuild423Telemetry(v,input.nowIso));});
 const governanceState=missingRoles.length?"HOLD_ROLE_ACCEPTANCE_REQUIRED":invalidRoles.length?"HOLD_ROLE_ACCEPTANCE_INVALID":
  missingCeremonies.length?"HOLD_WORKFLOW_CEREMONY_REQUIRED":invalidCeremonies.length?"HOLD_WORKFLOW_CEREMONY_INVALID":
  missingTelemetry.length?"HOLD_SYSOP_TELEMETRY_REQUIRED":invalidTelemetry.length?"HOLD_SYSOP_TELEMETRY_NOT_LIVE_VERIFIED":
  "OPERATOR_ACCEPTANCE_ROLE_SEPARATION_AND_PRODUCTION_CEREMONY_ASSURED";
 return {schema:BUILD_423_SCHEMA,build:BUILD_423,governanceState,missingRoles,invalidRoles,missingCeremonies,invalidCeremonies,missingTelemetry,invalidTelemetry,
  counts:{applications:7,requiredRoleAcceptance:requiredRoles.length,requiredWorkflowCeremonies:requiredCeremonies.length,requiredTelemetrySources:7,totalCheckpoints:requiredRoles.length+requiredCeremonies.length+7},
  policy:{minimumRoleAcceptancePercent:90,noSelfApproval:true,highRiskOwnerGateRequired:true,sourceOperationalAuthorityPreserved:true,telemetryReadOnly:true,
   telemetryAuthorizesAction:false,physicalRebootRequiresIndependentWitness:true,missingEvidenceMayPass:false,staleEvidenceMayPass:false,productionGreenMayPass:false}};
}
