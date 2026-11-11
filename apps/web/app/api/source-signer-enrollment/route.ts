import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import type { ConvergenceReceipt } from "@/lib/convergence-receipt-intake";
import { observeApiOperation } from "@/lib/performance-observatory-database";
import {
  admitGenuineSignedHealthReceipt,
  issueSignerCustodyChallenge,
  listSignerEnrollmentAndOwnerReviewForUser,
  submitSignerEnrollmentIntake,
  verifySignerCustodyAndEnroll
} from "@/lib/source-signer-enrollment-database";

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
    message.includes("_expired") ||
    message.includes("_mismatch") ||
    message.includes("_not_enrolled") ||
    message.includes("_replay") ||
    message.includes("_duplicate") ||
    message.includes("_verification_failed") ||
    message.includes("_requires_revocation") ||
    message.includes("_already_committed")
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

  return observeApiOperation(userId, "api.source-signer-enrollment.get", async () => {
    try {
      return Response.json(
        await listSignerEnrollmentAndOwnerReviewForUser(userId),
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "build366_list_failed";
      return Response.json({ error: message }, { status: statusForError(message) });
    }
  });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  return observeApiOperation(userId, "api.source-signer-enrollment.post", async () => {
    try {
      const declaredLength = Number(request.headers.get("content-length") ?? "");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
        return Response.json({ error: "build366_body_too_large" }, { status: 413 });
      }

      const raw = await request.text();
      if (raw.length < 2 || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        return Response.json({ error: "build366_body_invalid" }, { status: 400 });
      }
      const body = JSON.parse(raw) as Record<string, unknown>;
      const action = String(body.action ?? "");

      if (action === "submit-signer-intake") {
        const result = await submitSignerEnrollmentIntake(userId, {
          sourceId: body.sourceId,
          keyId: body.keyId,
          publicKeyPem: body.publicKeyPem,
          independentPinSpkiSha256: body.independentPinSpkiSha256,
          pinEvidenceURI: body.pinEvidenceURI,
          custodyEvidenceURI: body.custodyEvidenceURI,
          witnessEvidenceURI: body.witnessEvidenceURI
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "issue-custody-challenge") {
        const result = await issueSignerCustodyChallenge(userId, {
          intakeId: body.intakeId
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "verify-custody-and-enroll") {
        const result = await verifySignerCustodyAndEnroll(userId, {
          intakeId: body.intakeId,
          signatureBase64: body.signatureBase64
        });
        return Response.json({ recorded: true, result }, { status: 201 });
      }

      if (action === "admit-health-receipt") {
        const result = await admitGenuineSignedHealthReceipt(
          userId,
          body.receipt as ConvergenceReceipt
        );
        return Response.json(
          { recorded: true, result },
          { status: result.admitted ? 201 : 422 }
        );
      }

      return Response.json({ error: "build366_action_invalid" }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof SyntaxError
          ? "build366_json_invalid"
          : error instanceof Error
            ? error.message
            : "build366_operation_failed";
      return Response.json({ error: message }, { status: statusForError(message) });
    }
  });
}
