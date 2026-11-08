import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  buildInboundEndpointEvidence,
  translateWebhookReceiptToHostEvent
} from "@/lib/inbound-endpoint-module";
import {
  createWebhookEndpoint,
  listWebhookGatewayForUser,
  revokeWebhookEndpoint,
  searchWebhookReceiptsForUser,
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

function errorStatus(message: string) {
  if (message === "workspace_admin_required") return 403;
  if (message === "webhook_endpoint_not_found") return 404;
  if (message === "webhook_endpoint_revoked") return 409;
  if (
    message.includes("invalid") ||
    message.includes("required")
  ) {
    return 400;
  }
  return 409;
}

function bodyRecord(value: unknown) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const overview = await listWebhookGatewayForUser(userId);
    const receipts = await searchWebhookReceiptsForUser(userId, {
      workspaceId: url.searchParams.get("workspaceId"),
      endpointId: url.searchParams.get("endpointId"),
      receiptId: url.searchParams.get("receiptId"),
      eventId: url.searchParams.get("eventId"),
      eventType: url.searchParams.get("eventType"),
      sourceApplicationId:
        url.searchParams.get("sourceApplicationId"),
      environment:
        url.searchParams.get("environment") === "production"
          ? "production"
          : url.searchParams.get("environment") === "nonproduction"
            ? "nonproduction"
            : null,
      tenantId: url.searchParams.get("tenantId"),
      limit: Number(url.searchParams.get("limit") ?? 50)
    });
    const endpointById = new Map(
      overview.endpoints.map((endpoint) => [
        endpoint.endpointId,
        endpoint
      ])
    );

    return Response.json(
      {
        endpoints: overview.endpoints.map(buildInboundEndpointEvidence),
        receipts: receipts.map((receipt) => ({
          receiptId: receipt.receiptId,
          endpointId: receipt.endpointId,
          workspaceId: receipt.workspaceId,
          sourceApplicationId: receipt.sourceApplicationId,
          environment: receipt.environment,
          tenantId: receipt.tenantId,
          eventId: receipt.eventId,
          eventType: receipt.eventType,
          bodySha256: receipt.bodySha256,
          receivedAt: receipt.receivedAt.toISOString()
        })),
        hostEvents: receipts.flatMap((receipt) => {
          const endpoint = endpointById.get(receipt.endpointId);
          if (!endpoint) return [];
          return [
            translateWebhookReceiptToHostEvent({
              receipt,
              endpoint
            })
          ];
        }),
        security: {
          callbackDispatchPerformed: false,
          eventBusPublishPerformed: false,
          rawSecretValuesReturned: false
        }
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "webhook_module_search_failed";
    return Response.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
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
    const body = bodyRecord(await request.json().catch(() => null));
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
      callbackApplicationId:
        body.callbackApplicationId === null ||
        body.callbackApplicationId === undefined
          ? null
          : String(body.callbackApplicationId),
      callbackPath:
        body.callbackPath === null ||
        body.callbackPath === undefined
          ? null
          : String(body.callbackPath),
      allowedEventTypes: Array.isArray(body.allowedEventTypes)
        ? body.allowedEventTypes.map(String)
        : [],
      maxBodyBytes:
        body.maxBodyBytes === undefined
          ? undefined
          : Number(body.maxBodyBytes)
    });
    return Response.json(
      {
        endpoint: buildInboundEndpointEvidence(endpoint),
        registrationState: "installed-disabled",
        connectionActivated: false,
        callbackDispatchPerformed: false
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "webhook_module_registration_failed";
    return Response.json(
      { error: message },
      { status: errorStatus(message) }
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
    const body = bodyRecord(await request.json().catch(() => null));
    const endpointId = String(body.endpointId ?? "");
    const action = String(body.action ?? "disable");

    if (action === "revoke") {
      const endpoint = await revokeWebhookEndpoint(
        userId,
        endpointId
      );
      return Response.json({
        endpoint: buildInboundEndpointEvidence(endpoint),
        control: "revoked",
        connectionActivated: false
      });
    }
    if (action !== "disable" && action !== "enable") {
      return Response.json(
        { error: "webhook_endpoint_control_invalid" },
        { status: 400 }
      );
    }

    const endpoint = await updateWebhookEndpoint(userId, {
      endpointId,
      enabled: action === "enable",
      callbackApplicationId:
        body.callbackApplicationId === undefined
          ? undefined
          : body.callbackApplicationId === null
            ? null
            : String(body.callbackApplicationId),
      callbackPath:
        body.callbackPath === undefined
          ? undefined
          : body.callbackPath === null
            ? null
            : String(body.callbackPath)
    });
    return Response.json({
      endpoint: buildInboundEndpointEvidence(endpoint),
      control: action === "enable" ? "enabled" : "disabled",
      connectionActivated: false,
      callbackDispatchPerformed: false
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "webhook_module_control_failed";
    return Response.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}
