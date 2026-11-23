import {BUILD_438_PROFILES, type Build438DriftState} from "./build438-interface-drift-observatory";

export const BUILD_439=439 as const;
export const BUILD_439_SCHEMA="rosevear.ai-data-platform.build439-coordinated-release-graph.v1" as const;

export type ReleaseState="READY"|"REVIEW_REQUIRED"|"HOLD"|"RELEASED";
export type ReleaseNode={appId:string;release:string;state:ReleaseState;reason?:string};
export type ReleaseEdge={prerequisite:string;dependent:string;contract:string;required:boolean};
export type PlannedRelease={appId:string;release:string;state:"READY"|"REVIEW_REQUIRED"|"HOLD"|"RELEASED"|"BLOCKED_BY_DEPENDENCY";causes:string[];wave:number|null};
export type ReleasePlan={schema:typeof BUILD_439_SCHEMA;waves:string[][];releases:PlannedRelease[];invalidEdges:string[];cycles:string[][];safeToPromote:boolean};

/** Explicit contract dependencies, not a speculative total ordering of independent apps. */
export const BUILD_439_EDGES:readonly ReleaseEdge[]=[
 {prerequisite:"rosevear-comms-hub",dependent:"ai-data-platform",contract:"signed-operator-receipts",required:true},
 {prerequisite:"rosevear-ai-hub",dependent:"ai-data-platform",contract:"original-host-signed-telemetry",required:true},
 {prerequisite:"ai-data-platform",dependent:"icamp",contract:"release-contract-assurance",required:false},
 {prerequisite:"ai-data-platform",dependent:"yw",contract:"release-contract-assurance",required:false},
 {prerequisite:"ai-data-platform",dependent:"devilndove",contract:"release-contract-assurance",required:false},
 {prerequisite:"ai-data-platform",dependent:"rosiedazzlers",contract:"release-contract-assurance",required:false}
];

/** Deterministic fail-closed planning. Read only: does not deploy, promote or override app authority. */
export function planBuild439Releases(nodes:readonly ReleaseNode[],edges:readonly ReleaseEdge[]):ReleasePlan{
 const ids=new Set<string>();for(const node of nodes){if(!node.appId||ids.has(node.appId))throw new Error("build439_duplicate_or_empty_node");ids.add(node.appId);}
 const nodeById=new Map(nodes.map(n=>[n.appId,n]));
 const invalidEdges=edges.filter(e=>!ids.has(e.prerequisite)||!ids.has(e.dependent)||e.prerequisite===e.dependent).map(e=>e.prerequisite+" -> "+e.dependent);
 const valid=edges.filter(e=>ids.has(e.prerequisite)&&ids.has(e.dependent)&&e.prerequisite!==e.dependent);
 const incoming=new Map(nodes.map(n=>[n.appId,valid.filter(e=>e.dependent===n.appId&&e.required)]));
 const pending=new Set(nodes.map(n=>n.appId));
 const waves:string[][]=[];
 while(pending.size){
  const next=[...pending].filter(id=>(incoming.get(id)??[]).every(e=>!pending.has(e.prerequisite))).sort();
  if(!next.length)break;
  waves.push(next);
  next.forEach(id=>pending.delete(id));
 }
 const cycles=pending.size?[[...pending].sort()]:[];
 const waveById=new Map(waves.flatMap((wave,i)=>wave.map(id=>[id,i] as const)));
 const results=new Map<string,PlannedRelease>();
 for(const wave of waves){
  for(const id of wave){
   const node=nodeById.get(id)!;const causes:string[]=[];
   for(const edge of incoming.get(id)??[]){
    const predecessor=results.get(edge.prerequisite);
    if(!predecessor||!["READY","RELEASED"].includes(predecessor.state))
     causes.push(edge.prerequisite+":"+edge.contract+":"+(predecessor?.state??"UNKNOWN"));
   }
   results.set(id,{appId:id,release:node.release,state:causes.length?"BLOCKED_BY_DEPENDENCY":node.state,causes:[...(node.reason?[node.reason]:[]),...causes],wave:waveById.get(id)??null});
  }
 }
 for(const id of pending){const node=nodeById.get(id)!;results.set(id,{appId:id,release:node.release,state:"HOLD",causes:["dependency_cycle"],wave:null});}
 const releases=[...results.values()].sort((a,b)=>a.appId.localeCompare(b.appId));
 return {schema:BUILD_439_SCHEMA,waves,releases,invalidEdges,cycles,safeToPromote:!invalidEdges.length&&!cycles.length&&releases.every(r=>r.state==="READY"||r.state==="RELEASED")};
}
export function releaseNodesFromDrift(observed:readonly {appId:string;state:Build438DriftState}[]):ReleaseNode[]{
 const stateById=new Map(observed.map(r=>[r.appId,r.state]));
 return BUILD_438_PROFILES.map(p=>{
  const drift=stateById.get(p.appId);
  const state:ReleaseState=!drift?"REVIEW_REQUIRED":drift.startsWith("HOLD_")?"HOLD":drift==="NO_DRIFT"||drift==="ADDITIVE_NON_BREAKING"?"READY":"REVIEW_REQUIRED";
  return {appId:p.appId,release:p.buildLabel,state,reason:drift??"no_verified_current_drift_observation"};
 });
}
