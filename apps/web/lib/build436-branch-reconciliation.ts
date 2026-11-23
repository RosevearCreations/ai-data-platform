export const BUILD_436=436 as const;
export const BUILD_436_SCHEMA="rosevear.ai-data-platform.build436-branch-reconciliation.v1" as const;

export type Build436BranchClass=
 |"ALIGNED"
 |"MAIN_AHEAD_ONLY"
 |"DEV_AHEAD_ONLY"
 |"DIVERGED_HISTORY"
 |"UNKNOWN";

export type Build436CustodyAction=
 |"NO_ACTION"
 |"FAST_FORWARD_DEV"
 |"PROMOTE_DEV_CHANGESET"
 |"CLASSIFY_UNIQUE_COMMITS_FIRST"
 |"HOLD";

export function classifyBuild436Ancestry(input:{status?:string|null;aheadBy?:number|null;behindBy?:number|null;}):Build436BranchClass{
 const ahead=input.aheadBy??0,behind=input.behindBy??0,status=(input.status??"").toLowerCase();
 if(status==="identical"||(!ahead&&!behind))return "ALIGNED";
 if(ahead>0&&behind===0)return "DEV_AHEAD_ONLY";
 if(ahead===0&&behind>0)return "MAIN_AHEAD_ONLY";
 if(ahead>0&&behind>0)return "DIVERGED_HISTORY";
 return "UNKNOWN";
}

export function build436CustodyPlan(input:{classification:Build436BranchClass;uniqueDevClassified:boolean;uniqueMainClassified:boolean;}){
 if(input.classification==="ALIGNED")return {action:"NO_ACTION" as Build436CustodyAction,forceResetAllowed:false};
 if(input.classification==="MAIN_AHEAD_ONLY")return {action:"FAST_FORWARD_DEV" as Build436CustodyAction,forceResetAllowed:false};
 if(input.classification==="DEV_AHEAD_ONLY")return {action:"PROMOTE_DEV_CHANGESET" as Build436CustodyAction,forceResetAllowed:false};
 if(input.classification==="DIVERGED_HISTORY"){
  const classified=input.uniqueDevClassified&&input.uniqueMainClassified;
  return {action:(classified?"HOLD":"CLASSIFY_UNIQUE_COMMITS_FIRST") as Build436CustodyAction,forceResetAllowed:false};
 }
 return {action:"HOLD" as Build436CustodyAction,forceResetAllowed:false};
}

export function build436Snapshot(){
 const snapshot={status:"diverged",aheadBy:238,behindBy:222,mergeBase:"b382ac45bbb7d5f7bcaf2c311d2c3fab45d0a2d2",mainSha:"327339983d8138d47cb3520488d5d58cf01f8224"};
 const classification=classifyBuild436Ancestry(snapshot);
 const plan=build436CustodyPlan({classification,uniqueDevClassified:false,uniqueMainClassified:false});
 return {...snapshot,classification,plan,policy:{
  preserveProtectedBranches:true,
  preserveUniqueCommits:true,
  cleanMainPromotionPattern:true,
  peerEvolutionSeparate:true
 }};
}
