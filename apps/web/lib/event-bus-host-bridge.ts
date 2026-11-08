import { createHash } from "node:crypto";

import {
  eventBusSubscriptionMatches,
  type EventBusPublicationIdentity,
  type EventBusSubscriptionIdentity
} from "./event-bus-core";
import { safeDeliveryIdempotencyKey } from "./event-delivery-guarantees-core";
import {
  safeWebhookEventType,
  safeWebhookTenantId,
  WEBHOOK_SOURCE_APPLICATIONS,
  type WebhookSourceApplication
} from "./webhook-gateway-core";
import type { HostEnvironment } from "./universal-module-contract";

export const EVENT_BUS_HOST_BRIDGE_VERSION = "1.0.0" as const;
export const EVENT_BUS_HOST_BRIDGE_SCHEMA =
  "rosevear.ai-data-platform.event-bus-host-bridge.v1" as const;
export const EVENT_BUS_HOST_PUBLICATION_SCHEMA =
  "rosevear.ai-data-platform.host-event-publication-intent.v1" as const;
export const EVENT_BUS_HOST_SUBSCRIPTION_SCHEMA =
  "rosevear.ai-data-platform.host-event-subscription-registration.v1" as const;
export const EVENT_BUS_RECEIPT_CORRELATION_SCHEMA =
  "rosevear.ai-data-platform.event-receipt-correlation.v1" as const;

export type HostEventCapability =
  | "event-bus.publish"
  | "event-bus.subscriptions.manage";

export type HostEventAuthorization = {
  capability: HostEventCapability;
  granted: boolean;
  grantId: string;
  subjectId: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  expiresAt: string;
  reviewAt: string;
};

export type ExactEventTypeContractInput = {
  eventType: string;
  schemaId: string;
  version: string;
  description: string;
};

export type ExactEventTypeContract = {
  eventType: string;
  schemaId: string;
  version: string;
  description: string;
  exactMatchRequired: true;
  wildcardAccepted: false;
  payloadFingerprintRequired: true;
};

export type HostEventPublicationInput = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  sourceApplicationId: WebhookSourceApplication;
  platformTenantId: string;
  workspaceId: string;
  tenantId: string | null;
  eventId: string;
  eventType: string;
  bodySha256: string;
  occurredAt: string;
  auditCorrelationId: string;
  authorization: HostEventAuthorization;
};

export type HostEventPublicationIntent = {
  schema: typeof EVENT_BUS_HOST_PUBLICATION_SCHEMA;
  version: typeof EVENT_BUS_HOST_BRIDGE_VERSION;
  sourceApplicationId: WebhookSourceApplication;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  environment: "nonproduction" | "production";
  platformTenantId: string;
  workspaceId: string;
  tenantId: string | null;
  eventId: string;
  eventType: string;
  eventContract: ExactEventTypeContract;
  bodySha256: string;
  occurredAt: string;
  auditCorrelationId: string;
  authorizationEvidenceId: string;
  idempotencyKeySha256: string;
  state: "held";
  holdReason: "host-event-publication-review-required";
  publicationIdentity: EventBusPublicationIdentity;
  security: {
    rawPayloadAccepted: false;
    downstreamApprovalBypassed: false;
    networkDeliveryRequested: false;
    automaticRouteRelease: false;
  };
};

export type HostEventSubscriptionInput = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  sourceApplicationId: WebhookSourceApplication | null;
  destinationApplicationId: WebhookSourceApplication;
  platformTenantId: string;
  workspaceId: string;
  tenantId: string | null;
  name: string;
  eventTypes: string[];
  auditCorrelationId: string;
  authorization: HostEventAuthorization;
};

export type HostEventSubscriptionRegistration = {
  schema: typeof EVENT_BUS_HOST_SUBSCRIPTION_SCHEMA;
  version: typeof EVENT_BUS_HOST_BRIDGE_VERSION;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  platformTenantId: string;
  workspaceId: string;
  name: string;
  subscription: EventBusSubscriptionIdentity;
  exactEventContracts: ExactEventTypeContract[];
  auditCorrelationId: string;
  authorizationEvidenceId: string;
  state: "draft";
  requiresExplicitActivation: true;
  security: {
    autoActivated: false;
    downstreamApprovalBypassed: false;
    wildcardEventTypesAccepted: false;
    tenantEnvironmentScopePreserved: true;
  };
};

