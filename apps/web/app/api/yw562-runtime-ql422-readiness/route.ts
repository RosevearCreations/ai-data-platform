import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  admitBuild378FreshSourceBoundReceipt,
  intakeBuild378RuntimePrerequisiteEvidence,
  listBuild378RuntimeQl422ReadinessForUser,
  recordBuild378ProtectedActivationReadiness,
  recordBuild378Ql422ReferenceCandidate
} from "@/lib/yw562-runtime-ql422-protected-readiness-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 65_536;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusFor(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) {
    return 403;
  }
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_mismatch") ||
    message.includes("_stale") ||
    message.includes("_not_ready") ||
    message.includes("_incomplete") ||
    message.includes("_not_verified")
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
    "api.yw562-runtime-ql422-readiness.get",
    async () => {
      try {
        return Response.json(
          await listBuild378RuntimeQl422ReadinessForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "build378_list_failed";
        return Response.json({ error: message }, { status: statusFor(message) });
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
    "api.yw562-runtime-ql422-readiness.post",
    async () => {
      try {
        const raw = await request.text();
        if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
          return Response.json({ error: "build378_body_invalid" }, { status: 400 });
        }
        const body = JSON.parse(raw) as Record<string, unknown>;
        const action = String(body.action ?? "");

        if (action === "intake-runtime-prerequisites") {
          const result = await intakeBuild378RuntimePrerequisiteEvidence(
            userId,
            body
          );
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "admit-fresh-receipt") {
          const result = await admitBuild378FreshSourceBoundReceipt(userId);
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "record-ql422-reference") {
          const result = await recordBuild378Ql422ReferenceCandidate(
            userId,
            body
          );
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "recheck-readiness") {
          const result = await recordBuild378ProtectedActivationReadiness(userId);
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        return Response.json(
          { error: "build378_action_invalid" },
          { status: 400 }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "build378_json_invalid"
            : error instanceof Error
              ? error.message
              : "build378_operation_failed";
        return Response.json({ error: message }, { status: statusFor(message) });
      }
    }
  );
}
