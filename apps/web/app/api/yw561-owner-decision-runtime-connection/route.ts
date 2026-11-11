import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  executeBuild375OwnerDecision,
  listBuild375Yw561DecisionRuntimeConnectionForUser,
  recordBuild375Reconciliation
} from "@/lib/yw561-owner-decision-runtime-connection-reconciliation-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 65_536;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusFor(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_gate_hold") ||
    message.includes("_already_current")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(userId, "api.yw561-owner-decision-runtime-connection.get", async () => {
    try {
      return Response.json(
        await listBuild375Yw561DecisionRuntimeConnectionForUser(userId),
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "build375_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(userId, "api.yw561-owner-decision-runtime-connection.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build375_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "execute-owner-decision") {
        const result = await executeBuild375OwnerDecision(userId, {
          decision: body.decision,
          evidenceURI: body.evidenceURI,
          detail: body.detail,
          decidedAt: body.decidedAt
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "reconcile") {
        const result = await recordBuild375Reconciliation(userId);
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      return Response.json({ error: "build375_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build375_json_invalid"
          : error instanceof Error
            ? error.message
            : "build375_operation_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
