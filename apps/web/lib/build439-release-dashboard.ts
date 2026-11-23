import {readBuild438Dashboard} from "./build438-interface-drift-database";
import {BUILD_439_EDGES,planBuild439Releases,releaseNodesFromDrift} from "./build439-release-dependency-graph";

export async function readBuild439Dashboard(userId:string){
 const drift=await readBuild438Dashboard(userId); // owner/operator authorization inherited
 const graph=planBuild439Releases(releaseNodesFromDrift(drift.rows),BUILD_439_EDGES);
 return {...graph,build:439,capturedAt:new Date().toISOString(),evidence:"signed-peer-revision-ledger; interface observation is not independently certified",edges:BUILD_439_EDGES};
}
