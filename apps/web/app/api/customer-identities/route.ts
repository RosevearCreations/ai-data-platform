import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listCustomerIdentityForUser,
  recordCustomerIdentityObservation,
  reviewCustomerIdentityCandidate
} from "@/lib/customer-identity-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message === "workspace_admin_required") return 403;
  if (message.includes("not_found")) return 404;
  if (
    message.includes("invalid") ||
    message.includes("insufficient") ||
    message.includes("required")
  ) return 400;
  return 409;
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }
  const model = await listCustomerIdentityForUser(userId);
  return Response.json(model, {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "record-observation") {
      const result =
        await recordCustomerIdentityObservation(
          userId,
          {
            workspaceId: String(body.workspaceId ?? ""),
            sourceApplicationId: String(
              body.sourceApplicationId ?? ""
            ),
            canonicalTenantKey: String(
              body.canonicalTenantKey ?? ""
            ),
            sourceRecordId: String(
              body.sourceRecordId ?? ""
            ),
            sourceRecordVersion:
              typeof body.sourceRecordVersion === "string"
                ? body.sourceRecordVersion
                : null,
            email:
              typeof body.email === "string"
                ? body.email
                : null,
            phone:
              typeof body.phone === "string"
                ? body.phone
                : null,
            displayName:
              typeof body.displayName === "string"
                ? body.displayName
                : null,
            postalCode:
              typeof body.postalCode === "string"
                ? body.postalCode
                : null
          }
        );
      return Response.json({ result });
    }

    if (action === "review-candidate") {
      const result =
        await reviewCustomerIdentityCandidate(
          userId,
          {
            candidateId: String(
              body.candidateId ?? ""
            ),
            decision:
              body.decision === "accept"
                ? "accept"
                : body.decision === "reject"
                  ? "reject"
                  : ("" as "accept"),
            reason: String(body.reason ?? "")
          }
        );
      return Response.json({ result });
    }

    return Response.json(
      { error: "customer_identity_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "customer_identity_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
