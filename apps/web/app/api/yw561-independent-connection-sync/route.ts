import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  intakeBuild376IndependentConnectionEvidence,
  listBuild376Yw561ConnectionSyncForUser,
  recordBuild376ConnectionSyncRecheck
} from "@/lib/yw561-independent-connection-three-master-sync-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32_768;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusFor(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_not_trusted") ||
    message.includes("_already_intaked")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.yw561-independent-connection-sync.get", async () => {
    try {
      return Response.json(
        await listBuild376Yw561ConnectionSyncForUser(userId),
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "build376_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.yw561-independent-connection-sync.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build376_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "intake-connection-evidence") {
        const result = await intakeBuild376IndependentConnectionEvidence(userId, {
          registryEvidenceId: body.registryEvidenceId
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "recheck") {
        const result = await recordBuild376ConnectionSyncRecheck(userId);
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      return Response.json({ error: "build376_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build376_json_invalid"
          : error instanceof Error
            ? error.message
            : "build376_operation_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
