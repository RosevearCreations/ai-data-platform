export type AccessReviewState="healthy"|"review"|"attention";
export type AccessReviewMember={userId:string;name:string;role:"owner"|"admin"|"member";memberSince:string;lastPrivilegedActivityAt:string|null;state:AccessReviewState;reasons:string[];recommendations:string[];};
export type AccessReviewConnector={connectorKey:string;enabled:boolean;grants:string[];usedGrants:string[];unusedGrants:string[];state:AccessReviewState;recommendations:string[];};
export type SecurityWorkspaceReview={workspaceId:string;workspaceName:string;currentRole:"owner"|"admin"|"member";profileKey:string;effectiveCapabilities:string[];members:AccessReviewMember[];connectors:AccessReviewConnector[];privilegedOperationCount:number;reviewNotes:string[];};
export type SecurityAccessReviewModel={generatedAt:string;workspaces:SecurityWorkspaceReview[];totals:{workspaces:number;members:number;attentionMembers:number;unusedConnectorGrants:number;privilegedOperations:number};};
