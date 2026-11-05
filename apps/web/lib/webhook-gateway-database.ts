import { randomBytes, randomUUID } from "node:crypto";

import type { PoolClient } from "pg";

import {
  decodeWebhookSecret,
  parseWebhookEventEnvelope,
  safeWebhookEndpointKey,
  safeWebhookEventId,
  safeWebhookEventType,
  safeWebhookKeyId,
  safeWebhookSignature,
  safeWebhookTenantId,
  signWebhookReceipt,
  validateWebhookEventAgainstEndpoint,
  validateWebhookTimestamp,
  verifyWebhookHmacSignature,
  WEBHOOK_CONTRACT,
  WEBHOOK_EVENT_SCHEMA,
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_RECEIPT_SCHEMA,
  WEBHOOK_SOURCE_APPLICATIONS,
  WebhookGatewayError,
  webhookBodySha256,
  webhookCanonicalRequest,
  type WebhookEventEnvelope,
  type WebhookReceiptPayload,
  type WebhookSourceApplication
} from "./webhook-gateway-core";
import {
  listWorkspacesForUser,
  withIntegrationDatabase,
  withUserDatabase
} from "./database";

const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const DISPLAY_NAME_PATTERN = /^[^\u0000-\u001f\u007f]{1,160}$/;

export interface WebhookEndpointRecord {
  endpointId: string;
  endpointKey: string;
  workspaceId: string;
  sourceApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  displayName: string;
  keyId: string;
  secretEnvVar: string;
  enabled: boolean;
  allowedEventTypes: string[];
  maxBodyBytes: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookReceiptRecord {
  receiptId: string;
  endpointId: string;
  workspaceId: string;
  sourceApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  eventOccurredAt: Date;
  requestTimestampMs: number;
  bodySha256: string;
  payloadSizeBytes: number;
  receiptPayload: Record<string, unknown>;
  receiptSignature: string;
  receivedAt: Date;
}

export interface WebhookAuditRecord {
  auditId: string;
  endpointId: string;
  workspaceId: string;
  eventId: string | null;
  eventType: string | null;
  outcome: "accepted" | "denied";
  reasonCode: string;
  identityVerified: boolean;
  httpStatus: number;
  requestTimestampMs: number | null;
  bodySha256: string | null;
  occurredAt: Date;
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function endpointRow(row: Record<string, unknown>): WebhookEndpointRecord {
  return {
    endpointId: String(row.endpoint_id),
    endpointKey: String(row.endpoint_key),
    workspaceId: String(row.workspace_id),
    sourceApplicationId: String(row.source_application_id) as WebhookSourceApplication,
    environment: row.environment === "production" ? "production" : "nonproduction",
    tenantId: row.tenant_id === null || row.tenant_id === undefined
      ? null
      : String(row.tenant_id),
    displayName: String(row.display_name),
    keyId: String(row.key_id),
    secretEnvVar: String(row.secret_env_var),
    enabled: Boolean(row.enabled),
    allowedEventTypes: stringArray(row.allowed_event_types),
    maxBodyBytes: Number(row.max_body_bytes),
    createdBy: String(row.created_by),
    updatedBy: String(row.updated_by),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function receiptRow(row: Record<string, unknown>): WebhookReceiptRecord {
  return {
    receiptId: String(row.receipt_id),
    endpointId: String(row.endpoint_id),
    workspaceId: String(row.workspace_id),
    sourceApplicationId: String(row.source_application_id) as WebhookSourceApplication,
    environment: row.environment === "production" ? "production" : "nonproduction",
    tenantId: row.tenant_id === null || row.tenant_id === undefined
      ? null
      : String(row.tenant_id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    eventOccurredAt: new Date(String(row.event_occurred_at)),
    requestTimestampMs: Number(row.request_timestamp_ms),
    bodySha256: String(row.body_sha256),
    payloadSizeBytes: Number(row.payload_size_bytes),
    receiptPayload:
      row.receipt_payload &&
      typeof row.receipt_payload === "object" &&
      !Array.isArray(row.receipt_payload)
        ? (row.receipt_payload as Record<string, unknown>)
        : {},
    receiptSignature: String(row.receipt_signature),
    receivedAt: new Date(String(row.received_at))
  };
}

function auditRow(row: Record<string, unknown>): WebhookAuditRecord {
  return {
    auditId: String(row.audit_id),
    endpointId: String(row.endpoint_id),
    workspaceId: String(row.workspace_id),
    eventId: row.event_id ? String(row.event_id) : null,
    eventType: row.event_type ? String(row.event_type) : null,
    outcome: row.outcome === "accepted" ? "accepted" : "denied",
    reasonCode: String(row.reason_code),
    identityVerified: Boolean(row.identity_verified),
    httpStatus: Number(row.http_status),
    requestTimestampMs:
      row.request_timestamp_ms === null || row.request_timestamp_ms === undefined
        ? null
        : Number(row.request_timestamp_ms),
    bodySha256: row.body_sha256 ? String(row.body_sha256) : null,
    occurredAt: new Date(String(row.occurred_at))
  };
}

function normalizeAllowedEventTypes(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw new Error("webhook_event_types_required");
  }
  const values = [...new Set(value.map(String).map((item) => item.trim()))];
  if (
    values.length !== value.length ||
    values.some((item) => !safeWebhookEventType(item))
  ) {
    throw new Error("webhook_event_types_invalid");
  }
  return values.sort();
}

function normalizeTenantId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !safeWebhookTenantId(value)) {
    throw new Error("webhook_tenant_invalid");
  }
  return value;
}

function normalizeDisplayName(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!DISPLAY_NAME_PATTERN.test(result)) {
    throw new Error("webhook_display_name_invalid");
  }
  return result;
}

function normalizeSecretEnvVar(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!ENV_VAR_PATTERN.test(result)) {
    throw new Error("webhook_secret_reference_invalid");
  }
  return result;
}