export type EventReceiptCorrelationInput = {
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: WebhookSourceApplication;
  idempotencyKeySha256: string;
  routeId: string;
  sourceReceiptId: string | null;
  replayNumber?: number;
};

export type EventReceiptCorrelation = {
  schema: typeof EVENT_BUS_RECEIPT_CORRELATION_SCHEMA;
  version: typeof EVENT_BUS_HOST_BRIDGE_VERSION;
  correlationSha256: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: WebhookSourceApplication;
  idempotencyKeySha256: string;
  routeId: string;
  sourceReceiptId: string | null;
  replayNumber: number;
  replaySafe: true;
};

export class EventBusHostBridgeError extends Error {
  readonly code:
    | "authorization_denied"
    | "authorization_scope_mismatch"
    | "authorization_expired"
    | "authorization_review_required"
    | "event_contract_invalid"
    | "event_contract_missing"
    | "publication_invalid"
    | "subscription_invalid"
    | "receipt_correlation_invalid";

  constructor(code: EventBusHostBridgeError["code"], message: string) {
    super(message);
    this.name = "EventBusHostBridgeError";
    this.code = code;
  }
}

const APP_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const CONTRACT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,159}$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function assertId(value: string, field: string) {
  if (!ID_PATTERN.test(value)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      field + " is invalid."
    );
  }
}

function assertApplicationId(value: string, field: string) {
  if (!APP_ID_PATTERN.test(value)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      field + " is invalid."
    );
  }
}

function busEnvironment(environment: HostEnvironment) {
  return environment === "production" ? "production" : "nonproduction";
}

function normalizeTenantId(value: string | null) {
  if (value === null) return null;
  if (!safeWebhookTenantId(value)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      "Event tenant ID is invalid."
    );
  }
  return value;
}

function parseAuthorizationTime(value: string, field: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new EventBusHostBridgeError(
      "authorization_denied",
      field + " is invalid."
    );
  }
  return parsed;
}

function assertAuthorization(
  authorization: HostEventAuthorization,
  expected: {
    capability: HostEventCapability;
    hostApplicationId: string;
    hostEnvironment: HostEnvironment;
    platformTenantId: string;
    workspaceId: string;
  },
  now = Date.now()
) {
  if (
    authorization.capability !== expected.capability ||
    !authorization.granted
  ) {
    throw new EventBusHostBridgeError(
      "authorization_denied",
      "The required event-bus capability is not granted."
    );
  }

  if (
    authorization.hostApplicationId !== expected.hostApplicationId ||
    authorization.hostEnvironment !== expected.hostEnvironment ||
    authorization.platformTenantId !== expected.platformTenantId ||
    authorization.workspaceId !== expected.workspaceId
  ) {
    throw new EventBusHostBridgeError(
      "authorization_scope_mismatch",
      "Event-bus authorization does not match the active host, tenant and workspace scope."
    );
  }

  assertId(authorization.grantId, "authorization grant ID");
  assertId(authorization.subjectId, "authorization subject ID");

  const expiresAt = parseAuthorizationTime(
    authorization.expiresAt,
    "authorization expiresAt"
  );
  const reviewAt = parseAuthorizationTime(
    authorization.reviewAt,
    "authorization reviewAt"
  );

  if (expiresAt <= now) {
    throw new EventBusHostBridgeError(
      "authorization_expired",
      "Event-bus authorization has expired."
    );
  }
  if (reviewAt <= now) {
    throw new EventBusHostBridgeError(
      "authorization_review_required",
      "Event-bus authorization requires review before reuse."
    );
  }
}

