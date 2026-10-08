import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  archiveCustomWorkspaceProfile,
  createCustomWorkspaceProfile,
  listWorkspaceProfilesForUser,
  updateCustomWorkspaceProfile
} from "@/lib/workspace-profile-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const includeArchived =
    new URL(request.url).searchParams.get("includeArchived") === "true";
  return Response.json({
    profiles: await listWorkspaceProfilesForUser(userId, { includeArchived })
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(
      { profile: await createCustomWorkspaceProfile(userId, await request.json()) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "workspace_profile_invalid";
    return Response.json(
      { error: message },
      { status: message === "workspace_profile_manager_required" ? 403 : 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const profileKey =
    typeof body.profileKey === "string" ? body.profileKey : "";
  if (!profileKey || (body.action !== "update" && body.action !== "archive")) {
    return Response.json({ error: "Invalid profile mutation." }, { status: 400 });
  }
  try {
    const profile =
      body.action === "archive"
        ? await archiveCustomWorkspaceProfile(userId, profileKey)
        : await updateCustomWorkspaceProfile(userId, profileKey, body.profile);
    return Response.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "workspace_profile_invalid";
    const status =
      message === "workspace_profile_not_found"
        ? 404
        : message.includes("immutable") ||
            message.includes("not_editable") ||
            message === "workspace_profile_manager_required"
          ? 403
          : 400;
    return Response.json({ error: message }, { status });
  }
}
