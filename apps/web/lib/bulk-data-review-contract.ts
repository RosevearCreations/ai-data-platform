export const BULK_REVIEW_REASON_CODES = ["verified-clean","duplicate-set","source-incomplete","policy-review","needs-owner-review","quality-exception","other"] as const;
export type BulkReviewReasonCode = (typeof BULK_REVIEW_REASON_CODES)[number];
export type BulkReviewDecision = "approve" | "reject" | "hold";
export interface BulkReviewItem {
  workspaceId:string; workspaceName:string; role:"owner"|"admin"|"member";
  reviewId:string; title:string; sourceDatasetId:string; sourceServerVersion:number;
  rowCount:number; includedCount:number; updatedAt:string; eventCount:number;
  canDecide:boolean; openExceptionCount:number;
}
export interface BulkReviewException {
  workspaceId:string; workspaceName:string; exceptionId:string; reviewId:string;
  title:string; reasonCode:string; note:string; createdBy:string; createdAt:string;
}
export interface BulkReviewModel {
  generatedAt:string;
  workspaces:Array<{id:string;name:string;role:"owner"|"admin"|"member"}>;
  items:BulkReviewItem[]; exceptions:BulkReviewException[];
  totals:{inReview:number;selectable:number;openExceptions:number};
}
