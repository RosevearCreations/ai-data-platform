import { createHash } from "node:crypto";

import {
  getCrossAppDataContract,
  validateCrossAppDataContractRecord
} from "./cross-app-data-contract-registry";

export const MEDIA_EXCHANGE_APPLICATIONS = Object.freeze([
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const);

export const MEDIA_ASSET_KINDS = Object.freeze([
  "photo",
  "document",
  "receipt",
  "generated-media",
  "video",
  "audio"
] as const);

export const MEDIA_TYPES = Object.freeze([
  "image",
  "video",
  "document",
  "audio"
] as const);

export type MediaExchangeApplication =
  (typeof MEDIA_EXCHANGE_APPLICATIONS)[number];
export type MediaAssetKind =
  (typeof MEDIA_ASSET_KINDS)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];

export interface NormalizedMediaReference {
  sourceApplicationId: MediaExchangeApplication;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  assetKind: MediaAssetKind;
  mediaType: MediaType;
  mimeType: string | null;
  byteSize: number | null;
  contentSha256: string | null;
  dedupeSha256: string;
  dedupeBasis: "content-sha256" | "reference-url-sha256";
  contractId: "rosevear.shared.media.v1";
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  referenceSha256: string;
}

export interface MediaExchangeEnvelope {
  schema: "rosevear.media.exchange.package.v1";
  sourceApplicationId: MediaExchangeApplication;
  sourceTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  assetKind: MediaAssetKind;
  destinationApplicationId: MediaExchangeApplication;
  destinationTenantKey: string;
  dedupeSha256: string;
  dedupeBasis: "content-sha256" | "reference-url-sha256";
  contractId: "rosevear.shared.media.v1";
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  transportState: "held";
  holdReason: "media-exchange-not-authorized";
  binaryTransferRequested: false;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

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

function boundedText(
  value: unknown,
  max: number,
  code: string,
  required = false
) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  const normalized =
    typeof value === "string"
      ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
      : "";
  if (
    normalized.length < 1 ||
    normalized.length > max ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error(code);
  }
  return normalized;
}

function normalizeOptionalSha256(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("media_content_sha256_invalid");
  }
  return normalized;
}

function normalizeOptionalByteSize(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (
    !Number.isSafeInteger(number) ||
    number < 0 ||
    number > 10_737_418_240
  ) {
    throw new Error("media_byte_size_invalid");
  }
  return number;
}

function normalizeOptionalMimeType(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized.length < 3 ||
    normalized.length > 120 ||
    !/^[a-z0-9][a-z0-9.+_-]*\/[a-z0-9][a-z0-9.+_-]*$/.test(normalized)
  ) {
    throw new Error("media_mime_type_invalid");
  }
  return normalized;
}

function normalizeOptionalDateTime(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("media_created_at_invalid");
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new Error("media_created_at_invalid");
  }
  return new Date(ms).toISOString();
}

export function isMediaExchangeApplication(
  value: string
): value is MediaExchangeApplication {
  return (
    MEDIA_EXCHANGE_APPLICATIONS as readonly string[]
  ).includes(value);
}

export function isMediaAssetKind(
  value: string
): value is MediaAssetKind {
  return (MEDIA_ASSET_KINDS as readonly string[]).includes(value);
}

export function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(value);
}

export function normalizeMediaTenantKey(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("media_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeMediaRecordId(value: unknown) {
  return boundedText(value, 160, "media_source_record_id_invalid", true) as string;
}

export function normalizeMediaRecordVersion(value: unknown) {
  return boundedText(value, 120, "media_source_record_version_invalid");
}

export function normalizeStableMediaUrl(value: unknown) {
  const raw = boundedText(value, 2048, "media_url_invalid", true) as string;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("media_url_invalid");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw new Error("media_url_invalid");
  }

  for (const key of url.searchParams.keys()) {
    if (
      /^(token|access_token|auth|authorization|key|api[_-]?key|secret|signature|sig|expires|x-amz-)/i.test(
        key
      )
    ) {
      throw new Error("media_url_secret_parameter_denied");
    }
  }

  url.hash = "";
  return url.toString();
}

