import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listProductionLearningVIIIForUser,
  refreshProductionLearningVIII
} from "@/lib/production-learning-viii-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_384;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("suite_admin_required")) return 403;
  if (message.includes("_invalid") || message.includes("_missing")) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(
    userId,
    "api.production-learning-viii.get",
    async () => {
      try {
        return Response.json(
          await listProductionLearningVIIIForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "production_learning_viii_list_failed";
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
    "api.production-learning-viii.post",
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
            { error: "production_learning_viii_body_too_large" },
            { status: 413 }
          );
        }

        const raw = await request.text();
        if (
          raw.length < 2 ||
          Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES
        ) {
          return Response.json(
            { error: "production_learning_viii_body_invalid" },
            { status: 400 }
          );
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        if (body.action !== "refresh-learning-viii") {
          return Response.json(
            { error: "production_learning_viii_action_invalid" },
            { status: 400 }
          );
        }

        const result = await refreshProductionLearningVIII(userId);
        return Response.json(
          { recorded: true, ...result },
          { status: 201, headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "production_learning_viii_json_invalid"
            : error instanceof Error
              ? error.message
              : "production_learning_viii_operation_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}
