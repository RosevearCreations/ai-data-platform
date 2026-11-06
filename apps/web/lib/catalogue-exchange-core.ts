import { createHash } from "node:crypto";

import {
  getCrossAppDataContract,
  validateCrossAppDataContractRecord
} from "./cross-app-data-contract-registry";

export const CATALOGUE_BUSINESS_APPLICATIONS = Object.freeze([
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp"
] as const);

export const CATALOGUE_ITEM_KINDS = Object.freeze([
  "product",
  "service",
  "package",
  "addon",
  "campsite",
  "amenity",
  "rental"
] as const);

export type CatalogueBusinessApplication =
  (typeof CATALOGUE_BUSINESS_APPLICATIONS)[number];
export type CatalogueItemKind =
  (typeof CATALOGUE_ITEM_KINDS)[number];

export type CatalogueContractId =
  | "rosevear.shared.product.v1"
  | "rosevear.shared.service.v1";

export interface NormalizedCatalogueItem {
  sourceApplicationId: CatalogueBusinessApplication;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  itemKind: CatalogueItemKind;
  contractId: CatalogueContractId;
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  contentSha256: string;
}

export interface CatalogueExchangeEnvelope {
  schema: "rosevear.catalogue.exchange.package.v1";
  sourceApplicationId: CatalogueBusinessApplication;
  sourceTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion: string | null;
  itemKind: CatalogueItemKind;
  destinationApplicationId: CatalogueBusinessApplication;
  destinationTenantKey: string;
  contractId: CatalogueContractId;
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  transportState: "held";
  holdReason: "catalogue-exchange-not-authorized";
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
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonical(record[key])
        )
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function isCatalogueBusinessApplication(
  value: string
): value is CatalogueBusinessApplication {
  return (
    CATALOGUE_BUSINESS_APPLICATIONS as readonly string[]
  ).includes(value);
}

export function isCatalogueItemKind(
  value: string
): value is CatalogueItemKind {
  return (
    CATALOGUE_ITEM_KINDS as readonly string[]
  ).includes(value);
}

export function normalizeCatalogueTenantKey(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("catalogue_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeCatalogueRecordId(value: unknown) {
  const normalized =
    typeof value === "string" ? value.trim() : "";
  if (
    normalized.length < 1 ||
    normalized.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("catalogue_source_record_id_invalid");
  }
  return normalized;
}

export function normalizeCatalogueRecordVersion(
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
    throw new Error("catalogue_source_record_version_invalid");
  }
  return normalized;
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

function boundedMoney(value: unknown, code: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 10_000_000
  ) {
    throw new Error(code);
  }
  return Math.round(number * 100) / 100;
}

function boundedDuration(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 10080
  ) {
    throw new Error("catalogue_duration_invalid");
  }
  return number;
}

function normalizedServiceAreas(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return [] as string[];
  }
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = Array.from(
    new Set(
      source
        .map((entry) =>
          typeof entry === "string"
            ? entry.normalize("NFKC").trim().replace(/\s+/g, " ")
            : ""
        )
        .filter(Boolean)
    )
  );
  if (
    normalized.length > 32 ||
    normalized.some(
      (entry) =>
        entry.length > 120 ||
        /[\u0000-\u001f\u007f]/.test(entry)
    )
  ) {
    throw new Error("catalogue_service_areas_invalid");
  }
  return normalized;
}

function exactIso(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("catalogue_updated_at_invalid");
  }
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value
  ) {
    throw new Error("catalogue_updated_at_invalid");
  }
  return value;
}

export function contractForCatalogueItem(
  itemKind: CatalogueItemKind
): CatalogueContractId {
  return itemKind === "product"
    ? "rosevear.shared.product.v1"
    : "rosevear.shared.service.v1";
}

