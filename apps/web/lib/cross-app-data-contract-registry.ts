import { createHash } from "node:crypto";

import {
  PEER_APPLICATION_DEFINITIONS,
  type PeerApplicationId
} from "./app-connection-registry";

export type CrossAppContractKind =
  | "customer"
  | "product"
  | "service"
  | "booking"
  | "job"
  | "staff"
  | "equipment"
  | "invoice"
  | "media"
  | "inventory"
  | "notification";

export type CrossAppFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date-time"
  | "string-array";

export type CrossAppDataContractField = {
  key: string;
  label: string;
  type: CrossAppFieldType;
  required: boolean;
  description: string;
  enumValues?: readonly string[];
};

export type CrossAppDataContract = {
  kind: CrossAppContractKind;
  contractId: string;
  version: "1.0.0";
  majorVersion: 1;
  schemaId: string;
  title: string;
  description: string;
  compatibilityPolicy: "same-major-additive";
  additionalProperties: false;
  fields: readonly CrossAppDataContractField[];
  schemaFingerprint: string;
};

export type CrossAppDataContractRegistry = {
  schema: "ai-data-platform.cross-app-data-contract-registry.v1";
  build: 286;
  generatedAt: string;
  contracts: CrossAppDataContract[];
  peerApplications: Array<{
    applicationId: PeerApplicationId;
    displayName: string;
    availability: "registry-available";
    implementationEvidence: "not-asserted";
  }>;
  existingBusinessContracts: Array<{
    targetApplicationId: "rosiedazzlers" | "devilndove";
    adapterContract: string;
    schemaId: string;
    source: "packages/contracts/src/index.ts";
    relationship: "preserved-separately";
  }>;
  summary: {
    sharedContracts: number;
    peerApplications: number;
    activeVersions: number;
    reusableContractKinds: number;
    existingBusinessContractsPreserved: number;
    databaseMigrations: number;
    automaticConnectionActivations: number;
  };
  policy: {
    registryIsDeclarative: true;
    sameMajorAdditiveCompatibility: true;
    unknownContractsFailClosed: true;
    unknownFieldsFailClosed: true;
    appImplementationNotInferred: true;
    existingBusinessContractsRemainAuthoritative: true;
    fieldMappingRequiredBeforeExchange: true;
    liveExchangeAuthorized: false;
    automaticConnectionActivation: false;
    ql266Resumed: false;
  };
};

export type CrossAppCompatibilityInput = {
  contractId: string;
  producerApplicationId: string;
  consumerApplicationId: string;
  producerVersion: string;
  consumerVersion: string;
  schemaId?: string | null;
  schemaFingerprint?: string | null;
};

export type CrossAppCompatibilityResult = {
  compatible: boolean;
  code:
    | "compatible"
    | "unknown-contract"
    | "invalid-application"
    | "same-application"
    | "invalid-version"
    | "unsupported-major"
    | "future-version"
    | "schema-mismatch"
    | "fingerprint-mismatch";
  contractId: string;
  registryVersion: string | null;
  producerApplicationId: string;
  consumerApplicationId: string;
  producerVersion: string;
  consumerVersion: string;
  implementationVerified: false;
  fieldMappingRequired: true;
  detail: string;
};

export type CrossAppRecordValidationResult = {
  valid: boolean;
  contractId: string;
  version: string | null;
  errors: string[];
};

const COMMON_FIELDS: readonly CrossAppDataContractField[] = Object.freeze([
  Object.freeze({
    key: "sourceApplicationId",
    label: "Source application",
    type: "string" as const,
    required: true,
    description: "Stable peer-application ID that owns the source record.",
    enumValues: Object.freeze(
      PEER_APPLICATION_DEFINITIONS.map((application) => application.id)
    )
  }),
  Object.freeze({
    key: "sourceRecordId",
    label: "Source record ID",
    type: "string" as const,
    required: true,
    description: "Stable record identifier in the source application."
  }),
  Object.freeze({
    key: "tenantKey",
    label: "Tenant key",
    type: "string" as const,
    required: true,
    description: "Logical tenant key used to keep cross-app scope explicit."
  }),
  Object.freeze({
    key: "updatedAt",
    label: "Updated at",
    type: "date-time" as const,
    required: true,
    description: "Last source-record update timestamp."
  })
]);

