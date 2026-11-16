import { createHash, randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import {
  BUILD_412_SUPERVISED_ACTIONS,
  evaluateBuild412SupervisedAction,
  type Build412ApplicationId,
  type Build412SupervisedAction
} from "./master-security-incident-fusion";
import { BUILD_405_APPLICATION_IDS } from "./master-assurance-renewal-security-comms-recertification";

function isAppId(value: string): value is Build412ApplicationId {
  return (BUILD_405_APPLICATION_IDS as readonly string[]).includes(value);
}
function isAction(value: string): value is Build412SupervisedAction {
  return (BUILD_412_SUPERVISED_ACTIONS as readonly string[]).includes(value);
}
function digest(value: string) {
  return "sha256:" + createHash("sha256").update(value, "utf8").digest("hex");
}

export async function requestBuild412SupervisedAction(
  userId: string,
  input: {
    appId: string;
    action: string;
    reason: string;
    incidentCorrelationId: string;
    independentCustodianReceiptId: string;
  }
) {
  if (!isAppId(input.appId)) throw new Error("incident_app_invalid");
  if (!isAction(input.action)) throw new Error("incident_action_invalid");
  const appId: Build412ApplicationId = input.appId;
  const action: Build412SupervisedAction = input.action;
  const reason = input.reason.trim();
  const incidentCorrelationId = input.incidentCorrelationId.trim();
  if (reason.length < 10 || reason.length > 500) throw new Error("incident_reason_invalid");
  if (incidentCorrelationId.length < 8 || incidentCorrelationId.length > 200) {
    throw new Error("incident_correlation_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const roleResult = await client.query<{ role: "owner" | "operator" | null }>(
      "select app.current_master_sysop_role() as role"
    );
    const requesterRole = roleResult.rows[0]?.role ?? null;

    const receipt = await client.query<{
      receipt_id: string;
      custodian_user_id: string;
    }>(
      `select receipt_id,custodian_user_id
       from app.master_build411_custodian_receipts
       where receipt_id=$1 and state='VERIFIED' and expires_at>now()
       order by issued_at desc limit 1`,
      [input.independentCustodianReceiptId]
    );
    const custodian = receipt.rows[0];

    const reasonDigest = digest(reason);
    const decision = evaluateBuild412SupervisedAction({
      appId,
      action,
      requesterRole,
      requesterUserId: userId,
      reasonDigest,
      custodianUserId: custodian?.custodian_user_id ?? null,
      custodianReceiptVerified: Boolean(custodian)
    });
    if (decision.state !== "AUTHORIZED_FOR_SOURCE_HANDOFF") {
      throw new Error(decision.state.toLowerCase());
    }

    const intentId = randomUUID();
    const ownerApprovalReceiptId = randomUUID();
    await client.query(
      `insert into app.master_build412_remediation_intents (
        intent_id,incident_correlation_id,app_id,action,requester_user_id,
        reason_digest,owner_approval_receipt_id,custodian_receipt_id,state
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'QUEUED_FOR_SOURCE')`,
      [
        intentId, incidentCorrelationId, appId, action, userId, reasonDigest,
        ownerApprovalReceiptId, custodian?.receipt_id
      ]
    );

    return {
      intentId,
      incidentCorrelationId,
      appId,
      action,
      state: "QUEUED_FOR_SOURCE" as const,
      ownerApprovalReceiptId,
      aiDataPlatformExecutedPeerAction: false,
      sourceExecutionReceiptRequired: true,
      postActionTelemetryRequired: true
    };
  });
}
