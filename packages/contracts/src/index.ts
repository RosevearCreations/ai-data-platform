export const WORKSPACE_SLUGS = [
  "rosiedazzlers",
  "devilndove",
  "personal"
] as const;

export type WorkspaceSlug = (typeof WORKSPACE_SLUGS)[number];

export const PLATFORM_NAME = "AI Data Platform";
export const PLATFORM_BUILD = "022";

export const BUSINESS_INTEGRATION_TARGETS = [
  "rosie-dazzlers",
  "devil-n-dove"
] as const;

export type BusinessIntegrationTarget =
  (typeof BUSINESS_INTEGRATION_TARGETS)[number];

export const BUSINESS_INTEGRATION_CONTRACT_VERSION = 1 as const;
export const BUSINESS_INTEGRATION_PACKAGE_VERSION = 1 as const;
export const BUSINESS_INTEGRATION_MAX_SOURCE_AGE_MS =
  30 * 24 * 60 * 60 * 1000;
export const BUSINESS_INTEGRATION_PACKAGE_TTL_MS =
  24 * 60 * 60 * 1000;

export const BUSINESS_INTEGRATION_CONTRACTS = {
  "rosie-dazzlers": {
    schemaId:
      "https://rosevear.ai/contracts/rosie-dazzlers.competitive-intelligence.v1.schema.json",
    adapterContract: "rosie-dazzlers.competitive-intelligence.v1",
    integrationKeyPrefix: "rosie-competitor::",
    allowedFields: [
      "competitorBusinessName",
      "offeringName",
      "offeringKind",
      "category",
      "priceMinimumCad",
      "priceMaximumCad",
      "priceStartingAt",
      "vehicleSize",
      "serviceAreas",
      "deliveryMode",
      "packageContents",
      "sourceUrl",
      "sourceScope",
      "retrievedAt"
    ]
  },
  "devil-n-dove": {
    schemaId:
      "https://rosevear.ai/contracts/devil-n-dove.supplier-inventory.v1.schema.json",
    adapterContract: "devil-n-dove.supplier-inventory.v1",
    integrationKeyPrefix: "devil-supplier::",
    allowedFields: [
      "supplierName",
      "productName",
      "supplierSku",
      "supplierImageUrl",
      "packagePriceCad",
      "packageQuantity",
      "stockUnit",
      "usageUnit",
      "usageUnitsPerStockUnit",
      "totalUsageUnits",
      "costPerStockUnitCad",
      "costPerUsageUnitCad",
      "sourceUrl",
      "sourceScope",
      "retrievedAt"
    ]
  }
} as const;

export type IntegrationScalar = string | number | boolean | null;

export interface BusinessIntegrationOperation {
  action: "create" | "update";
  integrationKey: string;
  values: Record<string, IntegrationScalar>;
  sourceEvidence: {
    sourceUrl: string;
    retrievedAt: string;
  };
}

export interface BusinessIntegrationPackageV1 {
  version: 1;
  schemaId: string;
  target: BusinessIntegrationTarget;
  adapterContract: string;
  contractVersion: 1;
  packageId: string;
  replayKey: string;
  batchId: string;
  approvedAt: string;
  sourceDatasetUpdatedAt: string;
  generatedAt: string;
  expiresAt: string;
  fingerprint: string;
  operations: BusinessIntegrationOperation[];
}

export type BusinessIntegrationValidationCode =
  | "valid"
  | "invalid-shape"
  | "unsupported-version"
  | "wrong-contract"
  | "wrong-schema"
  | "invalid-package-id"
  | "invalid-replay-key"
  | "fingerprint-mismatch"
  | "duplicate"
  | "stale"
  | "expired"
  | "future-dated"
  | "unexpected-field"
  | "invalid-operation"
  | "invalid-evidence";

export interface BusinessIntegrationValidationResult {
  valid: boolean;
  code: BusinessIntegrationValidationCode;
  errors: string[];
  warnings: string[];
  packageId: string;
  replayKey: string;
  fingerprint: string;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map((item) => stableJson(item)).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(object)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value) ?? "null";
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function businessIntegrationFingerprint(input: {
  target: BusinessIntegrationTarget;
  adapterContract: string;
  contractVersion: number;
  batchId: string;
  approvedAt: string;
  sourceDatasetUpdatedAt: string;
  operations: BusinessIntegrationOperation[];
}) {
  return hashText(
    stableJson({
      target: input.target,
      adapterContract: input.adapterContract,
      contractVersion: input.contractVersion,
      batchId: input.batchId,
      approvedAt: input.approvedAt,
      sourceDatasetUpdatedAt: input.sourceDatasetUpdatedAt,
      operations: input.operations
    })
  );
}

export function businessIntegrationPackageId(input: {
  target: BusinessIntegrationTarget;
  batchId: string;
  approvedAt: string;
  fingerprint: string;
}) {
  return (
    "integration-package-" +
    hashText(
      stableJson({
        target: input.target,
        batchId: input.batchId,
        approvedAt: input.approvedAt,
        fingerprint: input.fingerprint
      })
    )
  );
}

