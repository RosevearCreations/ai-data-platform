import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listRoleDeviceAcceptanceForUser,
  recordRoleDeviceAcceptanceEvidence
} from "@/lib/role-device-acceptance-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 65_536;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function statusForError(message: string) {
  if (message.includes("suite_admin_required")) return 403;
  if (message.includes("_not_found")) return 404;
  if (message.includes("_invalid")) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.role-device-acceptance.get",
    async () => {
      try {
        return Response.json(
          await listRoleDeviceAcceptanceForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "role_device_acceptance_list_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.role-device-acceptance.post",
    async () => {
      try {
        const declaredLength = Number(
          request.headers.get("content-length") ?? ""
        );
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "role_device_acceptance_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "role_device_acceptance_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        const evidence = await recordRoleDeviceAcceptanceEvidence(
          userId,
          {
            sourceId: String(body.sourceId ?? ""),
            moduleId: optionalString(body.moduleId),
            role: String(body.role ?? ""),
            device: String(body.device ?? ""),
            state: String(body.state ?? ""),
            evidenceURI: String(body.evidenceURI ?? ""),
            reviewer: String(body.reviewer ?? ""),
            confidence: Number(body.confidence),
            observedAt: String(body.observedAt ?? ""),
            expiresAt: String(body.expiresAt ?? ""),
            branch: String(body.branch ?? ""),
            commitSha: String(body.commitSha ?? ""),
            notes: optionalString(body.notes)
          }
        );

        return Response.json(
          { recorded: true, evidence },
          {
            status: 201,
            headers: { "Cache-Control": "no-store" }
          }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "role_device_acceptance_json_invalid"
            : error instanceof Error
              ? error.message
              : "role_device_acceptance_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
