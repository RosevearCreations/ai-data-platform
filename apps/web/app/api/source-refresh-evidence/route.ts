import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild369SourceRefreshForUser,
  recordBuild369SourceRefreshEvidence,
  recordBuild369ThreeMasterAcceptanceRecheck
} from "@/lib/source-refresh-evidence-database";

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
    message.includes("_mismatch") ||
    message.includes("_missing") ||
    message.includes("_required") ||
    message.includes("_rejected")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.source-refresh-evidence.get", async () => {
    try {
      return Response.json(await listBuild369SourceRefreshForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build369_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.source-refresh-evidence.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build369_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "record-source-refresh-evidence") {
        const result = await recordBuild369SourceRefreshEvidence(userId, {
          sourceId: body.sourceId,
          handoffToken: body.handoffToken,
          sourceProductionRevision: body.sourceProductionRevision,
          manifestBaselineRevision: body.manifestBaselineRevision,
          deployedManifestRevision: body.deployedManifestRevision,
          tenantBoundary: body.tenantBoundary,
          durableReplayState: body.durableReplayState,
          evidenceURI: body.evidenceURI,
          evidenceDigest: body.evidenceDigest,
          sanitizedAck: body.sanitizedAck,
          receivedAt: body.receivedAt
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "record-three-master-acceptance-recheck") {
        const result = await recordBuild369ThreeMasterAcceptanceRecheck(userId);
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      return Response.json({ error: "build369_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build369_json_invalid"
          : error instanceof Error
            ? error.message
            : "build369_operation_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
