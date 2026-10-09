export type IntegrationTarget = "rosie-dazzlers" | "devil-n-dove";

export type IntegrationScalar = string | number | boolean | null;

export interface IntegrationOperation {
  action: "create" | "update";
  integrationKey: string;
  values: Record<string, IntegrationScalar>;
  sourceEvidence: {
    sourceUrl: string;
    retrievedAt: string;
  };
}

export interface IntegrationPackageV1 {
  version: 1;
  schemaId: string;
  target: IntegrationTarget;
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
  operations: IntegrationOperation[];
}

export interface IntegrationValidationResult {
  valid: boolean;
  code: string;
  errors: string[];
  packageId: string;
  replayKey: string;
  fingerprint: string;
  target: IntegrationTarget | null;
}

export const INTEGRATION_CONSUMER_PROTOCOL = "rosevear.integration-consumer.v1";
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

export function integrationFingerprint(input: {
  target: IntegrationTarget;
  adapterContract: string;
  contractVersion: number;
  batchId: string;
  approvedAt: string;
  sourceDatasetUpdatedAt: string;
  operations: IntegrationOperation[];
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

export function integrationPackageId(input: {
  target: IntegrationTarget;
  batchId: string;
  approvedAt: string;
  fingerprint: string;
}) {
  return (
    "integration-package-" +
    hashText({
      toString: () =>
        stableJson({
          target: input.target,
          batchId: input.batchId,
          approvedAt: input.approvedAt,
          fingerprint: input.fingerprint
        })
    }.toString())
  );
}

export function integrationReplayKey(input: {
  target: IntegrationTarget;
  packageId: string;
  fingerprint: string;
}) {
  return input.target + "::" + input.packageId + "::" + input.fingerprint;
}

export function validateIntegrationPackage(
  value: unknown,
  options: {
    now?: string | Date;
    seenPackageIds?: ReadonlySet<string>;
    expectedTarget?: IntegrationTarget;
    maxSourceAgeMs?: number;
  } = {}
): IntegrationValidationResult {
  const errors: string[] = [];
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  if (!object) {
    return {
      valid: false,
      code: "invalid-shape",
      errors: ["Package must be a JSON object."],
      packageId: "",
      replayKey: "",
      fingerprint: "",
      target: null
    };
  }

  const target =
    object.target === "rosie-dazzlers" || object.target === "devil-n-dove"
      ? object.target
      : null;
  const packageId = String(object.packageId ?? "");
  const replayKey = String(object.replayKey ?? "");
  const fingerprint = String(object.fingerprint ?? "");

  if (!target) {
    return {
      valid: false,
      code: "invalid-shape",
      errors: ["Package target is not supported."],
      packageId,
      replayKey,
      fingerprint,
      target: null
    };
  }
  if (options.expectedTarget && target !== options.expectedTarget) {
    return {
      valid: false,
      code: "wrong-target",
      errors: ["Package target does not match the configured consumer."],
      packageId,
      replayKey,
      fingerprint,
      target
    };
  }

  const contract = INTEGRATION_CONTRACTS[target];
  if (object.version !== 1 || object.contractVersion !== 1) {
    errors.push("Only package/contract version 1 is supported.");
    return { valid: false, code: "unsupported-version", errors, packageId, replayKey, fingerprint, target };
  }
  if (object.adapterContract !== contract.adapterContract) {
    errors.push("Adapter contract does not match the package target.");
    return { valid: false, code: "wrong-contract", errors, packageId, replayKey, fingerprint, target };
  }
  if (object.schemaId !== contract.schemaId) {
    errors.push("Schema identifier does not match the package target.");
    return { valid: false, code: "wrong-schema", errors, packageId, replayKey, fingerprint, target };
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
    return { valid: false, code: "invalid-shape", errors, packageId, replayKey, fingerprint, target };
  }

  const operations: IntegrationOperation[] = [];
  for (const raw of object.operations) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("Every operation must be an object.");
      return { valid: false, code: "invalid-operation", errors, packageId, replayKey, fingerprint, target };
    }
    const operation = raw as Record<string, unknown>;
    if (operation.action !== "create" && operation.action !== "update") {
      errors.push("Operation action must be create or update.");
      return { valid: false, code: "invalid-operation", errors, packageId, replayKey, fingerprint, target };
    }
    const integrationKey = String(operation.integrationKey ?? "");
    if (!integrationKey.startsWith(contract.integrationKeyPrefix)) {
      errors.push("Operation integration key does not match the contract prefix.");
      return { valid: false, code: "invalid-operation", errors, packageId, replayKey, fingerprint, target };
    }
    if (!operation.values || typeof operation.values !== "object" || Array.isArray(operation.values)) {
      errors.push("Operation values must be an object.");
      return { valid: false, code: "invalid-operation", errors, packageId, replayKey, fingerprint, target };
    }
    const values = operation.values as Record<string, unknown>;
    for (const [key, scalar] of Object.entries(values)) {
      if (!contract.allowedFields.has(key as never)) {
        errors.push("Unexpected contract field: " + key + ".");
        return { valid: false, code: "unexpected-field", errors, packageId, replayKey, fingerprint, target };
      }
      if (!isScalar(scalar)) {
        errors.push("Contract values must be scalar JSON values.");
        return { valid: false, code: "invalid-operation", errors, packageId, replayKey, fingerprint, target };
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
      return { valid: false, code: "invalid-evidence", errors, packageId, replayKey, fingerprint, target };
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

  const expectedFingerprint = integrationFingerprint({
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
    return { valid: false, code: "fingerprint-mismatch", errors, packageId, replayKey, fingerprint, target };
  }

  const expectedPackageId = integrationPackageId({
    target,
    batchId,
    approvedAt,
    fingerprint
  });
  if (packageId !== expectedPackageId) {
    errors.push("Package ID does not match the approved batch fingerprint.");
    return { valid: false, code: "invalid-package-id", errors, packageId, replayKey, fingerprint, target };
  }

  const expectedReplayKey = integrationReplayKey({ target, packageId, fingerprint });
  if (replayKey !== expectedReplayKey) {
    errors.push("Replay key does not match package identity.");
    return { valid: false, code: "invalid-replay-key", errors, packageId, replayKey, fingerprint, target };
  }
  if (options.seenPackageIds?.has(packageId)) {
    errors.push("This package ID has already been consumed.");
    return { valid: false, code: "duplicate", errors, packageId, replayKey, fingerprint, target };
  }

  const now =
    options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const generated = new Date(generatedAt);
  const sourceUpdated = new Date(sourceDatasetUpdatedAt);
  const expires = new Date(expiresAt);
  const maxSourceAgeMs = options.maxSourceAgeMs ?? INTEGRATION_MAX_SOURCE_AGE_MS;

  if (generated.getTime() > now.getTime() + 5 * 60 * 1000) {
    errors.push("Package generation time is unexpectedly in the future.");
    return { valid: false, code: "future-dated", errors, packageId, replayKey, fingerprint, target };
  }
  if (expires.getTime() <= now.getTime()) {
    errors.push("Package handoff window has expired.");
    return { valid: false, code: "expired", errors, packageId, replayKey, fingerprint, target };
  }
  if (now.getTime() - sourceUpdated.getTime() > maxSourceAgeMs) {
    errors.push("Source dataset is older than the allowed freshness window.");
    return { valid: false, code: "stale", errors, packageId, replayKey, fingerprint, target };
  }

  return { valid: true, code: "valid", errors, packageId, replayKey, fingerprint, target };
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function buildIntegrationPackageFromPersistedBatch(
  payload: Record<string, unknown>,
  input: {
    target: IntegrationTarget;
    batchId: string;
    now?: Date;
  }
): IntegrationPackageV1 {
  const batches = Array.isArray(payload.batches) ? payload.batches : [];
  const batch = batches
    .map(object)
    .find((candidate) => candidate?.id === input.batchId && candidate?.target === input.target);
  if (!batch) throw new Error("integration_batch_not_found");
  if (batch.status !== "approved" && batch.status !== "exported") {
    throw new Error("integration_batch_not_approved");
  }
  if (!isDate(batch.approvedAt) || !isDate(batch.sourceDatasetUpdatedAt)) {
    throw new Error("integration_batch_metadata_invalid");
  }

  const diffs = Array.isArray(batch.diffs) ? batch.diffs : [];
  const operations: IntegrationOperation[] = diffs.flatMap((raw) => {
    const diff = object(raw);
    if (!diff || (diff.action !== "create" && diff.action !== "update")) return [];
    const rawPayload = object(diff.payload);
    const evidence = object(diff.sourceEvidence);
    if (
      !rawPayload ||
      !evidence ||
      typeof diff.integrationKey !== "string" ||
      typeof evidence.sourceUrl !== "string" ||
      !isDate(evidence.retrievedAt)
    ) {
      throw new Error("integration_batch_diff_invalid");
    }
    const values = Object.fromEntries(
      Object.entries(rawPayload).map(([key, value]) => {
        if (!isScalar(value)) throw new Error("integration_batch_value_invalid");
        return [key, value];
      })
    );
    return [{
      action: diff.action,
      integrationKey: diff.integrationKey,
      values,
      sourceEvidence: {
        sourceUrl: evidence.sourceUrl,
        retrievedAt: String(evidence.retrievedAt)
      }
    }];
  });

  if (!operations.length) throw new Error("integration_batch_has_no_delivery_operations");

  const contract = INTEGRATION_CONTRACTS[input.target];
  const approvedAt = String(batch.approvedAt);
  const sourceDatasetUpdatedAt = String(batch.sourceDatasetUpdatedAt);
  const batchId = String(batch.id);
  const fingerprint = integrationFingerprint({
    target: input.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt,
    operations
  });
  const packageId = integrationPackageId({
    target: input.target,
    batchId,
    approvedAt,
    fingerprint
  });
  const replayKey = integrationReplayKey({
    target: input.target,
    packageId,
    fingerprint
  });
  const generatedAt = (input.now ?? new Date()).toISOString();
  const result: IntegrationPackageV1 = {
    version: 1,
    schemaId: contract.schemaId,
    target: input.target,
    adapterContract: contract.adapterContract,
    contractVersion: 1,
    packageId,
    replayKey,
    batchId,
    approvedAt,
    sourceDatasetUpdatedAt,
    generatedAt,
    expiresAt: new Date(
      new Date(generatedAt).getTime() + INTEGRATION_PACKAGE_TTL_MS
    ).toISOString(),
    fingerprint,
    operations
  };

  const validation = validateIntegrationPackage(result, {
    now: input.now ?? new Date(),
    expectedTarget: input.target
  });
  if (!validation.valid) {
    throw new Error("integration_package_invalid:" + validation.code);
  }
  return result;
}

export interface ConsumerHandshake {
  protocol: typeof INTEGRATION_CONSUMER_PROTOCOL;
  target: IntegrationTarget;
  contractVersion: 1;
  schemaId: string;
  authentication: "bearer";
  dryRunSupported: true;
  liveMutationEnabled: boolean;
}

export function validateConsumerHandshake(
  value: unknown,
  target: IntegrationTarget
): ConsumerHandshake {
  const input = object(value);
  const contract = INTEGRATION_CONTRACTS[target];
  if (
    !input ||
    input.protocol !== INTEGRATION_CONSUMER_PROTOCOL ||
    input.target !== target ||
    input.contractVersion !== 1 ||
    input.schemaId !== contract.schemaId ||
    input.authentication !== "bearer" ||
    input.dryRunSupported !== true ||
    typeof input.liveMutationEnabled !== "boolean"
  ) {
    throw new Error("consumer_handshake_invalid");
  }
  return input as unknown as ConsumerHandshake;
}

export interface ConsumerAcknowledgement {
  protocol: typeof INTEGRATION_CONSUMER_PROTOCOL;
  status: "accepted" | "rejected";
  code: string;
  target: IntegrationTarget;
  packageId: string;
  replayKey: string;
  fingerprint: string;
  receivedAt: string;
  dryRun: boolean;
}

export function validateConsumerAcknowledgement(
  value: unknown,
  expected: IntegrationPackageV1
): ConsumerAcknowledgement {
  const input = object(value);
  if (
    !input ||
    input.protocol !== INTEGRATION_CONSUMER_PROTOCOL ||
    (input.status !== "accepted" && input.status !== "rejected") ||
    typeof input.code !== "string" ||
    input.target !== expected.target ||
    input.packageId !== expected.packageId ||
    input.replayKey !== expected.replayKey ||
    input.fingerprint !== expected.fingerprint ||
    !isDate(input.receivedAt) ||
    typeof input.dryRun !== "boolean"
  ) {
    throw new Error("consumer_acknowledgement_invalid");
  }
  return input as unknown as ConsumerAcknowledgement;
}

function safeConsumerUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function integrationConsumerConfiguration(target: IntegrationTarget) {
  const urlName =
    target === "rosie-dazzlers"
      ? "INTEGRATION_CONSUMER_ROSIE_DAZZLERS_URL"
      : "INTEGRATION_CONSUMER_DEVIL_N_DOVE_URL";
  const tokenName =
    target === "rosie-dazzlers"
      ? "INTEGRATION_CONSUMER_ROSIE_DAZZLERS_TOKEN"
      : "INTEGRATION_CONSUMER_DEVIL_N_DOVE_TOKEN";
  const url = safeConsumerUrl(process.env[urlName]);
  const token = (process.env[tokenName] ?? "").trim();
  return {
    configured: Boolean(url && token),
    endpoint: url?.toString() ?? null,
    endpointOrigin: url?.origin ?? null,
    tokenConfigured: Boolean(token),
    urlName,
    tokenName
  };
}
