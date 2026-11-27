export const BUILD_452=452 as const;
export const BUILD_452_SCHEMA="rosevear.ai-data-platform.build452-site12-event-trace.v1" as const;
export const BUILD_452_TYPES=[
 "camp.site.maintenance.requested","camp.site.maintenance.acknowledged","camp.site.maintenance.resolved",
 "camp.site.addon.requested","camp.site.addon.approved","camp.site.addon.delivered",
 "camp.site.payment.captured","camp.site.folio.posted"
] as const;
export type Build452EventType=typeof BUILD_452_TYPES[number];
export type Build452Event={
 product:"icamp";tenantId:string;eventId:string;eventType:Build452EventType;siteNumber:string;
 objectId:string;operationId:string;occurredAt:string;observedAt:string;version:number;
 purpose:"OPERATIONS_SUMMARY";sourceReceiptId:string;folioReference:string|null
};
const stageNames=["maintenance.requested","maintenance.acknowledged","maintenance.resolved",
 "addon.requested","addon.approved","addon.delivered","payment.captured","folio.posted"] as const;
const typeStage=new Map<string,string>(BUILD_452_TYPES.map((t,i)=>[t,stageNames[i]]));
const validTime=(x:string)=>Number.isFinite(Date.parse(x));
export function build452Site12Trace(input:readonly Build452Event[],options:{now?:Date;sourceAgeMinutes?:number}={}){
 const now=options.now??new Date(),maxAgeMs=(options.sourceAgeMinutes??120)*60000;
 let excluded=0,duplicates=0,conflicts=0,outOfOrder=0;
 const valid:Build452Event[]=[],seen=new Map<string,string>();
 for(const e of input){
  if(e.product!=="icamp"||!e.tenantId||!e.eventId||!e.objectId||!e.operationId||
   e.siteNumber!=="12"||!typeStage.has(e.eventType)||e.purpose!=="OPERATIONS_SUMMARY"||
   !Number.isSafeInteger(e.version)||e.version<1||!validTime(e.occurredAt)||!validTime(e.observedAt)||
   Date.parse(e.occurredAt)>now.getTime()+120000||Date.parse(e.observedAt)>now.getTime()+120000||
   !e.sourceReceiptId){excluded++;continue;}
  const key=e.tenantId+"|"+e.eventId,identity=[e.eventType,e.objectId,e.operationId,e.version,e.occurredAt,e.folioReference].join("|");
  if(seen.has(key)){if(seen.get(key)===identity)duplicates++;else conflicts++;continue;}
  seen.set(key,identity);valid.push(e);
 }
 const groups=new Map<string,Build452Event[]>();
 for(const e of valid){const k=e.tenantId+"|"+e.objectId+"|"+e.operationId;groups.set(k,[...(groups.get(k)??[]),e]);}
 const journeys=[...groups].map(([id,events])=>{
  // Sort by producer event time then version; a late-arriving older resolution must not replace newer case state.
  const chronological=[...events].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||a.version-b.version||a.eventId.localeCompare(b.eventId));
  const latestByStage=new Map<string,Build452Event>(),highestByStage=new Map<string,number>();
  for(const e of chronological){
   const stage=typeStage.get(e.eventType)!;
   const old=highestByStage.get(stage)??0;
   if(e.version<old){outOfOrder++;continue;}
   highestByStage.set(stage,e.version);latestByStage.set(stage,e);
  }
  const has=(s:string)=>latestByStage.has(s);
  const maintenance=chronological.some(e=>e.eventType.startsWith("camp.site.maintenance."));
  const addon=chronological.some(e=>e.eventType.startsWith("camp.site.addon.")||e.eventType.startsWith("camp.site.payment.")||e.eventType.startsWith("camp.site.folio."));
  const required:string[]=[];
  if(maintenance)required.push("maintenance.requested","maintenance.acknowledged");
  if(addon)required.push("addon.requested","addon.approved","addon.delivered","payment.captured","folio.posted");
  const missing=required.filter(s=>!has(s));
  const folio=latestByStage.get("folio.posted")?.folioReference??null;
  const postedWithReference=has("folio.posted")&&!!folio;
  if(addon&&!postedWithReference&&!missing.includes("folio.reference"))missing.push("folio.reference");
  const newest=chronological.reduce((n,e)=>Math.max(n,Date.parse(e.observedAt)),0);
  const ageMinutes=Math.max(0,Math.floor((now.getTime()-newest)/60000));
  const stale=ageMinutes*60000>maxAgeMs;
  return {journeyKey:id,tenantId:chronological[0].tenantId,objectId:chronological[0].objectId,
   operationId:chronological[0].operationId,siteNumber:"12",firstEventAt:chronological[0].occurredAt,
   newestObservedAt:new Date(newest).toISOString(),sourceAgeMinutes:ageMinutes,stale,
   stages:[...latestByStage.keys()].sort(),missingStages:missing,
   maintenanceState:!maintenance?"NO_REPAIR_EVENTS":has("maintenance.resolved")?"REPORTED_RESOLVED":has("maintenance.acknowledged")?"ACKNOWLEDGED":"AWAITING_ACK",
   addonState:!addon?"NO_ADDON_EVENTS":missing.length===0?"REPORTED_POSTED_AND_CAPTURED":"PARTIAL_OR_UNRECONCILED",
   folioReference:folio,financialResult:addon&&missing.length===0?"SOURCE_REPORTS_FOLIO_AND_PAYMENT":"NOT_RECONCILED",
   margin:"UNAVAILABLE_WITHOUT_SOURCE_COSTS",sourceEvidenceCount:chronological.length};
 });
 const staleCount=journeys.filter(x=>x.stale).length,partial=journeys.filter(x=>x.missingStages.length>0).length;
 return {schema:BUILD_452_SCHEMA,build:452,site:"12",source:"icamp",windowMinutes:options.sourceAgeMinutes??120,
  rawEventCount:input.length,acceptedUniqueEventCount:valid.length,duplicatesSuppressed:duplicates,
  conflictingEventIds:conflicts,outOfOrderIgnored:outOfOrder,excludedEvents:excluded,
  journeyCount:journeys.length,partialJourneyCount:partial,staleJourneyCount:staleCount,
  observationStatus:journeys.length===0?"NO_REAL_SITE12_EVENTS_OBSERVED":partial||staleCount?"PARTIAL_OR_STALE_SOURCE_EVIDENCE":"REPORTED_STAGES_PRESENT",
  productionAcceptance:"HOLD_UNTIL_ORIGINAL_ICAMP_STAFF_GUEST_AND_FOLIO_READBACK",
  businessBooksRemainWith:"icamp",moneyPostedByMaster:false,sourceFinancialsVerifiedByMaster:false,
  denominator:journeys.length,journeys,
  note:"Source-reported event stages are not independently confirmed transactions. An iCamp folio and payment-provider reconciliation is needed before acceptance."};
}
