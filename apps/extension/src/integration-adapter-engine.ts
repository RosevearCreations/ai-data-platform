import {
  INTEGRATION_CONTRACTS,
  INTEGRATION_PACKAGE_TTL_MS,
  businessIntegrationFingerprint,
  businessIntegrationPackageId,
  businessIntegrationReplayKey,
  validateBusinessIntegrationPackage
} from "./integration-contract-validator";
import type {
  BusinessIntegrationBatch,
  BusinessIntegrationCandidate,
  BusinessIntegrationDiff,
  BusinessIntegrationFieldDiff,
  BusinessIntegrationPackage,
  BusinessIntegrationTarget,
  BusinessSnapshotRecord,
  BusinessSystemSnapshot,
  OntarioDetailerDataset,
  SupplierInventoryStagingDataset
} from "./types";

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function scalar(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value) ?? text(value);
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableObject(
  value: Record<string, string | number | boolean | null>
) {
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]])
  );
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

function sameValue(
  left: string | number | boolean | null,
  right: string | number | boolean | null
) {
  return stableJson(left) === stableJson(right);
}

export function integrationAdapterContract(target: BusinessIntegrationTarget) {
  return target === "rosie-dazzlers"
    ? "rosie-dazzlers.competitive-intelligence.v1"
    : "devil-n-dove.supplier-inventory.v1";
}

export function rosieIntegrationCandidates(
  dataset: OntarioDetailerDataset
): BusinessIntegrationCandidate[] {
  return dataset.series.flatMap((series) => {
    const latest = series.snapshots[series.snapshots.length - 1];
    if (!latest) return [];

    return latest.offerings.map((offering) => ({
      integrationKey: "rosie-competitor::" + offering.offeringKey,
      values: {
        competitorBusinessName: offering.businessName,
        offeringName: offering.offeringName,
        offeringKind: offering.offeringKind,
        category: offering.category,
        priceMinimumCad: offering.price.minimum,
        priceMaximumCad: offering.price.maximum,
        priceStartingAt: offering.price.startingAt,
        vehicleSize: offering.vehicleSize,
        serviceAreas: offering.serviceArea.locations.join(" | "),
        deliveryMode: offering.deliveryMode,
        packageContents: offering.packageContents.join(" | "),
        sourceUrl: offering.sourceUrl,
        sourceScope: offering.sourceScope,
        retrievedAt: offering.retrievedAt
      },
      sourceEvidence: {
        sourceUrl: offering.sourceUrl,
        retrievedAt: offering.retrievedAt
      }
    }));
  });
}

export function devilIntegrationCandidates(
  dataset: SupplierInventoryStagingDataset
): BusinessIntegrationCandidate[] {
  return dataset.items
    .filter((item) => item.reviewStatus === "approved")
    .map((item) => ({
      integrationKey: "devil-supplier::" + item.stagingKey,
      values: {
        supplierName: item.product.supplierName,
        productName: item.product.productName,
        supplierSku: item.product.sku,
        supplierImageUrl: item.product.imageUrl,
        packagePriceCad: item.product.packagePrice,
        packageQuantity: item.product.packageQuantity,
        stockUnit: item.product.stockUnit,
        usageUnit: item.product.usageUnit,
        usageUnitsPerStockUnit: item.product.usageUnitsPerStockUnit,
        totalUsageUnits: item.product.totalUsageUnits,
        costPerStockUnitCad: item.product.costPerStockUnit,
        costPerUsageUnitCad: item.product.costPerUsageUnit,
        sourceUrl: item.product.sourceUrl,
        sourceScope: item.product.sourceScope,
        retrievedAt: item.product.retrievedAt
      },
      sourceEvidence: {
        sourceUrl: item.product.sourceUrl,
        retrievedAt: item.product.retrievedAt
      }
    }));
}

