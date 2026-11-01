export type IntegrationSimulatorResult={
 workspaceId:string;workspaceName:string;target:"rosie-dazzlers"|"devil-n-dove";batchId:string;status:"compatible"|"invalid"|"unavailable";
 packageId:string;schemaId:string;adapterContract:string;contractVersion:number;operationCount:number;actions:string[];allowedFields:string[];
 validationCode:string;validationErrors:string[];dryRunResult:string;expectedAcknowledgement:string[];configured:boolean;endpointOrigin:string|null;
};
export type IntegrationCompatibilityModel={generatedAt:string;results:IntegrationSimulatorResult[];totals:{batches:number;compatible:number;invalid:number;configuredTargets:number};};
