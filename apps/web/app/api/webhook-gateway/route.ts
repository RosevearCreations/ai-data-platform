import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  createWebhookEndpoint,
  listWebhookGatewayForUser,
  updateWebhookEndpoint
} from "@/lib/webhook-gateway-database";

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
  if (message === "webhook_endpoint_not_found") return 404;
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
  const model = await listWebhookGatewayForUser(userId);
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
    const endpoint = await createWebhookEndpoint(userId, {
      workspaceId: String(body.workspaceId ?? ""),
      sourceApplicationId: String(
        body.sourceApplicationId ?? ""
      ),
      environment: String(body.environment ?? ""),
      tenantId:
        body.tenantId === null || body.tenantId === undefined
          ? null
          : String(body.tenantId),
      displayName: String(body.displayName ?? ""),
      keyId: String(body.keyId ?? ""),
      secretEnvVar: String(body.secretEnvVar ?? ""),
      allowedEventTypes: Array.isArray(body.allowedEventTypes)
        ? body.allowedEventTypes.map(String)
        : [],
      maxBodyBytes:
        body.maxBodyBytes === undefined
          ? undefined
          : Number(body.maxBodyBytes)
    });
    return Response.json({ endpoint }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "webhook_endpoint_create_failed";
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
    const endpoint = await updateWebhookEndpoint(userId, {
      endpointId: String(body.endpointId ?? ""),
      enabled:
        body.enabled === undefined
          ? undefined
          : Boolean(body.enabled),
      displayName:
        body.displayName === undefined
          ? undefined
          : String(body.displayName),
      keyId:
        body.keyId === undefined
          ? undefined
          : String(body.keyId),
      secretEnvVar:
        body.secretEnvVar === undefined
          ? undefined
          : String(body.secretEnvVar),
      allowedEventTypes:
        body.allowedEventTypes === undefined
          ? undefined
          : Array.isArray(body.allowedEventTypes)
            ? body.allowedEventTypes.map(String)
            : [],
      maxBodyBytes:
        body.maxBodyBytes === undefined
          ? undefined
          : Number(body.maxBodyBytes)
    });
    return Response.json({ endpoint });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "webhook_endpoint_update_failed";
    return Response.json(
      { error: message },
      { status: statusForError(message) }
    );
  }
}
