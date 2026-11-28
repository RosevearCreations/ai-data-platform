import type {CaseEvidence,HistoryEvidence} from "./build456-incident-intelligence";
export const BUILD457_SCHEMA="rosevear.ai-data-platform.build457-recurrence-forecast.v1";
export type ForecastCase=CaseEvidence&{action_code:string};
export type Forecast={key:string;riskBand:"INSUFFICIENT_EVIDENCE"|"LOW"|"ELEVATED"|"HIGH";
 priority:"MONITOR"|"REVIEW"|"URGENT";reopeningCount:number;openObservations:number;
 evidenceWindowDays:number;recommendationCode:string;explanation:string;advisoryOnly:true};
function millis(v:Date|string){const n=new Date(v).getTime();return Number.isFinite(n)?n:NaN;}
function priorityRank(priority:"URGENT"|"REVIEW"|"MONITOR"):number{
 switch(priority){case "URGENT":return 0;case "REVIEW":return 1;case "MONITOR":return 2;}
}
export function forecastBuild457(cases:readonly ForecastCase[],events:readonly HistoryEvidence[],now=new Date()):Forecast[]{
 const windowDays=30,cutoff=now.getTime()-windowDays*86400_000;
 return cases.filter(c=>c.status==="OPEN").map(c=>{
  const observations=events.filter(e=>e.exception_key===c.exception_key&&Number.isFinite(millis(e.captured_at))&&
   millis(e.captured_at)>=cutoff&&millis(e.captured_at)<=now.getTime()).sort((a,b)=>millis(a.captured_at)-millis(b.captured_at));
  const opens=observations.filter(e=>e.outcome==="OPEN").length;
  let reopenings=0,sawRecovery=false;
  for(const e of observations){
   if(e.outcome==="RECOVERY_VERIFIED")sawRecovery=true;
   if(e.outcome==="OPEN"&&sawRecovery){reopenings++;sawRecovery=false;}
  }
  const age=millis(c.first_seen_at);
  const ageHrs=Number.isFinite(age)?Math.max(0,(now.getTime()-age)/3600_000):0;
  // The outcome is a transparent rule-based signal, never an ungrounded failure probability.
  const riskBand:Forecast["riskBand"]=opens===0?"INSUFFICIENT_EVIDENCE":reopenings>=2||opens>=10?"HIGH":reopenings>=1||opens>=3?"ELEVATED":"LOW";
  const priority:"URGENT"|"REVIEW"|"MONITOR"=c.escalation==="OWNER_REVIEW"&&(ageHrs>=72||riskBand==="HIGH")?"URGENT":
   c.escalation==="OWNER_REVIEW"||riskBand==="ELEVATED"?"REVIEW":"MONITOR";
  const recommendationCode=c.owner_scope!=="AI_DATA_PLATFORM"?"REQUEST_ORIGINAL_SOURCE_EVIDENCE":
   c.action_code==="RETRY_READ_ONLY_INTAKE"?"RECHECK_PROTECTED_MASTER_READBACK":
   "REVIEW_MASTER_INTAKE_CONFIGURATION";
  const forecast:Forecast={key:c.exception_key,riskBand,priority,reopeningCount:reopenings,openObservations:opens,
   evidenceWindowDays:windowDays,recommendationCode,
   explanation:"Assessment uses recorded OPEN/RECOVERY_VERIFIED history and owner aging, not a statistical recurrence probability.",
   advisoryOnly:true};
  return forecast;
 }).sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority)||a.key.localeCompare(b.key));
}
