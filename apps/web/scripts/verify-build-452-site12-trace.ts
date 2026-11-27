import assert from "node:assert/strict";
import {build452Site12Trace,type Build452Event,type Build452EventType} from "../lib/build452-site12-trace";
const now=new Date("2026-11-26T22:00:00Z");
let seq=0;
function evt(eventType:Build452EventType,extra:Partial<Build452Event>={}):Build452Event{
 const n=++seq;
 return {product:"icamp",tenantId:"tenant-Camp-Rosevear-TEST",eventId:"site12-test-"+n,eventType,
  siteNumber:"12",objectId:"site-12",operationId:"stay-TEST",occurredAt:new Date(now.getTime()-600000+n*1000).toISOString(),
  observedAt:new Date(now.getTime()-300000).toISOString(),version:n,purpose:"OPERATIONS_SUMMARY",sourceReceiptId:"receipt-"+n,folioReference:null,...extra};
}
const repair=evt("camp.site.maintenance.requested",{operationId:"repair-TEST"});
const ack=evt("camp.site.maintenance.acknowledged",{operationId:"repair-TEST"});
const requested=evt("camp.site.addon.requested"),approved=evt("camp.site.addon.approved"),delivered=evt("camp.site.addon.delivered");
const capture=evt("camp.site.payment.captured"),posted=evt("camp.site.folio.posted",{folioReference:"TEST-FOLIO-SITE12"});
const accepted=build452Site12Trace([posted,repair,ack,requested,approved,delivered,capture,{...repair}],{now});
assert.equal(accepted.journeyCount,2);
assert.equal(accepted.duplicatesSuppressed,1);
assert.equal(accepted.partialJourneyCount,0);
assert.equal(accepted.journeys.find(x=>x.operationId==="repair-TEST")?.maintenanceState,"ACKNOWLEDGED");
assert.equal(accepted.journeys.find(x=>x.operationId==="stay-TEST")?.addonState,"REPORTED_POSTED_AND_CAPTURED");
assert.equal(accepted.journeys.find(x=>x.operationId==="stay-TEST")?.margin,"UNAVAILABLE_WITHOUT_SOURCE_COSTS");
assert.equal(accepted.moneyPostedByMaster,false);
const missing=build452Site12Trace([requested,approved,posted],{now});
assert.ok(missing.journeys[0].missingStages.includes("addon.delivered"));
assert.ok(missing.journeys[0].missingStages.includes("payment.captured"));
const stale=build452Site12Trace([repair,ack].map(x=>({...x,observedAt:"2026-11-25T02:00:00Z"})),{now});
assert.equal(stale.staleJourneyCount,1);
const clash=build452Site12Trace([repair,{...repair,eventType:"camp.site.maintenance.resolved"}],{now});
assert.equal(clash.conflictingEventIds,1);
assert.equal(clash.journeys[0].maintenanceState,"AWAITING_ACK");
const noData=build452Site12Trace([],{now});assert.equal(noData.observationStatus,"NO_REAL_SITE12_EVENTS_OBSERVED");
const crossTenant=build452Site12Trace([repair,{...repair,tenantId:"other-tenant",eventId:"separate"}],{now});
assert.equal(crossTenant.journeyCount,2);
const wrongSite=build452Site12Trace([repair,{...repair,eventId:"wrong",siteNumber:"18"}],{now});
assert.equal(wrongSite.excludedEvents,1);
const versionLate=build452Site12Trace([repair,{...ack,eventId:"later",version:10},{...ack,eventId:"older",version:2}],{now});
assert.equal(versionLate.outOfOrderIgnored,1);
console.log("Build 452 Site12 duplicate, conflicting, out-of-order, stale, tenancy, missing paid stages and no-fabricated-margin checks passed.");
