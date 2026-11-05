import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listDeliveryGuaranteesForUser,
  reconcileDeliveryGuaranteesForUser
} from "@/lib/event-delivery-guarantees-database";

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
    message.includes("invalid") ||
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
  const model = await listDeliveryGuaranteesForUser(userId);
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
    if (action === "reconcile-held-routes") {
      const result = await reconcileDeliveryGuaranteesForUser(
        userId,
        String(body.workspaceId ?? "")
      );
      return Response.json({ result });
    }

    return Response.json(
      { error: "delivery_guarantee_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "delivery_guarantee_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
