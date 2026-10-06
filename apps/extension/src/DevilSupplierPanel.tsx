import { useEffect, useMemo, useState } from "react";

import { normalizeDevilSupplierRows } from "./devil-supplier-engine";
import {
  loadSupplierInventoryStaging,
  removeSupplierStageItem,
  stageSupplierProducts,
  updateSupplierStageStatus
} from "./devil-supplier-store";
import type {
  DevilSupplierDefaults,
  DevilSupplierMapping,
  NormalizedSupplierProduct,
  ReviewColumn,
  ReviewRow,
  SupplierInventoryStagingDataset,
  SupplierStageStatus,
  SupplierUnit
} from "./types";

interface DevilSupplierPanelProps {
  columns: ReviewColumn[];
  rows: ReviewRow[];
  sourceUrl: string;
}

type MappingKey = keyof DevilSupplierMapping;

const MAPPING_FIELDS: Array<{
  key: MappingKey;
  label: string;
  required?: boolean;
  hint: string;
}> = [
  {
    key: "supplierNameKey",
    label: "Supplier name",
    hint: "Optional; the source hostname is used when omitted."
  },
  {
    key: "productNameKey",
    label: "Product name",
    required: true,
    hint: "Required public supplier product name."
  },
  {
    key: "skuKey",
    label: "Supplier SKU",
    hint: "Preferred stable staging identity when available."
  },
  {
    key: "imageUrlKey",
    label: "Product image URL",
    hint: "Optional HTTP/HTTPS supplier image URL."
  },
  {
    key: "packagePriceKey",
    label: "Package price",
    hint: "Current CAD purchase price for the supplier package."
  },
  {
    key: "packageQuantityKey",
    label: "Stock units per package",
    hint: "Example: 12 bottles, 50 sheets, 3.78 litres."
  },
  {
    key: "stockUnitKey",
    label: "Stock unit",
    hint: "Example: bottle, litre, kilogram, roll, piece."
  },
  {
    key: "usageUnitKey",
    label: "Usage unit",
    hint: "Example: millilitre, gram, centimetre, piece."
  },
  {
    key: "usageUnitsPerStockUnitKey",
    label: "Usage units per stock unit",
    hint: "Example: 1000 mL per litre; inferred for common compatible units."
  }
];

const FIELD_HINTS: Record<MappingKey, string[][]> = {
  supplierNameKey: [
    ["supplier", "name"],
    ["vendor", "name"],
    ["brand"],
    ["supplier"],
    ["vendor"]
  ],
  productNameKey: [
    ["product", "name"],
    ["item", "name"],
    ["product"],
    ["item"],
    ["title"]
  ],
  skuKey: [["sku"], ["item", "number"], ["product", "code"], ["model"]],
  imageUrlKey: [["image", "url"], ["image"], ["photo"], ["thumbnail"]],
  packagePriceKey: [["package", "price"], ["price"], ["cost"], ["amount"]],
  packageQuantityKey: [
    ["units", "package"],
    ["package", "quantity"],
    ["pack", "quantity"],
    ["quantity"],
    ["qty"]
  ],
  stockUnitKey: [
    ["stock", "unit"],
    ["package", "unit"],
    ["unit", "type"],
    ["uom"]
  ],
  usageUnitKey: [["usage", "unit"], ["use", "unit"], ["consumption", "unit"]],
  usageUnitsPerStockUnitKey: [
    ["usage", "units", "stock"],
    ["units", "per", "stock"],
    ["usage", "quantity"],
    ["conversion"]
  ]
};

