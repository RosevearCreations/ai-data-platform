import { createHash } from "node:crypto";

import {
  getCrossAppDataContract,
  validateCrossAppDataContractRecord
} from "./cross-app-data-contract-registry";

export const NOTIFICATION_CHANNELS = Object.freeze([
  "email",
  "sms",
  "push",
  "in-app",
  "voice"
] as const);

export const CONSENT_STATES = Object.freeze([
  "granted",
  "denied",
  "revoked",
  "unknown"
] as const);

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type ConsentState = (typeof CONSENT_STATES)[number];

export type NormalizedConsentEvidence = {
  canonicalTenantKey: string;
  customerRecordId: string;
  channel: NotificationChannel;
  state: ConsentState;
  basis: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  observedAt: string;
  expiresAt: string | null;
  evidenceSha256: string;
};

export type NormalizedNotificationRequest = {
  canonicalTenantKey: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  customerRecordId: string;
  channel: NotificationChannel;
  templateKey: string;
  consentBasis: string;
  requestedAt: string;
  scheduledAt: string | null;
  subject: string | null;
  contentSummary: string;
  operatorApplicationId: "rosevear-comms-hub";
  contractId: "rosevear.shared.notification.v1";
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  requestSha256: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function textValue(value: unknown, max: number, code: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function dateValue(value: unknown, code: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  if (typeof value !== "string") throw new Error(code);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return new Date(ms).toISOString();
}

export function normalizeNotificationTenantKey(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("notification_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeNotificationChannel(value: unknown): NotificationChannel {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!(NOTIFICATION_CHANNELS as readonly string[]).includes(normalized)) {
    throw new Error("notification_channel_invalid");
  }
  return normalized as NotificationChannel;
}

export function normalizeConsentState(value: unknown): ConsentState {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!(CONSENT_STATES as readonly string[]).includes(normalized)) {
    throw new Error("notification_consent_state_invalid");
  }
  return normalized as ConsentState;
}

export function normalizeConsentEvidence(input: {
  canonicalTenantKey: string;
  customerRecordId: string;
  channel: string;
  state: string;
  basis: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  observedAt: string;
  expiresAt?: string | null;
}): NormalizedConsentEvidence {
  const canonicalTenantKey = normalizeNotificationTenantKey(input.canonicalTenantKey);
  const customerRecordId = textValue(input.customerRecordId, 160, "notification_customer_record_id_invalid", true) as string;
  const channel = normalizeNotificationChannel(input.channel);
  const state = normalizeConsentState(input.state);
  const basis = textValue(input.basis, 240, "notification_consent_basis_invalid", true) as string;
  const sourceApplicationId = textValue(input.sourceApplicationId, 120, "notification_source_application_invalid", true) as string;
  const sourceRecordId = textValue(input.sourceRecordId, 160, "notification_source_record_id_invalid", true) as string;
  const observedAt = dateValue(input.observedAt, "notification_consent_observed_at_invalid", true) as string;
  const expiresAt = dateValue(input.expiresAt, "notification_consent_expires_at_invalid");
  if (expiresAt && Date.parse(expiresAt) <= Date.parse(observedAt)) {
    throw new Error("notification_consent_expiry_invalid");
  }

  const normalized = {
    schema: "rosevear.notification.consent-evidence.v1",
    canonicalTenantKey,
    customerRecordId,
    channel,
    state,
    basis,
    sourceApplicationId,
    sourceRecordId,
    observedAt,
    expiresAt
  };

  return {
    canonicalTenantKey,
    customerRecordId,
    channel,
    state,
    basis,
    sourceApplicationId,
    sourceRecordId,
    observedAt,
    expiresAt,
    evidenceSha256: sha256(canonical(normalized))
  };
}

export function normalizeNotificationRequest(input: {
  canonicalTenantKey: string;
  sourceApplicationId: string;
  sourceRecordId: string;
  customerRecordId: string;
  channel: string;
  templateKey: string;
  consentBasis: string;
  requestedAt: string;
  scheduledAt?: string | null;
  subject?: string | null;
  contentSummary: string;
}): NormalizedNotificationRequest {
  const canonicalTenantKey = normalizeNotificationTenantKey(input.canonicalTenantKey);
  const sourceApplicationId = textValue(input.sourceApplicationId, 120, "notification_source_application_invalid", true) as string;
  const sourceRecordId = textValue(input.sourceRecordId, 160, "notification_source_record_id_invalid", true) as string;
  const customerRecordId = textValue(input.customerRecordId, 160, "notification_customer_record_id_invalid", true) as string;
  const channel = normalizeNotificationChannel(input.channel);
  const templateKey = textValue(input.templateKey, 160, "notification_template_key_invalid", true) as string;
  const consentBasis = textValue(input.consentBasis, 240, "notification_consent_basis_invalid", true) as string;
  const requestedAt = dateValue(input.requestedAt, "notification_requested_at_invalid", true) as string;
  const scheduledAt = dateValue(input.scheduledAt, "notification_scheduled_at_invalid");
  const subject = textValue(input.subject, 240, "notification_subject_invalid");
  const contentSummary = textValue(input.contentSummary, 1000, "notification_content_summary_invalid", true) as string;

  const portableRecord: Record<string, unknown> = {
    sourceApplicationId,
    sourceRecordId,
    tenantKey: canonicalTenantKey,
    updatedAt: requestedAt,
    customerRecordId,
    channel,
    templateKey,
    consentBasis,
    status: "held"
  };
  if (scheduledAt) portableRecord.scheduledAt = scheduledAt;

  const contract = getCrossAppDataContract("rosevear.shared.notification.v1");
  if (!contract) throw new Error("notification_contract_missing");
  const validation = validateCrossAppDataContractRecord(contract.contractId, portableRecord);
  if (!validation.valid) {
    throw new Error("notification_contract_validation_failed:" + validation.errors.join("|"));
  }

  const normalized = {
    schema: "rosevear.notification.request.v1",
    canonicalTenantKey,
    sourceApplicationId,
    sourceRecordId,
    customerRecordId,
    channel,
    templateKey,
    consentBasis,
    requestedAt,
    scheduledAt,
    subject,
    contentSummary,
    operatorApplicationId: "rosevear-comms-hub",
    contractId: "rosevear.shared.notification.v1",
    contractVersion: "1.0.0",
    portableRecord,
    state: "held",
    holdReason: "notification-dispatch-not-authorized"
  };

  return {
    canonicalTenantKey,
    sourceApplicationId,
    sourceRecordId,
    customerRecordId,
    channel,
    templateKey,
    consentBasis,
    requestedAt,
    scheduledAt,
    subject,
    contentSummary,
    operatorApplicationId: "rosevear-comms-hub",
    contractId: "rosevear.shared.notification.v1",
    contractVersion: "1.0.0",
    portableRecord,
    requestSha256: sha256(canonical(normalized))
  };
}

export function consentAllowsRequest(
  consent: NormalizedConsentEvidence | null,
  request: NormalizedNotificationRequest
) {
  if (!consent) return { allowed: false as const, code: "consent-missing" as const };
  if (consent.canonicalTenantKey !== request.canonicalTenantKey ||
      consent.customerRecordId !== request.customerRecordId ||
      consent.channel !== request.channel) {
    return { allowed: false as const, code: "consent-scope-mismatch" as const };
  }
  if (consent.state !== "granted") {
    return { allowed: false as const, code: "consent-not-granted" as const };
  }
  if (consent.expiresAt && Date.parse(consent.expiresAt) <= Date.parse(request.requestedAt)) {
    return { allowed: false as const, code: "consent-expired" as const };
  }
  return { allowed: true as const, code: "consent-granted" as const };
}

export function safeNotificationReviewReason(value: string) {
  const normalized = value.trim();
  return normalized.length >= 8 &&
    normalized.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(normalized);
}
