export const BUILD456_SCHEMA="rosevear.ai-data-platform.build456-incident-intelligence.v1";
export type CaseEvidence={
 exception_key:string;owner_scope:string;status:string;escalation:string;
 first_seen_at:Date|string;last_seen_at:Date|string;recovered_at:Date|string|null;
 consecutive_open:number;
};
export type HistoryEvidence={exception_key:string;outcome:string;captured_at:Date|string};
function at(value:Date|string|null):number|null{
 if(value===null)return null;
 const t=new Date(value).getTime();
 return Number.isFinite(t)?t:null;
}
export function assessBuild456(cases:readonly CaseEvidence[],events:readonly HistoryEvidence[],now=new Date()){
 const time=now.getTime();
 const open=cases.filter(c=>c.status==="OPEN");
 const recovered=cases.filter(c=>c.status==="RECOVERY_VERIFIED"&&at(c.recovered_at)!==null);
 const owner=open.filter(c=>c.escalation==="OWNER_REVIEW");
 const aged=owner.filter(c=>{const t=at(c.first_seen_at);return t!==null&&time-t>=24*60*60_000;});
 const critical=owner.filter(c=>{const t=at(c.first_seen_at);return t!==null&&time-t>=72*60*60_000;});
 const unique=new Set(open.map(c=>c.exception_key));
 const duplicateObservations=events.filter(e=>e.outcome==="OPEN").length-
  new Set(events.filter(e=>e.outcome==="OPEN").map(e=>e.exception_key)).size;
 const observedRecoveryCandidates=new Set(events.filter(e=>e.outcome==="OPEN").map(e=>e.exception_key)).size;
 const verifiedRecoveryEvents=new Set(events.filter(e=>e.outcome==="RECOVERY_VERIFIED").map(e=>e.exception_key)).size;
 // Measured outcome of observed incidents, never presented as success of an unrecorded retry.
 const effectiveness=observedRecoveryCandidates>0?
  Math.round(1000*verifiedRecoveryEvents/observedRecoveryCandidates)/10:null;
 const ownerAge=owner.map(c=>({
  key:c.exception_key,
  ageHours:at(c.first_seen_at)===null?null:Math.max(0,Math.floor((time-(at(c.first_seen_at)??time))/3600000)),
  priority:critical.includes(c)?"CRITICAL":aged.includes(c)?"AGED":"NORMAL"
 }));
 return {schema:BUILD456_SCHEMA,build:456,asOf:now.toISOString(),
  uniqueOpenIncidents:unique.size,repeatedObservations:Math.max(0,duplicateObservations),
  ownerEscalations:owner.length,agedEscalations:aged.length,criticalEscalations:critical.length,
  verifiedRecoveries:recovered.length,recoveryEffectivenessPercent:effectiveness,
  scoreBasis:"UNIQUE_RECORDED_INCIDENTS_WITH_VERIFIED_RECOVERY_EVENTS_NOT_ATTEMPT_SUCCESS",
  ownerAge,sourceCaseCount:cases.length,
  control:"READ_ONLY_DIAGNOSTIC_NO_AUTOMATIC_EXTERNAL_REPAIR"};
}
