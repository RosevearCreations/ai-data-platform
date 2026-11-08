import { createHash } from "node:crypto";

import {
  WEBHOOK_CONTRACT,
  WEBHOOK_EVENT_SCHEMA,
  WEBHOOK_MAX_BODY_BYTES,
  WEBHOOK_MAX_SKEW_MS,
  WEBHOOK_RECEIPT_SCHEMA,
  type WebhookEventEnvelope
} from "./webhook-gateway-core";
import type {
  WebhookEndpointRecord,
  WebhookReceiptRecord
} from "./webhook-gateway-database";

export const INBOUND_ENDPOINT_MODULE_VERSION = "1.0.0" as const;
export const INBOUND_ENDPOINT_MODULE_SCHEMA =
  "rosevear.ai-data-platform.inbound-endpoint-module.v1" as const;
export const INBOUND_ENDPOINT_EVIDENCE_SCHEMA =
  "rosevear.ai-data-platform.inbound-endpoint-evidence.v1" as const;
export const INBOUND_CALLBACK_ROUTE_SCHEMA =
  "rosevear.ai-data-platform.inbound-callback-route.v1" as const;
export const HOST_INBOUND_EVENT_SCHEMA =
  "rosevear.ai-data-platform.host-inbound-event.v1" as const;

const APPLICATION_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const CALLBACK_PATH_PATTERN =
  /^\/[A-Za-z0-9._~:/-]{1,240}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

export type InboundEndpointVerificationReference = {
  contract: typeof WEBHOOK_CONTRACT;
  signatureAlgorithm: "HMAC-SHA256";
  keyId: string;
  secretReference: {
    kind: "environment";
    environmentVariable: string;
  };
  maximumTimestampSkewMs: typeof WEBHOOK_MAX_SKEW_MS;
  maximumBodyBytes: number;
  rawSecretIncluded: false;
};

export type InboundCallbackRoute = {
  schema: typeof INBOUND_CALLBACK_ROUTE_SCHEMA;
  endpointId: string;
  destinationApplicationId: string;
  callbackPath: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  state: "ready" | "disabled" | "revoked";
  dispatchRequested: false;
  externalRequestPerformed: false;
};

export type InboundEndpointEvidence = {
  schema: typeof INBOUND_ENDPOINT_EVIDENCE_SCHEMA;
  version: typeof INBOUND_ENDPOINT_MODULE_VERSION;
  endpointId: string;
  endpointKey: string;
  intakePath: string;
  workspaceId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  displayName: string;
  enabled: boolean;
  revoked: boolean;
  revokedAt: string | null;
  allowedEventTypes: string[];
  verification: InboundEndpointVerificationReference;
  callback: InboundCallbackRoute | null;
  createdAt: string;
  updatedAt: string;
  evidenceSha256: string;
  security: {
    endpointPresenceActivatesConnection: false;
    secretValueIncluded: false;
    callbackDispatchPerformed: false;
    eventBusPublishPerformed: false;
  };
};

export type HostInboundEvent = {
  schema: typeof HOST_INBOUND_EVENT_SCHEMA;
  version: typeof INBOUND_ENDPOINT_MODULE_VERSION;
  receiptId: string;
  endpointId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  bodySha256: string;
  data: Record<string, unknown>;
  callback: InboundCallbackRoute | null;
  deliveryState:
    | "held-callback-route-unconfigured"
    | "held-callback-route-disabled"
    | "held-callback-route-ready";
  callbackDispatchPerformed: false;
  eventBusPublishPerformed: false;
};

export function validateInboundCallbackRegistration(input: {
  callbackApplicationId?: string | null;
  callbackPath?: string | null;
}) {
  const applicationId =
    input.callbackApplicationId === undefined ||
    input.callbackApplicationId === null ||
    input.callbackApplicationId === ""
      ? null
      : input.callbackApplicationId.trim();
  const callbackPath =
    input.callbackPath === undefined ||
    input.callbackPath === null ||
    input.callbackPath === ""
      ? null
      : input.callbackPath.trim();

  if ((applicationId === null) !== (callbackPath === null)) {
    throw new Error("webhook_callback_pair_required");
  }
  if (
    applicationId !== null &&
    !APPLICATION_ID_PATTERN.test(applicationId)
  ) {
    throw new Error("webhook_callback_application_invalid");
  }
  if (
    callbackPath !== null &&
    !CALLBACK_PATH_PATTERN.test(callbackPath)
  ) {
    throw new Error("webhook_callback_path_invalid");
  }

  return {
    callbackApplicationId: applicationId,
    callbackPath
  };
}

export function buildInboundCallbackRoute(
  endpoint: WebhookEndpointRecord
): InboundCallbackRoute | null {
  if (
    endpoint.callbackApplicationId === null ||
    endpoint.callbackPath === null
  ) {
    return null;
  }

  return Object.freeze({
    schema: INBOUND_CALLBACK_ROUTE_SCHEMA,
    endpointId: endpoint.endpointId,
    destinationApplicationId: endpoint.callbackApplicationId,
    callbackPath: endpoint.callbackPath,
    environment: endpoint.environment,
    tenantId: endpoint.tenantId,
    state:
      endpoint.revokedAt !== null
        ? ("revoked" as const)
        : endpoint.enabled
          ? ("ready" as const)
          : ("disabled" as const),
    dispatchRequested: false as const,
    externalRequestPerformed: false as const
  });
}

