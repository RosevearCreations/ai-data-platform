import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  activateBuild377ThreeMasterSync,
  executeBuild377LiveTrustedConnectionIntake,
  listBuild377YwLiveConnectionContinuityForUser,
  recordBuild377AcceptanceRevalidation,
  recordBuild377PostConnectionContinuity
} from "@/lib/yw562-live-trusted-connection-continuity-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32_768;

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
    message.includes("_not_ready") ||
    message.includes("_incomplete") ||
    message.includes("_already_executed")
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
    "api.yw562-live-connection-continuity.get",
    async () => {
      try {
        return Response.json(
          await listBuild377YwLiveConnectionContinuityForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "build377_list_failed";
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
    "api.yw562-live-connection-continuity.post",
    async () => {
      try {
        const raw = await request.text();
        if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
          return Response.json({ error: "build377_body_invalid" }, { status: 400 });
        }

        const body = JSON.parse(raw) as Record<string, unknown>;
        const action = String(body.action ?? "");

        if (action === "execute-live-intake") {
          const result = await executeBuild377LiveTrustedConnectionIntake(
            userId,
            { registryEvidenceId: body.registryEvidenceId }
          );
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "revalidate-acceptance") {
          const result = await recordBuild377AcceptanceRevalidation(userId);
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "activate-three-master-sync") {
          const result = await activateBuild377ThreeMasterSync(userId);
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        if (action === "monitor-continuity") {
          const result = await recordBuild377PostConnectionContinuity(userId);
          return Response.json({ recorded: true, result }, { status: 201 });
        }

        return Response.json(
          { error: "build377_action_invalid" },
          { status: 400 }
        );
      } catch (error) {
        const message =
          error instanceof SyntaxError
            ? "build377_json_invalid"
            : error instanceof Error
              ? error.message
              : "build377_operation_failed";
        return Response.json({ error: message }, { status: statusFor(message) });
      }
    }
  );
}
