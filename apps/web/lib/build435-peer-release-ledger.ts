import {BUILD_434_PEER_BASELINE} from "./build434-cross-app-revision-convergence";
export const BUILD_435=435 as const;
export const BUILD_435_SCHEMA="rosevear.ai-data-platform.build435-peer-release-ledger.v1" as const;

export type Build435Continuity="BASELINE"|"ADVANCE"|"UNCHANGED"|"REGRESSION_HOLD"|"UNRESOLVED_SEQUENCE";

function numericPart(label:string|null|undefined){
 if(!label)return null;
 const m=label.match(/(?:QL-|YW)?(\d+)$/i);return m?Number(m[1]):null;
}
export function build435KnownLabel(appId:string,commit:string){
 const baseline=(BUILD_434_PEER_BASELINE as Record<string,{build:string;commit:string}>)[appId];
 return baseline?.commit===commit?baseline.build:null;
}
export function classifyBuild435Continuity(input:{currentCommit:string;currentBuildLabel?:string|null;previousCommit?:string|null;previousBuildLabel?:string|null;}):Build435Continuity{
 if(!input.previousCommit)return "BASELINE";
 if(input.currentCommit===input.previousCommit)return "UNCHANGED";
 const current=numericPart(input.currentBuildLabel),previous=numericPart(input.previousBuildLabel);
 if(current===null||previous===null)return "UNRESOLVED_SEQUENCE";
 if(current>previous)return "ADVANCE";
 return "REGRESSION_HOLD";
}
export function summarizeBuild435(rows:Array<{continuity_state:Build435Continuity}>){
 const regressions=rows.filter(x=>x.continuity_state==="REGRESSION_HOLD").length;
 const unresolved=rows.filter(x=>x.continuity_state==="UNRESOLVED_SEQUENCE").length;
 return {releaseHistoryState:regressions?"HOLD_REGRESSION_DETECTED":"LEDGER_HEALTHY",regressions,unresolved};
}
