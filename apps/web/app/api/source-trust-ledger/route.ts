import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listSourceTrustLedgerForUser,
  recordOwnerDecisionAudit,
  recordTrustedSourceSignerEvent,
  recordVerifiedConvergenceReceipt
} from "@/lib/source-trust-ledger-database";
import type { ConvergenceReceipt } from "@/lib/convergence-receipt-intake";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 131_072;

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("owner_required") || message.includes("admin_required")) return 403;
  if (
    message.includes("_invalid") ||
    message.includes("_required") ||
    message.includes("_not_enrolled") ||
    message.includes("_verification_failed") ||
    message.includes("_replay_or_duplicate") ||
    message.includes("_gate_hold")
  ) return 400;
  return 500;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(userId, "api.source-trust-ledger.get", async () => {
    try {
      return Response.json(await listSourceTrustLedgerForUser(userId), {
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "build365_list_failed";
      return Response.json({ error: message }, { status: statusForError(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(userId, "api.source-trust-ledger.post", async () => {
    try {
      const declaredLength = Number(request.headers.get("content-length") ?? "");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
        return Response.json({ error: "build365_body_too_large" }, { status: 413 });
      }
      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build365_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "signer-event") {
        const result = await recordTrustedSourceSignerEvent(userId, {
          sourceId: body.sourceId,
          eventType: body.eventType,
          keyId: body.keyId,
          publicKeyPem: body.publicKeyPem,
          custodyEvidenceURI: body.custodyEvidenceURI,
          independentlyVerifiedAt: body.independentlyVerifiedAt,
          note: body.note
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "receipt") {
        const result = await recordVerifiedConvergenceReceipt(
          userId,
          body.receipt as ConvergenceReceipt
        );
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "owner-decision") {
        const result = await recordOwnerDecisionAudit(userId, {
          sourceId: body.sourceId,
          receiptId: body.receiptId,
          decision: body.decision,
          evidenceURI: body.evidenceURI,
          detail: body.detail,
          decidedAt: body.decidedAt
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      return Response.json({ error: "build365_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build365_json_invalid"
          : error instanceof Error
            ? error.message
            : "build365_operation_failed";
      return Response.json({ error: message }, { status: statusForError(message) });
    }
  });
}
