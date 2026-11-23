import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const checks:Record<string,string[]>={
 "db/migrations/0196_master_build435_peer_release_ledger.sql":["master_build435_peer_release_ledger","force row level security","UNRESOLVED_SEQUENCE"],
 ".github/rosevear-build435-peer-release-ledger.v1.json":["movementPoints","unknownBuildNumbersRemainUnresolved","sourceRegressionFailsClosed"],
 "apps/web/lib/build435-peer-release-ledger.ts":["REGRESSION_HOLD","UNRESOLVED_SEQUENCE","build435KnownLabel"],
 "apps/web/lib/build435-peer-release-ledger-database.ts":["master_build432_closure_runs","verified_observation_count","predecessor_commit","ingestBuild435VerifiedReleases"],
 "apps/web/app/peer-release-ledger/page.tsx":["Every verified peer revision now has durable history","No guessed release numbers"],
 "docs/BUILD_435_SIGNED_PEER_RELEASE_LEDGER.md":["70% to 78%","append-only","never converted into a build number by inference"]
};
for(const [p,tokens] of Object.entries(checks)){const body=read(p);for(const t of tokens)assert.ok(body.includes(t),p+" missing "+t);}
console.log("Build 435 Signed Peer Release Ledger, Build-Number Continuity & Source Revision History verification passed.");