function field(
  key: string,
  label: string,
  type: CrossAppFieldType,
  description: string,
  options: {
    required?: boolean;
    enumValues?: readonly string[];
  } = {}
): CrossAppDataContractField {
  return Object.freeze({
    key,
    label,
    type,
    required: options.required ?? false,
    description,
    ...(options.enumValues
      ? { enumValues: Object.freeze([...options.enumValues]) }
      : {})
  });
}

const DOMAIN_FIELDS: Record<
  CrossAppContractKind,
  readonly CrossAppDataContractField[]
> = {
  customer: Object.freeze([
    field("displayName", "Display name", "string", "Customer or account display name."),
    field("email", "Email", "string", "Primary customer email when available."),
    field("phone", "Phone", "string", "Primary customer phone when available."),
    field("status", "Status", "string", "Source customer lifecycle status."),
    field("addressText", "Address", "string", "Human-readable service or billing address."),
    field("tags", "Tags", "string-array", "Portable customer classification tags.")
  ]),
  product: Object.freeze([
    field("sku", "SKU", "string", "Source product SKU or merchant code."),
    field("name", "Name", "string", "Product display name.", { required: true }),
    field("description", "Description", "string", "Portable product description."),
    field("category", "Category", "string", "Product category."),
    field("status", "Status", "string", "Product lifecycle status."),
    field("priceCad", "Price CAD", "number", "Portable Canadian-dollar unit price."),
    field("imageUrl", "Image URL", "string", "Primary public product image URL.")
  ]),
  service: Object.freeze([
    field("name", "Name", "string", "Service display name.", { required: true }),
    field("description", "Description", "string", "Portable service description."),
    field("category", "Category", "string", "Service category."),
    field("status", "Status", "string", "Service lifecycle status."),
    field("startingPriceCad", "Starting price CAD", "number", "Portable starting price in CAD."),
    field("durationMinutes", "Duration minutes", "number", "Nominal service duration."),
    field("serviceAreas", "Service areas", "string-array", "Named service-area labels.")
  ]),
  booking: Object.freeze([
    field("customerRecordId", "Customer record ID", "string", "Related customer source record."),
    field("serviceRecordId", "Service record ID", "string", "Related service source record."),
    field("startAt", "Start at", "date-time", "Scheduled booking start.", { required: true }),
    field("endAt", "End at", "date-time", "Scheduled booking end."),
    field("status", "Status", "string", "Booking lifecycle status.", { required: true }),
    field("locationText", "Location", "string", "Portable booking location label."),
    field("notes", "Notes", "string", "Non-secret operational booking notes.")
  ]),
  job: Object.freeze([
    field("customerRecordId", "Customer record ID", "string", "Related customer source record."),
    field("bookingRecordId", "Booking record ID", "string", "Related booking source record."),
    field("serviceRecordId", "Service record ID", "string", "Related service source record."),
    field("status", "Status", "string", "Job lifecycle status.", { required: true }),
    field("scheduledStartAt", "Scheduled start", "date-time", "Planned job start."),
    field("scheduledEndAt", "Scheduled end", "date-time", "Planned job end."),
    field("assignedStaffRecordIds", "Assigned staff", "string-array", "Related staff source records."),
    field("locationText", "Location", "string", "Portable job location label.")
  ]),
  staff: Object.freeze([
    field("displayName", "Display name", "string", "Staff display name.", { required: true }),
    field("role", "Role", "string", "Operational role label."),
    field("email", "Email", "string", "Work contact email when portable."),
    field("phone", "Phone", "string", "Work contact phone when portable."),
    field("active", "Active", "boolean", "Whether the staff record is active."),
    field("skills", "Skills", "string-array", "Portable skill or qualification labels.")
  ]),
  equipment: Object.freeze([
    field("name", "Name", "string", "Equipment display name.", { required: true }),
    field("category", "Category", "string", "Equipment category."),
    field("status", "Status", "string", "Operational equipment status."),
    field("serialNumber", "Serial number", "string", "Manufacturer or internal serial number."),
    field("assignedStaffRecordId", "Assigned staff record ID", "string", "Related staff source record."),
    field("serviceDueAt", "Service due", "date-time", "Next maintenance/service due time.")
  ]),
  invoice: Object.freeze([
    field("customerRecordId", "Customer record ID", "string", "Related customer source record."),
    field("status", "Status", "string", "Invoice lifecycle status.", { required: true }),
    field("currency", "Currency", "string", "ISO-style currency code.", {
      required: true,
      enumValues: ["CAD", "USD"]
    }),
    field("subtotal", "Subtotal", "number", "Invoice subtotal."),
    field("tax", "Tax", "number", "Invoice tax total."),
    field("total", "Total", "number", "Invoice grand total.", { required: true }),
    field("dueAt", "Due at", "date-time", "Payment due timestamp."),
    field("paidAt", "Paid at", "date-time", "Payment completion timestamp.")
  ]),
  media: Object.freeze([
    field("ownerKind", "Owner kind", "string", "Record kind that owns the media."),
    field("ownerRecordId", "Owner record ID", "string", "Source record that owns the media."),
    field("mediaType", "Media type", "string", "Portable media category.", {
      required: true,
      enumValues: ["image", "video", "document", "audio"]
    }),
    field("url", "URL", "string", "Media URL.", { required: true }),
    field("altText", "Alt text", "string", "Accessible alternative text."),
    field("caption", "Caption", "string", "Portable media caption."),
    field("createdAt", "Created at", "date-time", "Media creation timestamp.")
  ]),
  inventory: Object.freeze([
    field("productRecordId", "Product record ID", "string", "Related product source record."),
    field("sku", "SKU", "string", "Inventory SKU or stock code."),
    field("name", "Name", "string", "Inventory item display name.", { required: true }),
    field("quantityOnHand", "Quantity on hand", "number", "Current portable stock quantity.", {
      required: true
    }),
    field("unit", "Unit", "string", "Stock measurement unit.", { required: true }),
    field("reorderPoint", "Reorder point", "number", "Suggested reorder threshold."),
    field("locationText", "Location", "string", "Storage or stock location label.")
  ]),
  notification: Object.freeze([
    field("customerRecordId", "Customer record ID", "string", "Related customer source record."),
    field("channel", "Channel", "string", "Delivery channel.", {
      required: true,
      enumValues: ["email", "sms", "push", "in-app", "voice"]
    }),
    field("templateKey", "Template key", "string", "Stable notification template identifier."),
    field("consentBasis", "Consent basis", "string", "Portable consent/permission basis label."),
    field("status", "Status", "string", "Notification lifecycle status.", { required: true }),
    field("scheduledAt", "Scheduled at", "date-time", "Planned delivery timestamp."),
    field("sentAt", "Sent at", "date-time", "Observed send timestamp.")
  ])
};

