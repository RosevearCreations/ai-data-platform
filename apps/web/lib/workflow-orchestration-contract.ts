export type RunbookStepStatus="ready"|"blocked"|"complete"|"attention";
export type RunbookStep={
 id:string;label:string;description:string;href:string;status:RunbookStepStatus;
 evidence:string[];gate:string;actionLabel:string;
};
export type GuidedRunbook={
 id:string;name:string;purpose:string;workspaceId:string;workspaceName:string;
 role:"owner"|"admin"|"member";steps:RunbookStep[];completeSteps:number;blockedSteps:number;
};
export type WorkflowOrchestrationModel={
 generatedAt:string;runbooks:GuidedRunbook[];
 templates:Array<{id:string;name:string;sequence:string[];safety:string[]}>;
 totals:{workspaces:number;runbooks:number;readySteps:number;blockedSteps:number;completeSteps:number};
};
