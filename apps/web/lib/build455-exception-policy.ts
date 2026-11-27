import type {Exception} from "./build454-autonomous-recovery";

export const BUILD455_SCHEMA="rosevear.ai-data-platform.build455-durable-exception-operations.v1";
export type CaseStatus="OPEN"|"RECOVERY_VERIFIED";
export type Escalation="OWNER_REVIEW"|"WATCH_ONLY"|"NONE";
export type CaseInput=Pick<Exception,"id"|"severity"|"owner"|"state"|"detail"|"action"|"autonomous">;
export function nextDiagnosticAt(e:CaseInput,now=new Date()):string|null{
 // A due timestamp is a scheduling intention; this function never executes an action.
 // Daily CRON is authoritative and may execute after the due timestamp.
 if(!e.autonomous||e.owner!=="AI_DATA_PLATFORM")return null;
 if(e.action==="RETRY_READ_ONLY_INTAKE")return new Date(now.getTime()+15*60_000).toISOString();
 if(["PREPARE_EXISTING_GATEWAY_ONBOARDING_CONTRACT","VALIDATE_GUEST_SAFE_SITE12_EVENT_CONTRACT","PREPARE_LEAST_PRIVILEGE_EVENT_ROUTE_CONTRACT"].includes(e.action))
  return new Date(now.getTime()+24*60*60_000).toISOString();
 return null;
}
export function escalationFor(e:CaseInput):Escalation{
 return e.severity==="ACTION_REQUIRED"?"OWNER_REVIEW":"WATCH_ONLY";
}
export function recoveryTransition(previous:CaseStatus|undefined,stillPresent:boolean):CaseStatus|null{
 if(stillPresent)return "OPEN";
 // Only a previously observed OPEN exception can become RECOVERY_VERIFIED.
 return previous==="OPEN"?"RECOVERY_VERIFIED":null;
}
export function isPermittedAutomaticAction(action:string){
 return action==="RETRY_READ_ONLY_INTAKE";
}
export function boundedErrorText(error:unknown){
 // Never write credentials, raw database errors, full URLs or customer payloads to the ledger.
 return error instanceof Error?"BUILD455_INTERNAL_CHECK_FAILED":"BUILD455_CHECK_UNAVAILABLE";
}