const TITLES: Record<CrossAppContractKind, string> = {
  customer: "Customer",
  product: "Product",
  service: "Service",
  booking: "Booking",
  job: "Job",
  staff: "Staff",
  equipment: "Equipment",
  invoice: "Invoice",
  media: "Media",
  inventory: "Inventory",
  notification: "Notification"
};

const DESCRIPTIONS: Record<CrossAppContractKind, string> = {
  customer: "Portable customer/account identity and contact metadata.",
  product: "Portable sellable product identity, merchandising and price metadata.",
  service: "Portable service catalogue and starting-price metadata.",
  booking: "Portable scheduled booking relationship, time and status metadata.",
  job: "Portable operational job assignment, schedule and status metadata.",
  staff: "Portable staff identity, role, availability and skill metadata.",
  equipment: "Portable equipment identity, assignment and maintenance metadata.",
  invoice: "Portable invoice totals, status and payment timing metadata.",
  media: "Portable media ownership, type, URL and accessibility metadata.",
  inventory: "Portable stock identity, quantity, unit and reorder metadata.",
  notification: "Portable notification channel, consent, schedule and status metadata."
};

const CONTRACT_KINDS: readonly CrossAppContractKind[] = Object.freeze([
  "customer",
  "product",
  "service",
  "booking",
  "job",
  "staff",
  "equipment",
  "invoice",
  "media",
  "inventory",
  "notification"
]);

function canonicalDescriptor(input: {
  kind: CrossAppContractKind;
  contractId: string;
  version: "1.0.0";
  schemaId: string;
  fields: readonly CrossAppDataContractField[];
}) {
  return JSON.stringify({
    kind: input.kind,
    contractId: input.contractId,
    version: input.version,
    schemaId: input.schemaId,
    fields: input.fields.map((item) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      required: item.required,
      description: item.description,
      enumValues: item.enumValues ? [...item.enumValues] : undefined
    }))
  });
}

