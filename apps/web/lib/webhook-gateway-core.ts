import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_CONTRACT = "rosevear.webhook.v1" as const;
export const WEBHOOK_EVENT_SCHEMA = "rosevear.webhook.event.v1" as const;
export const WEBHOOK_RECEIPT_SCHEMA = "rosevear.webhook.receipt.v1" as const;
export const WEBHOOK_GATEWAY_ID = "ai-data-platform" as const;
export const WEBHOOK_MAX_SKEW_MS = 300_000;
export const WEBHOOK_MAX_BODY_BYTES = 262_144;

export const WEBHOOK_SOURCE_APPLICATIONS = [
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const;

export type WebhookSourceApplication =
  (typeof WEBHOOK_SOURCE_APPLICATIONS)[number];

export interface WebhookEventEnvelope {
  schemaVersion: typeof WEBHOOK_EVENT_SCHEMA;
  eventId: string;
  eventType: string;
  occurredAt: string;
  sourceApplicationId: WebhookSourceApplication;
  tenantId: string | null;
  data: Record<string, unknown>;
}

export interface WebhookReceiptPayload {
  schema_version: typeof WEBHOOK_RECEIPT_SCHEMA;
  gateway_id: typeof WEBHOOK_GATEWAY_ID;
  endpoint_key: string;
  source_application_id: WebhookSourceApplication;
  event_id: string;
  event_type: string;
  body_sha256: string;
  status: "accepted";
  key_id: string;
  received_at: string;
}

export class WebhookGatewayError extends Error {
  readonly code: string;
  readonly status: number;
  readonly identityVerified: boolean;

  constructor(
    code: string,
    status: number,
    message = code,
    identityVerified = false
  ) {
    super(message);
    this.name = "WebhookGatewayError";
    this.code = code;
    this.status = status;
    this.identityVerified = identityVerified;
  }
}

const EVENT_ID_PATTERN = /^evt_[A-Za-z0-9_-]{12,100}$/;
const ENDPOINT_KEY_PATTERN = /^whk_[A-Za-z0-9_-]{24}$/;
const KEY_ID_PATTERN = /^whk-key-[a-z0-9-]{4,50}$/;
const EVENT_TYPE_PATTERN =
  /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+){1,9}$/;
const TENANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BODY_HASH_PATTERN = /^[a-f0-9]{64}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
) {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    actual.every((key) => keys.includes(key))
  );
}

export function safeWebhookEndpointKey(value: string) {
  return ENDPOINT_KEY_PATTERN.test(value);
}

export function safeWebhookKeyId(value: string) {
  return KEY_ID_PATTERN.test(value);
}

export function safeWebhookEventId(value: string) {
  return EVENT_ID_PATTERN.test(value);
}

export function safeWebhookEventType(value: string) {
  return value.length <= 160 && EVENT_TYPE_PATTERN.test(value);
}

export function safeWebhookTenantId(value: string | null) {
  return value === null || TENANT_PATTERN.test(value);
}

export function safeWebhookSignature(value: string) {
  return SIGNATURE_PATTERN.test(value);
}

