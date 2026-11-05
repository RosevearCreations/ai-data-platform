import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createEventBusSubscription,
  listEventBusForUser,
  publishWebhookReceiptToEventBus,
  updateEventBusSubscription
} from "@/lib/event-bus-database";

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
    message === "event_bus_subscription_not_found" ||
    message === "event_bus_receipt_not_found"
  ) return 404;
  if (
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("denied")
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
  const model = await listEventBusForUser(userId);
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

    if (action === "create-subscription") {
      const subscription =
        await createEventBusSubscription(userId, {
          workspaceId: String(body.workspaceId ?? ""),
          name: String(body.name ?? ""),
          sourceApplicationId:
            body.sourceApplicationId === null ||
            body.sourceApplicationId === undefined ||
            body.sourceApplicationId === ""
              ? null
              : String(body.sourceApplicationId),
          destinationApplicationId: String(
            body.destinationApplicationId ?? ""
          ),
          environment: String(body.environment ?? ""),
          tenantId:
            body.tenantId === null ||
            body.tenantId === undefined ||
            body.tenantId === ""
              ? null
              : String(body.tenantId),
          eventTypes: Array.isArray(body.eventTypes)
            ? body.eventTypes.map(String)
            : []
        });
      return Response.json({ subscription }, { status: 201 });
    }

    if (action === "publish-receipt") {
      const result =
        await publishWebhookReceiptToEventBus(
          userId,
          String(body.receiptId ?? "")
        );
      return Response.json(result, {
        status: result.alreadyPublished ? 200 : 201
      });
    }

    return Response.json(
      { error: "event_bus_action_invalid" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "event_bus_request_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}

export async function PATCH(request: Request) {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const subscription =
      await updateEventBusSubscription(userId, {
        subscriptionId: String(
          body.subscriptionId ?? ""
        ),
        name:
          body.name === undefined
            ? undefined
            : String(body.name),
        state:
          body.state === undefined
            ? undefined
            : String(body.state) as
                | "draft"
                | "active"
                | "paused",
        eventTypes:
          body.eventTypes === undefined
            ? undefined
            : Array.isArray(body.eventTypes)
              ? body.eventTypes.map(String)
              : []
      });
    return Response.json({ subscription });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "event_bus_subscription_update_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