function makeContract(kind: CrossAppContractKind): CrossAppDataContract {
  const contractId = `rosevear.shared.${kind}.v1`;
  const schemaId =
    `https://rosevear.ai/contracts/shared/${kind}.v1.schema.json`;
  const fields = Object.freeze([...COMMON_FIELDS, ...DOMAIN_FIELDS[kind]]);
  const schemaFingerprint = createHash("sha256")
    .update(canonicalDescriptor({ kind, contractId, version: "1.0.0", schemaId, fields }))
    .digest("hex");

  return Object.freeze({
    kind,
    contractId,
    version: "1.0.0" as const,
    majorVersion: 1 as const,
    schemaId,
    title: TITLES[kind],
    description: DESCRIPTIONS[kind],
    compatibilityPolicy: "same-major-additive" as const,
    additionalProperties: false as const,
    fields,
    schemaFingerprint
  });
}

const SHARED_CONTRACTS = Object.freeze(CONTRACT_KINDS.map(makeContract));

function parseVersion(value: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareVersion(
  left: { major: number; minor: number; patch: number },
  right: { major: number; minor: number; patch: number }
) {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function peerApplicationIds() {
  return new Set(PEER_APPLICATION_DEFINITIONS.map((application) => application.id));
}

export function getCrossAppDataContract(contractId: string) {
  return SHARED_CONTRACTS.find((contract) => contract.contractId === contractId) ?? null;
}

export function buildCrossAppDataContractRegistry(
  generatedAt = new Date().toISOString()
): CrossAppDataContractRegistry {
  const peerApplications = PEER_APPLICATION_DEFINITIONS.map((application) => ({
    applicationId: application.id,
    displayName: application.displayName,
    availability: "registry-available" as const,
    implementationEvidence: "not-asserted" as const
  }));

  return {
    schema: "ai-data-platform.cross-app-data-contract-registry.v1",
    build: 286,
    generatedAt,
    contracts: [...SHARED_CONTRACTS],
    peerApplications,
    existingBusinessContracts: [
      {
        targetApplicationId: "rosiedazzlers",
        adapterContract: "rosie-dazzlers.competitive-intelligence.v1",
        schemaId:
          "https://rosevear.ai/contracts/rosie-dazzlers.competitive-intelligence.v1.schema.json",
        source: "packages/contracts/src/index.ts",
        relationship: "preserved-separately"
      },
      {
        targetApplicationId: "devilndove",
        adapterContract: "devil-n-dove.supplier-inventory.v1",
        schemaId:
          "https://rosevear.ai/contracts/devil-n-dove.supplier-inventory.v1.schema.json",
        source: "packages/contracts/src/index.ts",
        relationship: "preserved-separately"
      }
    ],
    summary: {
      sharedContracts: SHARED_CONTRACTS.length,
      peerApplications: peerApplications.length,
      activeVersions: SHARED_CONTRACTS.length,
      reusableContractKinds: CONTRACT_KINDS.length,
      existingBusinessContractsPreserved: 2,
      databaseMigrations: 0,
      automaticConnectionActivations: 0
    },
    policy: {
      registryIsDeclarative: true,
      sameMajorAdditiveCompatibility: true,
      unknownContractsFailClosed: true,
      unknownFieldsFailClosed: true,
      appImplementationNotInferred: true,
      existingBusinessContractsRemainAuthoritative: true,
      fieldMappingRequiredBeforeExchange: true,
      liveExchangeAuthorized: false,
      automaticConnectionActivation: false,
      ql266Resumed: false
    }
  };
}

export function evaluateCrossAppDataContractCompatibility(
  input: CrossAppCompatibilityInput
): CrossAppCompatibilityResult {
  const base = {
    contractId: input.contractId,
    producerApplicationId: input.producerApplicationId,
    consumerApplicationId: input.consumerApplicationId,
    producerVersion: input.producerVersion,
    consumerVersion: input.consumerVersion,
    implementationVerified: false as const,
    fieldMappingRequired: true as const
  };
  const contract = getCrossAppDataContract(input.contractId);
  if (!contract) {
    return {
      ...base,
      compatible: false,
      code: "unknown-contract",
      registryVersion: null,
      detail: "The requested contract is not registered. Unknown contracts fail closed."
    };
  }
  const apps = peerApplicationIds();
  if (
    !apps.has(input.producerApplicationId as PeerApplicationId) ||
    !apps.has(input.consumerApplicationId as PeerApplicationId)
  ) {
    return {
      ...base,
      compatible: false,
      code: "invalid-application",
      registryVersion: contract.version,
      detail: "Producer and consumer must both be registered peer applications."
    };
  }
  if (input.producerApplicationId === input.consumerApplicationId) {
    return {
      ...base,
      compatible: false,
      code: "same-application",
      registryVersion: contract.version,
      detail: "Cross-app compatibility requires two different registered applications."
    };
  }
  const producer = parseVersion(input.producerVersion);
  const consumer = parseVersion(input.consumerVersion);
  const current = parseVersion(contract.version);
  if (!producer || !consumer || !current) {
    return {
      ...base,
      compatible: false,
      code: "invalid-version",
      registryVersion: contract.version,
      detail: "Versions must use strict semantic version form such as 1.0.0."
    };
  }
  if (
    producer.major !== contract.majorVersion ||
    consumer.major !== contract.majorVersion ||
    producer.major !== consumer.major
  ) {
    return {
      ...base,
      compatible: false,
      code: "unsupported-major",
      registryVersion: contract.version,
      detail: "Build 286 accepts only the registered major version for this contract."
    };
  }
  if (compareVersion(producer, current) > 0 || compareVersion(consumer, current) > 0) {
    return {
      ...base,
      compatible: false,
      code: "future-version",
      registryVersion: contract.version,
      detail: "A producer or consumer requested a version newer than the registry knows."
    };
  }
  if (input.schemaId && input.schemaId !== contract.schemaId) {
    return {
      ...base,
      compatible: false,
      code: "schema-mismatch",
      registryVersion: contract.version,
      detail: "Observed schema ID does not match the registered contract schema."
    };
  }
  if (
    input.schemaFingerprint &&
    input.schemaFingerprint !== contract.schemaFingerprint
  ) {
    return {
      ...base,
      compatible: false,
      code: "fingerprint-mismatch",
      registryVersion: contract.version,
      detail: "Observed schema fingerprint does not match the registry fingerprint."
    };
  }

  return {
    ...base,
    compatible: true,
    code: "compatible",
    registryVersion: contract.version,
    detail:
      "Schema/version compatibility passes. This does not assert that either application has implemented the contract; Build 287 field mapping is still required before exchange."
  };
}

function valueMatchesField(field: CrossAppDataContractField, value: unknown) {
  if (field.enumValues) {
    return typeof value === "string" && field.enumValues.includes(value);
  }
  if (field.type === "string") return typeof value === "string";
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value);
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "date-time") {
    return (
      typeof value === "string" &&
      value.length > 0 &&
      !Number.isNaN(Date.parse(value))
    );
  }
  if (field.type === "string-array") {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  return false;
}

export function validateCrossAppDataContractRecord(
  contractId: string,
  value: unknown
): CrossAppRecordValidationResult {
  const contract = getCrossAppDataContract(contractId);
  if (!contract) {
    return {
      valid: false,
      contractId,
      version: null,
      errors: ["Unknown cross-app data contract."]
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      valid: false,
      contractId,
      version: contract.version,
      errors: ["Record must be a JSON object."]
    };
  }

  const object = value as Record<string, unknown>;
  const fields = new Map(contract.fields.map((item) => [item.key, item]));
  const errors: string[] = [];

  for (const key of Object.keys(object)) {
    if (!fields.has(key)) errors.push("Unexpected field: " + key + ".");
  }
  for (const field of contract.fields) {
    if (!(field.key in object)) {
      if (field.required) errors.push("Missing required field: " + field.key + ".");
      continue;
    }
    if (!valueMatchesField(field, object[field.key])) {
      errors.push(
        "Field " + field.key + " must match type " + field.type + "."
      );
    }
  }

  return {
    valid: errors.length === 0,
    contractId,
    version: contract.version,
    errors
  };
}

function fieldSchema(field: CrossAppDataContractField) {
  if (field.enumValues) return { type: "string", enum: [...field.enumValues] };
  if (field.type === "date-time") return { type: "string", format: "date-time" };
  if (field.type === "string-array") {
    return { type: "array", items: { type: "string" }, uniqueItems: true };
  }
  return { type: field.type };
}

export function buildCrossAppDataContractJsonSchema(contractId: string) {
  const contract = getCrossAppDataContract(contractId);
  if (!contract) return null;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: contract.schemaId,
    title: contract.title + " Cross-App Contract",
    description: contract.description,
    type: "object",
    additionalProperties: false,
    required: contract.fields
      .filter((item) => item.required)
      .map((item) => item.key),
    properties: Object.fromEntries(
      contract.fields.map((item) => [item.key, fieldSchema(item)])
    )
  };
}
