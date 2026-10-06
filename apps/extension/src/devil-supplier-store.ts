import { normalizeDevilSupplierRows } from "./devil-supplier-engine";
import type { DevilSupplierRow } from "./devil-supplier-engine";
import type {
  DevilSupplierDefaults,
  DevilSupplierMapping,
  SupplierInventoryStageItem,
  SupplierInventoryStagingDataset,
  SupplierStageStatus,
  SupplierStageSummary
} from "./types";

const STORAGE_KEY = "ai-data-platform-devil-supplier-staging-v1";
const DATASET_ID = "devil-n-dove-supplier-staging";
const MAX_ITEMS = 500;
const MAX_PRICE_HISTORY = 24;

function emptyDataset(now = new Date().toISOString()): SupplierInventoryStagingDataset {
  return {
    version: 1,
    id: DATASET_ID,
    createdAt: now,
    updatedAt: now,
    items: []
  };
}

function normalizeDataset(value: unknown): SupplierInventoryStagingDataset | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SupplierInventoryStagingDataset>;
  if (
    candidate.version !== 1 ||
    candidate.id !== DATASET_ID ||
    !Array.isArray(candidate.items)
  ) {
    return null;
  }

  return candidate as SupplierInventoryStagingDataset;
}

export async function loadSupplierInventoryStaging() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeDataset(stored[STORAGE_KEY]) ?? emptyDataset();
}

async function writeSupplierInventoryStaging(
  dataset: SupplierInventoryStagingDataset
) {
  await chrome.storage.local.set({ [STORAGE_KEY]: dataset });
}

function summarize(
  dataset: SupplierInventoryStagingDataset,
  staged: number,
  created: number,
  updated: number
): SupplierStageSummary {
  return {
    staged,
    created,
    updated,
    pending: dataset.items.filter((item) => item.reviewStatus === "pending").length,
    approved: dataset.items.filter((item) => item.reviewStatus === "approved").length,
    rejected: dataset.items.filter((item) => item.reviewStatus === "rejected").length,
    calculableUsageCost: dataset.items.filter(
      (item) => item.product.costPerUsageUnit !== null
    ).length
  };
}

function materialProductSignature(product: SupplierInventoryStageItem["product"]) {
  return JSON.stringify({
    supplierName: product.supplierName,
    productName: product.productName,
    sku: product.sku,
    imageUrl: product.imageUrl,
    sourceScope: product.sourceScope,
    packagePrice: product.packagePrice,
    packageQuantity: product.packageQuantity,
    stockUnit: product.stockUnit,
    usageUnit: product.usageUnit,
    usageUnitsPerStockUnit: product.usageUnitsPerStockUnit,
    totalUsageUnits: product.totalUsageUnits,
    costPerStockUnit: product.costPerStockUnit,
    costPerUsageUnit: product.costPerUsageUnit
  });
}

function appendPriceObservation(
  current: SupplierInventoryStageItem | null,
  packagePrice: number | null,
  rawPrice: string,
  observedAt: string
) {
  const next = {
    observedAt,
    currency: "CAD" as const,
    packagePrice,
    rawPrice
  };

  if (!current) {
    return [next];
  }

  const last = current.priceHistory[current.priceHistory.length - 1];
  if (
    last &&
    last.packagePrice === packagePrice &&
    last.rawPrice === rawPrice
  ) {
    return current.priceHistory;
  }

  return [...current.priceHistory, next].slice(-MAX_PRICE_HISTORY);
}

export async function stageSupplierProducts(input: {
  sourceUrl: string;
  retrievedAt: string;
  mapping: DevilSupplierMapping;
  defaults: DevilSupplierDefaults;
  rows: DevilSupplierRow[];
}): Promise<{
  dataset: SupplierInventoryStagingDataset;
  summary: SupplierStageSummary;
}> {
  const products = normalizeDevilSupplierRows(input);
  const current = await loadSupplierInventoryStaging();
  const itemByKey = new Map(
    current.items.map((item) => [item.stagingKey, item])
  );
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const existing = itemByKey.get(product.stagingKey) ?? null;
    const now = input.retrievedAt;
    const changedSinceReview =
      existing !== null &&
      materialProductSignature(existing.product) !==
        materialProductSignature(product);
    const reviewStatus =
      changedSinceReview && existing?.reviewStatus === "approved"
        ? "pending"
        : existing?.reviewStatus ?? "pending";
    const item: SupplierInventoryStageItem = {
      version: 1,
      id: existing?.id ?? "supplier-stage-" + crypto.randomUUID(),
      stagingKey: product.stagingKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      reviewStatus,
      reviewedAt:
        reviewStatus === "pending" && changedSinceReview
          ? null
          : existing?.reviewedAt ?? null,
      product,
      priceHistory: appendPriceObservation(
        existing,
        product.packagePrice,
        product.rawPrice,
        input.retrievedAt
      )
    };

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
    itemByKey.set(product.stagingKey, item);
  }

  const now = new Date().toISOString();
  const dataset: SupplierInventoryStagingDataset = {
    ...current,
    updatedAt: now,
    items: Array.from(itemByKey.values())
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, MAX_ITEMS)
  };

  await writeSupplierInventoryStaging(dataset);
  return {
    dataset,
    summary: summarize(dataset, products.length, created, updated)
  };
}

export async function updateSupplierStageStatus(
  itemId: string,
  reviewStatus: SupplierStageStatus
): Promise<SupplierInventoryStagingDataset> {
  const current = await loadSupplierInventoryStaging();
  const now = new Date().toISOString();
  let found = false;

  const items = current.items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    found = true;
    return {
      ...item,
      reviewStatus,
      reviewedAt: reviewStatus === "pending" ? null : now,
      updatedAt: now
    };
  });

  if (!found) {
    throw new Error("The supplier staging item no longer exists.");
  }

  const dataset = { ...current, updatedAt: now, items };
  await writeSupplierInventoryStaging(dataset);
  return dataset;
}

export async function removeSupplierStageItem(itemId: string) {
  const current = await loadSupplierInventoryStaging();
  const now = new Date().toISOString();
  const dataset = {
    ...current,
    updatedAt: now,
    items: current.items.filter((item) => item.id !== itemId)
  };
  await writeSupplierInventoryStaging(dataset);
  return dataset;
}