function normalizeContract(input: ExactEventTypeContractInput): ExactEventTypeContract {
  if (
    !safeWebhookEventType(input.eventType) ||
    input.eventType.includes("*") ||
    !CONTRACT_ID_PATTERN.test(input.schemaId) ||
    !VERSION_PATTERN.test(input.version)
  ) {
    throw new EventBusHostBridgeError(
      "event_contract_invalid",
      "Event type contract identity is invalid."
    );
  }
  const description = input.description.trim();
  if (
    !description ||
    description.length > 240 ||
    /[\r\n\0]/.test(description)
  ) {
    throw new EventBusHostBridgeError(
      "event_contract_invalid",
      "Event type contract description is invalid."
    );
  }

  return Object.freeze({
    eventType: input.eventType,
    schemaId: input.schemaId,
    version: input.version,
    description,
    exactMatchRequired: true as const,
    wildcardAccepted: false as const,
    payloadFingerprintRequired: true as const
  });
}

export function createExactEventTypeContractPack(
  inputs: ExactEventTypeContractInput[]
) {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 100) {
    throw new EventBusHostBridgeError(
      "event_contract_invalid",
      "Event type contract pack must contain 1 to 100 contracts."
    );
  }

  const contracts = inputs.map(normalizeContract);
  const seen = new Set<string>();
  for (const contract of contracts) {
    if (seen.has(contract.eventType)) {
      throw new EventBusHostBridgeError(
        "event_contract_invalid",
        "Event type contracts must be unique by exact event type."
      );
    }
    seen.add(contract.eventType);
  }
  return Object.freeze(contracts);
}

function contractFor(
  contracts: readonly ExactEventTypeContract[],
  eventType: string
) {
  const contract = contracts.find((item) => item.eventType === eventType);
  if (!contract) {
    throw new EventBusHostBridgeError(
      "event_contract_missing",
      "No exact event type contract is registered for this event."
    );
  }
  return contract;
}

export function createHostEventPublicationAdapter(
  input: HostEventPublicationInput,
  contracts: readonly ExactEventTypeContract[],
  now = Date.now()
): HostEventPublicationIntent {
  assertApplicationId(input.hostApplicationId, "hostApplicationId");
  assertId(input.platformTenantId, "platformTenantId");
  assertId(input.workspaceId, "workspaceId");
  assertId(input.eventId, "eventId");
  assertId(input.auditCorrelationId, "auditCorrelationId");

  if (!WEBHOOK_SOURCE_APPLICATIONS.includes(input.sourceApplicationId)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      "Source application is not supported by the event bus."
    );
  }
  if (!safeWebhookEventType(input.eventType)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      "Event type is invalid."
    );
  }
  if (!SHA256_PATTERN.test(input.bodySha256)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      "Only a SHA-256 payload fingerprint is accepted by the host bridge."
    );
  }
  const occurredAtMs = Date.parse(input.occurredAt);
  if (!Number.isFinite(occurredAtMs)) {
    throw new EventBusHostBridgeError(
      "publication_invalid",
      "Event occurredAt is invalid."
    );
  }

  assertAuthorization(
    input.authorization,
    {
      capability: "event-bus.publish",
      hostApplicationId: input.hostApplicationId,
      hostEnvironment: input.hostEnvironment,
      platformTenantId: input.platformTenantId,
      workspaceId: input.workspaceId
    },
    now
  );

  const eventContract = contractFor(contracts, input.eventType);
  const tenantId = normalizeTenantId(input.tenantId);
  const environment = busEnvironment(input.hostEnvironment);
  const idempotencyKeySha256 = sha256([
    "rosevear-module-event-publication-v1",
    input.workspaceId,
    input.sourceApplicationId,
    environment,
    tenantId,
    input.eventId,
    input.eventType,
    input.bodySha256
  ]);

  return Object.freeze({
    schema: EVENT_BUS_HOST_PUBLICATION_SCHEMA,
    version: EVENT_BUS_HOST_BRIDGE_VERSION,
    sourceApplicationId: input.sourceApplicationId,
    hostApplicationId: input.hostApplicationId,
    hostEnvironment: input.hostEnvironment,
    environment,
    platformTenantId: input.platformTenantId,
    workspaceId: input.workspaceId,
    tenantId,
    eventId: input.eventId,
    eventType: input.eventType,
    eventContract,
    bodySha256: input.bodySha256,
    occurredAt: new Date(occurredAtMs).toISOString(),
    auditCorrelationId: input.auditCorrelationId,
    authorizationEvidenceId: input.authorization.grantId,
    idempotencyKeySha256,
    state: "held" as const,
    holdReason: "host-event-publication-review-required" as const,
    publicationIdentity: Object.freeze({
      sourceApplicationId: input.sourceApplicationId,
      environment,
      tenantId,
      eventType: input.eventType
    }),
    security: Object.freeze({
      rawPayloadAccepted: false as const,
      downstreamApprovalBypassed: false as const,
      networkDeliveryRequested: false as const,
      automaticRouteRelease: false as const
    })
  });
}

