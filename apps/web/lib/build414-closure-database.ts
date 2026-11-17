import { createHash, randomUUID } from "node:crypto";

import { withUserDatabase } from "./database";
import { BUILD_414_ROADMAP_ID } from "./master-acceleration-closure";

function digest(value: string) {
  return "sha256:" + createHash("sha256").update(value).digest("hex");
}

export async function requestBuild414CommsPilot(
  userId: string,
  reason: string
) {
  const trimmed = reason.trim();
  if (trimmed.length < 8 || trimmed.length > 500) {
    throw new Error("build414_pilot_reason_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const role = await client.query<{role:"owner"|"operator"|null}>(
      "select app.current_master_sysop_role() as role"
    );
    if (role.rows[0]?.role !== "owner") throw new Error("build414_owner_required");

    const requestId = randomUUID();
    const reasonDigest = digest(trimmed);
    await client.query(
      `insert into app.master_build414_comms_pilot_requests
       (request_id,owner_user_id,reason_digest,state)
       values ($1,$2,$3,'REQUESTED')`,
      [requestId,userId,reasonDigest]
    );
    return {
      requestId,
      reasonDigest,
      state:"REQUESTED" as const,
      note:"Request recorded only. Rosevear Comms Hub retains message authority and must produce independent pilot receipts."
    };
  });
}

export async function approveBuild414Roadmap(
  userId: string,
  roadmapContent: string
) {
  if (roadmapContent.length < 100) throw new Error("build414_roadmap_content_invalid");

  return withUserDatabase(userId, async (client) => {
    const role = await client.query<{role:"owner"|"operator"|null}>(
      "select app.current_master_sysop_role() as role"
    );
    if (role.rows[0]?.role !== "owner") throw new Error("build414_owner_required");

    const approvalId = randomUUID();
    const roadmapDigest = digest(roadmapContent);
    await client.query(
      `insert into app.master_build414_roadmap_renewal_approvals
       (approval_id,roadmap_id,roadmap_digest,owner_user_id,owner_approved)
       values ($1,$2,$3,$4,true)`,
      [approvalId,BUILD_414_ROADMAP_ID,roadmapDigest,userId]
    );
    return {approvalId,roadmapId:BUILD_414_ROADMAP_ID,roadmapDigest,ownerApproved:true};
  });
}
