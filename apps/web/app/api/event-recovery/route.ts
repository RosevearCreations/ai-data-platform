import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  dismissEventBusDeadLetter,
  listEventRecoveryForUser,
  recordEventBusFailure,
  requestEventBusReplay
} from "@/lib/event-recovery-database";

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
  if (
    message === "event_bus_route_not_found" ||
    message === "event_bus_dead_letter_not_found"
  ) return 404;
  if (
    message.includes("invalid") ||
    message.includes("not_replayable") ||
    message.includes("not_active") ||
    message.includes("dismissed")
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

  const model = await listEventRecoveryForUser(userId);
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

    if (action === "record-failure") {
      const result = await recordEventBusFailure(userId, {
        routeId: String(body.routeId ?? ""),
        category: String(body.category ?? ""),
        code: String(body.code ?? ""),
        summary: String(body.summary ?? ""),
        attemptNumber: Number(body.attemptNumber),
        details:
          body.details &&
          typeof body.details === "object" &&
          !Array.isArray(body.details)
            ? body.details
            : {}
      });
      return Response.json(result, { status: 201 });
    }

    if (action === "request-replay") {
      const result = await requestEventBusReplay(userId, {
        deadLetterId: String(body.deadLetterId ?? ""),
        reason: String(body.reason ?? "")
      });
      return Response.json(result, { status: 201 });
    }

    if (action === "dismiss-dead-letter") {
      const result = await dismissEventBusDeadLetter(userId, {
        deadLetterId: String(body.deadLetterId ?? ""),
        reason: String(body.reason ?? "")
      });
      return Response.json(result, { status: 200 });
    }

    return Response.json(
      { error: "event_recovery_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "event_recovery_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
