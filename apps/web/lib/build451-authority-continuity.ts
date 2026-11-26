export const BUILD_451=451 as const;
export const BUILD_451_SCHEMA="rosevear.ai-data-platform.build451-source-authority-continuity.v1" as const;
export const BUILD_451_OBSERVATION_LIMIT_MS=2*60*60*1000;
export type Build451SourceState={appId:string;sourceState:string;reason:string;nextAction:string;
 maySelfRepair:boolean;sourceAgeMinutes:number|null;authenticatedTelemetry:boolean;independentOriginalDeviceWitness:boolean};
const remedies:Record<string,string>={
 VERIFIED_SIGNATURE_COMMIT_DRIFT:"REVIEW_DEPLOYED_MAIN_COMMIT_AND_PIN_AUTHORITY_BEFORE_APPROVED_ROTATION",
 VERIFIED_SIGNATURE_CLOCK_OR_EXPIRY:"CHECK_SOURCE_HOST_CLOCK_AND_SIGNER_EXPIRY_WITHOUT_ACCEPTING_STALE_RECEIPTS",
 VERIFIED_SIGNATURE_PRIVACY_OR_ACTION_SCOPE:"CORRECT_SOURCE_TELEMETRY_DATA_SCOPE_BEFORE_RETRY",
 VERIFIED_SIGNATURE_PROTOCOL_OR_CHALLENGE:"CORRECT_SOURCE_PROTOCOL_V12_CHALLENGE_AND_NONCE",
 NO_TRUSTED_SOURCE_PIN:"ENROLL_APPROVED_PUBLIC_SOURCE_SIGNER_PIN",
 UNTRUSTED_SIGNATURE_OR_KEY:"VERIFY_SOURCE_PUBLIC_KEY_AND_SIGNATURE_CUSTODY",
 build423_telemetry_scope_or_freshness_invalid:"RECHECK_SIGNED_SOURCE_COMMIT_CLOCK_AND_PAYLOAD_POLICY",
 original_host_relay_receipt_missing_or_stale:"RESTORE_AUTHENTIC_ORIGINAL_WINDOWS_OUTBOUND_RELAY",
 HOLD_ORIGINAL_HOST_RESTART_SIGNER_AND_HTTPS_RELAY_REQUIRED:"RESTORE_AUTHENTIC_ORIGINAL_WINDOWS_OUTBOUND_RELAY",
 HOLD_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED:"CHECK_ORIGINAL_CLOUDFLARE_SIGNER_AUTHORITY_AT_SOURCE",
 HOLD_CLOUDFLARE_PUBLIC_BRIDGE_AND_SECRET_AUTHORITY_REQUIRED:"CHECK_CLOUDFLARE_PUBLIC_SIGNER_BRIDGE_AND_SECRET_AUTHORITY",
 HOLD_V12_SIGNER_NOT_VERIFIED:"RECOVER_SOURCE_V12_SIGNER_AND_EXACT_RELEASE_PIN",
};
function safeCode(value:string):string{
 return value.replace(/[^A-Za-z0-9_]/g,"_").slice(0,120)||"MISSING_SOURCE_EVIDENCE";
}
export function build451Action(reason:string,appId:string){
 if(appId==="rosevear-ai-hub")return "RESTORE_AUTHENTIC_ORIGINAL_WINDOWS_OUTBOUND_RELAY";
 const clean=safeCode(reason);
 return remedies[clean]??(clean.startsWith("telemetry_http_")?"CHECK_SOURCE_ENDPOINT_ROUTE_AND_AUTHORITY":"REVIEW_REAL_SIGNER_FAILURE_WITH_SOURCE_OWNER");
}
export type Build451Input={
 rows:readonly {appId:string;recentlySigned:boolean;originReachable:boolean;sourceHoldReason:string;latestSourceObservedAt:string|null;independentFieldWitness:string}[];
 historyVerified:number;latestSweepAt:string|null;latestVerified:number;now?:Date;
};
export function assessBuild451(input:Build451Input){
 const now=input.now??new Date();
 const age=input.latestSweepAt?now.getTime()-Date.parse(input.latestSweepAt):NaN;
 const windowValid=Number.isFinite(age)&&age>=0&&age<=BUILD_451_OBSERVATION_LIMIT_MS;
 const rows:Build451SourceState[]=input.rows.map(r=>{
  const t=r.latestSourceObservedAt?now.getTime()-Date.parse(r.latestSourceObservedAt):NaN;
  const sourceAgeMinutes=Number.isFinite(t)&&t>=0?Math.round(t/60000):null;
  const authenticatedTelemetry=windowValid&&r.recentlySigned;
  const sourceState=authenticatedTelemetry?"VERIFIED_SIGNED_SOURCE_CURRENT":
   r.originReachable?"REACHABLE_BUT_SOURCE_SIGNER_NOT_VERIFIED":"STALE_OR_UNREACHABLE_SOURCE";
  return {appId:r.appId,sourceState,
   reason:authenticatedTelemetry?"SIGNED_V12_CHALLENGE_ADMITTED":safeCode(r.sourceHoldReason),
   nextAction:authenticatedTelemetry?"NO_REPAIR_NEEDED":build451Action(r.sourceHoldReason,r.appId),
   maySelfRepair:false,sourceAgeMinutes,authenticatedTelemetry,
   independentOriginalDeviceWitness:r.independentFieldWitness==="FRESH_INDEPENDENT_SOURCE_BOUND_PROOF"};
 });
 const current=rows.filter(r=>r.authenticatedTelemetry).length;
 const independent=rows.filter(r=>r.independentOriginalDeviceWitness).length;
 const ownerInputNeeded=rows.filter(r=>r.nextAction==="RESTORE_AUTHENTIC_ORIGINAL_WINDOWS_OUTBOUND_RELAY");
 return {schema:BUILD_451_SCHEMA,build:451,
  observationWindowMinutes:120,observedAt:input.latestSweepAt,
  denominator:7,verifiedSignedNow:current,historicallySigned:input.historyVerified,
  fieldCertified:independent,excludedUnsigned:7-current,
  currentAcceptance:current===7?"SEVEN_SOURCE_SIGNED_ACCEPTED":"PARTIAL_OR_STALE_SOURCE_AUTHORITY_HOLD",
  independentFieldAcceptance:independent===7?"SEVEN_ORIGINAL_DEVICE_WITNESSES_ACCEPTED":"INDEPENDENT_DEVICE_WITNESS_HOLD",
  ownerInputNeeded:ownerInputNeeded.map(r=>r.appId),
  rows,
  evidenceCategory:"SOURCE_SIGNED_TRANSPORT_NOT_SEPARATE_PHYSICAL_FIELD_WITNESS",
  sourceFixesPerformed:0,pinChangesPerformed:0,automatedWindowsRestarts:0,
  note:"This readback classifies real signed receipts. It never repairs secrets, rotates trusted pins or restarts an original Windows host without source-side authentication and approved custody."};
}
