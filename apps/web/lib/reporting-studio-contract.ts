export type ReportingKpiKey=
 |"collection-success"|"approval-throughput"|"exception-rate"|"integration-outcomes"
 |"data-quality"|"workspace-activity"|"adoption"|"retention"|"provider-usage";

export type ReportingKpi={
 key:ReportingKpiKey;label:string;value:number;unit:"count"|"percent"|"bytes"|"units";
 numerator:number|null;denominator:number|null;detail:string;href:string;
};

export type WorkspaceReport={
 workspaceId:string;workspaceName:string;role:"owner"|"admin"|"member";
 kpis:ReportingKpi[];
 evidence:{collectionAttempts:number;collectionSuccesses:number;reviewExceptions:number;
 approvedCandidates:number;publishedDatasets:number;deliveryAccepted:number;deliveryExceptions:number;
 qualityAssessments:number;qualityHealthy:number;activityEvents:number;retentionBytes:number;providerUnits:number};
};

export type ReportingStudioModel={
 schema:"ai-data-platform.reporting-studio.v1";generatedAt:string;
 workspaces:WorkspaceReport[];
 totals:{workspaces:number;collectionAttempts:number;collectionSuccesses:number;approvedCandidates:number;
 publishedDatasets:number;exceptions:number;deliveryAccepted:number;qualityAssessments:number;qualityHealthy:number;
 activityEvents:number;retentionBytes:number;providerUnits:number};
 presets:Array<{id:string;label:string;kpis:ReportingKpiKey[]}>;
};
