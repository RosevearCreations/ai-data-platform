import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  applySchemaDriftRepairToDraft,
  cancelSchemaDriftRepair,
  listSchemaDriftAssistantForUser,
  prepareSchemaDriftRepair,
  recordSchemaDriftScan
} from "@/lib/schema-drift-database";

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
    error instanceof Error ? error.message : "schema_drift_request_failed";
  const status =
    message === "workspace_admin_required"
      ? 403
      : [
            "field_mapping_profile_not_found",
            "schema_drift_scan_not_found",
            "schema_drift_repair_not_found"
          ].includes(message)
        ? 404
        : [
              "schema_drift_scan_stale",
              "schema_drift_repair_stale",
              "schema_drift_repair_not_prepared"
            ].includes(message)
          ? 409
          : 400;
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await listSchemaDriftAssistantForUser(id), {
    headers: { "cache-control": "no-store" }
  });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = bodyObject(await request.json().catch(() => null));
  const action = String(body.action ?? "");
  try {
    if (action === "scan") {
      const scan = await recordSchemaDriftScan(id, {
        workspaceId: body.workspaceId,
        mappingProfileId: body.mappingProfileId,
        sourceSchemaVersion: body.sourceSchemaVersion,
        sourceSchemaFields: body.sourceSchemaFields
      });
      return Response.json({ scan }, { status: 201 });
    }

    if (action === "prepare-repair") {
      const repair = await prepareSchemaDriftRepair(id, {
        workspaceId: body.workspaceId,
        driftScanId: body.driftScanId,
        note: body.note
      });
      return Response.json({ repair }, { status: 201 });
    }

    if (action === "apply-repair-to-draft") {
      const profile = await applySchemaDriftRepairToDraft(id, {
        workspaceId: body.workspaceId,
        repairSessionId: body.repairSessionId,
        note: body.note
      });
      return Response.json({ profile });
    }

    if (action === "cancel-repair") {
      const repair = await cancelSchemaDriftRepair(id, {
        workspaceId: body.workspaceId,
        repairSessionId: body.repairSessionId,
        note: body.note
      });
      return Response.json({ repair });
    }

    return Response.json(
      { error: "schema_drift_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    return responseError(error);
  }
}