export function createHostSubscriptionRegistration(
  input: HostEventSubscriptionInput,
  contracts: readonly ExactEventTypeContract[],
  now = Date.now()
): HostEventSubscriptionRegistration {
  assertApplicationId(input.hostApplicationId, "hostApplicationId");
  assertId(input.platformTenantId, "platformTenantId");
  assertId(input.workspaceId, "workspaceId");
  assertId(input.auditCorrelationId, "auditCorrelationId");

  const name = input.name.trim();
  if (!name || name.length > 160 || /[\r\n\0]/.test(name)) {
    throw new EventBusHostBridgeError(
      "subscription_invalid",
      "Subscription name is invalid."
    );
  }
  if (
    input.sourceApplicationId !== null &&
    !WEBHOOK_SOURCE_APPLICATIONS.includes(input.sourceApplicationId)
  ) {
    throw new EventBusHostBridgeError(
      "subscription_invalid",
      "Subscription source application is unsupported."
    );
  }
  if (!WEBHOOK_SOURCE_APPLICATIONS.includes(input.destinationApplicationId)) {
    throw new EventBusHostBridgeError(
      "subscription_invalid",
      "Subscription destination application is unsupported."
    );
  }
  if (input.sourceApplicationId === input.destinationApplicationId) {
    throw new EventBusHostBridgeError(
      "subscription_invalid",
      "Event subscriptions may not route back to the same application."
    );
  }

  assertAuthorization(
    input.authorization,
    {
      capability: "event-bus.subscriptions.manage",
      hostApplicationId: input.hostApplicationId,
      hostEnvironment: input.hostEnvironment,
      platformTenantId: input.platformTenantId,
      workspaceId: input.workspaceId
    },
    now
  );

  const eventTypes = [...new Set(input.eventTypes)];
  if (
    eventTypes.length < 1 ||
    eventTypes.length > 100 ||
    eventTypes.some((eventType) => !safeWebhookEventType(eventType))
  ) {
    throw new EventBusHostBridgeError(
      "subscription_invalid",
      "Subscription event types are invalid."
    );
  }

  const exactEventContracts = eventTypes.map((eventType) =>
    contractFor(contracts, eventType)
  );
  const tenantId = normalizeTenantId(input.tenantId);
  const subscription = Object.freeze({
    sourceApplicationId: input.sourceApplicationId,
    destinationApplicationId: input.destinationApplicationId,
    environment: busEnvironment(input.hostEnvironment),
    tenantId,
    eventTypes,
    state: "draft" as const
  });

  return Object.freeze({
    schema: EVENT_BUS_HOST_SUBSCRIPTION_SCHEMA,
    version: EVENT_BUS_HOST_BRIDGE_VERSION,
    hostApplicationId: input.hostApplicationId,
    hostEnvironment: input.hostEnvironment,
    platformTenantId: input.platformTenantId,
    workspaceId: input.workspaceId,
    name,
    subscription,
    exactEventContracts,
    auditCorrelationId: input.auditCorrelationId,
    authorizationEvidenceId: input.authorization.grantId,
    state: "draft" as const,
    requiresExplicitActivation: true as const,
    security: Object.freeze({
      autoActivated: false as const,
      downstreamApprovalBypassed: false as const,
      wildcardEventTypesAccepted: false as const,
      tenantEnvironmentScopePreserved: true as const
    })
  });
}

