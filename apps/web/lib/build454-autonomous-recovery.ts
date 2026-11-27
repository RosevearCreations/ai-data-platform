import type {Build453Stage} from "./build453-autonomous-intake";

export const BUILD454_SCHEMA="rosevear.ai-data-platform.build454-owner-exceptions.v1";
export type IntakeEvidence={
 asOf:string;intakeState:string;sourceAgeMinutes:number|null;
 signedSweepAgeMinutes:number|null;originalRelayAgeMinutes:number|null;
 steps:Build453Stage[];ownPipelineHolds:number;externalSourceHolds:number;
 lastAutonomousCheck:{at:string;state:string}|null;
};
export type Exception={
 id:string;severity:"ACTION_REQUIRED"|"WATCH"|"INFORMATION";
 owner:"AI_DATA_PLATFORM"|"EXTERNAL_SOURCE"|"ORIGINAL_WINDOWS_HOST";
 state:string;detail:string;action:string;autonomous:boolean
};
export function classifyBuild454(input:IntakeEvidence,now=new Date()){
 const exceptions:Exception[]=[];
 const current=now.getTime();
 const snapshot=Date.parse(input.asOf);
 if(!Number.isFinite(snapshot)||snapshot>current+120000||current-snapshot>300000)
  exceptions.push({id:"master_readback_freshness",severity:"ACTION_REQUIRED",owner:"AI_DATA_PLATFORM",state:"READBACK_STALE",detail:"The Master intake snapshot is older than five minutes or its timestamp is invalid.",action:"RETRY_READ_ONLY_INTAKE",autonomous:true});
 const last=input.lastAutonomousCheck?.at?Date.parse(input.lastAutonomousCheck.at):NaN;
 if(!Number.isFinite(last)||last>current+120000||current-last>26*60*60*1000)
  exceptions.push({id:"daily_intake_watch",severity:"ACTION_REQUIRED",owner:"AI_DATA_PLATFORM",state:"CRON_EVIDENCE_MISSING_OR_STALE",detail:"No verified daily intake watch has been recorded within 26 hours.",action:"CHECK_SCHEDULE_AND_DATABASE_WRITE",autonomous:false});
 for(const stage of input.steps){
  if(stage.state==="READY")continue;
  const external=stage.owner!=="AI_DATA_PLATFORM";
  const id="stage_"+stage.stage.toLowerCase();
  exceptions.push({id,severity:external?"WATCH":"ACTION_REQUIRED",
   owner:stage.owner==="AI_DATA_PLATFORM"?"AI_DATA_PLATFORM":stage.owner==="ORIGINAL_WINDOWS_HOST"?"ORIGINAL_WINDOWS_HOST":"EXTERNAL_SOURCE",
   state:stage.state,detail:stage.explanation,action:stage.nextAutonomousAction,
   autonomous:stage.owner==="AI_DATA_PLATFORM"&&["PREPARE_EXISTING_GATEWAY_ONBOARDING_CONTRACT","VALIDATE_GUEST_SAFE_SITE12_EVENT_CONTRACT","PREPARE_LEAST_PRIVILEGE_EVENT_ROUTE_CONTRACT"].includes(stage.nextAutonomousAction)});
 }
 if(input.sourceAgeMinutes!==null&&input.sourceAgeMinutes>120)
  exceptions.push({id:"source_event_age",severity:"WATCH",owner:"EXTERNAL_SOURCE",state:"SOURCE_STALE",detail:"The last original source event is outside the 120-minute freshness window.",action:"WAIT_FOR_AUTHENTIC_SIGNED_SOURCE_EVENT",autonomous:false});
 if(input.signedSweepAgeMinutes===null||input.signedSweepAgeMinutes>120)
  exceptions.push({id:"signed_sweep_age",severity:"WATCH",owner:"EXTERNAL_SOURCE",state:"SIGNED_SWEEP_STALE_OR_MISSING",detail:"No recent signed source sweep evidence is available.",action:"RECHECK_APPROVED_SIGNED_SOURCE_MONITOR",autonomous:false});
 return {schema:BUILD454_SCHEMA,build:454,asOf:now.toISOString(),
  state:exceptions.some(e=>e.severity==="ACTION_REQUIRED")?"OWNER_EXCEPTION_OPEN":exceptions.length?"MONITORING_WITH_EXTERNAL_HOLDS":"NO_CURRENT_EXCEPTIONS",
  exceptions,counts:{ownerAction:exceptions.filter(e=>e.severity==="ACTION_REQUIRED").length,watch:exceptions.filter(e=>e.severity==="WATCH").length,autonomousEligible:exceptions.filter(e=>e.autonomous).length},
  recoveryPolicy:{maxAttempts:2,readOnly:true,credentialsRotated:false,physicalHostActuated:false,peerApplicationsModified:false},
  note:"Autonomous eligibility is a diagnosis, not evidence that a mutation or remote recovery has occurred."};
}
