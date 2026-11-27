export const BUILD_453=453 as const;
export const BUILD_453_SCHEMA="rosevear.ai-data-platform.build453-autonomous-intake-readiness.v1" as const;
export type Build453Summary={
 sourceEndpointCount:number;site12AllowedEndpointCount:number;validSecretBindingCount:number;
 activeSubscriptions:number;webhookReceipts:number;site12EventReceipts:number;
 lastSite12ReceiptAt:string|null;eventPublications:number;eventRoutes:number;
 lastSignedSweepAt:string|null;lastWindowsRelayAt:string|null
};
type StageOwner="AI_DATA_PLATFORM"|"ICAMP_SOURCE"|"ORIGINAL_WINDOWS_HOST";
export type Build453Stage={stage:string;owner:StageOwner;state:"READY"|"HOLD"|"PENDING_SOURCE";explanation:string;nextAutonomousAction:string};
function ageMinutes(value:string|null,now:Date):number|null{
 if(!value)return null;const n=Date.parse(value);
 if(!Number.isFinite(n)||n>now.getTime()+120000)return null;
 return Math.max(0,Math.floor((now.getTime()-n)/60000));
}
export function assessBuild453(summary:Build453Summary,now=new Date()){
 const endpointReady=summary.sourceEndpointCount>0;
 const contractReady=summary.site12AllowedEndpointCount>0;
 const secretReady=contractReady&&summary.validSecretBindingCount>0;
 const routesReady=summary.activeSubscriptions>0;
 const receiptsReady=summary.site12EventReceipts>0;
 const receiptAgeMinutes=ageMinutes(summary.lastSite12ReceiptAt,now);
 const sweepAgeMinutes=ageMinutes(summary.lastSignedSweepAt,now);
 const relayAgeMinutes=ageMinutes(summary.lastWindowsRelayAt,now);
 const steps:Build453Stage[]=[
  {stage:"SIGNED_WEBHOOK_ENDPOINT",owner:"AI_DATA_PLATFORM",state:endpointReady?"READY":"HOLD",
   explanation:endpointReady?"An enabled production iCamp endpoint exists.":"No enabled production iCamp intake endpoint is registered in this Master.",
   nextAutonomousAction:endpointReady?"KEEP_EXISTING_ENDPOINT_NO_KEY_ROTATION":"PREPARE_EXISTING_GATEWAY_ONBOARDING_CONTRACT"},
  {stage:"SITE12_EVENT_ALLOWLIST",owner:"AI_DATA_PLATFORM",state:contractReady?"READY":"HOLD",
   explanation:contractReady?"An enabled source endpoint allows Site12 maintenance and folio events.":"No enabled source endpoint permits the required Site12 maintenance-to-folio event pair.",
   nextAutonomousAction:contractReady?"RETAIN_CURRENT_ALLOWLIST":"VALIDATE_GUEST_SAFE_SITE12_EVENT_CONTRACT"},
  {stage:"HMAC_SOURCE_BINDING",owner:"AI_DATA_PLATFORM",state:secretReady?"READY":"HOLD",
   explanation:secretReady?"At least one allowed endpoint has a valid configured signing secret.":"A source-bound HMAC secret is not ready or there is no valid allowed endpoint.",
   nextAutonomousAction:secretReady?"MAINTAIN_APPROVED_SECRET_CUSTODY":"HOLD_UNTIL_ORIGINAL_SOURCE_KEY_IS_PROVISIONED"},
  {stage:"EVENT_BUS_SUBSCRIPTION",owner:"AI_DATA_PLATFORM",state:routesReady?"READY":"HOLD",
   explanation:routesReady?"An active production iCamp subscription is present.":"No active production event-bus subscription is registered for the iCamp source.",
   nextAutonomousAction:routesReady?"RETAIN_AUTHORIZED_ROUTE":"PREPARE_LEAST_PRIVILEGE_EVENT_ROUTE_CONTRACT"},
  {stage:"REAL_SITE12_SOURCE_EVENTS",owner:"ICAMP_SOURCE",state:receiptsReady?"READY":"PENDING_SOURCE",
   explanation:receiptsReady?"A real authenticated Site12 source receipt exists.":"No real iCamp Site12 business event has arrived. This does not block other Master work.",
   nextAutonomousAction:receiptsReady?"RECONCILE_SOURCE_EVENT_CHAIN":"RECHECK_AFTER_NEXT_ORIGINAL_SOURCE_EVENT"},
  {stage:"ORIGINAL_HUB_RELAY_FRESHNESS",owner:"ORIGINAL_WINDOWS_HOST",state:relayAgeMinutes!==null&&relayAgeMinutes<=5?"READY":"PENDING_SOURCE",
   explanation:relayAgeMinutes===null?"No dated original-host receipt is available.":relayAgeMinutes<=5?"Recent authentic original-host receipt is present.":"The last authentic Windows relay receipt has expired from the five-minute field window.",
   nextAutonomousAction:"MONITOR_SIGNED_RELAY_WITHOUT_DEVICE_IMPERSONATION"}
 ];
 const masterHolds=steps.filter(x=>x.owner==="AI_DATA_PLATFORM"&&x.state==="HOLD").length;
 const sourceHolds=steps.filter(x=>x.owner!=="AI_DATA_PLATFORM"&&x.state!=="READY").length;
 const sourceStale=receiptsReady&&(receiptAgeMinutes===null||receiptAgeMinutes>120);
 return {schema:BUILD_453_SCHEMA,build:453,asOf:now.toISOString(),denominator:steps.length,
  sourceReceiptWindowMinutes:120,
  intakeState:!endpointReady?"MASTER_INTAKE_ENDPOINT_NOT_PROVISIONED":
   !contractReady?"MASTER_SITE12_ALLOWLIST_INCOMPLETE":
   !secretReady?"MASTER_HMAC_SIGNER_BINDING_MISSING":
   !routesReady?"MASTER_EVENT_BUS_ROUTE_INACTIVE":
   !receiptsReady?"MASTER_READY_WAITING_FOR_ICAMP_SOURCE_EVENTS":
   sourceStale?"SOURCE_EVENTS_STALE":
   "SOURCE_EVENT_INTAKE_OBSERVED",
  realSite12Trace:!receiptsReady?"HOLD_NO_ORIGINAL_SOURCE_EVENT":"SOURCE_REPORTED_UNRECONCILED",
  sourceAgeMinutes:receiptAgeMinutes,signedSweepAgeMinutes:sweepAgeMinutes,originalRelayAgeMinutes:relayAgeMinutes,
  counts:{endpoints:summary.sourceEndpointCount,site12AllowedEndpoints:summary.site12AllowedEndpointCount,
   validHmacBindings:summary.validSecretBindingCount,activeEventSubscriptions:summary.activeSubscriptions,
   icampSourceReceipts:summary.webhookReceipts,site12SourceReceipts:summary.site12EventReceipts,
   masterEventPublications:summary.eventPublications,eventBusRoutes:summary.eventRoutes},
  ownPipelineHolds:masterHolds,externalSourceHolds:sourceHolds,
  steps,independentReleaseAllowed:true,noSourceAppDeploymentAttempted:true,noRawGuestData:true,
  noAutomaticCredentialCreation:true,noSyntheticEvents:true,noBusinessFundsMoved:true,
  note:"Snapshot and live readback diagnose Master-owned intake without modifying any peer application. Source-side readiness does not block this Master's release."};
}