export function buildInboundEndpointEvidence(
  endpoint: WebhookEndpointRecord
): InboundEndpointEvidence {
  const callback = buildInboundCallbackRoute(endpoint);
  const verification = Object.freeze({
    contract: WEBHOOK_CONTRACT,
    signatureAlgorithm: "HMAC-SHA256" as const,
    keyId: endpoint.keyId,
    secretReference: Object.freeze({
      kind: "environment" as const,
      environmentVariable: endpoint.secretEnvVar
    }),
    maximumTimestampSkewMs: WEBHOOK_MAX_SKEW_MS,
    maximumBodyBytes: endpoint.maxBodyBytes,
    rawSecretIncluded: false as const
  });
  const evidenceSource = {
    schema: INBOUND_ENDPOINT_EVIDENCE_SCHEMA,
    endpointId: endpoint.endpointId,
    endpointKey: endpoint.endpointKey,
    workspaceId: endpoint.workspaceId,
    sourceApplicationId: endpoint.sourceApplicationId,
    environment: endpoint.environment,
    tenantId: endpoint.tenantId,
    enabled: endpoint.enabled,
    revokedAt: endpoint.revokedAt?.toISOString() ?? null,
    allowedEventTypes: endpoint.allowedEventTypes,
    verification,
    callback,
    updatedAt: endpoint.updatedAt.toISOString()
  };

  return Object.freeze({
    schema: INBOUND_ENDPOINT_EVIDENCE_SCHEMA,
    version: INBOUND_ENDPOINT_MODULE_VERSION,
    endpointId: endpoint.endpointId,
    endpointKey: endpoint.endpointKey,
    intakePath: "/api/webhooks/" + endpoint.endpointKey,
    workspaceId: endpoint.workspaceId,
    sourceApplicationId: endpoint.sourceApplicationId,
    environment: endpoint.environment,
    tenantId: endpoint.tenantId,
    displayName: endpoint.displayName,
    enabled: endpoint.enabled,
    revoked: endpoint.revokedAt !== null,
    revokedAt: endpoint.revokedAt?.toISOString() ?? null,
    allowedEventTypes: [...endpoint.allowedEventTypes],
    verification,
    callback,
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
    evidenceSha256: sha256(evidenceSource),
    security: Object.freeze({
      endpointPresenceActivatesConnection: false as const,
      secretValueIncluded: false as const,
      callbackDispatchPerformed: false as const,
      eventBusPublishPerformed: false as const
    })
  });
}

function validatedReceiptEvent(
  receipt: WebhookReceiptRecord
): WebhookEventEnvelope {
  const event = receipt.eventEnvelope;
  if (
    event.schemaVersion !== WEBHOOK_EVENT_SCHEMA ||
    event.eventId !== receipt.eventId ||
    event.eventType !== receipt.eventType ||
    event.sourceApplicationId !== receipt.sourceApplicationId ||
    event.tenantId !== receipt.tenantId
  ) {
    throw new Error("webhook_receipt_event_evidence_mismatch");
  }
  return event;
}

export function translateWebhookReceiptToHostEvent(input: {
  receipt: WebhookReceiptRecord;
  endpoint: WebhookEndpointRecord;
}): HostInboundEvent {
  if (input.receipt.endpointId !== input.endpoint.endpointId) {
    throw new Error("webhook_receipt_endpoint_mismatch");
  }
  const event = validatedReceiptEvent(input.receipt);
  const callback = buildInboundCallbackRoute(input.endpoint);

  return Object.freeze({
    schema: HOST_INBOUND_EVENT_SCHEMA,
    version: INBOUND_ENDPOINT_MODULE_VERSION,
    receiptId: input.receipt.receiptId,
    endpointId: input.endpoint.endpointId,
    sourceApplicationId: input.receipt.sourceApplicationId,
    environment: input.receipt.environment,
    tenantId: input.receipt.tenantId,
    eventId: input.receipt.eventId,
    eventType: input.receipt.eventType,
    occurredAt: input.receipt.eventOccurredAt.toISOString(),
    receivedAt: input.receipt.receivedAt.toISOString(),
    bodySha256: input.receipt.bodySha256,
    data: event.data,
    callback,
    deliveryState:
      callback === null
        ? ("held-callback-route-unconfigured" as const)
        : callback.state === "ready"
          ? ("held-callback-route-ready" as const)
          : ("held-callback-route-disabled" as const),
    callbackDispatchPerformed: false as const,
    eventBusPublishPerformed: false as const
  });
}

export function inboundEndpointModuleDescriptor() {
  return Object.freeze({
    schema: INBOUND_ENDPOINT_MODULE_SCHEMA,
    version: INBOUND_ENDPOINT_MODULE_VERSION,
    sourceBuild: 290,
    endpointRegistration: true,
    signingVerificationReferences: true,
    nonceReplayProtection: {
      reservation: "endpoint-id+event-id",
      atomic: true,
      maximumTimestampSkewMs: WEBHOOK_MAX_SKEW_MS
    },
    callbackRouting: true,
    hostEventTranslation: true,
    receiptSearch: true,
    endpointDisable: true,
    endpointRevoke: true,
    environmentSpecificEvidence: true,
    maximumBodyBytes: WEBHOOK_MAX_BODY_BYTES,
    requestContract: WEBHOOK_CONTRACT,
    eventSchema: WEBHOOK_EVENT_SCHEMA,
    receiptSchema: WEBHOOK_RECEIPT_SCHEMA,
    security: {
      rawSecretsAccepted: false,
      discoveryActivatesConnection: false,
      callbackDispatchPerformedByModule: false,
      eventBusPublishPerformedByModule: false,
      revokedEndpointCanBeReenabled: false
    }
  });
}
