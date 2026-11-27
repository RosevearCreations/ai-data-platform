import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessBuild453,type Build453Summary} from "../lib/build453-autonomous-intake";
const now=new Date("2026-11-27T12:00:00Z");
const initial:Build453Summary={
 sourceEndpointCount:0,site12AllowedEndpointCount:0,validSecretBindingCount:0,
 activeSubscriptions:0,webhookReceipts:0,site12EventReceipts:0,
 lastSite12ReceiptAt:null,eventPublications:0,eventRoutes:0,
 lastSignedSweepAt:"2026-11-26T12:56:13Z",lastWindowsRelayAt:"2026-11-22T13:42:59Z"
};
const missing=assessBuild453(initial,now);
assert.equal(missing.intakeState,"MASTER_INTAKE_ENDPOINT_NOT_PROVISIONED");
assert.equal(missing.ownPipelineHolds,4);
assert.equal(missing.externalSourceHolds,2);
assert.equal(missing.counts.site12SourceReceipts,0);
assert.equal(missing.noSyntheticEvents,true);
assert.equal(missing.independentReleaseAllowed,true);
assert.equal(missing.sourceAgeMinutes,null);
assert.equal(missing.steps.find(s=>s.stage==="REAL_SITE12_SOURCE_EVENTS")?.owner,"ICAMP_SOURCE");
assert.equal(missing.steps.find(s=>s.stage==="SIGNED_WEBHOOK_ENDPOINT")?.owner,"AI_DATA_PLATFORM");
assert.equal(assessBuild453({...initial,sourceEndpointCount:1},now).intakeState,"MASTER_SITE12_ALLOWLIST_INCOMPLETE");
assert.equal(assessBuild453({...initial,sourceEndpointCount:1,site12AllowedEndpointCount:1},now).intakeState,"MASTER_HMAC_SIGNER_BINDING_MISSING");
assert.equal(assessBuild453({...initial,sourceEndpointCount:1,site12AllowedEndpointCount:1,validSecretBindingCount:1},now).intakeState,"MASTER_EVENT_BUS_ROUTE_INACTIVE");
const ready={...initial,sourceEndpointCount:1,site12AllowedEndpointCount:1,validSecretBindingCount:1,activeSubscriptions:1};
assert.equal(assessBuild453(ready,now).intakeState,"MASTER_READY_WAITING_FOR_ICAMP_SOURCE_EVENTS");
assert.equal(assessBuild453({...ready,site12EventReceipts:2,lastSite12ReceiptAt:"2026-11-27T11:59:00Z"},now).intakeState,"SOURCE_EVENT_INTAKE_OBSERVED");
assert.equal(assessBuild453({...ready,site12EventReceipts:2,lastSite12ReceiptAt:"2026-11-26T09:00:00Z"},now).intakeState,"SOURCE_EVENTS_STALE");
const sql=readFileSync(new URL("../../../db/migrations/0201_master_build453_intake_watch.sql",import.meta.url),"utf8");
assert.match(sql,/security definer/i);
assert.match(sql,/revoke all on function app\.build453_intake_source_summary\(\) from public/i);
const watcher=readFileSync(new URL("../lib/build453-autonomous-intake-database.ts",import.meta.url),"utf8");
assert.match(watcher,/on conflict/i);
const cron=readFileSync(new URL("../app/api/cron/build427-rollup/route.ts",import.meta.url),"utf8");
assert.ok(cron.includes("runBuild453AutonomousIntakeWatch"));
assert.ok(cron.indexOf("runBuild453AutonomousIntakeWatch")<cron.indexOf("sweepBuild427Protected()"));
const page=readFileSync(new URL("../app/owner-intake-readiness/page.tsx",import.meta.url),"utf8");
assert.ok(!page.includes("<textarea"));
console.log("Build 453 Master intake endpoints/allowlist/HMAC/route staging, missing source, stale evidence, RLS and autonomous cron checks passed.");
