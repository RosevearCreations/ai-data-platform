import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const checks:Record<string,string[]>={
 ".github/rosevear-build438-interface-drift-observatory.v1.json":["revisionMovementTriggersInspectionNotFailure","removedRequiredEndpointIsBreaking","completionPercent","movementPoints"],
 "apps/web/lib/build438-interface-drift-observatory.ts":["REVISION_INSPECTION_REQUIRED","HOLD_REQUIRED_CAPABILITY_REMOVED","HOLD_REQUIRED_ENDPOINT_REMOVED","ADDITIVE_NON_BREAKING","BUILD_438_PROFILES"],
 "apps/web/lib/build438-interface-drift-database.ts":["master_build435_peer_release_ledger","classifyBuild438Drift","summarizeBuild438"],
 "apps/web/app/interface-drift-observatory/page.tsx":["Revision drift and interface drift are different facts","Fail closed without crying wolf"],
 "docs/BUILD_438_INTERFACE_DRIFT_OBSERVATORY.md":["QL-487","Build 381","94% to 100%","A release SHA change by itself never proves an interface break"]
};
for(const [p,tokens] of Object.entries(checks)){const body=read(p);for(const t of tokens)assert.ok(body.includes(t),p+" missing "+t);}
console.log("Build 438 Seven-Application Schema, Capability & Endpoint Drift Observatory verification passed.");
