import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { upsertRemotePilotAllowlist } from "@/lib/remote-pilot-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const sourceUrl =
    typeof body.sourceUrl === "string" ? body.sourceUrl : "";
  const policyId =
    typeof body.policyId === "string" ? body.policyId : "";
  const policyFingerprint =
    typeof body.policyFingerprint === "string" ? body.policyFingerprint : "";
  const policyRevision =
    typeof body.policyRevision === "number" && Number.isInteger(body.policyRevision)
      ? body.policyRevision
      : 0;

  if (
    !workspaceId ||
    !sourceUrl ||
    !policyId ||
    !policyFingerprint ||
    policyRevision < 1
  ) {
    return Response.json({ error: "Invalid allowlist request." }, { status: 400 });
  }

  try {
    const entry = await upsertRemotePilotAllowlist(current.user.id, {
      workspaceId,
      sourceUrl,
      policyPin: {
        policyId,
        policyRevision,
        policyFingerprint
      },
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      maxRecords:
        typeof body.maxRecords === "number" ? body.maxRecords : undefined,
      maxRuntimeSeconds:
        typeof body.maxRuntimeSeconds === "number"
          ? body.maxRuntimeSeconds
          : undefined,
      maxUnitsPerRun:
        typeof body.maxUnitsPerRun === "number"
          ? body.maxUnitsPerRun
          : undefined
    });
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "workspace_access_denied" ||
        error.message === "workspace_admin_required"
      ) {
        return Response.json({ error: "Workspace admin access required." }, { status: 403 });
      }
      if (
        error.message.startsWith("remote_") ||
        error.message.startsWith("browserless_")
      ) {
        return Response.json({ error: error.message }, { status: 409 });
      }
    }
    throw error;
  }
}
