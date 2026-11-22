import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
import {BUILD_432_ALL_SOURCES,build432ClosureState} from "../lib/master-build432-seven-source-closure";
assert.equal(BUILD_432_ALL_SOURCES.length,7);assert.equal(build432ClosureState([...BUILD_432_ALL_SOURCES]),"SEVEN_OF_SEVEN_GENUINE_SIGNED_LIVE");assert.equal(build432ClosureState(["ai-data-platform"]),"SEVEN_SOURCE_CLOSURE_HOLD");
const root=path.resolve(process.cwd(),"../.."),read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
for(const [p,tokens] of Object.entries({
 "apps/web/lib/build432-original-host-relay-database.ts":["issueBuild432HubChallenge","admitBuild432HubRelay","expectedChallenge:challenge"],
 "apps/web/lib/build432-seven-source-closure-database.ts":["runBuild432ProductionAcceptance","build432_seven_of_seven_required","publicCloudflareProbe","latestBuild432HubRelay"],
 "apps/web/app/internal/rosevear/sysop/build432/challenge/rosevear-ai-hub/route.ts":["issueBuild432HubChallenge","Cache-Control"],
 "apps/web/app/internal/rosevear/sysop/build432/intake/route.ts":["admitBuild432HubRelay","PAYLOAD_TOO_LARGE"],
 "db/migrations/0195_master_build432_seven_source_closure.sql":["master_build432_hub_challenges","master_build432_hub_relay_receipts","master_build432_closure_runs","force row level security"],
 "apps/web/app/seven-source-telemetry-closure/page.tsx":["Seven signatures or Production stays HOLD","DESKTOP-AE894KC"],
 "docs/BUILD_432_SEVEN_SOURCE_GENUINE_TELEMETRY_CLOSURE.md":["7/7","original Windows host","Cloudflare"]
}) ){const body=read(p);for(const token of tokens)assert.ok(body.includes(token),p+" missing "+token);}
const telemetry=read("apps/web/lib/sysop-telemetry-v1.ts");assert.ok(telemetry.includes("spkiFingerprint"));assert.ok(telemetry.includes("legacyRawFingerprint"));
const pkg=JSON.parse(read("apps/web/package.json"));assert.ok(pkg.scripts.build.includes("verify-build-432-seven-source-closure.ts"));assert.ok(pkg.scripts.build.includes("activate-build-432-production.ts"));
console.log("Build 432 Cloudflare Three-Source Signer Provisioning, Original-Host AI Hub Signed Relay Activation & Seven-of-Seven Genuine Production Telemetry Closure verification passed.");
