import { createHash } from "node:crypto";

export const SAFE_CONNECTOR_RECOVERY_MAX_ATTEMPTS = 3;
export const SAFE_CONNECTOR_RECOVERY_COOLDOWN_SECONDS = 300;
export const SAFE_CONNECTOR_RECOVERY_EXPIRY_HOURS = 24;

export type RecoveryClassification =
  | "safe-bounded-retry"
  | "owner-approval-required"
  | "not-retryable";

export type RecoverySourceKind =
  | "connector-audit"
  | "event-dead-letter"
  | "credential-reference";

export type RecoveryAction =
  | "connector-health-retry"
  | "event-held-replay"
  | "credential-remediation";

export function stableRecoverySourceKey(input:{
  workspaceId:string;
  sourceKind:RecoverySourceKind;
  sourceId:string;
  action:RecoveryAction;
}) {
  return createHash("sha256")
    .update(
      [input.workspaceId,input.sourceKind,input.sourceId,input.action]
        .join("|"),
      "utf8"
    )
    .digest("hex");
}

export function connectorFailureClassification(input:{
  status:"succeeded"|"failed"|"blocked";
  errorCode:string|null;
  transportKind:"legacy"|"local"|"http";
}) {
  if(input.status!=="failed"){
    return {
      classification:"not-retryable" as RecoveryClassification,
      reasonCode:"connector-latest-evidence-not-failed",
      maxAttempts:0,
      cooldownSeconds:0,
      autoExecutionAllowed:false
    };
  }
  if(input.transportKind!=="http"){
    return {
      classification:"owner-approval-required" as RecoveryClassification,
      reasonCode:"connector-health-retry-requires-http-transport",
      maxAttempts:0,
      cooldownSeconds:0,
      autoExecutionAllowed:false
    };
  }
  const code=input.errorCode??"";
  const retryable=
    code==="connector_request_timeout" ||
    code==="connector_request_failed" ||
    /^connector_http_status_(408|429|5\d\d)$/.test(code);

  return retryable
    ? {
        classification:"safe-bounded-retry" as RecoveryClassification,
        reasonCode:"connector-transient-health-failure",
        maxAttempts:SAFE_CONNECTOR_RECOVERY_MAX_ATTEMPTS,
        cooldownSeconds:SAFE_CONNECTOR_RECOVERY_COOLDOWN_SECONDS,
        autoExecutionAllowed:true
      }
    : {
        classification:"owner-approval-required" as RecoveryClassification,
        reasonCode:"connector-failure-needs-owner-review",
        maxAttempts:0,
        cooldownSeconds:0,
        autoExecutionAllowed:false
      };
}

export function eventFailureClassification(category:string) {
  if(category==="transient" || category==="unknown"){
    return {
      classification:"owner-approval-required" as RecoveryClassification,
      reasonCode:category==="transient"
        ? "event-transient-held-replay-needs-owner-approval"
        : "event-unknown-failure-needs-owner-review",
      action:"event-held-replay" as RecoveryAction,
      autoExecutionAllowed:false
    };
  }
  return {
    classification:"not-retryable" as RecoveryClassification,
    reasonCode:"event-permanent-or-policy-failure",
    action:"event-held-replay" as RecoveryAction,
    autoExecutionAllowed:false
  };
}

export function credentialRecoveryClassification(riskState:string){
  if(riskState==="active"){
    return {
      classification:"not-retryable" as RecoveryClassification,
      reasonCode:"credential-reference-active",
      action:"credential-remediation" as RecoveryAction,
      autoExecutionAllowed:false
    };
  }
  return {
    classification:"owner-approval-required" as RecoveryClassification,
    reasonCode:"credential-reference-"+riskState,
    action:"credential-remediation" as RecoveryAction,
    autoExecutionAllowed:false
  };
}

export function safeOwnerDecisionReason(value:string){
  const normalized=value.trim();
  return normalized.length>=8 &&
    normalized.length<=500 &&
    !/[\u0000-\u001f\u007f]/.test(normalized);
}