export function businessIntegrationReplayKey(input: {
  target: BusinessIntegrationTarget;
  packageId: string;
  fingerprint: string;
}) {
  return input.target + "::" + input.packageId + "::" + input.fingerprint;
}

function isDate(value: unknown) {
  return typeof value === "string" && Boolean(value) && !Number.isNaN(Date.parse(value));
}

function isScalar(value: unknown): value is IntegrationScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function validateBusinessIntegrationPackage(
  value: unknown,
  options: {
    now?: string | Date;
    seenPackageIds?: ReadonlySet<string>;
    maxSourceAgeMs?: number;
  } = {}
): BusinessIntegrationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  if (!object) {
    return {
      valid: false,
      code: "invalid-shape",
      errors: ["Package must be a JSON object."],
      warnings,
      packageId: "",
      replayKey: "",
      fingerprint: ""
    };
  }

  const target = object.target;
  if (target !== "rosie-dazzlers" && target !== "devil-n-dove") {
    return {
      valid: false,
      code: "invalid-shape",
      errors: ["Package target is not supported."],
      warnings,
      packageId: String(object.packageId ?? ""),
      replayKey: String(object.replayKey ?? ""),
      fingerprint: String(object.fingerprint ?? "")
    };
  }

  const contract = BUSINESS_INTEGRATION_CONTRACTS[target];
  const packageId = String(object.packageId ?? "");
  const replayKey = String(object.replayKey ?? "");
  const fingerprint = String(object.fingerprint ?? "");

  if (
    object.version !== BUSINESS_INTEGRATION_PACKAGE_VERSION ||
    object.contractVersion !== BUSINESS_INTEGRATION_CONTRACT_VERSION
  ) {
    errors.push("Only package/contract version 1 is supported.");
    return { valid: false, code: "unsupported-version", errors, warnings, packageId, replayKey, fingerprint };
  }

  if (object.adapterContract !== contract.adapterContract) {
    errors.push("Adapter contract does not match the package target.");
    return { valid: false, code: "wrong-contract", errors, warnings, packageId, replayKey, fingerprint };
  }

  if (object.schemaId !== contract.schemaId) {
    errors.push("Schema identifier does not match the package target.");
    return { valid: false, code: "wrong-schema", errors, warnings, packageId, replayKey, fingerprint };
  }

  const batchId = String(object.batchId ?? "");
  const approvedAt = String(object.approvedAt ?? "");
  const sourceDatasetUpdatedAt = String(object.sourceDatasetUpdatedAt ?? "");
  const generatedAt = String(object.generatedAt ?? "");
  const expiresAt = String(object.expiresAt ?? "");
  if (
    !batchId ||
    !isDate(approvedAt) ||
    !isDate(sourceDatasetUpdatedAt) ||
    !isDate(generatedAt) ||
    !isDate(expiresAt) ||
    !Array.isArray(object.operations)
  ) {
    errors.push("Package timestamps, batch ID, or operations are invalid.");
    return { valid: false, code: "invalid-shape", errors, warnings, packageId, replayKey, fingerprint };
  }

  const operations: BusinessIntegrationOperation[] = [];
  const allowedFields = new Set<string>(contract.allowedFields);
  for (const raw of object.operations) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("Every operation must be an object.");
      return { valid: false, code: "invalid-operation", errors, warnings, packageId, replayKey, fingerprint };
    }
    const operation = raw as Record<string, unknown>;
    if (operation.action !== "create" && operation.action !== "update") {
      errors.push("Operation action must be create or update.");
      return { valid: false, code: "invalid-operation", errors, warnings, packageId, replayKey, fingerprint };
    }
    const integrationKey = String(operation.integrationKey ?? "");
    if (!integrationKey.startsWith(contract.integrationKeyPrefix)) {
      errors.push("Operation integration key does not match the contract prefix.");
      return { valid: false, code: "invalid-operation", errors, warnings, packageId, replayKey, fingerprint };
    }
    if (!operation.values || typeof operation.values !== "object" || Array.isArray(operation.values)) {
      errors.push("Operation values must be an object.");
      return { valid: false, code: "invalid-operation", errors, warnings, packageId, replayKey, fingerprint };
    }
    const values = operation.values as Record<string, unknown>;
    for (const [key, scalar] of Object.entries(values)) {
      if (!allowedFields.has(key)) {
        errors.push("Unexpected contract field: " + key + ".");
        return { valid: false, code: "unexpected-field", errors, warnings, packageId, replayKey, fingerprint };
      }
      if (!isScalar(scalar)) {
        errors.push("Contract values must be scalar JSON values.");
        return { valid: false, code: "invalid-operation", errors, warnings, packageId, replayKey, fingerprint };
      }
    }
    const evidence =
      operation.sourceEvidence &&
      typeof operation.sourceEvidence === "object" &&
      !Array.isArray(operation.sourceEvidence)
        ? (operation.sourceEvidence as Record<string, unknown>)
        : null;
    if (
      !evidence ||
      typeof evidence.sourceUrl !== "string" ||
      !/^https?:\/\//i.test(evidence.sourceUrl) ||
      !isDate(evidence.retrievedAt)
    ) {
      errors.push("Every operation requires HTTP(S) source evidence and a retrieval timestamp.");
      return { valid: false, code: "invalid-evidence", errors, warnings, packageId, replayKey, fingerprint };
    }
    operations.push({
      action: operation.action,
      integrationKey,
      values: Object.fromEntries(
        Object.entries(values).map(([key, scalar]) => [key, scalar as IntegrationScalar])
      ),
      sourceEvidence: {
        sourceUrl: evidence.sourceUrl,
        retrievedAt: String(evidence.retrievedAt)
      }
    });
  }

  const expectedFingerprint = businessIntegrationFingerprint({
    target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt,
    operations
  });
  if (fingerprint !== expectedFingerprint) {
    errors.push("Package fingerprint does not match canonical package content.");
    return { valid: false, code: "fingerprint-mismatch", errors, warnings, packageId, replayKey, fingerprint };
  }

  const expectedPackageId = businessIntegrationPackageId({
    target,
    batchId,
    approvedAt,
    fingerprint
  });
  if (packageId !== expectedPackageId) {
    errors.push("Package ID does not match the approved batch fingerprint.");
    return { valid: false, code: "invalid-package-id", errors, warnings, packageId, replayKey, fingerprint };
  }

  const expectedReplayKey = businessIntegrationReplayKey({ target, packageId, fingerprint });
  if (replayKey !== expectedReplayKey) {
    errors.push("Replay key does not match package identity.");
    return { valid: false, code: "invalid-replay-key", errors, warnings, packageId, replayKey, fingerprint };
  }

  if (options.seenPackageIds?.has(packageId)) {
    errors.push("This package ID has already been consumed.");
    return { valid: false, code: "duplicate", errors, warnings, packageId, replayKey, fingerprint };
  }

  const now =
    options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const generated = new Date(generatedAt);
  const sourceUpdated = new Date(sourceDatasetUpdatedAt);
  const expires = new Date(expiresAt);
  const maxSourceAgeMs =
    options.maxSourceAgeMs ?? BUSINESS_INTEGRATION_MAX_SOURCE_AGE_MS;

  if (generated.getTime() > now.getTime() + 5 * 60 * 1000) {
    errors.push("Package generation time is unexpectedly in the future.");
    return { valid: false, code: "future-dated", errors, warnings, packageId, replayKey, fingerprint };
  }
  if (expires.getTime() <= now.getTime()) {
    errors.push("Package handoff window has expired.");
    return { valid: false, code: "expired", errors, warnings, packageId, replayKey, fingerprint };
  }
  if (now.getTime() - sourceUpdated.getTime() > maxSourceAgeMs) {
    errors.push("Source dataset is older than the allowed freshness window.");
    return { valid: false, code: "stale", errors, warnings, packageId, replayKey, fingerprint };
  }
  if (!operations.length) warnings.push("Package has no create/update operations.");

  return { valid: true, code: "valid", errors, warnings, packageId, replayKey, fingerprint };
}