export function normalizeMediaReference(input: {
  sourceApplicationId: string;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion?: string | null;
  assetKind: string;
  mediaType: string;
  url: string;
  ownerKind?: string | null;
  ownerRecordId?: string | null;
  altText?: string | null;
  caption?: string | null;
  createdAt?: string | null;
  mimeType?: string | null;
  byteSize?: number | string | null;
  contentSha256?: string | null;
}): NormalizedMediaReference {
  if (!isMediaExchangeApplication(input.sourceApplicationId)) {
    throw new Error("media_source_application_invalid");
  }
  if (!isMediaAssetKind(input.assetKind)) {
    throw new Error("media_asset_kind_invalid");
  }
  if (!isMediaType(input.mediaType)) {
    throw new Error("media_type_invalid");
  }

  const canonicalTenantKey = normalizeMediaTenantKey(
    input.canonicalTenantKey
  );
  const sourceRecordId = normalizeMediaRecordId(input.sourceRecordId);
  const sourceRecordVersion = normalizeMediaRecordVersion(
    input.sourceRecordVersion
  );
  const url = normalizeStableMediaUrl(input.url);
  const ownerKind = boundedText(
    input.ownerKind,
    80,
    "media_owner_kind_invalid"
  );
  const ownerRecordId = boundedText(
    input.ownerRecordId,
    160,
    "media_owner_record_id_invalid"
  );
  const altText = boundedText(
    input.altText,
    500,
    "media_alt_text_invalid"
  );
  const caption = boundedText(
    input.caption,
    1000,
    "media_caption_invalid"
  );
  const createdAt = normalizeOptionalDateTime(input.createdAt);
  const mimeType = normalizeOptionalMimeType(input.mimeType);
  const byteSize = normalizeOptionalByteSize(input.byteSize);
  const contentSha256 = normalizeOptionalSha256(input.contentSha256);

  const portableRecord: Record<string, unknown> = {
    mediaType: input.mediaType,
    url
  };
  if (ownerKind) portableRecord.ownerKind = ownerKind;
  if (ownerRecordId) portableRecord.ownerRecordId = ownerRecordId;
  if (altText) portableRecord.altText = altText;
  if (caption) portableRecord.caption = caption;
  if (createdAt) portableRecord.createdAt = createdAt;

  const contract = getCrossAppDataContract("rosevear.shared.media.v1");
  if (!contract) {
    throw new Error("media_contract_missing");
  }
  const validation = validateCrossAppDataContractRecord(
    contract.contractId,
    portableRecord
  );
  if (!validation.valid) {
    throw new Error(
      "media_contract_validation_failed:" + validation.errors.join("|")
    );
  }

  const dedupeBasis = contentSha256
    ? "content-sha256"
    : "reference-url-sha256";
  const dedupeSha256 = contentSha256 ?? sha256(url);

  const referenceSha256 = sha256(
    canonical({
      schema: "rosevear.media.reference.v1",
      sourceApplicationId: input.sourceApplicationId,
      canonicalTenantKey,
      sourceRecordId,
      sourceRecordVersion,
      assetKind: input.assetKind,
      mimeType,
      byteSize,
      contentSha256,
      dedupeSha256,
      portableRecord
    })
  );

  return {
    sourceApplicationId: input.sourceApplicationId,
    canonicalTenantKey,
    sourceRecordId,
    sourceRecordVersion,
    assetKind: input.assetKind,
    mediaType: input.mediaType,
    mimeType,
    byteSize,
    contentSha256,
    dedupeSha256,
    dedupeBasis,
    contractId: "rosevear.shared.media.v1",
    contractVersion: "1.0.0",
    portableRecord,
    referenceSha256
  };
}

export function buildMediaExchangeEnvelope(input: {
  reference: NormalizedMediaReference;
  destinationApplicationId: string;
  destinationTenantKey: string;
}) {
  if (!isMediaExchangeApplication(input.destinationApplicationId)) {
    throw new Error("media_destination_application_invalid");
  }
  if (
    input.destinationApplicationId === input.reference.sourceApplicationId
  ) {
    throw new Error("media_same_application_denied");
  }
  const destinationTenantKey = normalizeMediaTenantKey(
    input.destinationTenantKey
  );

  const validation = validateCrossAppDataContractRecord(
    input.reference.contractId,
    input.reference.portableRecord
  );
  if (!validation.valid) {
    throw new Error(
      "media_contract_validation_failed:" + validation.errors.join("|")
    );
  }

  const envelope: MediaExchangeEnvelope = {
    schema: "rosevear.media.exchange.package.v1",
    sourceApplicationId: input.reference.sourceApplicationId,
    sourceTenantKey: input.reference.canonicalTenantKey,
    sourceRecordId: input.reference.sourceRecordId,
    sourceRecordVersion: input.reference.sourceRecordVersion,
    assetKind: input.reference.assetKind,
    destinationApplicationId: input.destinationApplicationId,
    destinationTenantKey,
    dedupeSha256: input.reference.dedupeSha256,
    dedupeBasis: input.reference.dedupeBasis,
    contractId: input.reference.contractId,
    contractVersion: input.reference.contractVersion,
    portableRecord: input.reference.portableRecord,
    transportState: "held",
    holdReason: "media-exchange-not-authorized",
    binaryTransferRequested: false
  };

  return {
    envelope,
    payloadSha256: sha256(canonical(envelope))
  };
}

export function safeMediaExchangeReviewReason(value: string) {
  const reason = value.trim();
  return (
    reason.length >= 8 &&
    reason.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(reason)
  );
}
