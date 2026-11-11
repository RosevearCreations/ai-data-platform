import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild367OwnerReviewForUser,
  prepareBuild367OwnerReviewPacket,
  recordBuild367ExplicitDecision
} from "@/lib/source-owner-review-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 65_536;

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
function status(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  if (
    message.includes("_invalid") ||
    message.includes("_not_found") ||
    message.includes("_gate_hold") ||
    message.includes("_missing")
  ) return 400;
  return 500;
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(id, "api.source-owner-review.get", async () => {
    try {
      return Response.json(await listBuild367OwnerReviewForUser(id), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build367_list_failed";
      return Response.json({ error: message }, { status: status(message) });
    }
  });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "authentication_required" }, { status: 401 });
  return observeApiOperation(id, "api.source-owner-review.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build367_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");
      if (action === "prepare-review-packet") {
        const result = await prepareBuild367OwnerReviewPacket(id, body.sourceId);
        return Response.json({ recorded: true, result }, { status: 201 });
      }
      if (action === "record-explicit-decision") {
        const result = await recordBuild367ExplicitDecision(id, {
          packetId: body.packetId,
          decision: body.decision,
          evidenceURI: body.evidenceURI,
          detail: body.detail,
          decidedAt: body.decidedAt
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }
      return Response.json({ error: "build367_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build367_json_invalid"
          : error instanceof Error
            ? error.message
            : "build367_operation_failed";
      return Response.json({ error: message }, { status: status(message) });
    }
  });
}
