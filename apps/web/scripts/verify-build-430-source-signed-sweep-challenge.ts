import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_430_HOSTED_CADENCE,build430OverlapCertified,build430ReliabilityKind} from "../lib/master-build430-sweep-challenge";

assert.equal(BUILD_430_HOSTED_CADENCE.schedule,"17 12 * * *");
assert.equal(BUILD_430_HOSTED_CADENCE.floorSeconds,86400);
assert.equal(build430ReliabilityKind({previousVerified:null,previousCommit:null,currentVerified:true,currentCommit:"a".repeat(40)}),"ONLINE_VERIFIED");
assert.equal(build430ReliabilityKind({previousVerified:true,previousCommit:"a".repeat(40),currentVerified:true,currentCommit:"b".repeat(40)}),"DEPLOYMENT_CHANGE_VERIFIED");
assert.equal(build430ReliabilityKind({previousVerified:true,previousCommit:"a".repeat(40),currentVerified:false,currentCommit:null}),"OFFLINE_OR_HELD");
assert.equal(build430ReliabilityKind({previousVerified:false,previousCommit:"a".repeat(40),currentVerified:true,currentCommit:"a".repeat(40)}),"RETURN_VERIFIED");
assert.equal(build430OverlapCertified([
 {appId:"yw",challengeSha256:"a".repeat(64),receiptId:"r1",challengeVerified:true},
 {appId:"yw",challengeSha256:"b".repeat(64),receiptId:"r2",challengeVerified:true},
 {appId:"icamp",challengeSha256:"c".repeat(64),receiptId:"r3",challengeVerified:true},
 {appId:"icamp",challengeSha256:"d".repeat(64),receiptId:"r4",challengeVerified:true}
]),true);
assert.equal(build430OverlapCertified([
 {appId:"yw",challengeSha256:"a".repeat(64),receiptId:"r1",challengeVerified:true},
 {appId:"yw",challengeSha256:"a".repeat(64),receiptId:"r2",challengeVerified:true},
 {appId:"icamp",challengeSha256:"c".repeat(64),receiptId:"r3",challengeVerified:true},
 {appId:"icamp",challengeSha256:"d".repeat(64),receiptId:"r4",challengeVerified:true}
]),false);

const root=path.resolve(process.cwd(),"../.."),read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const protocol=read("apps/web/lib/sysop-telemetry-v1.ts");
for(const token of ["SYSOP_TELEMETRY_CHALLENGE_HEADER","protocolVersion===\"1.2\"","expectedChallenge","build430_telemetry_challenge_mismatch","challenge_verified"])assert.ok(protocol.includes(token),token);

const db=read("apps/web/lib/build430-sweep-challenge-database.ts");
for(const token of ["randomBytes(32)","x-rosevear-telemetry-challenge","expectedChallenge:challenge","certifyBuild430OverlapIsolation","runBuild430ProductionAcceptance","priorReliability","DEPLOYMENT_CHANGE_VERIFIED"])assert.ok(db.includes(token),token);

const migration=read("db/migrations/0193_master_build430_source_signed_challenge.sql");
for(const token of ["protocol_version","challenge_sha256","challenge_verified","master_build430_sweep_runs","master_build430_source_challenge_observations","master_build430_reliability_events","master_build430_cadence_baseline","force row level security"])assert.ok(migration.includes(token),token);

const cron=read("apps/web/app/api/cron/build427-rollup/route.ts");
assert.ok(cron.includes("runBuild430ProtectedSweep"));assert.ok(cron.includes("build:430"));
const vercel=JSON.parse(read("apps/web/vercel.json"));assert.equal(vercel.crons[0].schedule,"17 12 * * *");

const manifest=JSON.parse(read(".github/rosevear-build430-source-signed-sweep-challenge.v1.json"));
assert.equal(manifest.build,430);assert.equal(manifest.protocol.version,"1.2");assert.equal(manifest.productionGate.overlapIsolationRequired,true);assert.equal(manifest.hostedCadence.fiveMinuteUptimeClaim,false);

const api=read("apps/web/app/api/sweep-challenge-reliability/route.ts");assert.ok(api.includes("refreshBuild430"));assert.ok(api.includes("authentication_required"));
const page=read("apps/web/app/sweep-challenge-reliability/page.tsx");assert.ok(page.includes("OFFLINE_OR_HELD"));assert.ok(page.includes("does not manufacture an outage"));
const nav=read("apps/web/lib/application-navigation.ts");assert.ok(nav.includes('href: "/sweep-challenge-reliability"'));
const mnav=read("apps/web/lib/master-instrument-navigation.ts");assert.ok(mnav.includes('"/sweep-challenge-reliability"'));
const tools=read("apps/web/lib/module-operator-tools.ts");assert.ok(tools.includes('"/sweep-challenge-reliability"'));
const suite=read("apps/web/app/master-suite/page.tsx");assert.ok(suite.includes('href="/sweep-challenge-reliability"'));
const docs=read("docs/BUILD_430_SOURCE_SIGNED_SWEEP_CHALLENGE.md");assert.ok(docs.includes("256-bit challenge"));assert.ok(docs.includes("does not deliberately take a production source offline"));
const activation=read("apps/web/scripts/activate-build-430-production.ts");assert.ok(activation.includes("runBuild430ProductionAcceptance"));

console.log("Build 430 Source-Signed Sweep Challenge V1.2, Overlapping-Sweep Isolation Certification, Repeated YW/iCamp Deployment & Offline Reliability History, and Hosted Cadence Baseline verification passed.");