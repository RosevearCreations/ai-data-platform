import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { listCollectionRunConsoleForUser } from "@/lib/collection-runs";
import { requestWorkspaceRemoteExecutionCancellation } from "@/lib/remote-execution-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json(await listCollectionRunConsoleForUser(current.user.id));
}

export async function PATCH(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const action = typeof body.action === "string" ? body.action : "";

  if (!workspaceId || !jobId || action !== "cancel") {
    return Response.json({ error: "Invalid collection-run request." }, { status: 400 });
  }

  try {
    const job = await requestWorkspaceRemoteExecutionCancellation(
      current.user.id,
      workspaceId,
      jobId
    );
    return Response.json({
      workspaceId: job.workspaceId,
      jobId: job.jobId,
      status: job.status,
      cancelRequestedAt: job.cancelRequestedAt?.toISOString() ?? null
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Collection-run cancellation failed."
      },
      { status: 409 }
    );
  }
}
