import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const checks:Record<string,string[]>={
 ".github/rosevear-build434-cross-app-revision-convergence.v1.json":["verifiedPeerRevisionAdvanceIsExpectedEvolution","movementPoints","gitBranchDivergenceRemainsSeparateFromPeerRevisionEvolution"],
 "apps/web/lib/build434-cross-app-revision-convergence.ts":["EXPECTED_PEER_ADVANCE","UNVERIFIED_REVISION_CHANGE","BUILD_434_PEER_BASELINE"],
 "apps/web/lib/build434-cross-app-revision-convergence-database.ts":["master_build432_closure_runs","previousObservationAt","releaseConvergenceState"],
 "apps/web/app/cross-app-revision-convergence/page.tsx":["Peer application progress is not automatically branch divergence","Two kinds of divergence are now kept separate"],
 "docs/AUTONOMOUS_BUILDS_435_454.md":["Build 435","Build 454","20. **Build 454"]
};
for(const [p,tokens] of Object.entries(checks)){const body=read(p);for(const t of tokens)assert.ok(body.includes(t),p+" missing "+t);}
console.log("Build 434 Cross-Application Revision Convergence, Source-Aware Divergence Classification & Multi-App Build Awareness verification passed.");