function normalizeKeyId(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!safeWebhookKeyId(result)) {
    throw new Error("webhook_key_id_invalid");
  }
  return result;
}

async function requireWorkspaceAdmin(
  client: PoolClient,
  workspaceId: string
) {
  const result = await client.query<{ role: string }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  if (
    result.rows[0]?.role !== "owner" &&
    result.rows[0]?.role !== "admin"
  ) {
    throw new Error("workspace_admin_required");
  }
}

export async function listWebhookGatewayForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [endpoints, receipts, audit] = await Promise.all([
      client.query(
        `select *
         from app.webhook_endpoints
         order by updated_at desc, display_name`
      ),
      client.query(
        `select receipt_id,endpoint_id,workspace_id,source_application_id,
                environment,tenant_id,event_id,event_type,event_occurred_at,
                request_timestamp_ms,body_sha256,payload_size_bytes,
                receipt_payload,receipt_signature,received_at
         from app.webhook_receipts
         order by received_at desc
         limit 200`
      ),
      client.query(
        `select *
         from app.webhook_request_audit
         order by occurred_at desc
         limit 300`
      )
    ]);
    return {
      endpoints: endpoints.rows.map(endpointRow),
      receipts: receipts.rows.map(receiptRow),
      audit: audit.rows.map(auditRow)
    };
  });

  return {
    workspaces,
    ...state,
    sourceApplications: [...WEBHOOK_SOURCE_APPLICATIONS],
    contract: {
      request: WEBHOOK_CONTRACT,
      event: WEBHOOK_EVENT_SCHEMA,
      receipt: WEBHOOK_RECEIPT_SCHEMA,
      signature: "HMAC-SHA256",
      timestampSkewMs: 300_000,
      maximumBodyBytes: WEBHOOK_MAX_BODY_BYTES
    },
    summary: {
      endpoints: state.endpoints.length,
      enabled: state.endpoints.filter((item) => item.enabled).length,
      disabled: state.endpoints.filter((item) => !item.enabled).length,
      receipts: state.receipts.length,
      accepted: state.audit.filter((item) => item.outcome === "accepted").length,
      denied: state.audit.filter((item) => item.outcome === "denied").length,
      replayDenied: state.audit.filter(
        (item) => item.reasonCode === "webhook_replay_denied"
      ).length
    },
    policy: {
      explicitEndpointCreationOnly: true,
      explicitEnablementOnly: true,
      rawSecretValuesStored: false,
      signedRequestsRequired: true,
      signedReceipts: true,
      atomicReplaySuppression: true,
      downstreamDispatch: false,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export async function createWebhookEndpoint(
  userId: string,
  input: {
    workspaceId: string;
    sourceApplicationId: string;
    environment: string;
    tenantId?: string | null;
    displayName: string;
    keyId: string;
    secretEnvVar: string;
    allowedEventTypes: string[];
    maxBodyBytes?: number;
  }
) {
  if (
    !WEBHOOK_SOURCE_APPLICATIONS.includes(
      input.sourceApplicationId as WebhookSourceApplication
    )
  ) {
    throw new Error("webhook_source_application_invalid");
  }
  if (
    input.environment !== "nonproduction" &&
    input.environment !== "production"
  ) {
    throw new Error("webhook_environment_invalid");
  }
  const tenantId = normalizeTenantId(input.tenantId);
  const displayName = normalizeDisplayName(input.displayName);
  const keyId = normalizeKeyId(input.keyId);
  const secretEnvVar = normalizeSecretEnvVar(input.secretEnvVar);
  const allowedEventTypes = normalizeAllowedEventTypes(input.allowedEventTypes);
  const maxBodyBytes = input.maxBodyBytes ?? WEBHOOK_MAX_BODY_BYTES;
  if (
    !Number.isInteger(maxBodyBytes) ||
    maxBodyBytes < 1024 ||
    maxBodyBytes > WEBHOOK_MAX_BODY_BYTES
  ) {
    throw new Error("webhook_body_limit_invalid");
  }

  const endpointId = randomUUID();
  const endpointKey = "whk_" + randomBytes(18).toString("base64url");

  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const result = await client.query(
      `insert into app.webhook_endpoints (
        endpoint_id,endpoint_key,workspace_id,source_application_id,
        environment,tenant_id,display_name,key_id,secret_env_var,
        enabled,allowed_event_types,max_body_bytes,created_by,updated_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10::jsonb,$11,$12,$12
      )
      returning *`,
      [
        endpointId,
        endpointKey,
        input.workspaceId,
        input.sourceApplicationId,
        input.environment,
        tenantId,
        displayName,
        keyId,
        secretEnvVar,
        JSON.stringify(allowedEventTypes),
        maxBodyBytes,
        userId
      ]
    );
    return endpointRow(result.rows[0]);
  });
}

