import {
  BUILD_405_APPLICATION_IDS,
  BUILD_405_COMMUNICATION_RELATIONSHIPS
} from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_417=417 as const;
export const BUILD_417_SCHEMA=
  "rosevear.ai-data-platform.build417-communications-delivery-sla.v1" as const;
export const BUILD_417_AUTHORITY="rosevear-comms-hub" as const;
export const BUILD_417_ACK_SLA_SECONDS=120 as const;
export const BUILD_417_QUEUE_TO_DELIVERY_SLA_SECONDS=300 as const;
export const BUILD_417_DEAD_LETTER_RECOVERY_HOURS=24 as const;
export const BUILD_417_MAX_REPLAY_ATTEMPTS=3 as const;

export type Build417ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build417DeliveryState="ACKNOWLEDGED"|"DEAD_LETTER"|"HOLD"|"FAILED";
export type Build417ReplayOutcome="NOT_REQUIRED"|"RECOVERED"|"HELD"|"FAILED";

export type Build417DeliveryReceipt={
  receiptId:string;
  leftAppId:Build417ApplicationId;
  rightAppId:Build417ApplicationId;
  messageId:string;
  correlationId:string;
  queuedAt:string;
  deliveredAt:string|null;
  acknowledgedAt:string|null;
  deliveryState:Build417DeliveryState;
  duplicateCount:number;
  duplicateSuppressed:boolean;
  replayAttemptCount:number;
  replayOutcome:Build417ReplayOutcome;
  deadLetterId:string|null;
  transportAuthenticated:boolean;
  sourceIdentityVerified:boolean;
  targetAudienceVerified:boolean;
  tenantBoundaryVerified:boolean;
  replayProtectionVerified:boolean;
  authorityHolder:typeof BUILD_417_AUTHORITY;
  authorityPreserved:boolean;
  directPeerDatabaseWrite:boolean;
  evidenceDigest:string;
  observedAt:string;
  expiresAt:string;
  independentlyVerified:boolean;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

export type Build417DeadLetterRecoveryReceipt={
  receiptId:string;
  deadLetterId:string;
  leftAppId:Build417ApplicationId;
  rightAppId:Build417ApplicationId;
  failureDigest:string;
  enteredAt:string;
  replayRequestedAt:string|null;
  recoveredAt:string|null;
  replayNumber:number;
  disposition:"RECOVERED"|"OPEN"|"FAILED";
  duplicateSuppressionPreserved:boolean;
  originalMessageIdentityPreserved:boolean;
  authorityPreserved:boolean;
  ownerReviewed:boolean;
  independentlyVerified:boolean;
  evidenceDigest:string;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

const canonicalRelationships=new Set(
  BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([left,right])=>relationshipKey(left,right))
);

function relationshipKey(left:string,right:string){
  return [left,right].sort().join("::");
}
function digest(value:string){return /^sha256:[a-f0-9]{64}$/.test(value);}
function finiteDate(value:string){return Number.isFinite(Date.parse(value));}
function fresh(value:string,now:number){
  return finiteDate(value)&&Date.parse(value)>now;
}
function nonNegativeInteger(value:number){
  return Number.isInteger(value)&&value>=0;
}

export function deliveryLatency417(item:Build417DeliveryReceipt){
  const queued=Date.parse(item.queuedAt);
  const delivered=item.deliveredAt?Date.parse(item.deliveredAt):NaN;
  const acknowledged=item.acknowledgedAt?Date.parse(item.acknowledgedAt):NaN;
  return {
    queueToDeliverySeconds:
      Number.isFinite(queued)&&Number.isFinite(delivered)&&delivered>=queued
        ? Math.round((delivered-queued)/1000):null,
    ackLatencySeconds:
      Number.isFinite(delivered)&&Number.isFinite(acknowledged)&&acknowledged>=delivered
        ? Math.round((acknowledged-delivered)/1000):null
  };
}

export function validateBuild417DeliveryReceipt(item:Build417DeliveryReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  const latency=deliveryLatency417(item);
  const relationshipValid=canonicalRelationships.has(relationshipKey(item.leftAppId,item.rightAppId));
  const chronological=
    finiteDate(item.queuedAt)&&
    (!item.deliveredAt||Date.parse(item.deliveredAt)>=Date.parse(item.queuedAt))&&
    (!item.acknowledgedAt||Boolean(item.deliveredAt)&&Date.parse(item.acknowledgedAt)>=Date.parse(item.deliveredAt!));
  const replayQuality=
    nonNegativeInteger(item.replayAttemptCount)&&
    item.replayAttemptCount<=BUILD_417_MAX_REPLAY_ATTEMPTS&&
    (item.replayAttemptCount===0
      ? item.replayOutcome==="NOT_REQUIRED"||item.replayOutcome==="HELD"
      : item.replayOutcome!=="NOT_REQUIRED");
  const duplicateQuality=
    nonNegativeInteger(item.duplicateCount)&&
    (item.duplicateCount===0||item.duplicateSuppressed);
  const stateShape=
    item.deliveryState==="ACKNOWLEDGED"
      ? Boolean(item.deliveredAt&&item.acknowledgedAt&&latency.ackLatencySeconds!==null)
      : item.deliveryState==="DEAD_LETTER"
        ? Boolean(item.deadLetterId)
        : true;

  return Boolean(
    relationshipValid&&
    item.leftAppId!==item.rightAppId&&
    item.messageId.length>=12&&
    item.correlationId.length>=12&&
    chronological&&
    replayQuality&&
    duplicateQuality&&
    stateShape&&
    item.transportAuthenticated&&
    item.sourceIdentityVerified&&
    item.targetAudienceVerified&&
    item.tenantBoundaryVerified&&
    item.replayProtectionVerified&&
    item.authorityHolder===BUILD_417_AUTHORITY&&
    item.authorityPreserved&&
    item.directPeerDatabaseWrite===false&&
    digest(item.evidenceDigest)&&
    fresh(item.expiresAt,now)&&
    item.independentlyVerified&&
    item.state==="VERIFIED"
  );
}

export function validateBuild417DeadLetterRecovery(
  item:Build417DeadLetterRecoveryReceipt,
  nowIso:string
){
  const now=Date.parse(nowIso);
  const entered=Date.parse(item.enteredAt);
  const recovered=item.recoveredAt?Date.parse(item.recoveredAt):NaN;
  const recoveryHours=Number.isFinite(recovered)&&Number.isFinite(entered)
    ? (recovered-entered)/3_600_000:null;
  return Boolean(
    canonicalRelationships.has(relationshipKey(item.leftAppId,item.rightAppId))&&
    item.deadLetterId.length>=12&&
    digest(item.failureDigest)&&
    nonNegativeInteger(item.replayNumber)&&
    item.replayNumber<=BUILD_417_MAX_REPLAY_ATTEMPTS&&
    item.duplicateSuppressionPreserved&&
    item.originalMessageIdentityPreserved&&
    item.authorityPreserved&&
    item.ownerReviewed&&
    item.independentlyVerified&&
    digest(item.evidenceDigest)&&
    fresh(item.expiresAt,now)&&
    item.state==="VERIFIED"&&
    (item.disposition!=="RECOVERED"||
      (recoveryHours!==null&&recoveryHours>=0&&recoveryHours<=BUILD_417_DEAD_LETTER_RECOVERY_HOURS))
  );
}

export function evaluateBuild417CommunicationsOperations(input:{
  build416SoftwareReleasePresent:boolean;
  deliveryReceipts?:readonly Build417DeliveryReceipt[];
  deadLetterRecoveries?:readonly Build417DeadLetterRecoveryReceipt[];
  nowIso:string;
}){
  const latest=new Map<string,Build417DeliveryReceipt>();
  for(const item of [...(input.deliveryReceipts??[])].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){
    const key=relationshipKey(item.leftAppId,item.rightAppId);
    if(!latest.has(key))latest.set(key,item);
  }

  const missingRelationships=BUILD_405_COMMUNICATION_RELATIONSHIPS
    .map(([left,right])=>relationshipKey(left,right))
    .filter(key=>!latest.has(key));
  const invalidRelationships=[...latest.entries()]
    .filter(([,item])=>!validateBuild417DeliveryReceipt(item,input.nowIso))
    .map(([key])=>key);

  const ackSlaBreaches=[...latest.entries()].flatMap(([key,item])=>{
    const latency=deliveryLatency417(item).ackLatencySeconds;
    return item.deliveryState==="ACKNOWLEDGED"&&latency!==null&&latency>BUILD_417_ACK_SLA_SECONDS
      ? [{relationship:key,ackLatencySeconds:latency}]:[];
  });
  const deliverySlaBreaches=[...latest.entries()].flatMap(([key,item])=>{
    const latency=deliveryLatency417(item).queueToDeliverySeconds;
    return latency!==null&&latency>BUILD_417_QUEUE_TO_DELIVERY_SLA_SECONDS
      ? [{relationship:key,queueToDeliverySeconds:latency}]:[];
  });
  const unresolvedDeadLetters=[...latest.entries()]
    .filter(([,item])=>item.deliveryState==="DEAD_LETTER"&&item.replayOutcome!=="RECOVERED")
    .map(([key,item])=>({relationship:key,deadLetterId:item.deadLetterId}));

  const recoveryByDeadLetter=new Map<string,Build417DeadLetterRecoveryReceipt>();
  for(const item of [...(input.deadLetterRecoveries??[])].sort((a,b)=>b.observedAt.localeCompare(a.observedAt))){
    if(!recoveryByDeadLetter.has(item.deadLetterId))recoveryByDeadLetter.set(item.deadLetterId,item);
  }
  const invalidRecoveries=[...recoveryByDeadLetter.values()]
    .filter(item=>!validateBuild417DeadLetterRecovery(item,input.nowIso))
    .map(item=>item.deadLetterId);

  const duplicateSuppressions=[...latest.values()].reduce(
    (sum,item)=>sum+(item.duplicateCount>0&&item.duplicateSuppressed?item.duplicateCount:0),0
  );
  const acknowledged=[...latest.values()].filter(item=>item.deliveryState==="ACKNOWLEDGED");
  const ackLatencies=acknowledged
    .map(item=>deliveryLatency417(item).ackLatencySeconds)
    .filter((value):value is number=>value!==null);
  const averageAckLatencySeconds=ackLatencies.length
    ? Math.round(ackLatencies.reduce((a,b)=>a+b,0)/ackLatencies.length):null;

  const governanceState=
    !input.build416SoftwareReleasePresent
      ? ("HOLD_BUILD416_SOFTWARE_RELEASE_REQUIRED" as const)
      : missingRelationships.length
        ? ("HOLD_COMMUNICATIONS_DELIVERY_EVIDENCE_REQUIRED" as const)
        : invalidRelationships.length
          ? ("HOLD_COMMUNICATIONS_DELIVERY_EVIDENCE_INVALID" as const)
          : ackSlaBreaches.length||deliverySlaBreaches.length
            ? ("HOLD_COMMUNICATIONS_DELIVERY_SLA_BREACH" as const)
            : unresolvedDeadLetters.length
              ? ("HOLD_DEAD_LETTER_RECOVERY_REQUIRED" as const)
              : invalidRecoveries.length
                ? ("HOLD_REPLAY_OR_RECOVERY_QUALITY_INVALID" as const)
                : ("COMMUNICATIONS_DELIVERY_SLA_AND_RECOVERY_ASSURED" as const);

  return {
    schema:BUILD_417_SCHEMA,
    build:BUILD_417,
    governanceState,
    missingRelationships,
    invalidRelationships,
    ackSlaBreaches,
    deliverySlaBreaches,
    unresolvedDeadLetters,
    invalidRecoveries,
    counts:{
      relationships:BUILD_405_COMMUNICATION_RELATIONSHIPS.length,
      relationshipReceipts:latest.size,
      acknowledged:acknowledged.length,
      deadLetters:[...latest.values()].filter(item=>item.deliveryState==="DEAD_LETTER").length,
      recoveredDeadLetters:[...recoveryByDeadLetter.values()].filter(item=>item.disposition==="RECOVERED").length,
      duplicateSuppressions
    },
    metrics:{averageAckLatencySeconds},
    policy:{
      authorityHolder:BUILD_417_AUTHORITY,
      ackSlaSeconds:BUILD_417_ACK_SLA_SECONDS,
      queueToDeliverySlaSeconds:BUILD_417_QUEUE_TO_DELIVERY_SLA_SECONDS,
      deadLetterRecoveryHours:BUILD_417_DEAD_LETTER_RECOVERY_HOURS,
      maxReplayAttempts:BUILD_417_MAX_REPLAY_ATTEMPTS,
      duplicateSuppressionRequired:true,
      automaticReplayAuthorized:false,
      directPeerDatabaseWriteAllowed:false,
      cloudGreenImpliesLiveDelivery:false,
      missingEvidenceMayPass:false,
      lockstepReleaseRequired:false
    },
    relationships:[...latest.entries()].map(([relationship,item])=>({
      relationship,
      state:item.deliveryState,
      ...deliveryLatency417(item),
      duplicateCount:item.duplicateCount,
      replayAttemptCount:item.replayAttemptCount,
      replayOutcome:item.replayOutcome,
      deadLetterId:item.deadLetterId,
      observedAt:item.observedAt,
      expiresAt:item.expiresAt
    }))
  };
}
