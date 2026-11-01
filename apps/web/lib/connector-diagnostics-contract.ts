export type ConnectorDiagnosticState="pass"|"attention"|"fail"|"not-applicable";
export type ConnectorDiagnosticCheck={id:string;label:string;state:ConnectorDiagnosticState;detail:string;recovery:string;};
export type ConnectorDiagnosticItem={
 workspaceId:string;workspaceName:string;role:"owner"|"admin"|"member";connectorKey:string;displayName:string;
 enabled:boolean;canManage:boolean;connectorVersion:string;manifestVersion:number;
 referenceAgeDays:number|null;endpointSummary:string;latestAuditStatus:string;latestAuditError:string;latestAuditAt:string|null;
 checks:ConnectorDiagnosticCheck[];overall:ConnectorDiagnosticState;testCapability:"import"|"enrichment"|"export"|null;
};
export type ConnectorDiagnosticsModel={generatedAt:string;items:ConnectorDiagnosticItem[];totals:{connectors:number;pass:number;attention:number;fail:number;enabled:number};};
