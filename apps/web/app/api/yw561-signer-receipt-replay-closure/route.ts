import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  listBuild372Yw561ClosureForUser,
  recordBuild372CustodyEvidence,
  recordBuild372ReplayCorrelation,
  recordBuild372RuntimeClosureRecheck
} from "@/lib/yw561-signer-receipt-replay-closure-database";

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
    message.includes("_not_found") ||
    message.includes("_must_be_distinct")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.yw561-signer-receipt-replay-closure.get", async () => {
    try {
      return Response.json(await listBuild372Yw561ClosureForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build372_list_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  return observeApiOperation(userId, "api.yw561-signer-receipt-replay-closure.post", async () => {
    try {
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build372_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "record-custody-evidence") {
        const result = await recordBuild372CustodyEvidence(userId, {
          keyId: body.keyId,
          publicKeySpkiSha256: body.publicKeySpkiSha256,
          pinEvidenceURI: body.pinEvidenceURI,
          custodyEvidenceURI: body.custodyEvidenceURI,
          witnessEvidenceURI: body.witnessEvidenceURI
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "record-replay-correlation") {
        const result = await recordBuild372ReplayCorrelation(userId, {
          receiptId: body.receiptId,
          replayEvidenceURI: body.replayEvidenceURI,
          replayEvidenceDigest: body.replayEvidenceDigest
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "record-runtime-closure-recheck") {
        const result = await recordBuild372RuntimeClosureRecheck(userId);
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      return Response.json({ error: "build372_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build372_json_invalid"
          : error instanceof Error
            ? error.message
            : "build372_operation_failed";
      return Response.json({ error: message }, { status: statusFor(message) });
    }
  });
}
