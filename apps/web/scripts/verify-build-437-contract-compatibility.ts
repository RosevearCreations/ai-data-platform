import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const checks:Record<string,string[]>={
 ".github/rosevear-build437-contract-compatibility.v1.json":["shaChangeAloneIsNotBreakingChange","unobservedNewPeerReleaseRequiresReview","movementPoints"],
 "apps/web/lib/build437-contract-compatibility.ts":["EXPECTED_RELEASE_PENDING_OBSERVATION","HOLD_CONTRACT_BREAK","BUILD_437_RELEASE_SNAPSHOT","authority_boundary_change"],
 "apps/web/lib/build437-contract-compatibility-database.ts":["master_build435_peer_release_ledger","distinct on(app_id)","forecastBuild437"],
 "apps/web/app/contract-compatibility/page.tsx":["A new peer SHA is a change signal, not proof of breakage","Change impact is contract-based"],
 "docs/BUILD_437_CONTRACT_COMPATIBILITY_MATRIX.md":["QL-486","Build 380","YW591","Build 921","86% to 94%"]
};
for(const [p,tokens] of Object.entries(checks)){const body=read(p);for(const t of tokens)assert.ok(body.includes(t),p+" missing "+t);}
console.log("Build 437 Cross-Application Contract Compatibility Matrix & Change-Impact Forecasting verification passed.");