export function hostEventSubscriptionMatches(
  subscription: HostEventSubscriptionRegistration,
  publication: HostEventPublicationIntent
) {
  if (
    subscription.workspaceId !== publication.workspaceId ||
    subscription.platformTenantId !== publication.platformTenantId
  ) {
    return false;
  }
  return eventBusSubscriptionMatches(
    subscription.subscription,
    publication.publicationIdentity
  );
}

export function buildReplaySafeReceiptCorrelation(
  input: EventReceiptCorrelationInput
): EventReceiptCorrelation {
  for (const [field, value] of [
    ["workspaceId", input.workspaceId],
    ["publicationId", input.publicationId],
    ["subscriptionId", input.subscriptionId],
    ["routeId", input.routeId]
  ] as const) {
    assertId(value, field);
  }
  if (
    input.sourceReceiptId !== null &&
    !ID_PATTERN.test(input.sourceReceiptId)
  ) {
    throw new EventBusHostBridgeError(
      "receipt_correlation_invalid",
      "Source receipt ID is invalid."
    );
  }
  if (!WEBHOOK_SOURCE_APPLICATIONS.includes(input.destinationApplicationId)) {
    throw new EventBusHostBridgeError(
      "receipt_correlation_invalid",
      "Destination application is invalid."
    );
  }
  if (!safeDeliveryIdempotencyKey(input.idempotencyKeySha256)) {
    throw new EventBusHostBridgeError(
      "receipt_correlation_invalid",
      "Delivery idempotency key is invalid."
    );
  }

  const replayNumber = input.replayNumber ?? 0;
  if (
    !Number.isInteger(replayNumber) ||
    replayNumber < 0 ||
    replayNumber > 5
  ) {
    throw new EventBusHostBridgeError(
      "receipt_correlation_invalid",
      "Replay number must be an integer from 0 to 5."
    );
  }

  const correlationSha256 = sha256([
    "rosevear-module-event-receipt-correlation-v1",
    input.workspaceId,
    input.publicationId,
    input.subscriptionId,
    input.destinationApplicationId,
    input.idempotencyKeySha256,
    input.routeId,
    input.sourceReceiptId,
    replayNumber
  ]);

  return Object.freeze({
    schema: EVENT_BUS_RECEIPT_CORRELATION_SCHEMA,
    version: EVENT_BUS_HOST_BRIDGE_VERSION,
    correlationSha256,
    workspaceId: input.workspaceId,
    publicationId: input.publicationId,
    subscriptionId: input.subscriptionId,
    destinationApplicationId: input.destinationApplicationId,
    idempotencyKeySha256: input.idempotencyKeySha256,
    routeId: input.routeId,
    sourceReceiptId: input.sourceReceiptId,
    replayNumber,
    replaySafe: true as const
  });
}

export function eventBusHostBridgeDescriptor() {
  return Object.freeze({
    schema: EVENT_BUS_HOST_BRIDGE_SCHEMA,
    version: EVENT_BUS_HOST_BRIDGE_VERSION,
    capabilities: Object.freeze([
      Object.freeze({
        id: "event-bus.publish",
        classification: "action",
        consequential: true,
        requiresOwnerControlledGrant: true
      }),
      Object.freeze({
        id: "event-bus.subscriptions.manage",
        classification: "write",
        consequential: true,
        requiresOwnerControlledGrant: true
      })
    ]),
    exactEventTypeContracts: true,
    tenantEnvironmentScoping: true,
    heldRouteEvidence: true,
    deterministicIdempotencyKeys: true,
    replaySafeReceiptCorrelation: true,
    rawPayloadAcceptedByHostBridge: false,
    downstreamApprovalBypassed: false,
    networkDeliveryRequested: false,
    subscriptionAutoActivation: false,
    automaticRouteRelease: false
  });
}