function cleanSnapshotRecord(value: unknown): BusinessSnapshotRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const integrationKey = text(record.integrationKey);
  if (!integrationKey) return null;

  const rawValues =
    record.values && typeof record.values === "object" && !Array.isArray(record.values)
      ? (record.values as Record<string, unknown>)
      : {};
  const values = Object.fromEntries(
    Object.entries(rawValues).map(([key, item]) => [key, scalar(item)])
  );
  const userOwnedKeys = Array.isArray(record.userOwnedKeys)
    ? record.userOwnedKeys.map(text).filter(Boolean)
    : [];

  return {
    integrationKey,
    values,
    userOwnedKeys: Array.from(new Set(userOwnedKeys))
  };
}

export function parseBusinessSystemSnapshot(
  target: BusinessIntegrationTarget,
  rawText: string
): BusinessSystemSnapshot {
  const parsed = JSON.parse(rawText) as unknown;
  const object =
    Array.isArray(parsed)
      ? { records: parsed }
      : parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;

  if (!object || !Array.isArray(object.records)) {
    throw new Error("Business snapshot JSON must be an array or an object with a records array.");
  }

  const suppliedTarget = text(object.target);
  if (suppliedTarget && suppliedTarget !== target) {
    throw new Error(
      "Snapshot target " + suppliedTarget + " does not match " + target + "."
    );
  }

  const records = object.records
    .map(cleanSnapshotRecord)
    .filter((record): record is BusinessSnapshotRecord => Boolean(record));

  return {
    version: 1,
    target,
    capturedAt: text(object.capturedAt) || new Date().toISOString(),
    records
  };
}

function diffCandidate(
  candidate: BusinessIntegrationCandidate,
  current: BusinessSnapshotRecord | null
): BusinessIntegrationDiff {
  const id = "integration-diff-" + crypto.randomUUID();

  if (!current) {
    return {
      id,
      integrationKey: candidate.integrationKey,
      action: "create",
      changedFields: Object.entries(candidate.values).map(([key, after]) => ({
        key,
        before: null,
        after
      })),
      blockedFields: [],
      payload: { ...candidate.values },
      sourceEvidence: { ...candidate.sourceEvidence }
    };
  }

  const userOwned = new Set(current.userOwnedKeys);
  const changedFields: BusinessIntegrationFieldDiff[] = [];
  const blockedFields: string[] = [];
  const payload: Record<string, string | number | boolean | null> = {};

  for (const [key, after] of Object.entries(candidate.values)) {
    const before = current.values[key] ?? null;
    if (sameValue(before, after)) continue;

    if (userOwned.has(key)) {
      blockedFields.push(key);
      continue;
    }

    changedFields.push({ key, before, after });
    payload[key] = after;
  }

  const action =
    changedFields.length > 0
      ? "update"
      : blockedFields.length > 0
        ? "blocked"
        : "unchanged";

  return {
    id,
    integrationKey: candidate.integrationKey,
    action,
    changedFields,
    blockedFields,
    payload,
    sourceEvidence: { ...candidate.sourceEvidence }
  };
}

