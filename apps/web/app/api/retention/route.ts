import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  executeRetentionCleanup,
  setRetentionCleanupApproval
} from "@/lib/retention-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const action =
    body.action === "approve" ||
    body.action === "revoke" ||
    body.action === "run"
      ? body.action
      : null;
  const confirmation =
    typeof body.confirmation === "string" ? body.confirmation : "";

  if (!workspaceId || !action) {
    return Response.json({ error: "invalid_retention_request" }, { status: 400 });
  }

  try {
    if (action === "approve" || action === "revoke") {
      const policy = await setRetentionCleanupApproval(session.user.id, {
        workspaceId,
        approved: action === "approve",
        confirmation
      });
      return Response.json({ ok: true, policy });
    }

    const result = await executeRetentionCleanup(session.user.id, {
      workspaceId,
      confirmation,
      maxRows:
        typeof body.maxRows === "number" && Number.isFinite(body.maxRows)
          ? body.maxRows
          : 100
    });
    const failed = result.status === "failed";
    return Response.json({ ok: !failed, result }, { status: failed ? 500 : 200 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "retention_failed";
    const status =
      code === "workspace_admin_required"
        ? 403
        : code.includes("confirmation")
          ? 400
          : code === "retention_cleanup_not_approved"
            ? 409
            : 500;
    return Response.json({ error: code }, { status });
  }
}
