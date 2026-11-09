import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  approveMasterCompletionDenominator,
  listMasterCompletionForUser,
  recordMasterCompletionEvidence,
  recordMasterCompletionRequirementRevision
} from "@/lib/master-completion-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 131_072;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("suite_admin_required")) return 403;
  if (message.includes("_not_found")) return 404;
  if (
    message.includes("_mismatch") ||
    message.includes("_identity_drift") ||
    message.includes("_nonrequired") ||
    message.includes("_not_required")
  ) {
    return 409;
  }
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_must_be_empty")
  ) {
    return 400;
  }
  return 500;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
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
    "api.master-completion.get",
    async () => {
      try {
        return Response.json(
          await listMasterCompletionForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_completion_list_failed";
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
    "api.master-completion.post",
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
            { error: "master_completion_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "master_completion_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        const action = String(body.action ?? "");

        if (action === "record-requirement-revision") {
          const requirement =
            await recordMasterCompletionRequirementRevision(
              userId,
              {
                sourceId: String(body.sourceId ?? ""),
                moduleId: optionalString(body.moduleId),
                requirementKey: String(
                  body.requirementKey ?? ""
                ),
                title: String(body.title ?? ""),
                description: String(body.description ?? ""),
                applicability: String(
                  body.applicability ?? ""
                ),
                requiredAxes: Array.isArray(body.requiredAxes)
                  ? body.requiredAxes.map(String)
                  : [],
                weight: Number(body.weight),
                critical: body.critical === true
              }
            );
          return Response.json(
            { recorded: true, requirement },
            {
              status: 201,
              headers: { "Cache-Control": "no-store" }
            }
          );
        }

        if (action === "approve-denominator") {
          const approval =
            await approveMasterCompletionDenominator(
              userId,
              {
                sourceId: String(body.sourceId ?? ""),
                moduleId: optionalString(body.moduleId),
                scopeDate: String(body.scopeDate ?? ""),
                branch: String(body.branch ?? ""),
                commitSha: String(body.commitSha ?? ""),
                requirementIds: Array.isArray(
                  body.requirementIds
                )
                  ? body.requirementIds.map(String)
                  : [],
                approvedBy: String(body.approvedBy ?? "")
              }
            );
          return Response.json(
            { approved: true, approval },
            {
              status: 201,
              headers: { "Cache-Control": "no-store" }
            }
          );
        }

        if (action === "record-evidence") {
          const evidence =
            await recordMasterCompletionEvidence(
              userId,
              {
                requirementId: String(
                  body.requirementId ?? ""
                ),
                axis: String(body.axis ?? ""),
                state: String(body.state ?? ""),
                evidenceURI: String(
                  body.evidenceURI ?? ""
                ),
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
        }

        return Response.json(
          { error: "master_completion_action_invalid" },
          { status: 400 }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "master_completion_json_invalid"
            : error instanceof Error
              ? error.message
              : "master_completion_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
