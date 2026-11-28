import {withProtectedDatabase,withUserDatabase} from "./database";
import type {HistoryEvidence} from "./build456-incident-intelligence";
import {forecastBuild457,BUILD457_SCHEMA,type ForecastCase} from "./build457-recurrence-policy";
const casesSql="select exception_key,owner_scope,status,escalation,first_seen_at,last_seen_at,recovered_at,consecutive_open,action_code from app.master_build455_exception_cases where status='OPEN' order by last_seen_at desc limit 1000";
const eventsSql="select exception_key,outcome,captured_at from app.master_build455_exception_history where captured_at >= now()-interval '30 days' order by captured_at desc limit 3000";
export async function runBuild457ProtectedRecurrenceSweep(){
 return withProtectedDatabase(async client=>{
  const cases=await client.query<ForecastCase>(casesSql);
  const history=await client.query<HistoryEvidence>(eventsSql);
  const forecast=forecastBuild457(cases.rows,history.rows);
  for(const f of forecast){
   await client.query(`insert into app.master_build457_recurrence_forecasts(
    inspection_day,exception_key,risk_band,priority,reopening_count,open_observations,
    evidence_window_days,recommendation_code)
    values((now() at time zone 'UTC')::date,$1,$2,$3,$4,$5,$6,$7)
    on conflict(inspection_day,exception_key) do nothing`,
    [f.key,f.riskBand,f.priority,f.reopeningCount,f.openObservations,f.evidenceWindowDays,f.recommendationCode]);
  }
  return {schema:BUILD457_SCHEMA,build:457,openForecasts:forecast.length,
   urgent:forecast.filter(f=>f.priority==="URGENT").length,executedRepairs:0};
 });
}
export async function readBuild457OwnerForecast(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  if(role.rows[0]?.role!=="owner")throw new Error("build457_owner_required");
  const [cases,history,snapshots]=await Promise.all([
   client.query<ForecastCase>(casesSql),client.query<HistoryEvidence>(eventsSql),
   client.query<{inspection_day:Date;exception_key:string;risk_band:string;priority:string;reopening_count:number;open_observations:number;recommendation_code:string;captured_at:Date}>(
    "select inspection_day,exception_key,risk_band,priority,reopening_count,open_observations,recommendation_code,captured_at from app.master_build457_recurrence_forecasts order by captured_at desc limit 100")
  ]);
  return {schema:BUILD457_SCHEMA,build:457,asOf:new Date().toISOString(),
   forecast:forecastBuild457(cases.rows,history.rows),recentSnapshots:snapshots.rows.map(s=>({
    ...s,inspection_day:String(s.inspection_day),captured_at:s.captured_at.toISOString()})),
   observationRowsExamined:history.rows.length,assessmentType:"TRANSPARENT_HEURISTIC_NOT_STATISTICAL_FORECAST",
   noAutomaticRepair:true,ownerOnly:true};
 });
}
