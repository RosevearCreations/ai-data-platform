export type AuditEvidenceItem={
  id:string; workspaceId:string; workspaceName:string; module:string; operation:string; result:string;
  actorUserId:string; occurredAt:string; source:string; consumer:string; collectionRunId:string; recordId:string;
  summary:string; details:Record<string,unknown>;
};
export type AuditEvidenceModel={
  generatedAt:string;
  workspaces:Array<{id:string;name:string;role:"owner"|"admin"|"member"}>;
  items:AuditEvidenceItem[];
  filters:{modules:string[];operations:string[];results:string[];actors:string[];sources:string[];consumers:string[]};
  totals:{events:number;modules:number;workspaces:number};
};
