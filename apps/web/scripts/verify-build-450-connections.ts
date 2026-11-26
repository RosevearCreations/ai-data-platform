import assert from "node:assert/strict";
import {classifyBuild450,type ClosureEvidence,type LatestSourceStatus} from "../lib/build450-connection-classification";
import {BUILD_432_ALL_SOURCES} from "../lib/master-build432-seven-source-closure";
const now=new Date("2026-11-26T04:00:00Z");
const historical:ClosureEvidence={mode:"PRODUCTION_BUILD",observedAt:"2026-11-22T13:46:19Z",verifiedSources:7,
 state:"SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE",
 sources:Object.fromEntries(BUILD_432_ALL_SOURCES.map(id=>[id,{verified:true,receiptId:"receipt-"+id,sourceCommit:"a".repeat(40),detail:"signed"}]))};
const recent:ClosureEvidence={mode:"CRON",observedAt:"2026-11-26T03:58:00Z",verifiedSources:1,state:"SEVEN_SOURCE_CLOSURE_HOLD",
 sources:Object.fromEntries(BUILD_432_ALL_SOURCES.map(id=>[id,{verified:id==="ai-data-platform",receiptId:id==="ai-data-platform"?"receipt-current":null,sourceCommit:id==="ai-data-platform"?"b".repeat(40):null,detail:"source unavailable"}]))};
const status:LatestSourceStatus[]=BUILD_432_ALL_SOURCES.map(id=>({appId:id,state:id==="ai-data-platform"?"ACTIVE_V12_SIGNED":"HOLD_V12_SIGNER_NOT_VERIFIED",originReachable:id!=="rosevear-ai-hub",credentialPresent:id==="ai-data-platform",challengeVerified:id==="ai-data-platform",observedAt:"2026-11-26T03:58:00Z",detail:"live test"}));
const report=classifyBuild450({closures:[historical,recent],sourceStatus:status,sourceKeyReady:new Set(),originalWitnessCertified:new Set(),ownerAuthorizedValidation:true,now});
assert.equal(report.history.verified,7);
assert.equal(report.currentSignedChallengeSources,1);
assert.equal(report.currentConnectionState,"PARTIAL_SIGNED_LIVE");
assert.equal(report.currentlyReachableOrigins,6);
assert.equal(report.independentOriginalDeviceWitnesses,0);
assert.equal(report.firstAuthenticSourceTelemetryPilot.appId,"ai-data-platform");
assert.equal(report.rows.find(x=>x.appId==="icamp")?.state,"HISTORIC_SIGNED_SOURCE_CURRENT_REVALIDATION_REQUIRED");
assert.equal(report.rows.find(x=>x.appId==="ai-data-platform")?.state,"SIGNED_CHALLENGE_VERIFIED_RECENT");
const stale=classifyBuild450({closures:[historical],sourceStatus:status,sourceKeyReady:new Set(),originalWitnessCertified:new Set(),ownerAuthorizedValidation:true,now});
assert.equal(stale.currentSignedChallengeSources,0);
assert.equal(stale.history.verified,7);
assert.equal(stale.firstAuthenticSourceTelemetryPilot.state,"AWAITING_NEW_SIGNED_SOURCE_CHALLENGE");
assert.equal(stale.independentFieldState,"INDEPENDENT_FIELD_EVIDENCE_INCOMPLETE");
assert.equal(stale.automaticDeviceAttestation,false);
const allFresh={...historical,observedAt:"2026-11-26T03:59:00Z"};
const complete=classifyBuild450({closures:[allFresh,historical],sourceStatus:status,sourceKeyReady:new Set(BUILD_432_ALL_SOURCES),originalWitnessCertified:new Set(),ownerAuthorizedValidation:true,now});
assert.equal(complete.currentSignedChallengeSources,7);
assert.equal(complete.independentOriginalDeviceWitnesses,0);
console.log("Build 450 historic 7/7 signed transport, fresh source challenge, owner-authorized validation and separate original-device witness gates passed.");