export async function updateWebhookEndpoint(
  userId: string,
  input: {
    endpointId: string;
    enabled?: boolean;
    displayName?: string;
    keyId?: string;
    secretEnvVar?: string;
    allowedEventTypes?: string[];
    maxBodyBytes?: number;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const current = await client.query(
      `select * from app.webhook_endpoints
       where endpoint_id=$1
       for update`,
      [input.endpointId]
    );
    if (!current.rows[0]) throw new Error("webhook_endpoint_not_found");
    const endpoint = endpointRow(current.rows[0]);
    await requireWorkspaceAdmin(client, endpoint.workspaceId);

    const displayName =
      input.displayName === undefined
        ? endpoint.displayName
        : normalizeDisplayName(input.displayName);
    const keyId =
      input.keyId === undefined
        ? endpoint.keyId
        : normalizeKeyId(input.keyId);
    const secretEnvVar =
      input.secretEnvVar === undefined
        ? endpoint.secretEnvVar
        : normalizeSecretEnvVar(input.secretEnvVar);
    const allowedEventTypes =
      input.allowedEventTypes === undefined
        ? endpoint.allowedEventTypes
        : normalizeAllowedEventTypes(input.allowedEventTypes);
    const maxBodyBytes =
      input.maxBodyBytes === undefined
        ? endpoint.maxBodyBytes
        : input.maxBodyBytes;

    if (
      !Number.isInteger(maxBodyBytes) ||
      maxBodyBytes < 1024 ||
      maxBodyBytes > WEBHOOK_MAX_BODY_BYTES
    ) {
      throw new Error("webhook_body_limit_invalid");
    }

    const credentialChanged =
      keyId !== endpoint.keyId ||
      secretEnvVar !== endpoint.secretEnvVar;
    const enabled =
      credentialChanged
        ? false
        : input.enabled ?? endpoint.enabled;

    const result = await client.query(
      `update app.webhook_endpoints
       set display_name=$2,
           key_id=$3,
           secret_env_var=$4,
           allowed_event_types=$5::jsonb,
           max_body_bytes=$6,
           enabled=$7,
           updated_by=$8,
           updated_at=now()
       where endpoint_id=$1
       returning *`,
      [
        endpoint.endpointId,
        displayName,
        keyId,
        secretEnvVar,
        JSON.stringify(allowedEventTypes),
        maxBodyBytes,
        enabled,
        userId
      ]
    );
    return endpointRow(result.rows[0]);
  });
}

