import { createHash } from "node:crypto";

export const CUSTOMER_IDENTITY_SOURCE_APPLICATIONS = Object.freeze([
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const);

export type CustomerIdentitySourceApplication =
  (typeof CUSTOMER_IDENTITY_SOURCE_APPLICATIONS)[number];

export type CustomerIdentityMatchRule =
  | "email-and-phone-exact"
  | "email-exact"
  | "phone-exact"
  | "name-postal-exact";

export interface CustomerIdentityFingerprint {
  emailSha256: string | null;
  phoneSha256: string | null;
  nameSha256: string | null;
  postalSha256: string | null;
  evidenceSha256: string;
  evidenceFields: Array<"email" | "phone" | "name" | "postal">;
}

export interface CustomerIdentityComparable {
  emailSha256: string | null;
  phoneSha256: string | null;
  nameSha256: string | null;
  postalSha256: string | null;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isCustomerIdentitySourceApplication(
  value: string
): value is CustomerIdentitySourceApplication {
  return (
    CUSTOMER_IDENTITY_SOURCE_APPLICATIONS as readonly string[]
  ).includes(value);
}

export function normalizeCustomerIdentityTenantKey(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("customer_identity_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeCustomerIdentityRecordId(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim() : "";
  if (
    normalized.length < 1 ||
    normalized.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("customer_identity_source_record_id_invalid");
  }
  return normalized;
}

export function normalizeCustomerIdentityRecordVersion(
  value: unknown
) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string" ? value.trim() : "";
  if (
    normalized.length < 1 ||
    normalized.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("customer_identity_source_record_version_invalid");
  }
  return normalized;
}

function normalizeEmail(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string"
      ? value.trim().normalize("NFKC").toLowerCase()
      : "";
  if (
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("customer_identity_email_invalid");
  }
  return normalized;
}

function normalizePhone(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  let digits =
    typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("customer_identity_phone_invalid");
  }
  return digits;
}

function normalizeName(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  if (normalized.length < 2 || normalized.length > 160) {
    throw new Error("customer_identity_name_invalid");
  }
  return normalized;
}

function normalizePostal(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .toUpperCase()
          .replace(/[\s-]/g, "")
      : "";
  if (!/^[A-Z0-9]{3,12}$/.test(normalized)) {
    throw new Error("customer_identity_postal_invalid");
  }
  return normalized;
}

export function fingerprintCustomerIdentity(input: {
  sourceApplicationId: string;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion?: string | null;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  postalCode?: string | null;
}): CustomerIdentityFingerprint {
  if (!isCustomerIdentitySourceApplication(input.sourceApplicationId)) {
    throw new Error("customer_identity_source_application_invalid");
  }
  const canonicalTenantKey =
    normalizeCustomerIdentityTenantKey(input.canonicalTenantKey);
  const sourceRecordId =
    normalizeCustomerIdentityRecordId(input.sourceRecordId);
  const sourceRecordVersion =
    normalizeCustomerIdentityRecordVersion(
      input.sourceRecordVersion
    );
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const name = normalizeName(input.displayName);
  const postal = normalizePostal(input.postalCode);

  if (!email && !phone && !(name && postal)) {
    throw new Error("customer_identity_evidence_insufficient");
  }

  const emailSha256 = email ? sha256(email) : null;
  const phoneSha256 = phone ? sha256(phone) : null;
  const nameSha256 = name ? sha256(name) : null;
  const postalSha256 = postal ? sha256(postal) : null;
  const evidenceFields: CustomerIdentityFingerprint["evidenceFields"] = [];
  if (emailSha256) evidenceFields.push("email");
  if (phoneSha256) evidenceFields.push("phone");
  if (nameSha256) evidenceFields.push("name");
  if (postalSha256) evidenceFields.push("postal");

  const evidenceSha256 = sha256(
    JSON.stringify([
      "rosevear-shared-customer-identity-observation-v1",
      input.sourceApplicationId,
      canonicalTenantKey,
      sourceRecordId,
      sourceRecordVersion,
      emailSha256,
      phoneSha256,
      nameSha256,
      postalSha256
    ])
  );

  return {
    emailSha256,
    phoneSha256,
    nameSha256,
    postalSha256,
    evidenceSha256,
    evidenceFields
  };
}

export function matchCustomerIdentityEvidence(
  left: CustomerIdentityComparable,
  right: CustomerIdentityComparable
): {
  rule: CustomerIdentityMatchRule;
  confidenceScore: number;
  evidenceFields: Array<"email" | "phone" | "name" | "postal">;
} | null {
  const email =
    left.emailSha256 !== null &&
    left.emailSha256 === right.emailSha256;
  const phone =
    left.phoneSha256 !== null &&
    left.phoneSha256 === right.phoneSha256;

  if (email && phone) {
    return {
      rule: "email-and-phone-exact",
      confidenceScore: 100,
      evidenceFields: ["email", "phone"]
    };
  }
  if (email) {
    return {
      rule: "email-exact",
      confidenceScore: 95,
      evidenceFields: ["email"]
    };
  }
  if (phone) {
    return {
      rule: "phone-exact",
      confidenceScore: 90,
      evidenceFields: ["phone"]
    };
  }

  const namePostal =
    left.nameSha256 !== null &&
    left.postalSha256 !== null &&
    left.nameSha256 === right.nameSha256 &&
    left.postalSha256 === right.postalSha256;

  if (namePostal) {
    return {
      rule: "name-postal-exact",
      confidenceScore: 75,
      evidenceFields: ["name", "postal"]
    };
  }

  return null;
}

export function safeCustomerIdentityReviewReason(value: string) {
  return (
    value.trim().length >= 8 &&
    value.trim().length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