export function buildIntegrationDryRun(input: {
  target: BusinessIntegrationTarget;
  candidates: BusinessIntegrationCandidate[];
  snapshot: BusinessSystemSnapshot | null;
  sourceDatasetUpdatedAt: string;
}): BusinessIntegrationBatch {
  if (!input.candidates.length) {
    throw new Error(
      input.target === "devil-n-dove"
        ? "No approved Devil n Dove supplier staging records are available for integration."
        : "No Rosie Dazzlers competitive-intelligence records are available for integration."
    );
  }

  const currentByKey = new Map(
    (input.snapshot?.records ?? []).map((record) => [
      record.integrationKey,
      record
    ])
  );
  const diffs = input.candidates.map((candidate) =>
    diffCandidate(
      candidate,
      currentByKey.get(candidate.integrationKey) ?? null
    )
  );
  const now = new Date().toISOString();
  const summary = {
    create: diffs.filter((diff) => diff.action === "create").length,
    update: diffs.filter((diff) => diff.action === "update").length,
    unchanged: diffs.filter((diff) => diff.action === "unchanged").length,
    blocked: diffs.filter((diff) => diff.action === "blocked").length,
    exportableOperations: diffs.filter(
      (diff) => diff.action === "create" || diff.action === "update"
    ).length
  };
  const fingerprint = hashText(
    stableJson({
      target: input.target,
      sourceDatasetUpdatedAt: input.sourceDatasetUpdatedAt,
      snapshotCapturedAt: input.snapshot?.capturedAt ?? null,
      diffs: diffs.map((diff) => ({
        integrationKey: diff.integrationKey,
        action: diff.action,
        payload: stableObject(diff.payload),
        blockedFields: [...diff.blockedFields].sort()
      }))
    })
  );

  return {
    version: 1,
    id: "integration-batch-" + crypto.randomUUID(),
    target: input.target,
    adapterContract: integrationAdapterContract(input.target),
    contractVersion: 1,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    exportedAt: null,
    cancelledAt: null,
    status: "draft",
    sourceDatasetUpdatedAt: input.sourceDatasetUpdatedAt,
    snapshotCapturedAt: input.snapshot?.capturedAt ?? null,
    dryRunFingerprint: fingerprint,
    summary,
    diffs
  };
}

export function buildApprovedIntegrationPackage(
  batch: BusinessIntegrationBatch
): BusinessIntegrationPackage {
  if (batch.status !== "approved" && batch.status !== "exported") {
    throw new Error("Only an approved integration batch can be exported.");
  }
  if (!batch.approvedAt) {
    throw new Error("Approved integration batch is missing its approval timestamp.");
  }

  const generatedAt = new Date().toISOString();
  const operations = batch.diffs
    .filter(
      (diff) => diff.action === "create" || diff.action === "update"
    )
    .map((diff) => ({
      action: diff.action as "create" | "update",
      integrationKey: diff.integrationKey,
      values: { ...diff.payload },
      sourceEvidence: { ...diff.sourceEvidence }
    }));
  const contract = INTEGRATION_CONTRACTS[batch.target];
  const fingerprint = businessIntegrationFingerprint({
    target: batch.target,
    adapterContract: batch.adapterContract,
    contractVersion: 1,
    batchId: batch.id,
    approvedAt: batch.approvedAt,
    sourceDatasetUpdatedAt: batch.sourceDatasetUpdatedAt,
    operations
  });
  const packageId = businessIntegrationPackageId({
    target: batch.target,
    batchId: batch.id,
    approvedAt: batch.approvedAt,
    fingerprint
  });
  const replayKey = businessIntegrationReplayKey({
    target: batch.target,
    packageId,
    fingerprint
  });
  const integrationPackage: BusinessIntegrationPackage = {
    version: 1,
    schemaId: contract.schemaId,
    target: batch.target,
    adapterContract: batch.adapterContract,
    contractVersion: 1,
    packageId,
    replayKey,
    batchId: batch.id,
    approvedAt: batch.approvedAt,
    sourceDatasetUpdatedAt: batch.sourceDatasetUpdatedAt,
    generatedAt,
    expiresAt: new Date(
      new Date(generatedAt).getTime() + INTEGRATION_PACKAGE_TTL_MS
    ).toISOString(),
    fingerprint,
    operations
  };
  const verification = validateBusinessIntegrationPackage(
    integrationPackage
  );
  if (!verification.valid) {
    throw new Error(
      "Generated integration package failed contract verification: " +
        verification.code +
        " — " +
        verification.errors.join(" ")
    );
  }

  return integrationPackage;
}

export function integrationPackageBlob(
  integrationPackage: BusinessIntegrationPackage
) {
  return new Blob([JSON.stringify(integrationPackage, null, 2)], {
    type: "application/json;charset=utf-8"
  });
}

export function integrationPackageFilename(
  integrationPackage: BusinessIntegrationPackage
) {
  const date = integrationPackage.generatedAt.slice(0, 10);
  return (
    integrationPackage.target +
    "-integration-" +
    date +
    "-" +
    integrationPackage.batchId.slice(-8) +
    ".json"
  );
}
