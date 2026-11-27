import {randomUUID} from "node:crypto";
import {withProtectedDatabase,withUserDatabase} from "./database";
import {readBuild453ProtectedIntake} from "./build453-autonomous-intake-database";
import {classifyBuild454} from "./build454-autonomous-recovery";
import {BUILD455_SCHEMA,nextDiagnosticAt,escalationFor,recoveryTransition} from "./build455-exception-policy";

type StoredCase={exception_key:string;status:"OPEN"|"RECOVERY_VERIFIED";};
export async function runBuild455ProtectedExceptionSweep(){
 let input:Awaited<ReturnType<typeof readBuild453ProtectedIntake>>;
 let diagnosticReadAttempts=1;
 try{input=await readBuild453ProtectedIntake();}
 catch{diagnosticReadAttempts=2;input=await readBuild453ProtectedIntake();}
 const observed=classifyBuild454(input);
 const now=new Date();
 const open=new Map(observed.exceptions.map(e=>[e.id,e]));
 const result=await withProtectedDatabase(async client=>{
  // Serialize the case ledger across overlapping scheduler invocations.
  await client.query("select pg_advisory_xact_lock($1)",[4552026]);
  const rows=await client.query<StoredCase>("select exception_key,status from app.master_build455_exception_cases");
  const old=new Map(rows.rows.map(r=>[r.exception_key,r.status]));
  let newlyOpen=0,recovered=0;
  for(const e of observed.exceptions){
   const next=nextDiagnosticAt(e,now);
   const prior=old.get(e.id);
   if(prior!=="OPEN")newlyOpen++;
   await client.query(`insert into app.master_build455_exception_cases
    (exception_key,severity,owner_scope,status,observed_state,action_code,detail,first_seen_at,last_seen_at,recovered_at,next_check_at,consecutive_open,escalation)
    values ($1,$2,$3,'OPEN',$4,$5,$6,$7,$7,null,$8,1,$9)
    on conflict(exception_key) do update set severity=excluded.severity,
     owner_scope=excluded.owner_scope,status='OPEN',observed_state=excluded.observed_state,
     action_code=excluded.action_code,detail=excluded.detail,
     last_seen_at=excluded.last_seen_at,recovered_at=null,next_check_at=excluded.next_check_at,
     consecutive_open=case when app.master_build455_exception_cases.status='OPEN'
      then app.master_build455_exception_cases.consecutive_open+1 else 1 end,
     escalation=excluded.escalation`,
    [e.id,e.severity,e.owner,e.state,e.action,e.detail.slice(0,1000),now,next,escalationFor(e)]);
   await client.query(`insert into app.master_build455_exception_history
    (event_id,exception_key,inspection_day,outcome,observed_state,captured_at,next_check_at,evidence_type)
    values($1,$2,($3::timestamptz at time zone 'UTC')::date,'OPEN',$4,$3,$5,'PROTECTED_MASTER_INTAKE_SNAPSHOT')
    on conflict(exception_key,inspection_day,outcome) do nothing`,
    [randomUUID(),e.id,now,e.state,next]);
  }
  for(const row of rows.rows){
   if(open.has(row.exception_key)||recoveryTransition(row.status,false)!=="RECOVERY_VERIFIED")continue;
   await client.query(`update app.master_build455_exception_cases set status='RECOVERY_VERIFIED',
    observed_state='NO_LONGER_PRESENT_IN_FRESH_MASTER_SNAPSHOT',recovered_at=$2,
    last_seen_at=$2,next_check_at=null,consecutive_open=0,escalation='NONE'
    where exception_key=$1 and status='OPEN'`,[row.exception_key,now]);
   await client.query(`insert into app.master_build455_exception_history
    (event_id,exception_key,inspection_day,outcome,observed_state,captured_at,evidence_type)
    values($1,$2,($3::timestamptz at time zone 'UTC')::date,'RECOVERY_VERIFIED',
    'NO_LONGER_PRESENT_IN_FRESH_MASTER_SNAPSHOT',$3,'PROTECTED_MASTER_INTAKE_SNAPSHOT')
    on conflict(exception_key,inspection_day,outcome) do nothing`,
    [randomUUID(),row.exception_key,now]);recovered++;
  }
  return {newlyOpen,recovered,open:open.size};
 });
 return {schema:BUILD455_SCHEMA,build:455,...result,diagnosticReadAttempts,
  evidence:"CURRENT_PROTECTED_MASTER_SNAPSHOT",
  authority:"DIAGNOSTIC_ONLY_NO_EXTERNAL_MUTATIONS",
  schedule:"EXISTING_DAILY_MASTER_CRON_WITH_DUE_TIME_CLASSIFICATION"};
}
export async function readBuild455OwnerLedger(userId:string){
 const authorized=await withUserDatabase(userId,async client=>{
  const r=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  return r.rows[0]?.role==="owner";
 });
 if(!authorized)throw new Error("build455_owner_required");
 return withUserDatabase(userId,async client=>{
  const [cases,history]=await Promise.all([
   client.query<{exception_key:string;severity:string;owner_scope:string;status:string;observed_state:string;action_code:string;first_seen_at:Date;last_seen_at:Date;recovered_at:Date|null;next_check_at:Date|null;consecutive_open:number;escalation:string}>(
    "select exception_key,severity,owner_scope,status,observed_state,action_code,first_seen_at,last_seen_at,recovered_at,next_check_at,consecutive_open,escalation from app.master_build455_exception_cases order by (status='OPEN') desc,last_seen_at desc limit 100"),
   client.query<{exception_key:string;outcome:string;observed_state:string;captured_at:Date}>(
    "select exception_key,outcome,observed_state,captured_at from app.master_build455_exception_history order by captured_at desc limit 100")
  ]);
  return {schema:BUILD455_SCHEMA,build:455,asOf:new Date().toISOString(),
   cases:cases.rows.map(r=>({...r,first_seen_at:r.first_seen_at.toISOString(),last_seen_at:r.last_seen_at.toISOString(),
    recovered_at:r.recovered_at?.toISOString()??null,next_check_at:r.next_check_at?.toISOString()??null})),
   history:history.rows.map(r=>({...r,captured_at:r.captured_at.toISOString()})),
   readOnly:true,noAutomaticPhysicalActions:true,noExternalApplicationMutations:true};
 });
}
