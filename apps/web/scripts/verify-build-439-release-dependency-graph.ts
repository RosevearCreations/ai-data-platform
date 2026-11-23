import assert from "node:assert/strict";
import {BUILD_439_EDGES,planBuild439Releases,releaseNodesFromDrift} from "../lib/build439-release-dependency-graph";
import {BUILD_438_PROFILES} from "../lib/build438-interface-drift-observatory";

const nodes=BUILD_438_PROFILES.map(p=>({appId:p.appId,release:p.buildLabel,state:"READY" as const}));
const happy=planBuild439Releases(nodes,BUILD_439_EDGES);
assert.equal(happy.invalidEdges.length,0);
assert.equal(happy.cycles.length,0);
assert.equal(happy.releases.length,7);
assert.equal(happy.safeToPromote,true);
assert.ok((happy.releases.find(x=>x.appId==="ai-data-platform")?.wave??0)>0);

const blocked=planBuild439Releases(nodes.map(n=>n.appId==="rosevear-ai-hub"?{...n,state:"HOLD" as const}:n),BUILD_439_EDGES);
assert.equal(blocked.releases.find(x=>x.appId==="ai-data-platform")?.state,"BLOCKED_BY_DEPENDENCY");
assert.equal(blocked.safeToPromote,false);
assert.equal(blocked.releases.find(x=>x.appId==="yw")?.state,"READY"); // advisory edge cannot block tenant app

const unknown=releaseNodesFromDrift([]);
assert.ok(unknown.every(n=>n.state==="REVIEW_REQUIRED"));
const cycle=planBuild439Releases([{appId:"a",release:"1",state:"READY"},{appId:"b",release:"1",state:"READY"}],[{prerequisite:"a",dependent:"b",contract:"x",required:true},{prerequisite:"b",dependent:"a",contract:"x",required:true}]);
assert.equal(cycle.safeToPromote,false);
assert.equal(cycle.cycles.length,1);
const malformed=planBuild439Releases(nodes,[{prerequisite:"missing",dependent:"yw",contract:"x",required:true}]);
assert.equal(malformed.safeToPromote,false);
assert.equal(malformed.invalidEdges.length,1);
console.log("Build 439 release graph checks passed");
