import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listFieldMappingStudioForUser,
  saveFieldMappingProfile
} from "@/lib/field-mapping-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function bodyObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function responseError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "field_mapping_request_failed";
  const status =
    message === "workspace_admin_required"
      ? 403
      : message === "field_mapping_profile_not_found"
        ? 404
        : message === "field_mapping_review_incomplete"
          ? 409
          : 400;
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listFieldMappingStudioForUser(id), {
    headers: { "cache-control": "no-store" }
  });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = bodyObject(await request.json().catch(() => null));
  const action = String(body.action ?? "");
  if (action !== "save" && action !== "review") {
    return Response.json(
      { error: "field_mapping_action_invalid" },
      { status: 400 }
    );
  }

  try {
    const profile = await saveFieldMappingProfile(id, {
      workspaceId: body.workspaceId,
      mappingProfileId: body.mappingProfileId,
      applicationId: body.applicationId,
      contractId: body.contractId,
      profileName: body.profileName,
      sourceSchemaLabel: body.sourceSchemaLabel,
      mappingEntries: body.mappingEntries,
      notes: body.notes,
      review: action === "review"
    });
    return Response.json(
      { profile },
      {
        status: body.mappingProfileId ? 200 : 201,
        headers: { "cache-control": "no-store" }
      }
    );
  } catch (error) {
    return responseError(error);
  }
}