export async function loadWebhookEndpointForIntake(
  endpointKey: string
) {
  if (!safeWebhookEndpointKey(endpointKey)) return null;
  return withIntegrationDatabase(async (client) => {
    await client.query(
      "select set_config('app.webhook_endpoint_key',$1,true)",
      [endpointKey]
    );
    const result = await client.query(
      `select * from app.webhook_endpoints
       where endpoint_key=$1
       limit 1`,
      [endpointKey]
    );
    return result.rows[0] ? endpointRow(result.rows[0]) : null;
  });
}

async function appendKnownWebhookDenial(
  endpoint: WebhookEndpointRecord,
  input: {
    eventId?: string | null;
    eventType?: string | null;
    reasonCode: string;
    identityVerified: boolean;
    httpStatus: number;
    requestTimestampMs?: number | null;
    bodySha256?: string | null;
  }
) {
  await withIntegrationDatabase(async (client) => {
    await client.query(
      "select set_config('app.webhook_endpoint_key',$1,true)",
      [endpoint.endpointKey]
    );
    await client.query(
      `insert into app.webhook_request_audit (
        audit_id,endpoint_id,workspace_id,event_id,event_type,
        outcome,reason_code,identity_verified,http_status,
        request_timestamp_ms,body_sha256
      ) values ($1,$2,$3,$4,$5,'denied',$6,$7,$8,$9,$10)`,
      [
        randomUUID(),
        endpoint.endpointId,
        endpoint.workspaceId,
        input.eventId ?? null,
        input.eventType ?? null,
        input.reasonCode.slice(0, 96),
        input.identityVerified,
        input.httpStatus,
        input.requestTimestampMs ?? null,
        input.bodySha256 ?? null
      ]
    );
  });
}

