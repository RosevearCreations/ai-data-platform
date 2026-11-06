import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listNotificationConsentForUser,
  prepareNotificationRequest,
  recordNotificationConsent,
  recordNotificationDeliveryEvidence,
  reviewNotificationRequest
} from "@/lib/notification-consent-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message === "workspace_admin_required") return 403;
  if (message.includes("not_found")) return 404;
  if (message.includes("invalid") || message.includes("not_granted")) return 400;
  return 409;
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });
  return Response.json(await listNotificationConsentForUser(userId), {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "record-consent") {
      return Response.json({ result: await recordNotificationConsent(userId, {
        workspaceId: String(body.workspaceId ?? ""),
        canonicalTenantKey: String(body.canonicalTenantKey ?? ""),
        customerRecordId: String(body.customerRecordId ?? ""),
        channel: String(body.channel ?? ""),
        state: String(body.state ?? ""),
        basis: String(body.basis ?? ""),
        sourceApplicationId: String(body.sourceApplicationId ?? ""),
        sourceRecordId: String(body.sourceRecordId ?? ""),
        observedAt: String(body.observedAt ?? ""),
        expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null
      })});
    }

    if (action === "prepare-request") {
      return Response.json({ result: await prepareNotificationRequest(userId, {
        workspaceId: String(body.workspaceId ?? ""),
        canonicalTenantKey: String(body.canonicalTenantKey ?? ""),
        sourceApplicationId: String(body.sourceApplicationId ?? ""),
        sourceRecordId: String(body.sourceRecordId ?? ""),
        customerRecordId: String(body.customerRecordId ?? ""),
        channel: String(body.channel ?? ""),
        templateKey: String(body.templateKey ?? ""),
        consentBasis: String(body.consentBasis ?? ""),
        requestedAt: String(body.requestedAt ?? ""),
        scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
        subject: typeof body.subject === "string" ? body.subject : null,
        contentSummary: String(body.contentSummary ?? "")
      })});
    }

    if (action === "review-request") {
      const decision = body.decision === "approve" ? "approve" :
        body.decision === "reject" ? "reject" : null;
      if (!decision) return Response.json({ error: "notification_review_decision_invalid" }, { status: 400 });
      return Response.json({ result: await reviewNotificationRequest(userId, {
        requestId: String(body.requestId ?? ""),
        decision,
        reason: String(body.reason ?? "")
      })});
    }

    if (action === "record-delivery-evidence") {
      const status = body.status === "not-dispatched" ? "not-dispatched" :
        body.status === "external-evidence-only" ? "external-evidence-only" : null;
      if (!status) return Response.json({ error: "notification_evidence_status_invalid" }, { status: 400 });
      return Response.json({ result: await recordNotificationDeliveryEvidence(userId, {
        requestId: String(body.requestId ?? ""),
        status,
        providerMessageId: typeof body.providerMessageId === "string" ? body.providerMessageId : null,
        observedAt: String(body.observedAt ?? "")
      })});
    }

    return Response.json({ error: "notification_action_invalid" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "notification_request_failed";
    return Response.json({ error: message }, { status: statusForError(message) });
  }
}