export function webhookBodySha256(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

export function parseWebhookEventEnvelope(
  value: unknown
): WebhookEventEnvelope {
  const input = record(value);
  const keys = [
    "schemaVersion",
    "eventId",
    "eventType",
    "occurredAt",
    "sourceApplicationId",
    "tenantId",
    "data"
  ] as const;

  if (!input || !exactKeys(input, keys)) {
    throw new WebhookGatewayError(
      "webhook_event_schema_invalid",
      400
    );
  }
  if (input.schemaVersion !== WEBHOOK_EVENT_SCHEMA) {
    throw new WebhookGatewayError(
      "webhook_event_schema_version_invalid",
      400
    );
  }
  if (
    typeof input.eventId !== "string" ||
    !safeWebhookEventId(input.eventId)
  ) {
    throw new WebhookGatewayError("webhook_event_id_invalid", 400);
  }
  if (
    typeof input.eventType !== "string" ||
    !safeWebhookEventType(input.eventType)
  ) {
    throw new WebhookGatewayError("webhook_event_type_invalid", 400);
  }
  if (
    typeof input.sourceApplicationId !== "string" ||
    !WEBHOOK_SOURCE_APPLICATIONS.includes(
      input.sourceApplicationId as WebhookSourceApplication
    )
  ) {
    throw new WebhookGatewayError(
      "webhook_source_application_invalid",
      400
    );
  }
  if (
    input.tenantId !== null &&
    (typeof input.tenantId !== "string" ||
      !safeWebhookTenantId(input.tenantId))
  ) {
    throw new WebhookGatewayError("webhook_tenant_invalid", 400);
  }
  if (typeof input.occurredAt !== "string") {
    throw new WebhookGatewayError(
      "webhook_occurred_at_invalid",
      400
    );
  }
  const occurredAtMs = Date.parse(input.occurredAt);
  if (!Number.isFinite(occurredAtMs)) {
    throw new WebhookGatewayError(
      "webhook_occurred_at_invalid",
      400
    );
  }
  const data = record(input.data);
  if (!data) {
    throw new WebhookGatewayError("webhook_data_invalid", 400);
  }

  return {
    schemaVersion: WEBHOOK_EVENT_SCHEMA,
    eventId: input.eventId,
    eventType: input.eventType,
    occurredAt: new Date(occurredAtMs).toISOString(),
    sourceApplicationId:
      input.sourceApplicationId as WebhookSourceApplication,
    tenantId: input.tenantId as string | null,
    data
  };
}

export function validateWebhookEventAgainstEndpoint(
  event: WebhookEventEnvelope,
  endpoint: {
    sourceApplicationId: WebhookSourceApplication;
    tenantId: string | null;
    allowedEventTypes: string[];
  }
) {
  if (event.sourceApplicationId !== endpoint.sourceApplicationId) {
    throw new WebhookGatewayError(
      "webhook_source_application_mismatch",
      403,
      "Webhook source application does not match the endpoint.",
      true
    );
  }
  if (event.tenantId !== endpoint.tenantId) {
    throw new WebhookGatewayError(
      "webhook_tenant_mismatch",
      403,
      "Webhook tenant does not match the endpoint.",
      true
    );
  }
  if (!endpoint.allowedEventTypes.includes(event.eventType)) {
    throw new WebhookGatewayError(
      "webhook_event_type_not_allowed",
      403,
      "Webhook event type is not allowed by this endpoint.",
      true
    );
  }
}

export function webhookCanonicalRequest(input: {
  endpointKey: string;
  keyId: string;
  eventId: string;
  timestampMs: number;
  bodySha256: string;
}) {
  if (
    !safeWebhookEndpointKey(input.endpointKey) ||
    !safeWebhookKeyId(input.keyId) ||
    !safeWebhookEventId(input.eventId) ||
    !Number.isSafeInteger(input.timestampMs) ||
    !BODY_HASH_PATTERN.test(input.bodySha256)
  ) {
    throw new WebhookGatewayError(
      "webhook_canonical_request_invalid",
      400
    );
  }
  return Buffer.from(
    [
      WEBHOOK_CONTRACT,
      "POST",
      input.endpointKey,
      input.keyId,
      input.eventId,
      String(input.timestampMs),
      input.bodySha256
    ].join("\n"),
    "utf8"
  );
}

export function verifyWebhookHmacSignature(input: {
  secret: Buffer;
  signature: string;
  canonical: Uint8Array;
}) {
  if (input.secret.byteLength !== 32) {
    throw new WebhookGatewayError(
      "webhook_secret_invalid",
      503
    );
  }
  if (!safeWebhookSignature(input.signature)) return false;

  const expected = createHmac("sha256", input.secret)
    .update(input.canonical)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(input.signature, "base64url");
  } catch {
    expected.fill(0);
    return false;
  }
  const valid =
    received.byteLength === expected.byteLength &&
    timingSafeEqual(received, expected);
  expected.fill(0);
  received.fill(0);
  return valid;
}

const RECEIPT_KEYS = [
  "schema_version",
  "gateway_id",
  "endpoint_key",
  "source_application_id",
  "event_id",
  "event_type",
  "body_sha256",
  "status",
  "key_id",
  "received_at"
] as const;

export function webhookCanonicalReceipt(
  payload: WebhookReceiptPayload
) {
  const value = payload as unknown as Record<string, unknown>;
  if (!exactKeys(value, RECEIPT_KEYS)) {
    throw new WebhookGatewayError(
      "webhook_receipt_schema_invalid",
      500
    );
  }
  return Buffer.from(
    RECEIPT_KEYS.map((key) =>
      JSON.stringify([key, value[key]])
    ).join("\n"),
    "utf8"
  );
}

export function signWebhookReceipt(
  secret: Buffer,
  payload: WebhookReceiptPayload
) {
  if (secret.byteLength !== 32) {
    throw new WebhookGatewayError(
      "webhook_secret_invalid",
      503
    );
  }
  return createHmac("sha256", secret)
    .update(webhookCanonicalReceipt(payload))
    .digest("base64url");
}

export function decodeWebhookSecret(
  raw: string | undefined
): Buffer | null {
  if (!raw) return null;
  let secret: Buffer;
  try {
    secret = Buffer.from(raw, "base64");
  } catch {
    return null;
  }
  if (
    secret.byteLength !== 32 ||
    secret.toString("base64") !== raw
  ) {
    secret.fill(0);
    return null;
  }
  return secret;
}

export function validateWebhookTimestamp(
  timestampMs: number,
  now = Date.now()
) {
  if (!Number.isSafeInteger(timestampMs)) {
    throw new WebhookGatewayError(
      "webhook_timestamp_invalid",
      401
    );
  }
  if (Math.abs(now - timestampMs) > WEBHOOK_MAX_SKEW_MS) {
    throw new WebhookGatewayError(
      "webhook_timestamp_stale",
      401,
      "Webhook timestamp is outside the accepted freshness window.",
      true
    );
  }
}

export async function readBoundedWebhookBody(
  request: Request,
  maxBytes: number
) {
  if (
    !Number.isInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > WEBHOOK_MAX_BODY_BYTES
  ) {
    throw new WebhookGatewayError(
      "webhook_body_limit_invalid",
      500
    );
  }

  const declaredLength = Number(
    request.headers.get("content-length") ?? ""
  );
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  ) {
    throw new WebhookGatewayError(
      "webhook_body_too_large",
      413
    );
  }

  if (!request.body) {
    throw new WebhookGatewayError(
      "webhook_body_required",
      400
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new WebhookGatewayError(
        "webhook_body_too_large",
        413
      );
    }
    chunks.push(part.value);
  }

  if (total < 2) {
    throw new WebhookGatewayError(
      "webhook_body_required",
      400
    );
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