export async function acceptInboundWebhook(input: {
  endpoint: WebhookEndpointRecord;
  contract: string;
  keyId: string;
  eventId: string;
  timestampMs: number;
  signature: string;
  body: Uint8Array;
  contentType: string;
  now?: number;
}) {
  const endpoint = input.endpoint;
  let bodySha256: string | null = null;
  let event: WebhookEventEnvelope | null = null;
  let identityVerified = false;
  const now = input.now ?? Date.now();

  try {
    if (!endpoint.enabled) {
      throw new WebhookGatewayError(
        "webhook_endpoint_disabled",
        404
      );
    }
    if (input.contract !== WEBHOOK_CONTRACT) {
      throw new WebhookGatewayError(
        "webhook_contract_invalid",
        401
      );
    }
    if (!input.contentType.toLowerCase().startsWith("application/json")) {
      throw new WebhookGatewayError(
        "webhook_content_type_invalid",
        415
      );
    }
    if (!safeWebhookKeyId(input.keyId) || input.keyId !== endpoint.keyId) {
      throw new WebhookGatewayError(
        "webhook_key_id_denied",
        401
      );
    }
    if (!safeWebhookEventId(input.eventId)) {
      throw new WebhookGatewayError(
        "webhook_event_id_invalid",
        401
      );
    }
    if (!safeWebhookSignature(input.signature)) {
      throw new WebhookGatewayError(
        "webhook_signature_invalid",
        401
      );
    }

    bodySha256 = webhookBodySha256(input.body);
    const secret = decodeWebhookSecret(
      process.env[endpoint.secretEnvVar]
    );
    if (!secret) {
      throw new WebhookGatewayError(
        "webhook_secret_unconfigured",
        503
      );
    }

    const canonical = webhookCanonicalRequest({
      endpointKey: endpoint.endpointKey,
      keyId: input.keyId,
      eventId: input.eventId,
      timestampMs: input.timestampMs,
      bodySha256
    });
    const valid = (() => {
      try {
        return verifyWebhookHmacSignature({
          secret,
          signature: input.signature,
          canonical
        });
      } finally {
        secret.fill(0);
      }
    })();

    if (!valid) {
      throw new WebhookGatewayError(
        "webhook_signature_denied",
        401
      );
    }
    identityVerified = true;
    validateWebhookTimestamp(input.timestampMs, now);

    let parsed: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(input.body);
      parsed = JSON.parse(text);
    } catch {
      throw new WebhookGatewayError(
        "webhook_json_invalid",
        400,
        "Webhook body is not valid UTF-8 JSON.",
        true
      );
    }
    event = parseWebhookEventEnvelope(parsed);
    if (event.eventId !== input.eventId) {
      throw new WebhookGatewayError(
        "webhook_event_id_mismatch",
        400,
        "Webhook event ID header does not match the event envelope.",
        true
      );
    }
    validateWebhookEventAgainstEndpoint(event, endpoint);

    const receiptId =
      "whr_" + randomUUID().replaceAll("-", "");
    const receivedAt = new Date(now).toISOString();
    const receiptPayload: WebhookReceiptPayload = {
      schema_version: WEBHOOK_RECEIPT_SCHEMA,
      gateway_id: "ai-data-platform",
      endpoint_key: endpoint.endpointKey,
      source_application_id: endpoint.sourceApplicationId,
      event_id: event.eventId,
      event_type: event.eventType,
      body_sha256: bodySha256,
      status: "accepted",
      key_id: endpoint.keyId,
      received_at: receivedAt
    };

    const signingSecret = decodeWebhookSecret(
      process.env[endpoint.secretEnvVar]
    );
    if (!signingSecret) {
      throw new WebhookGatewayError(
        "webhook_secret_unconfigured",
        503,
        "Webhook receipt signing key is not configured.",
        true
      );
    }
    let receiptSignature: string;
    try {
      receiptSignature = signWebhookReceipt(
        signingSecret,
        receiptPayload
      );
    } finally {
      signingSecret.fill(0);
    }

    const committed = await withIntegrationDatabase(
      async (client) => {
        await client.query(
          "select set_config('app.webhook_endpoint_key',$1,true)",
          [endpoint.endpointKey]
        );
        const latestResult = await client.query(
          `select * from app.webhook_endpoints
           where endpoint_key=$1
           limit 1
           for share`,
          [endpoint.endpointKey]
        );
        if (!latestResult.rows[0]) {
          return {
            ok: false as const,
            code: "webhook_endpoint_not_found",
            status: 404
          };
        }
        const latest = endpointRow(latestResult.rows[0]);
        if (
          !latest.enabled ||
          latest.updatedAt.getTime() !== endpoint.updatedAt.getTime() ||
          latest.keyId !== endpoint.keyId ||
          latest.secretEnvVar !== endpoint.secretEnvVar
        ) {
          return {
            ok: false as const,
            code: "webhook_endpoint_changed",
            status: 409
          };
        }

        const nonce = await client.query(
          `insert into app.webhook_event_nonces (
            endpoint_id,event_id,request_timestamp_ms,body_sha256
          ) values ($1,$2,$3,$4)
          on conflict do nothing
          returning event_id`,
          [
            endpoint.endpointId,
            event!.eventId,
            input.timestampMs,
            bodySha256
          ]
        );

        if (nonce.rowCount !== 1) {
          await client.query(
            `insert into app.webhook_request_audit (
              audit_id,endpoint_id,workspace_id,event_id,event_type,
              outcome,reason_code,identity_verified,http_status,
              request_timestamp_ms,body_sha256
            ) values ($1,$2,$3,$4,$5,'denied','webhook_replay_denied',true,409,$6,$7)`,
            [
              randomUUID(),
              endpoint.endpointId,
              endpoint.workspaceId,
              event!.eventId,
              event!.eventType,
              input.timestampMs,
              bodySha256
            ]
          );
          return {
            ok: false as const,
            code: "webhook_replay_denied",
            status: 409
          };
        }

        await client.query(
          `insert into app.webhook_receipts (
            receipt_id,endpoint_id,workspace_id,source_application_id,
            environment,tenant_id,event_id,event_type,event_occurred_at,
            request_timestamp_ms,body_sha256,payload_size_bytes,
            event_envelope,receipt_payload,receipt_signature,received_at
          ) values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
            $13::jsonb,$14::jsonb,$15,$16
          )`,
          [
            receiptId,
            endpoint.endpointId,
            endpoint.workspaceId,
            endpoint.sourceApplicationId,
            endpoint.environment,
            endpoint.tenantId,
            event!.eventId,
            event!.eventType,
            event!.occurredAt,
            input.timestampMs,
            bodySha256,
            input.body.byteLength,
            JSON.stringify(event),
            JSON.stringify(receiptPayload),
            receiptSignature,
            receivedAt
          ]
        );

        await client.query(
          `insert into app.webhook_request_audit (
            audit_id,endpoint_id,workspace_id,event_id,event_type,
            outcome,reason_code,identity_verified,http_status,
            request_timestamp_ms,body_sha256,occurred_at
          ) values (
            $1,$2,$3,$4,$5,'accepted','webhook_event_accepted',
            true,202,$6,$7,$8
          )`,
          [
            randomUUID(),
            endpoint.endpointId,
            endpoint.workspaceId,
            event!.eventId,
            event!.eventType,
            input.timestampMs,
            bodySha256,
            receivedAt
          ]
        );

        return {
          ok: true as const,
          receiptId,
          receiptPayload,
          receiptSignature
        };
      }
    );

    if (!committed.ok) {
      throw new WebhookGatewayError(
        committed.code,
        committed.status,
        committed.code,
        true
      );
    }

    return {
      accepted: true as const,
      receiptId: committed.receiptId,
      receipt: committed.receiptPayload,
      signature: committed.receiptSignature
    };
  } catch (error) {
    const normalized =
      error instanceof WebhookGatewayError
        ? error
        : new WebhookGatewayError(
            "webhook_intake_failed",
            500
          );

    if (normalized.code !== "webhook_replay_denied") {
      await appendKnownWebhookDenial(endpoint, {
        eventId: event?.eventId ?? input.eventId ?? null,
        eventType: event?.eventType ?? null,
        reasonCode: normalized.code,
        identityVerified:
          normalized.identityVerified || identityVerified,
        httpStatus: normalized.status,
        requestTimestampMs: Number.isSafeInteger(input.timestampMs)
          ? input.timestampMs
          : null,
        bodySha256
      }).catch(() => undefined);
    }
    throw normalized;
  }
}

