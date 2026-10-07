import type {
  BusinessIntegrationOperation,
  BusinessIntegrationPackage,
  BusinessIntegrationTarget,
  BusinessIntegrationValidationResult
} from "./types";

const SIMULATION_STORAGE_KEY =
  "ai-data-platform-integration-contract-simulation-v1";

export const INTEGRATION_PACKAGE_TTL_MS = 24 * 60 * 60 * 1000;
export const INTEGRATION_MAX_SOURCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const INTEGRATION_CONTRACTS = {
  "rosie-dazzlers": {
    schemaId:
      "https://rosevear.ai/contracts/rosie-dazzlers.competitive-intelligence.v1.schema.json",
    adapterContract: "rosie-dazzlers.competitive-intelligence.v1",
    integrationKeyPrefix: "rosie-competitor::",
    allowedFields: new Set([
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
    ])
  },
  "devil-n-dove": {
    schemaId:
      "https://rosevear.ai/contracts/devil-n-dove.supplier-inventory.v1.schema.json",
    adapterContract: "devil-n-dove.supplier-inventory.v1",
    integrationKeyPrefix: "devil-supplier::",
    allowedFields: new Set([
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
    ])
  }
} as const;

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

function dateValue(value: unknown) {
  if (
    typeof value !== "string" ||
    !value ||
    Number.isNaN(Date.parse(value))
  ) {
    return null;
  }
  return value;
}

function scalar(value: unknown) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function failure(
  code: BusinessIntegrationValidationResult["code"],
  message: string,
  object?: Record<string, unknown> | null,
  target: BusinessIntegrationTarget | null = null
): BusinessIntegrationValidationResult {
  return {
    valid: false,
    code,
    errors: [message],
    warnings: [],
    packageId: String(object?.packageId ?? ""),
    replayKey: String(object?.replayKey ?? ""),
    fingerprint: String(object?.fingerprint ?? ""),
    target
  };
}

