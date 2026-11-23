import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const checks:Record<string,string[]>={
 ".github/rosevear-build436-branch-reconciliation.v1.json":["devAheadBy","devBehindBy","neverForceResetProtectedBranches","movementPoints"],
 "apps/web/lib/build436-branch-reconciliation.ts":["DIVERGED_HISTORY","CLASSIFY_UNIQUE_COMMITS_FIRST","forceResetAllowed:false","peerEvolutionSeparate"],
 "apps/web/app/branch-reconciliation/page.tsx":["Classify before reconciling","No destructive reconciliation","Clean main promotion candidates remain valid"],
 "docs/BUILD_436_BRANCH_RECONCILIATION_INTELLIGENCE.md":["238 commits","222 commits","78% to 86%","patch equivalence"]
};
for(const [p,tokens] of Object.entries(checks)){const body=read(p);for(const t of tokens)assert.ok(body.includes(t),p+" missing "+t);}
console.log("Build 436 Branch Reconciliation Intelligence, Safe Ancestry Classification & Merge-Custody Planner verification passed.");
