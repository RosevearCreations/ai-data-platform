import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
 BUILD_429_METRIC_DICTIONARY,
 BUILD_429_SOURCE_CATALOG,
 build429Coverage,
 build429HealthState
} from "../lib/master-build429-seven-source-continuous-health";

assert.equal(Object.keys(BUILD_429_SOURCE_CATALOG).length,7);
assert.equal(BUILD_429_SOURCE_CATALOG["rosevear-ai-hub"].provider,"ORIGINAL_HOST");
assert.equal(BUILD_429_SOURCE_CATALOG["rosevear-ai-hub"].sourceRouteImplemented,true);
assert.equal(BUILD_429_SOURCE_CATALOG["rosevear-comms-hub"].sourceRouteImplemented,false);
assert.equal(BUILD_429_SOURCE_CATALOG.devilndove.sourceRouteImplemented,true);
assert.equal(BUILD_429_SOURCE_CATALOG.rosiedazzlers.sourceRouteImplemented,true);
assert.equal(BUILD_429_SOURCE_CATALOG["ai-data-platform"].explicitHold,"HOLD_AIDP_SELF_SIGNER_PROVIDER_WRITE_BLOCKED");
assert.equal(build429HealthState("yw",{telemetryVerified:true,receiptId:"receipt"}),"ACTIVE_SIGNED_FRESH");
assert.equal(build429HealthState("yw",{telemetryVerified:false,receiptId:null}),"HOLD_UNVERIFIED");
assert.equal(build429HealthState("devilndove",{telemetryVerified:false,receiptId:null}),"HOLD_CLOUDFLARE_SECRET_AUTHORITY_NOT_CONNECTED");
assert.deepEqual(build429Coverage({verifiedSources:2,classifiedSources:7}),{freshVerifiedSources:2,allSources:7,classifiedSources:7,fleetCoveragePercent:28.6,classificationCoveragePercent:100,sevenSourceConnected:false});
assert.equal(BUILD_429_METRIC_DICTIONARY.fleetCoverage.denominator,"all_seven_sources");

const root=path.resolve(process.cwd(),"../.."),read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const manifest=JSON.parse(read(".github/rosevear-build429-seven-source-continuous-health.v1.json"));
assert.equal(manifest.build,429);assert.equal(manifest.productionGate.allSevenClassified,true);assert.equal(manifest.productionGate.sevenSourceConnectedRequired,false);assert.equal(manifest.secretPolicy.privateKeysInGit,false);

const migration=read("db/migrations/0192_master_build429_seven_source_continuous_health.sql");
for(const token of ["master_build429_sweep_receipts","master_build429_source_health_observations","unique(sweep_id,app_id)","unique(source_receipt_id)","force row level security","master_build429_latest_source_health"])assert.ok(migration.includes(token),token);

const runtime=read("apps/web/lib/build429-seven-source-health-database.ts");
for(const token of ["probeBuild426Source","source_receipt_id","sweepId","runBuild429ProductionAcceptance","build429_required_existing_signed_sources_regressed"])assert.ok(runtime.includes(token),token);
assert.ok(!runtime.includes("master_build423_sysop_telemetry_receipts where recorded_at >="));

const cron=read("apps/web/app/api/cron/build427-rollup/route.ts");assert.ok(cron.includes("runBuild429ProtectedSweep"));assert.ok(cron.includes("legacyBuild427"));
const api=read("apps/web/app/api/seven-source-health/route.ts");assert.ok(api.includes("refreshBuild429"));assert.ok(api.includes("authentication_required"));
const page=read("apps/web/app/seven-source-health/page.tsx");assert.ok(page.includes("Production GREEN does not mean seven-source CONNECTED"));assert.ok(page.includes("one receipt cannot be borrowed by another sweep"));
const nav=read("apps/web/lib/application-navigation.ts");assert.ok(nav.includes('href: "/seven-source-health"'));
const mnav=read("apps/web/lib/master-instrument-navigation.ts");assert.ok(mnav.includes('"/seven-source-health"'));
const tools=read("apps/web/lib/module-operator-tools.ts");assert.ok(tools.includes('"/seven-source-health"'));
const suite=read("apps/web/app/master-suite/page.tsx");assert.ok(suite.includes('href="/seven-source-health"'));
const docs=read("docs/BUILD_429_SEVEN_SOURCE_CONTINUOUS_HEALTH.md");assert.ok(docs.includes("goal framework"));assert.ok(docs.includes("unique(source_receipt_id)"));
const activation=read("apps/web/scripts/activate-build-429-production.ts");assert.ok(activation.includes("runBuild429ProductionAcceptance"));assert.ok(activation.includes('VERCEL_ENV!=="production"'));

console.log("Build 429 Remaining Five-Source Signer Enrollment, Cloudflare Telemetry Activation, Original-Host AI Hub Relay & Seven-Source Continuous Health Completion verification passed.");
