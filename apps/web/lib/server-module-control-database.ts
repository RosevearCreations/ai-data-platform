import { createHash, randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import {
  BUILD_411_MODULE_ACTIONS,
  evaluateBuild411ModuleControlRequest,
  type Build411ModuleAction
} from "./master-privileged-operations-server-custody";
import {
  BUILD_410_SERVER_MODULE_IDS,
  type Build410ServerModuleId
} from "./master-sensitive-data-dlp-server-shell";

function isModuleId(value: string): value is Build410ServerModuleId {
  return (BUILD_410_SERVER_MODULE_IDS as readonly string[]).includes(value);
}

function isAction(value: string): value is Build411ModuleAction {
  return (BUILD_411_MODULE_ACTIONS as readonly string[]).includes(value);
}

function digestReason(reason: string) {
  return "sha256:" + createHash("sha256").update(reason, "utf8").digest("hex");
}

export async function requestServerModuleControl(
  userId: string,
  input: {
    moduleId: string;
    action: string;
    reason: string;
    independentCustodianReceiptId?: string | null;
  }
) {
  if (!isModuleId(input.moduleId)) throw new Error("server_module_invalid");
  if (!isAction(input.action)) throw new Error("server_module_action_invalid");

  const moduleId: Build410ServerModuleId = input.moduleId;
  const action: Build411ModuleAction = input.action;
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500) {
    throw new Error("server_module_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const roleResult = await client.query<{ role: "owner" | "operator" | null }>(
      "select app.current_master_sysop_role() as role"
    );
    const requesterRole = roleResult.rows[0]?.role ?? null;

    let custodian:
      | { receipt_id: string; custodian_user_id: string; expires_at: Date }
      | undefined;

    if (input.independentCustodianReceiptId) {
      const receipt = await client.query<{
        receipt_id: string;
        custodian_user_id: string;
        expires_at: Date;
      }>(
        `select receipt_id,custodian_user_id,expires_at
         from app.master_build411_custodian_receipts
         where receipt_id=$1
           and state='VERIFIED'
           and expires_at>now()
         order by issued_at desc
         limit 1`,
        [input.independentCustodianReceiptId]
      );
      custodian = receipt.rows[0];
    }

    const reasonDigest = digestReason(reason);
    const decision = evaluateBuild411ModuleControlRequest({
      moduleId,
      action,
      requesterRole,
      requesterUserId: userId,
      reasonDigest,
      independentCustodianUserId: custodian?.custodian_user_id ?? null,
      independentCustodianReceiptVerified: Boolean(custodian)
    });

    if (decision.state !== "AUTHORIZED_FOR_PROTECTED_HOST") {
      throw new Error(decision.state.toLowerCase());
    }

    const intentId = randomUUID();
    const ownerApprovalReceiptId = randomUUID();

    await client.query(
      `insert into app.master_build411_module_control_intents (
         intent_id,module_id,action,requester_user_id,reason_digest,
         owner_approval_receipt_id,independent_custodian_receipt_id,
         desired_state,control_state
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,'QUEUED')`,
      [
        intentId,
        moduleId,
        action,
        userId,
        reasonDigest,
        ownerApprovalReceiptId,
        custodian?.receipt_id ?? null,
        action === "DISABLE" ? "DISABLED" : "ENABLED"
      ]
    );

    return {
      intentId,
      moduleId,
      action,
      controlState: "QUEUED" as const,
      ownerApprovalReceiptId,
      requiresProtectedWindowsHost: true,
      physicalActionCompleted: false
    };
  });
}
