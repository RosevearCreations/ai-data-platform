import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  executeBuild379SupervisedActivationDecision,
  listBuild379ProtectedActivationForUser,
  recheckBuild379ProtectedActivation
} from "@/lib/yw562-protected-runtime-activation-decision-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 8_192;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusFor(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_not_ready") ||
    message.includes("_not_current") ||
    message.includes("_already_executed")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(userId, "api.yw562-protected-activation.get", async () => {
    try {
      return Response.json(await listBuild379ProtectedActivationForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build379_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.yw562-protected-activation.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build379_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "execute-supervised-activation-decision") {
        const decision = String(body.decision ?? "");
        if (decision !== "APPROVE_ACTIVATION" && decision !== "REJECT_ACTIVATION") {
          return Response.json({ error: "build379_activation_decision_invalid" }, { status: 400 });
        }
        const result = await executeBuild379SupervisedActivationDecision(userId, {
          decision,
          ownerNote: String(body.ownerNote ?? ""),
          ownerAttested: body.ownerAttested === true
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "recheck") {
        return Response.json({
          recorded: false,
          result: await recheckBuild379ProtectedActivation(userId)
        });
      }

      return Response.json({ error: "build379_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build379_json_invalid"
          : error instanceof Error
            ? error.message
            : "build379_operation_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