const UNIT_OPTIONS: Array<{ value: SupplierUnit; label: string }> = [
  { value: "each", label: "Each" },
  { value: "piece", label: "Piece" },
  { value: "pair", label: "Pair" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box / case" },
  { value: "bottle", label: "Bottle" },
  { value: "jar", label: "Jar" },
  { value: "tube", label: "Tube" },
  { value: "roll", label: "Roll" },
  { value: "sheet", label: "Sheet" },
  { value: "millilitre", label: "Millilitre (mL)" },
  { value: "litre", label: "Litre (L)" },
  { value: "gram", label: "Gram (g)" },
  { value: "kilogram", label: "Kilogram (kg)" },
  { value: "centimetre", label: "Centimetre (cm)" },
  { value: "metre", label: "Metre (m)" },
  { value: "foot", label: "Foot (ft)" },
  { value: "ounce", label: "Ounce (oz)" },
  { value: "pound", label: "Pound (lb)" },
  { value: "other", label: "Other / unavailable" }
];

function searchableColumn(column: ReviewColumn) {
  return (column.key + " " + column.label)
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function guessColumn(columns: ReviewColumn[], key: MappingKey) {
  const active = columns.filter((column) => !column.dropped);

  for (const terms of FIELD_HINTS[key]) {
    const found = active.find((column) => {
      const value = searchableColumn(column);
      return terms.every((term) => value.includes(term));
    });
    if (found) return found.key;
  }

  return "";
}

function guessMapping(columns: ReviewColumn[]): DevilSupplierMapping {
  return {
    supplierNameKey: guessColumn(columns, "supplierNameKey"),
    productNameKey: guessColumn(columns, "productNameKey"),
    skuKey: guessColumn(columns, "skuKey"),
    imageUrlKey: guessColumn(columns, "imageUrlKey"),
    packagePriceKey: guessColumn(columns, "packagePriceKey"),
    packageQuantityKey: guessColumn(columns, "packageQuantityKey"),
    stockUnitKey: guessColumn(columns, "stockUnitKey"),
    usageUnitKey: guessColumn(columns, "usageUnitKey"),
    usageUnitsPerStockUnitKey: guessColumn(
      columns,
      "usageUnitsPerStockUnitKey"
    )
  };
}

function sanitizeMapping(
  current: DevilSupplierMapping,
  columns: ReviewColumn[]
) {
  const active = new Set(
    columns.filter((column) => !column.dropped).map((column) => column.key)
  );
  const guessed = guessMapping(columns);
  const next = { ...current };

  for (const field of MAPPING_FIELDS) {
    if (next[field.key] && !active.has(next[field.key])) {
      next[field.key] = guessed[field.key];
    } else if (!next[field.key] && guessed[field.key]) {
      next[field.key] = guessed[field.key];
    }
  }

  return next;
}

function money(value: number | null) {
  return value === null ? "—" : "$" + value.toFixed(value < 0.01 ? 4 : 2);
}

function stageStats(dataset: SupplierInventoryStagingDataset | null) {
  const items = dataset?.items ?? [];
  return {
    total: items.length,
    pending: items.filter((item) => item.reviewStatus === "pending").length,
    approved: items.filter((item) => item.reviewStatus === "approved").length,
    calculable: items.filter(
      (item) => item.product.costPerUsageUnit !== null
    ).length
  };
}

export function DevilSupplierPanel({
  columns,
  rows,
  sourceUrl
}: DevilSupplierPanelProps) {
  const visibleColumns = useMemo(
    () =>
      [...columns]
        .sort((left, right) => left.position - right.position)
        .filter((column) => !column.dropped),
    [columns]
  );
  const includedRows = useMemo(
    () => rows.filter((row) => row.included),
    [rows]
  );
  const [mapping, setMapping] = useState<DevilSupplierMapping>(() =>
    guessMapping(columns)
  );
  const [defaults, setDefaults] = useState<DevilSupplierDefaults>({
    packageQuantity: "1",
    stockUnit: "",
    usageUnit: "",
    usageUnitsPerStockUnit: ""
  });
  const [dataset, setDataset] =
    useState<SupplierInventoryStagingDataset | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMapping((current) => sanitizeMapping(current, columns));
  }, [columns]);

  useEffect(() => {
    let cancelled = false;

    void loadSupplierInventoryStaging()
      .then((loaded) => {
        if (!cancelled) setDataset(loaded);
      })
      .catch((reason) => {
        if (!cancelled) {
          setMessage(
            reason instanceof Error
              ? reason.message
              : "Supplier staging storage is unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(() => {
    if (!mapping.productNameKey || !includedRows.length) {
      return {
        products: [] as NormalizedSupplierProduct[],
        error: null as string | null
      };
    }

    try {
      return {
        products: normalizeDevilSupplierRows({
          sourceUrl,
          retrievedAt: new Date().toISOString(),
          mapping,
          defaults,
          rows: includedRows.map((row) => ({
            sourceIndex: row.sourceIndex,
            values: { ...row.values }
          }))
        }),
        error: null
      };
    } catch (reason) {
      return {
        products: [] as NormalizedSupplierProduct[],
        error:
          reason instanceof Error
            ? reason.message
            : "Unable to normalize the supplier rows."
      };
    }
  }, [defaults, includedRows, mapping, sourceUrl]);

  const stats = useMemo(() => stageStats(dataset), [dataset]);
  const recentItems = useMemo(
    () => (dataset?.items ?? []).slice(0, 12),
    [dataset]
  );

  function updateMapping(key: MappingKey, value: string) {
    setMapping((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function updateDefault(key: keyof DevilSupplierDefaults, value: string) {
    setDefaults((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function stageProducts() {
    setPending(true);
    setMessage(null);

    try {
      const result = await stageSupplierProducts({
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        mapping,
        defaults,
        rows: includedRows.map((row) => ({
          sourceIndex: row.sourceIndex,
          values: { ...row.values }
        }))
      });
      setDataset(result.dataset);
      setMessage(
        "Supplier staging updated · " +
          result.summary.staged +
          " staged · " +
          result.summary.created +
          " new · " +
          result.summary.updated +
          " refreshed · " +
          result.summary.calculableUsageCost +
          " with calculable usage cost."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to stage supplier products."
      );
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(itemId: string, status: SupplierStageStatus) {
    setPending(true);
    setMessage(null);

    try {
      const updated = await updateSupplierStageStatus(itemId, status);
      setDataset(updated);
      setMessage(
        status === "approved"
          ? "Supplier product approved for future inventory integration staging. Nothing has been written to Devil n Dove."
          : status === "rejected"
            ? "Supplier product rejected from future inventory integration."
            : "Supplier product returned to pending review."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to update supplier staging review."
      );
    } finally {
      setPending(false);
    }
  }

  async function removeItem(itemId: string) {
    setPending(true);
    setMessage(null);

    try {
      const updated = await removeSupplierStageItem(itemId);
      setDataset(updated);
      setMessage("Supplier product removed from local staging.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to remove supplier staging item."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="devilSupplier">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 015</p>
          <h2>Devil n Dove supplier intelligence</h2>
        </div>
        <span className="devilSupplierBadge">Staging only</span>
      </div>

      <p className="devilSupplierIntro">
        Normalize reviewed supplier products into package, stock-unit and
        usage-unit economics. Approved staging records are only preparation for
        a later integration adapter; this build cannot write to Devil n Dove
        inventory.
      </p>

      <div className="devilSupplierMapping">
        {MAPPING_FIELDS.map((field) => (
          <label key={field.key}>
            <span>
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <select
              disabled={pending}
              onChange={(event) => updateMapping(field.key, event.target.value)}
              value={mapping[field.key]}
            >
              <option value="">
                {field.required ? "Choose a field" : "Not mapped"}
              </option>
              {visibleColumns.map((column) => (
                <option key={column.id} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
            <small>{field.hint}</small>
          </label>
        ))}
      </div>

      <div className="devilSupplierDefaults">
        <strong>Defaults when supplier data omits units</strong>
        <div>
          <label>
            Stock units per package
            <input
              disabled={pending}
              inputMode="decimal"
              onChange={(event) =>
                updateDefault("packageQuantity", event.target.value)
              }
              value={defaults.packageQuantity}
            />
          </label>
          <label>
            Stock unit
            <select
              disabled={pending}
              onChange={(event) => updateDefault("stockUnit", event.target.value)}
              value={defaults.stockUnit}
            >
              <option value="">No default</option>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Usage unit
            <select
              disabled={pending}
              onChange={(event) => updateDefault("usageUnit", event.target.value)}
              value={defaults.usageUnit}
            >
              <option value="">No default</option>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Usage units per stock unit
            <input
              disabled={pending}
              inputMode="decimal"
              onChange={(event) =>
                updateDefault("usageUnitsPerStockUnit", event.target.value)
              }
              placeholder="Auto when compatible"
              value={defaults.usageUnitsPerStockUnit}
            />
          </label>
        </div>
        <small>
          Mapped supplier values override these defaults. Compatible unit pairs
          such as litre→millilitre, kilogram→gram, metre→centimetre and
          pound→ounce are inferred automatically.
        </small>
      </div>

      <div className="devilSupplierPreviewHeader">
        <strong>Normalized cost preview</strong>
        <span>
          {preview.products.length} product
          {preview.products.length === 1 ? "" : "s"}
        </span>
      </div>

      {preview.error ? (
        <p className="devilSupplierError">{preview.error}</p>
      ) : preview.products.length ? (
        <div className="devilSupplierPreview">
          {preview.products.slice(0, 6).map((product) => (
            <article key={product.id}>
              <div>
                <strong>{product.supplierName}</strong>
                <span>{product.sku || "SKU not mapped"}</span>
              </div>
              <b>{product.productName}</b>
              <small>
                Package {money(product.packagePrice)} · qty{" "}
                {product.packageQuantity ?? "—"} {product.stockUnit}
              </small>
              <small>
                Cost / stock unit {money(product.costPerStockUnit)} · cost /{" "}
                {product.usageUnit === "other" ? "usage unit" : product.usageUnit}{" "}
                {money(product.costPerUsageUnit)}
              </small>
              {product.warnings.length ? (
                <ul>
                  {product.warnings.slice(0, 3).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="devilSupplierEmpty">
          Map the required product-name field to preview normalized supplier
          economics.
        </p>
      )}

      <button
        className="devilSupplierStageButton"
        disabled={
          pending ||
          !mapping.productNameKey ||
          !includedRows.length ||
          Boolean(preview.error)
        }
        onClick={stageProducts}
        type="button"
      >
        {pending ? "Updating local staging…" : "Stage reviewed supplier products locally"}
      </button>

      <div className="devilSupplierStats">
        <div>
          <strong>{stats.total}</strong>
          <span>staged</span>
        </div>
        <div>
          <strong>{stats.pending}</strong>
          <span>pending</span>
        </div>
        <div>
          <strong>{stats.approved}</strong>
          <span>approved</span>
        </div>
        <div>
          <strong>{stats.calculable}</strong>
          <span>usage cost ready</span>
        </div>
      </div>

      <div className="devilSupplierQueueHeader">
        <strong>Reviewed inventory integration staging</strong>
        <span>most recent 12</span>
      </div>

      {recentItems.length ? (
        <div className="devilSupplierQueue">
          {recentItems.map((item) => (
            <article key={item.id}>
              <div className="devilSupplierQueueTop">
                <div>
                  <span
                    className={
                      "devilSupplierStatus devilSupplierStatus-" +
                      item.reviewStatus
                    }
                  >
                    {item.reviewStatus}
                  </span>
                  <strong>{item.product.supplierName}</strong>
                </div>
                <small>{item.product.sku || "no SKU"}</small>
              </div>
              <b>{item.product.productName}</b>
              <small>
                {money(item.product.packagePrice)} package ·{" "}
                {money(item.product.costPerStockUnit)} / stock ·{" "}
                {money(item.product.costPerUsageUnit)} / usage
              </small>
              <small>
                Price observations: {item.priceHistory.length} · source captured{" "}
                {new Date(item.product.retrievedAt).toLocaleString()}
              </small>
              <div className="devilSupplierQueueActions">
                {item.reviewStatus !== "approved" ? (
                  <button
                    disabled={pending}
                    onClick={() => changeStatus(item.id, "approved")}
                    type="button"
                  >
                    Approve staging
                  </button>
                ) : null}
                {item.reviewStatus !== "rejected" ? (
                  <button
                    disabled={pending}
                    onClick={() => changeStatus(item.id, "rejected")}
                    type="button"
                  >
                    Reject
                  </button>
                ) : null}
                {item.reviewStatus !== "pending" ? (
                  <button
                    disabled={pending}
                    onClick={() => changeStatus(item.id, "pending")}
                    type="button"
                  >
                    Reopen
                  </button>
                ) : null}
                <button
                  disabled={pending}
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="devilSupplierEmpty">
          No supplier products are staged yet. Staged records remain local until
          a later explicit business-system integration build.
        </p>
      )}

      {message ? (
        <p className="devilSupplierMessage" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
