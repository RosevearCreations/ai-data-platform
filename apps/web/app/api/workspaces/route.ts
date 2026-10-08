import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listWorkspacesForUser } from "@/lib/database";
import {
  archiveWorkspace,
  createWorkspaceFromProfile,
  updateWorkspaceMetadata
} from "@/lib/workspace-profile-database";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    workspaces: await listWorkspacesForUser(session.user.id)
  });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const name = typeof body.name === "string" ? body.name : "";
  const purpose = typeof body.purpose === "string" ? body.purpose : "";
  const profileKey = typeof body.profileKey === "string" ? body.profileKey : "";
  if (!name || !profileKey) {
    return NextResponse.json({ error: "name and profileKey are required." }, { status: 400 });
  }
  try {
    const workspace = await createWorkspaceFromProfile(session.user.id, {
      name, purpose, profileKey
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "workspace_create_failed";
    return NextResponse.json(
      { error: message },
      { status: message === "workspace_profile_manager_required" ? 403 : 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const workspaceId =
    typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  try {
    const workspace =
      body.action === "archive"
        ? await archiveWorkspace(session.user.id, workspaceId)
        : await updateWorkspaceMetadata(session.user.id, {
            workspaceId,
            name: typeof body.name === "string" ? body.name : "",
            purpose: typeof body.purpose === "string" ? body.purpose : ""
          });
    return NextResponse.json({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : "workspace_update_failed";
    return NextResponse.json(
      { error: message },
      { status: message === "workspace_admin_required" ? 403 : 400 }
    );
  }
}
