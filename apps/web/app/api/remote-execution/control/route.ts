import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listWorkspaceRemotePilotState,
  setRemotePilotControl
} from "@/lib/remote-pilot-database";
import type { BrowserlessRegion } from "@/lib/browserless-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const regions = new Set<BrowserlessRegion>([
  "us-east",
  "us-west",
  "eu-uk",
  "eu-ams"
]);

async function session() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const current = await session();
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  if (!workspaceId) {
    return Response.json({ error: "workspaceId is required." }, { status: 400 });
  }
  try {
    const state = await listWorkspaceRemotePilotState(
      current.user.id,
      workspaceId
    );
    return Response.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "workspace_access_denied") {
      return Response.json({ error: "Workspace access denied." }, { status: 403 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const current = await session();
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  const region =
    typeof body.region === "string" && regions.has(body.region as BrowserlessRegion)
      ? (body.region as BrowserlessRegion)
      : null;
  if (
    !workspaceId ||
    region === null ||
    typeof body.enabled !== "boolean" ||
    typeof body.killSwitch !== "boolean"
  ) {
    return Response.json({ error: "Invalid control request." }, { status: 400 });
  }

  try {
    const control = await setRemotePilotControl(current.user.id, {
      workspaceId,
      enabled: body.enabled,
      killSwitch: body.killSwitch,
      region,
      maxUnitsPerRun:
        typeof body.maxUnitsPerRun === "number"
          ? body.maxUnitsPerRun
          : undefined
    });
    return Response.json({ control });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "workspace_access_denied" ||
        error.message === "workspace_admin_required")
    ) {
      return Response.json({ error: "Workspace admin access required." }, { status: 403 });
    }
    throw error;
  }
}
