import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessBuild451,build451Action} from "../lib/build451-authority-continuity";
const now=new Date("2026-11-26T17:30:00Z"),observed="2026-11-26T17:00:00Z";
const rows=[
 {appId:"ai-data-platform",recentlySigned:true,originReachable:true,sourceHoldReason:"NONE",latestSourceObservedAt:observed,independentFieldWitness:"NOT_VERIFIED"},
 {appId:"icamp",recentlySigned:false,originReachable:true,sourceHoldReason:"VERIFIED_SIGNATURE_COMMIT_DRIFT",latestSourceObservedAt:observed,independentFieldWitness:"NOT_VERIFIED"},
 {appId:"yw",recentlySigned:false,originReachable:true,sourceHoldReason:"VERIFIED_SIGNATURE_CLOCK_OR_EXPIRY",latestSourceObservedAt:observed,independentFieldWitness:"NOT_VERIFIED"},
 {appId:"rosevear-ai-hub",recentlySigned:false,originReachable:false,sourceHoldReason:"original_host_relay_receipt_missing_or_stale",latestSourceObservedAt:observed,independentFieldWitness:"NOT_VERIFIED"},
 ...["rosevear-comms-hub","devilndove","rosiedazzlers"].map(appId=>({appId,recentlySigned:false,originReachable:true,sourceHoldReason:"HOLD_CLOUDFLARE_SECRET_AUTHORITY_REQUIRED",latestSourceObservedAt:observed,independentFieldWitness:"NOT_VERIFIED"}))
];
const report=assessBuild451({rows,historyVerified:7,latestSweepAt:observed,latestVerified:1,now});
assert.equal(report.verifiedSignedNow,1);
assert.equal(report.denominator,7);
assert.equal(report.historicallySigned,7);
assert.equal(report.excludedUnsigned,6);
assert.equal(report.rows.find(x=>x.appId==="icamp")?.nextAction,"REVIEW_DEPLOYED_MAIN_COMMIT_AND_PIN_AUTHORITY_BEFORE_APPROVED_ROTATION");
assert.equal(report.rows.find(x=>x.appId==="rosevear-ai-hub")?.nextAction,"RESTORE_AUTHENTIC_ORIGINAL_WINDOWS_OUTBOUND_RELAY");
assert.equal(report.rows.find(x=>x.appId==="rosevear-ai-hub")?.maySelfRepair,false);
assert.equal(report.fieldCertified,0);
const stale=assessBuild451({rows,historyVerified:7,latestSweepAt:"2026-11-25T12:00:00Z",latestVerified:7,now});
assert.equal(stale.verifiedSignedNow,0);
assert.equal(stale.currentAcceptance,"PARTIAL_OR_STALE_SOURCE_AUTHORITY_HOLD");
assert.equal(build451Action("VERIFIED_SIGNATURE_PRIVACY_OR_ACTION_SCOPE","icamp"),"CORRECT_SOURCE_TELEMETRY_DATA_SCOPE_BEFORE_RETRY");
const relaySource=readFileSync(new URL("../lib/build432-original-host-relay-database.ts",import.meta.url),"utf8");
assert.ok(relaySource.indexOf("verifySysopTelemetryEnvelope(envelope,Date.now()")>0);
assert.ok(relaySource.indexOf("verifySysopTelemetryEnvelope(envelope,Date.now()")<relaySource.indexOf("update app.master_build432_hub_challenges"));
assert.equal(report.pinChangesPerformed,0);
console.log("Build 451 signed-source continuity, honest 7-source denominator, original Windows relay preflight and fail-closed repair guidance passed.");
