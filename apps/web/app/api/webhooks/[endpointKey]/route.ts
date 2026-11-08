import {
  WebhookGatewayError,
  readBoundedWebhookBody
} from "@/lib/webhook-gateway-core";
import {
  acceptInboundWebhook,
  loadWebhookEndpointForIntake
} from "@/lib/webhook-gateway-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ endpointKey: string }> }
) {
  const { endpointKey } = await context.params;
  const endpoint = await loadWebhookEndpointForIntake(endpointKey);
  if (!endpoint || endpoint.revokedAt !== null || !endpoint.enabled) {
    return json(
      { accepted: false, error: "webhook_endpoint_not_found" },
      404
    );
  }

  try {
    const body = await readBoundedWebhookBody(
      request,
      endpoint.maxBodyBytes
    );
    const timestampMs = Number(
      request.headers.get("X-Rosevear-Webhook-Timestamp") ?? ""
    );
    const result = await acceptInboundWebhook({
      endpoint,
      contract:
        request.headers.get("X-Rosevear-Webhook-Contract") ?? "",
      keyId:
        request.headers.get("X-Rosevear-Webhook-Key-Id") ?? "",
      eventId:
        request.headers.get("X-Rosevear-Webhook-Event-Id") ?? "",
      timestampMs,
      signature:
        request.headers.get("X-Rosevear-Webhook-Signature") ?? "",
      contentType: request.headers.get("Content-Type") ?? "",
      body
    });

    return json(result, 202);
  } catch (error) {
    const normalized =
      error instanceof WebhookGatewayError
        ? error
        : new WebhookGatewayError(
            "webhook_intake_failed",
            500
          );
    return json(
      { accepted: false, error: normalized.code },
      normalized.status
    );
  }
}