function schemaFor(target: BusinessIntegrationTarget) {
  const contract = BUSINESS_INTEGRATION_CONTRACTS[target];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: contract.schemaId,
    title: contract.adapterContract,
    type: "object",
    additionalProperties: false,
    required: [
      "version", "schemaId", "target", "adapterContract", "contractVersion",
      "packageId", "replayKey", "batchId", "approvedAt", "sourceDatasetUpdatedAt",
      "generatedAt", "expiresAt", "fingerprint", "operations"
    ],
    properties: {
      version: { const: 1 },
      schemaId: { const: contract.schemaId },
      target: { const: target },
      adapterContract: { const: contract.adapterContract },
      contractVersion: { const: 1 },
      packageId: { type: "string", minLength: 1 },
      replayKey: { type: "string", minLength: 1 },
      batchId: { type: "string", minLength: 1 },
      approvedAt: { type: "string", format: "date-time" },
      sourceDatasetUpdatedAt: { type: "string", format: "date-time" },
      generatedAt: { type: "string", format: "date-time" },
      expiresAt: { type: "string", format: "date-time" },
      fingerprint: { type: "string", pattern: "^[0-9a-f]{8}$" },
      operations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "integrationKey", "values", "sourceEvidence"],
          properties: {
            action: { enum: ["create", "update"] },
            integrationKey: { type: "string", minLength: 1 },
            values: {
              type: "object",
              additionalProperties: false,
              properties: Object.fromEntries(
                contract.allowedFields.map((key) => [
                  key,
                  { type: ["string", "number", "boolean", "null"] }
                ])
              )
            },
            sourceEvidence: {
              type: "object",
              additionalProperties: false,
              required: ["sourceUrl", "retrievedAt"],
              properties: {
                sourceUrl: { type: "string", pattern: "^https?://" },
                retrievedAt: { type: "string", format: "date-time" }
              }
            }
          }
        }
      }
    }
  } as const;
}

export const ROSIE_DAZZLERS_INTEGRATION_SCHEMA_V1 =
  schemaFor("rosie-dazzlers");
export const DEVIL_N_DOVE_INTEGRATION_SCHEMA_V1 =
  schemaFor("devil-n-dove");
