import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listMasterProductionReadinessForUser,
  recordMasterProductionReadinessRun
} from "@/lib/master-production-readiness-database";
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
  if (
    message.includes("suite_admin_required") ||
    message.includes("suite_owner_required")
  ) {
    return 403;
  }
  if (
    message.includes("_invalid") ||
    message.includes("_requires_") ||
    message.includes("_duplicate_") ||
    message.includes("_missing") ||
    message.includes("_not_supported") ||
    message.includes("_required") ||
    message.includes("_must_be_empty")
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
    "api.master-production-readiness.get",
    async () => {
      try {
        return Response.json(
          await listMasterProductionReadinessForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_production_readiness_list_failed";
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
    "api.master-production-readiness.post",
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
            { error: "master_production_readiness_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_production_readiness_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        const result = await recordMasterProductionReadinessRun(userId, {
          sourceId: body.sourceId,
          reviewer: String(body.reviewer ?? ""),
          observedAt: String(body.observedAt ?? ""),
          expiresAt: String(body.expiresAt ?? ""),
          branch: String(body.branch ?? ""),
          commitSha: String(body.commitSha ?? ""),
          notes: optionalString(body.notes),
          ownerDecision: String(body.ownerDecision ?? "not-reviewed"),
          ownerDecisionEvidenceURI: optionalString(body.ownerDecisionEvidenceURI),
          ownerDecisionDetail: optionalString(body.ownerDecisionDetail),
          ownerDecidedAt: optionalString(body.ownerDecidedAt),
          assertions: body.assertions
        });

        return Response.json(
          { recorded: true, run: result },
          { status: 201, headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_production_readiness_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_production_readiness_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
