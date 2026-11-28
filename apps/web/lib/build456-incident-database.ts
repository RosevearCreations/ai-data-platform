import {withProtectedDatabase,withUserDatabase} from "./database";
import {assessBuild456,BUILD456_SCHEMA,type CaseEvidence,type HistoryEvidence} from "./build456-incident-intelligence";

const caseSql="select exception_key,owner_scope,status,escalation,first_seen_at,last_seen_at,recovered_at,consecutive_open from app.master_build455_exception_cases order by last_seen_at desc limit 1000";
const historySql="select exception_key,outcome,captured_at from app.master_build455_exception_history order by captured_at desc limit 2000";
export async function runBuild456ProtectedIntelligenceSweep(){
 return withProtectedDatabase(async client=>{
  const [cases,history]=await Promise.all([
   client.query<CaseEvidence>(caseSql),client.query<HistoryEvidence>(historySql)
  ]);
  const report=assessBuild456(cases.rows,history.rows);
  await client.query(`insert into app.master_build456_incident_intelligence(
   inspection_day,unique_open_incidents,repeated_observations,owner_escalations,
   aged_escalations,verified_recoveries,recovery_effectiveness_percent,source_case_count,evidence)
   values((now() at time zone 'UTC')::date,$1,$2,$3,$4,$5,$6,$7,$8::jsonb)
   on conflict(inspection_day) do nothing`,
   [report.uniqueOpenIncidents,report.repeatedObservations,report.ownerEscalations,
    report.agedEscalations,report.verifiedRecoveries,report.recoveryEffectivenessPercent,
    report.sourceCaseCount,JSON.stringify({schema:BUILD456_SCHEMA,scoreBasis:report.scoreBasis,
     criticalEscalations:report.criticalEscalations})]);
  return {build:456,uniqueOpenIncidents:report.uniqueOpenIncidents,
   ownerEscalations:report.ownerEscalations,verifiedRecoveries:report.verifiedRecoveries};
 });
}
export async function readBuild456OwnerIntelligence(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  if(role.rows[0]?.role!=="owner")throw new Error("build456_owner_required");
  const [cases,history,daily]=await Promise.all([
   client.query<CaseEvidence>(caseSql),client.query<HistoryEvidence>(historySql),
   client.query<{inspection_day:Date;captured_at:Date;unique_open_incidents:number;owner_escalations:number;verified_recoveries:number;recovery_effectiveness_percent:string|null}>(
    "select inspection_day,captured_at,unique_open_incidents,owner_escalations,verified_recoveries,recovery_effectiveness_percent from app.master_build456_incident_intelligence order by inspection_day desc limit 30")
  ]);
  return {...assessBuild456(cases.rows,history.rows),
   historyWindowIsBounded:true,historyRowsExamined:history.rows.length,
   dailySnapshots:daily.rows.map(x=>({day:String(x.inspection_day),capturedAt:x.captured_at.toISOString(),
    open:x.unique_open_incidents,escalations:x.owner_escalations,recovered:x.verified_recoveries,
    effectivenessPercent:x.recovery_effectiveness_percent===null?null:Number(x.recovery_effectiveness_percent)})),
   noAutomaticPeerOrDeviceActions:true};
 });
}
