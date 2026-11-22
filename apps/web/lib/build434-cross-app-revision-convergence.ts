export const BUILD_434=434 as const;
export const BUILD_434_SCHEMA="rosevear.ai-data-platform.build434-cross-app-revision-convergence.v1" as const;

export type Build434SourceState={
 verified?:boolean;
 sourceCommit?:string|null;
 receiptId?:string|null;
 detail?:string|null;
};

export type Build434RevisionClass=
 |"VERIFIED_UNCHANGED"
 |"EXPECTED_PEER_ADVANCE"
 |"VERIFIED_REVISION_CHANGE"
 |"UNVERIFIED_REVISION_CHANGE"
 |"UNVERIFIED_NO_CHANGE"
 |"NO_REVISION_EVIDENCE";

export const BUILD_434_PEER_BASELINE={
 "rosevear-comms-hub":{repository:"RosevearCreations/rosevear-comms-hub",build:"QL-483",commit:"6a8fe68c05f76cde0c88027224a16f7a7ace0829"},
 "rosevear-ai-hub":{repository:"RosevearCreations/rosevear-ai-hub",build:"375",commit:"8b6fdc19861eb17cf50013080c5022619e76de48"},
 "icamp":{repository:"RosevearCreations/iCamp",build:"272",commit:"e2739ad971dc2c437482467fc5b5ed95ffd8c6c4"},
 "yw":{repository:"RosevearCreations/yw",build:"588",commit:"9ecf99f7e8bca694c112d68e6d6ae2e1a100324b"},
 "devilndove":{repository:"RosevearCreations/devilndove-site",build:"748",commit:"c6321eb680df04a4f18ea77353232e51ff227016"},
 "rosiedazzlers":{repository:"RosevearCreations/rosiedazzlers",build:"918",commit:"760623164d62381ea91a809f47cb1331566860e4"}
} as const;

export function classifyBuild434Revision(input:{
 appId:string;
 current:Build434SourceState|undefined;
 previous:Build434SourceState|undefined;
}):Build434RevisionClass{
 const currentCommit=input.current?.sourceCommit?.trim()||null;
 const previousCommit=input.previous?.sourceCommit?.trim()||null;
 const verified=input.current?.verified===true;
 if(!currentCommit)return "NO_REVISION_EVIDENCE";
 const changed=Boolean(previousCommit&&previousCommit!==currentCommit);
 const peer=input.appId!=="ai-data-platform";
 if(verified&&changed&&peer)return "EXPECTED_PEER_ADVANCE";
 if(verified&&changed)return "VERIFIED_REVISION_CHANGE";
 if(!verified&&changed)return "UNVERIFIED_REVISION_CHANGE";
 if(verified)return "VERIFIED_UNCHANGED";
 return "UNVERIFIED_NO_CHANGE";
}

export function build434Summary(rows:Array<{classification:Build434RevisionClass}>){
 const expectedPeerAdvances=rows.filter(x=>x.classification==="EXPECTED_PEER_ADVANCE").length;
 const unverifiedChanges=rows.filter(x=>x.classification==="UNVERIFIED_REVISION_CHANGE").length;
 return {
  expectedPeerAdvances,
  unverifiedChanges,
  releaseConvergenceState:unverifiedChanges>0?"HOLD_UNVERIFIED_REVISION_CHANGE":"CONVERGED_OR_EXPECTED_EVOLUTION"
 };
}