export function normalizeCatalogueItem(input: {
  sourceApplicationId: string;
  canonicalTenantKey: string;
  sourceRecordId: string;
  sourceRecordVersion?: string | null;
  itemKind: string;
  updatedAt: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  priceCad?: number | string | null;
  durationMinutes?: number | string | null;
  serviceAreas?: string[] | string | null;
}): NormalizedCatalogueItem {
  if (!isCatalogueBusinessApplication(input.sourceApplicationId)) {
    throw new Error("catalogue_source_application_invalid");
  }
  if (!isCatalogueItemKind(input.itemKind)) {
    throw new Error("catalogue_item_kind_invalid");
  }

  const canonicalTenantKey =
    normalizeCatalogueTenantKey(input.canonicalTenantKey);
  const sourceRecordId =
    normalizeCatalogueRecordId(input.sourceRecordId);
  const sourceRecordVersion =
    normalizeCatalogueRecordVersion(input.sourceRecordVersion);
  const updatedAt = exactIso(input.updatedAt);
  const name = boundedText(
    input.name,
    200,
    "catalogue_name_invalid",
    true
  ) as string;
  const description = boundedText(
    input.description,
    2000,
    "catalogue_description_invalid"
  );
  const category =
    boundedText(
      input.category,
      120,
      "catalogue_category_invalid"
    ) ?? input.itemKind;
  const status = boundedText(
    input.status,
    64,
    "catalogue_status_invalid"
  );
  const priceCad = boundedMoney(
    input.priceCad,
    "catalogue_price_invalid"
  );
  const contractId = contractForCatalogueItem(input.itemKind);

  const portableRecord: Record<string, unknown> = {
    sourceApplicationId: input.sourceApplicationId,
    sourceRecordId,
    tenantKey: canonicalTenantKey,
    updatedAt,
    name
  };

  if (description) portableRecord.description = description;
  if (category) portableRecord.category = category;
  if (status) portableRecord.status = status;

  if (contractId === "rosevear.shared.product.v1") {
    const sku = boundedText(
      input.sku,
      120,
      "catalogue_sku_invalid"
    );
    if (sku) portableRecord.sku = sku;
    if (priceCad !== null) portableRecord.priceCad = priceCad;
  } else {
    if (priceCad !== null) {
      portableRecord.startingPriceCad = priceCad;
    }
    const durationMinutes = boundedDuration(
      input.durationMinutes
    );
    if (durationMinutes !== null) {
      portableRecord.durationMinutes = durationMinutes;
    }
    const serviceAreas = normalizedServiceAreas(
      input.serviceAreas
    );
    if (serviceAreas.length) {
      portableRecord.serviceAreas = serviceAreas;
    }
  }

  const contract = getCrossAppDataContract(contractId);
  if (!contract) {
    throw new Error("catalogue_contract_missing");
  }
  const validation =
    validateCrossAppDataContractRecord(
      contractId,
      portableRecord
    );
  if (!validation.valid) {
    throw new Error(
      "catalogue_contract_validation_failed:" +
        validation.errors.join("|")
    );
  }

  const contentSha256 = sha256(
    canonical({
      schema: "rosevear.catalogue.normalized-item.v1",
      itemKind: input.itemKind,
      contractId,
      contractVersion: contract.version,
      portableRecord,
      sourceRecordVersion
    })
  );

  return {
    sourceApplicationId: input.sourceApplicationId,
    canonicalTenantKey,
    sourceRecordId,
    sourceRecordVersion,
    itemKind: input.itemKind,
    contractId,
    contractVersion: "1.0.0",
    portableRecord,
    contentSha256
  };
}

export function buildCatalogueExchangeEnvelope(input: {
  item: NormalizedCatalogueItem;
  destinationApplicationId: string;
  destinationTenantKey: string;
}): {
  envelope: CatalogueExchangeEnvelope;
  payloadSha256: string;
} {
  if (
    !isCatalogueBusinessApplication(
      input.destinationApplicationId
    )
  ) {
    throw new Error(
      "catalogue_destination_application_invalid"
    );
  }
  if (
    input.destinationApplicationId ===
    input.item.sourceApplicationId
  ) {
    throw new Error("catalogue_same_application_denied");
  }
  const destinationTenantKey =
    normalizeCatalogueTenantKey(
      input.destinationTenantKey
    );

  const validation =
    validateCrossAppDataContractRecord(
      input.item.contractId,
      input.item.portableRecord
    );
  if (!validation.valid) {
    throw new Error(
      "catalogue_contract_validation_failed:" +
        validation.errors.join("|")
    );
  }

  const envelope: CatalogueExchangeEnvelope = {
    schema: "rosevear.catalogue.exchange.package.v1",
    sourceApplicationId: input.item.sourceApplicationId,
    sourceTenantKey: input.item.canonicalTenantKey,
    sourceRecordId: input.item.sourceRecordId,
    sourceRecordVersion: input.item.sourceRecordVersion,
    itemKind: input.item.itemKind,
    destinationApplicationId:
      input.destinationApplicationId,
    destinationTenantKey,
    contractId: input.item.contractId,
    contractVersion: input.item.contractVersion,
    portableRecord: input.item.portableRecord,
    transportState: "held",
    holdReason: "catalogue-exchange-not-authorized"
  };

  return {
    envelope,
    payloadSha256: sha256(canonical(envelope))
  };
}

export function safeCatalogueExchangeReviewReason(
  value: string
) {
  const reason = value.trim();
  return (
    reason.length >= 8 &&
    reason.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(reason)
  );
}
