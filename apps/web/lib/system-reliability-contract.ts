export type ReliabilityState="healthy"|"attention"|"critical"|"inactive";
export type ReliabilitySignal={
 id:string;label:string;state:ReliabilityState;value:string;detail:string;href:string;
};
export type ReliabilityException={
 id:string;workspaceName:string;area:string;state:Exclude<ReliabilityState,"healthy"|"inactive">;
 title:string;detail:string;href:string;observedAt:string|null;
};
export type ReliabilityDashboardModel={
 generatedAt:string;
 database:{reachable:boolean;latencyMs:number;authorizedWorkspaces:number};
 runtime:{collectionRuntimeReady:boolean;browserlessConfigured:boolean;globalKillSwitchActive:boolean};
 signals:ReliabilitySignal[];
 exceptions:ReliabilityException[];
 totals:{healthy:number;attention:number;critical:number;inactive:number;exceptions:number};
};
