/** QL-337 broker -> Comms contract preparation only; NO HTTP sender or signing key. */
import { createHash } from "node:crypto";
import type { WebhookSourceApplication } from "./webhook-gateway-core";

export const QL337_COMMS_SCHEMA = "rosevear.broker.comms.event.v1" as const;
export const QL337_COMMS_AUDIENCE = "rosevear-comms-hub:nonproduction" as const;
export const QL337_COMMS_EVENT_TYPES = [
  "case.handoff.requested",
  "task.followup.requested"
] as const;
export const QL337_MAX_EXPIRY_MS = 300_000;
const SOURCE_SHELLS = {
  yw: "yard-workers",
  icamp: "icamp",
  rosiedazzlers: "rosiedazzlers",
  devilndove: "devilndove"
} as const;
type Shell = keyof typeof SOURCE_SHELLS;
type CommsEventType = (typeof QL337_COMMS_EVENT_TYPES)[number];
const SAFE_SCOPE = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const SAFE_REF = /^ref_[A-Za-z0-9_-]{12,80}$/;
const SAFE_EVENT = /^evt_[A-Za-z0-9_-]{12,80}$/;
const SAFE_NONCE = /^[A-Za-z0-9_-]{22,64}$/;
const SAFE_DIGEST = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const REQUIRED_PROOFS = ["originalSourceReceiptVerified", "workspaceOwnerTestAuthorized",
  "sourceOwnerTestAuthorized", "childIsolationVerified", "consentEvidenceVerified",
  "independentBrokerWorkloadVerified"] as const;

export interface Ql337UnsignedCommsEvent {
  schemaVersion: typeof QL337_COMMS_SCHEMA;
  eventId: string;
  eventType: CommsEventType;
  traceId: string;
  sourceApplicationId: "ai-data-platform";
  originApplicationId: WebhookSourceApplication;
  destinationApplicationId: "rosevear-comms-hub";
  sourceShell: Shell;
  tenantId: string;
  childId: string;
  audience: typeof QL337_COMMS_AUDIENCE;
  environment: "TEST";
  sourceReceiptSha256: string;
  consentSha256: string;
  payloadRef: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

export interface Ql337PreparedInput {
  routeState: "held" | "pending";
  sourceShell: Shell;
  originApplicationId: WebhookSourceApplication;
  eventType: CommsEventType;
  eventId: string;
  traceId: string;
  tenantId: string;
  childId: string;
  sourceReceiptSha256: string;
  consentSha256: string;
  payloadRef: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  proof: {
    originalSourceReceiptVerified: boolean;
    workspaceOwnerTestAuthorized: boolean;
    sourceOwnerTestAuthorized: boolean;
    childIsolationVerified: boolean;
    consentEvidenceVerified: boolean;
    independentBrokerWorkloadVerified: boolean;
  };
}

/** Deterministic sorted JSON, matching the Node-only Comms verifier. */
export function canonicalQl337CommsEvent(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalQl337CommsEvent).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map(key =>
      JSON.stringify(key) + ":" + canonicalQl337CommsEvent(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function prepareQl337CommsEvent(input: Ql337PreparedInput, nowMs: number = Date.now()):
  | { status: "HOLD_SOURCE_OR_OWNER_PROOF"; outboundDeliveryEnabled: false }
  | { status: "DENY_SCHEMA_OR_SCOPE"; outboundDeliveryEnabled: false }
  | { status: "HOLD_EXPIRED_OR_FUTURE"; outboundDeliveryEnabled: false }
  | { status: "UNSIGNED_TEST_ENVELOPE_ONLY"; outboundDeliveryEnabled: false;
      envelope: Ql337UnsignedCommsEvent; envelopeSha256: string } {
  // Existing Build 291/292 route state remains held: no delivery transition occurs.
  if (!input || input.routeState !== "held" ||
    !input.proof || Object.keys(input.proof).length !== REQUIRED_PROOFS.length ||
    REQUIRED_PROOFS.some(key => input.proof[key] !== true)) {
    return { status: "HOLD_SOURCE_OR_OWNER_PROOF", outboundDeliveryEnabled: false };
  }
  if (!(input.sourceShell in SOURCE_SHELLS) ||
    SOURCE_SHELLS[input.sourceShell] !== input.originApplicationId ||
    !QL337_COMMS_EVENT_TYPES.includes(input.eventType) ||
    !SAFE_EVENT.test(input.eventId) || !UUID.test(input.traceId) ||
    !SAFE_SCOPE.test(input.tenantId) || !SAFE_SCOPE.test(input.childId) ||
    !SAFE_DIGEST.test(input.sourceReceiptSha256) || !SAFE_DIGEST.test(input.consentSha256) ||
    !SAFE_REF.test(input.payloadRef) || !SAFE_NONCE.test(input.nonce)) {
    return { status: "DENY_SCHEMA_OR_SCOPE", outboundDeliveryEnabled: false };
  }
  const issuedMs = Date.parse(input.issuedAt), expiresMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(issuedMs) || !Number.isFinite(expiresMs) ||
    expiresMs - issuedMs > QL337_MAX_EXPIRY_MS || expiresMs <= nowMs ||
    issuedMs > nowMs + 30_000 ||
    new Date(issuedMs).toISOString() !== input.issuedAt ||
    new Date(expiresMs).toISOString() !== input.expiresAt) {
    return { status: "HOLD_EXPIRED_OR_FUTURE", outboundDeliveryEnabled: false };
  }
  const envelope: Ql337UnsignedCommsEvent = {
    schemaVersion: QL337_COMMS_SCHEMA, eventId: input.eventId, eventType: input.eventType,
    traceId: input.traceId, sourceApplicationId: "ai-data-platform",
    originApplicationId: input.originApplicationId,
    destinationApplicationId: "rosevear-comms-hub", sourceShell: input.sourceShell,
    tenantId: input.tenantId, childId: input.childId, audience: QL337_COMMS_AUDIENCE,
    environment: "TEST", sourceReceiptSha256: input.sourceReceiptSha256,
    consentSha256: input.consentSha256, payloadRef: input.payloadRef,
    nonce: input.nonce, issuedAt: input.issuedAt, expiresAt: input.expiresAt
  };
  return {
    status: "UNSIGNED_TEST_ENVELOPE_ONLY", outboundDeliveryEnabled: false,
    envelope, envelopeSha256: createHash("sha256").update(canonicalQl337CommsEvent(envelope)).digest("hex")
  };
}