export function validateBusinessIntegrationPackage(
  value: unknown,
  options: {
    now?: string | Date;
    seenPackageIds?: ReadonlySet<string>;
    maxSourceAgeMs?: number;
  } = {}
): BusinessIntegrationValidationResult {
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  if (!object) {
    return failure("invalid-shape", "Package must be a JSON object.");
  }

  const target =
    object.target === "rosie-dazzlers" || object.target === "devil-n-dove"
      ? object.target
      : null;
  if (!target) {
    return failure(
      "invalid-shape",
      "Package target is not supported.",
      object
    );
  }

  const contract = INTEGRATION_CONTRACTS[target];
  if (object.version !== 1 || object.contractVersion !== 1) {
    return failure(
      "unsupported-version",
      "Only package/contract version 1 is supported.",
      object,
      target
    );
  }
  if (object.adapterContract !== contract.adapterContract) {
    return failure(
      "wrong-contract",
      "Adapter contract does not match the package target.",
      object,
      target
    );
  }
  if (object.schemaId !== contract.schemaId) {
    return failure(
      "wrong-schema",
      "Schema identifier does not match the package target.",
      object,
      target
    );
  }

  const batchId =
    typeof object.batchId === "string" ? object.batchId.trim() : "";
  const approvedAt = dateValue(object.approvedAt);
  const sourceDatasetUpdatedAt = dateValue(object.sourceDatasetUpdatedAt);
  const generatedAt = dateValue(object.generatedAt);
  const expiresAt = dateValue(object.expiresAt);
  if (
    !batchId ||
    !approvedAt ||
    !sourceDatasetUpdatedAt ||
    !generatedAt ||
    !expiresAt ||
    !Array.isArray(object.operations)
  ) {
    return failure(
      "invalid-shape",
      "Package timestamps, batch ID, or operations are invalid.",
      object,
      target
    );
  }

  const operations: BusinessIntegrationOperation[] = [];
  for (const raw of object.operations) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return failure(
        "invalid-operation",
        "Every operation must be an object.",
        object,
        target
      );
    }
    const operation = raw as Record<string, unknown>;
    if (operation.action !== "create" && operation.action !== "update") {
      return failure(
        "invalid-operation",
        "Operation action must be create or update.",
        object,
        target
      );
    }
    const integrationKey =
      typeof operation.integrationKey === "string"
        ? operation.integrationKey
        : "";
    if (!integrationKey.startsWith(contract.integrationKeyPrefix)) {
      return failure(
        "invalid-operation",
        "Operation integration key does not match the contract prefix.",
        object,
        target
      );
    }
    if (
      !operation.values ||
      typeof operation.values !== "object" ||
      Array.isArray(operation.values)
    ) {
      return failure(
        "invalid-operation",
        "Operation values must be an object.",
        object,
        target
      );
    }
    const values = operation.values as Record<string, unknown>;
    for (const [key, item] of Object.entries(values)) {
      if (!contract.allowedFields.has(key)) {
        return failure(
          "unexpected-field",
          "Unexpected contract field: " + key + ".",
          object,
          target
        );
      }
      if (!scalar(item)) {
        return failure(
          "invalid-operation",
          "Contract values must be scalar JSON values.",
          object,
          target
        );
      }
    }

    const evidence =
      operation.sourceEvidence &&
      typeof operation.sourceEvidence === "object" &&
      !Array.isArray(operation.sourceEvidence)
        ? (operation.sourceEvidence as Record<string, unknown>)
        : null;
    const evidenceUrl =
      typeof evidence?.sourceUrl === "string" ? evidence.sourceUrl : "";
    const retrievedAt = dateValue(evidence?.retrievedAt);
    if (!/^https?:\/\//i.test(evidenceUrl) || !retrievedAt) {
      return failure(
        "invalid-evidence",
        "Every operation requires HTTP(S) source evidence and a retrieval timestamp.",
        object,
        target
      );
    }

    operations.push({
      action: operation.action,
      integrationKey,
      values: Object.fromEntries(
        Object.entries(values).map(([key, item]) => [
          key,
          item as string | number | boolean | null
        ])
      ),
      sourceEvidence: {
        sourceUrl: evidenceUrl,
        retrievedAt
      }
    });
  }

  const fingerprint = String(object.fingerprint ?? "");
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
    return failure(
      "fingerprint-mismatch",
      "Package fingerprint does not match canonical package content.",
      object,
      target
    );
  }

  const packageId = String(object.packageId ?? "");
  const expectedPackageId = businessIntegrationPackageId({
    target,
    batchId,
    approvedAt,
    fingerprint
  });
  if (packageId !== expectedPackageId) {
    return failure(
      "invalid-package-id",
      "Package ID does not match the approved batch fingerprint.",
      object,
      target
    );
  }

  const replayKey = String(object.replayKey ?? "");
  if (
    replayKey !==
    businessIntegrationReplayKey({ target, packageId, fingerprint })
  ) {
    return failure(
      "invalid-replay-key",
      "Replay key does not match package identity.",
      object,
      target
    );
  }

  if (options.seenPackageIds?.has(packageId)) {
    return failure(
      "duplicate",
      "This package ID has already been accepted by the simulation registry.",
      object,
      target
    );
  }

  const now =
    options.now instanceof Date
      ? options.now
      : new Date(options.now ?? Date.now());
  const generated = new Date(generatedAt);
  const sourceUpdated = new Date(sourceDatasetUpdatedAt);
  const expires = new Date(expiresAt);

  if (generated.getTime() > now.getTime() + 5 * 60 * 1000) {
    return failure(
      "future-dated",
      "Package generation time is unexpectedly in the future.",
      object,
      target
    );
  }
  if (expires.getTime() <= now.getTime()) {
    return failure(
      "expired",
      "Package handoff window has expired.",
      object,
      target
    );
  }
  const maxSourceAgeMs =
    options.maxSourceAgeMs ?? INTEGRATION_MAX_SOURCE_AGE_MS;
  if (now.getTime() - sourceUpdated.getTime() > maxSourceAgeMs) {
    return failure(
      "stale",
      "Source dataset is older than the allowed freshness window.",
      object,
      target
    );
  }

  return {
    valid: true,
    code: "valid",
    errors: [],
    warnings:
      operations.length === 0
        ? ["Package has no create/update operations."]
        : [],
    packageId,
    replayKey,
    fingerprint,
    target
  };
}

function normalizeSimulationRegistry(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [] as string[];
  }
  const candidate = value as { packageIds?: unknown };
  return Array.isArray(candidate.packageIds)
    ? candidate.packageIds
        .filter((item): item is string => typeof item === "string" && Boolean(item))
        .slice(0, 200)
    : [];
}

export async function simulateBusinessIntegrationConsumer(
  rawText: string
): Promise<BusinessIntegrationValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    return {
      valid: false,
      code: "invalid-json",
      errors: ["Package is not valid JSON."],
      warnings: [],
      packageId: "",
      replayKey: "",
      fingerprint: "",
      target: null
    };
  }

  const stored = await chrome.storage.local.get(SIMULATION_STORAGE_KEY);
  const packageIds = normalizeSimulationRegistry(
    stored[SIMULATION_STORAGE_KEY]
  );
  const result = validateBusinessIntegrationPackage(parsed, {
    seenPackageIds: new Set(packageIds)
  });

  if (result.valid && result.packageId) {
    await chrome.storage.local.set({
      [SIMULATION_STORAGE_KEY]: {
        version: 1,
        packageIds: [result.packageId, ...packageIds].slice(0, 200),
        updatedAt: new Date().toISOString()
      }
    });
  }

  return result;
}

export async function clearBusinessIntegrationSimulationRegistry() {
  await chrome.storage.local.remove(SIMULATION_STORAGE_KEY);
}
