import type {
  DevilSupplierDefaults,
  DevilSupplierMapping,
  NormalizedSupplierProduct,
  SupplierUnit
} from "./types";

export interface DevilSupplierRow {
  sourceIndex: number;
  values: Record<string, string | number | null>;
}

export interface NormalizeSupplierInput {
  sourceUrl: string;
  retrievedAt: string;
  mapping: DevilSupplierMapping;
  defaults: DevilSupplierDefaults;
  rows: DevilSupplierRow[];
}

const MAX_CAPTURE_ROWS = 300;

function nextId(prefix: string) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

function valueString(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function valueFor(row: DevilSupplierRow, key: string) {
  return key ? valueString(row.values[key]) : "";
}

function sourceOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function supplierSourceScope(url: string) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return url.split(/[?#]/, 1)[0] ?? "";
  }
}

function fallbackSupplierName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const first = hostname.split(".")[0] ?? "Supplier";
    return first
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "Supplier";
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function positiveNumber(raw: string) {
  if (!raw.trim()) {
    return null;
  }

  const match = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function normalizeSupplierPrice(raw: string) {
  if (!raw.trim()) {
    return null;
  }

  const cleaned = raw
    .replace(/\bCAD\b/gi, "")
    .replace(/\bC\$/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "");
  const match = cleaned.match(/\d+(?:\.\d{1,2})?/);

  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizeSupplierUnit(rawValue: string): SupplierUnit {
  const raw = rawValue
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!raw) return "other";

  const rules: Array<[RegExp, SupplierUnit]> = [
    [/^(ea|each|unit|units)$/i, "each"],
    [/^(pc|pcs|piece|pieces)$/i, "piece"],
    [/^(pair|pairs)$/i, "pair"],
    [/^(pack|packs|pkg|pkgs|package|packages)$/i, "pack"],
    [/^(box|boxes|case|cases)$/i, "box"],
    [/^(bottle|bottles)$/i, "bottle"],
    [/^(jar|jars)$/i, "jar"],
    [/^(tube|tubes)$/i, "tube"],
    [/^(roll|rolls)$/i, "roll"],
    [/^(sheet|sheets)$/i, "sheet"],
    [/^(ml|millilitre|millilitres|milliliter|milliliters)$/i, "millilitre"],
    [/^(l|lt|ltr|litre|litres|liter|liters)$/i, "litre"],
    [/^(g|gram|grams)$/i, "gram"],
    [/^(kg|kilogram|kilograms)$/i, "kilogram"],
    [/^(cm|centimetre|centimetres|centimeter|centimeters)$/i, "centimetre"],
    [/^(m|metre|metres|meter|meters)$/i, "metre"],
    [/^(ft|foot|feet)$/i, "foot"],
    [/^(oz|ounce|ounces)$/i, "ounce"],
    [/^(lb|lbs|pound|pounds)$/i, "pound"]
  ];

  for (const [pattern, unit] of rules) {
    if (pattern.test(raw)) {
      return unit;
    }
  }

  return "other";
}

function inferredUsageUnitsPerStockUnit(
  stockUnit: SupplierUnit,
  usageUnit: SupplierUnit
) {
  if (stockUnit === usageUnit && stockUnit !== "other") {
    return 1;
  }

  const conversions: Record<string, number> = {
    "litre::millilitre": 1000,
    "kilogram::gram": 1000,
    "metre::centimetre": 100,
    "pound::ounce": 16
  };

  return conversions[stockUnit + "::" + usageUnit] ?? null;
}

function cleanImageUrl(raw: string, sourceUrl: string) {
  if (!raw.trim()) {
    return "";
  }

  try {
    const parsed = new URL(raw, sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.href;
  } catch {
    return "";
  }
}

function stableStagingKey(
  sourceUrl: string,
  supplierName: string,
  sku: string,
  productName: string
) {
  const supplier = slug(supplierName) || "supplier";
  const productIdentity = slug(sku) || slug(productName) || "product";
  return (sourceOrigin(sourceUrl) || "unknown-source") + "::" + supplier + "::" + productIdentity;
}

function roundMoney(value: number | null) {
  return value === null ? null : Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

export function normalizeDevilSupplierRows(
  input: NormalizeSupplierInput
): NormalizedSupplierProduct[] {
  if (!input.mapping.productNameKey) {
    throw new Error("Choose the supplier product name field before staging inventory intelligence.");
  }

  if (!input.rows.length) {
    throw new Error("Supplier staging needs at least one included reviewed row.");
  }

  if (input.rows.length > MAX_CAPTURE_ROWS) {
    throw new Error(
      "Supplier-intelligence staging is capped at " +
        MAX_CAPTURE_ROWS +
        " included rows at a time."
    );
  }

  const scope = supplierSourceScope(input.sourceUrl);
  const fallbackSupplier = fallbackSupplierName(input.sourceUrl);
  const normalized: NormalizedSupplierProduct[] = [];

  for (const row of input.rows) {
    const productName = valueFor(row, input.mapping.productNameKey);
    if (!productName) {
      continue;
    }

    const supplierName =
      valueFor(row, input.mapping.supplierNameKey) || fallbackSupplier;
    const sku = valueFor(row, input.mapping.skuKey);
    const rawPrice = valueFor(row, input.mapping.packagePriceKey);
    const packagePrice = normalizeSupplierPrice(rawPrice);
    const packageQuantity = positiveNumber(
      valueFor(row, input.mapping.packageQuantityKey) ||
        input.defaults.packageQuantity
    );
    const stockUnitRaw =
      valueFor(row, input.mapping.stockUnitKey) || input.defaults.stockUnit;
    const usageUnitRaw =
      valueFor(row, input.mapping.usageUnitKey) || input.defaults.usageUnit;
    const stockUnit = normalizeSupplierUnit(stockUnitRaw);
    const usageUnit = normalizeSupplierUnit(usageUnitRaw);
    const mappedUsageUnits = positiveNumber(
      valueFor(row, input.mapping.usageUnitsPerStockUnitKey) ||
        input.defaults.usageUnitsPerStockUnit
    );
    const inferredUsageUnits = inferredUsageUnitsPerStockUnit(
      stockUnit,
      usageUnit
    );
    const usageUnitsPerStockUnit = mappedUsageUnits ?? inferredUsageUnits;
    const usageUnitsPerStockUnitSource =
      mappedUsageUnits !== null
        ? "mapped"
        : inferredUsageUnits !== null
          ? "inferred"
          : "unavailable";
    const totalUsageUnits =
      packageQuantity !== null && usageUnitsPerStockUnit !== null
        ? packageQuantity * usageUnitsPerStockUnit
        : null;
    const costPerStockUnit =
      packagePrice !== null && packageQuantity !== null
        ? packagePrice / packageQuantity
        : null;
    const costPerUsageUnit =
      packagePrice !== null && totalUsageUnits !== null && totalUsageUnits > 0
        ? packagePrice / totalUsageUnits
        : null;
    const warnings: string[] = [];

    if (packagePrice === null) {
      warnings.push("Package price is unavailable or not numeric.");
    }
    if (packageQuantity === null) {
      warnings.push("Package quantity is unavailable or not numeric.");
    }
    if (stockUnit === "other") {
      warnings.push("Stock unit is missing or could not be normalized.");
    }
    if (usageUnit === "other") {
      warnings.push("Usage unit is missing or could not be normalized.");
    }
    if (usageUnitsPerStockUnit === null) {
      warnings.push("Usage units per stock unit are unavailable; cost per usage unit cannot be calculated.");
    }
    if (!sku) {
      warnings.push("Supplier SKU is not mapped; staging identity falls back to product name.");
    }

    normalized.push({
      version: 1,
      id: nextId("supplier-product"),
      stagingKey: stableStagingKey(
        input.sourceUrl,
        supplierName,
        sku,
        productName
      ),
      supplierName,
      productName,
      sku,
      imageUrl: cleanImageUrl(
        valueFor(row, input.mapping.imageUrlKey),
        input.sourceUrl
      ),
      sourceUrl: input.sourceUrl,
      sourceScope: scope,
      sourceIndex: row.sourceIndex,
      retrievedAt: input.retrievedAt,
      currency: "CAD",
      rawPrice,
      packagePrice: roundMoney(packagePrice),
      packageQuantity,
      stockUnit,
      stockUnitRaw,
      usageUnit,
      usageUnitRaw,
      usageUnitsPerStockUnit,
      usageUnitsPerStockUnitSource,
      totalUsageUnits,
      costPerStockUnit: roundMoney(costPerStockUnit),
      costPerUsageUnit: roundMoney(costPerUsageUnit),
      warnings
    });
  }

  if (!normalized.length) {
    throw new Error(
      "No included row has a value in the mapped supplier product name field."
    );
  }

  return normalized;
}
