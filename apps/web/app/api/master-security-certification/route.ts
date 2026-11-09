import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listMasterSecurityCertificationForUser,
  recordMasterSecurityCertification
} from "@/lib/master-security-certification-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 131_072;

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
  if (
    message.includes("_invalid") ||
    message.includes("_mismatch") ||
    message.includes("_requires_") ||
    message.includes("_duplicate_") ||
    message.includes("_missing")
  ) {
    return 400;
  }
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(
    userId,
    "api.master-security-certification.get",
    async () => {
      try {
        return Response.json(
          await listMasterSecurityCertificationForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_security_certification_list_failed";
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
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(
    userId,
    "api.master-security-certification.post",
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
            { error: "master_security_certification_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_security_certification_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        const result = await recordMasterSecurityCertification(userId, {
          sourceId: body.sourceId,
          reviewer: String(body.reviewer ?? ""),
          observedAt: String(body.observedAt ?? ""),
          expiresAt: String(body.expiresAt ?? ""),
          branch: String(body.branch ?? ""),
          commitSha: String(body.commitSha ?? ""),
          notes: optionalString(body.notes),
          assertions: body.assertions
        });

        return Response.json(
          { recorded: true, run: result },
          {
            status: 201,
            headers: { "Cache-Control": "no-store" }
          }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_security_certification_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_security_certification_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
