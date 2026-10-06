import { useEffect, useMemo, useState } from "react";

import { normalizeRosieCompetitiveRows } from "./rosie-competitive-engine";
import {
  loadOntarioDetailerDataset,
  saveOntarioCompetitiveCapture
} from "./rosie-competitive-store";
import type {
  OntarioCompetitorOffering,
  OntarioDetailerDataset,
  ReviewColumn,
  ReviewRow,
  RosieCompetitiveMapping
} from "./types";

interface RosieCompetitivePanelProps {
  columns: ReviewColumn[];
  rows: ReviewRow[];
  sourceUrl: string;
}

type MappingKey = keyof RosieCompetitiveMapping;

const MAPPING_FIELDS: Array<{
  key: MappingKey;
  label: string;
  required?: boolean;
  hint: string;
}> = [
  {
    key: "businessNameKey",
    label: "Business name",
    hint: "Optional; source hostname is used when omitted."
  },
  {
    key: "offeringNameKey",
    label: "Service / package name",
    required: true,
    hint: "Required stable public name for each offering."
  },
  {
    key: "offeringKindKey",
    label: "Offering type",
    hint: "Package, service, add-on or promotion when available."
  },
  {
    key: "priceKey",
    label: "Price",
    hint: "CAD price, range or starting-at price."
  },
  {
    key: "packageContentsKey",
    label: "Package contents",
    hint: "Converted to canonical detailing facts; marketing prose is not retained."
  },
  {
    key: "vehicleSizeKey",
    label: "Vehicle size",
    hint: "Small, medium, large, oversize or universal."
  },
  {
    key: "serviceAreaKey",
    label: "Service area",
    hint: "Ontario cities, towns, regions or service-area text."
  },
  {
    key: "deliveryModeKey",
    label: "Mobile / location mode",
    hint: "Mobile, fixed-location or both."
  }
];

const FIELD_HINTS: Record<MappingKey, string[][]> = {
  businessNameKey: [
    ["business", "name"],
    ["company", "name"],
    ["detailer"],
    ["business"],
    ["company"]
  ],
  offeringNameKey: [
    ["service", "name"],
    ["package", "name"],
    ["offering", "name"],
    ["package"],
    ["service"],
    ["title"]
  ],
  offeringKindKey: [
    ["offering", "type"],
    ["service", "type"],
    ["package", "type"],
    ["kind"],
    ["type"]
  ],
  priceKey: [["price"], ["pricing"], ["cost"], ["amount"]],
  packageContentsKey: [
    ["package", "contents"],
    ["includes"],
    ["included"],
    ["features"],
    ["contents"]
  ],
  vehicleSizeKey: [
    ["vehicle", "size"],
    ["vehicle", "class"],
    ["size"],
    ["vehicle"]
  ],
  serviceAreaKey: [
    ["service", "area"],
    ["coverage", "area"],
    ["service", "location"],
    ["area"],
    ["region"],
    ["city"]
  ],
  deliveryModeKey: [
    ["delivery", "mode"],
    ["service", "mode"],
    ["location", "type"],
    ["mobile"],
    ["mode"]
  ]
};

function searchableColumn(column: ReviewColumn) {
  return (column.key + " " + column.label)
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function guessColumn(
  columns: ReviewColumn[],
  key: MappingKey
) {
  const available = columns.filter((column) => !column.dropped);

  for (const terms of FIELD_HINTS[key]) {
    const found = available.find((column) => {
      const value = searchableColumn(column);
      return terms.every((term) => value.includes(term));
    });

    if (found) {
      return found.key;
    }
  }

  return "";
}

function guessMapping(columns: ReviewColumn[]): RosieCompetitiveMapping {
  return {
    businessNameKey: guessColumn(columns, "businessNameKey"),
    offeringNameKey: guessColumn(columns, "offeringNameKey"),
    offeringKindKey: guessColumn(columns, "offeringKindKey"),
    priceKey: guessColumn(columns, "priceKey"),
    packageContentsKey: guessColumn(columns, "packageContentsKey"),
    vehicleSizeKey: guessColumn(columns, "vehicleSizeKey"),
    serviceAreaKey: guessColumn(columns, "serviceAreaKey"),
    deliveryModeKey: guessColumn(columns, "deliveryModeKey")
  };
}

function sanitizeMapping(
  current: RosieCompetitiveMapping,
  columns: ReviewColumn[]
): RosieCompetitiveMapping {
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

function formatPrice(offering: OntarioCompetitorOffering) {
  const { minimum, maximum, startingAt } = offering.price;

  if (minimum === null) {
    return "Price not mapped";
  }

  const prefix = startingAt ? "from " : "";
  if (maximum !== null && maximum !== minimum) {
    return prefix + "$" + minimum + "–$" + maximum + " CAD";
  }

  return prefix + "$" + minimum + " CAD";
}

function latestOfferings(dataset: OntarioDetailerDataset) {
  return dataset.series.flatMap((series) => {
    const latest = series.snapshots[series.snapshots.length - 1];
    return latest?.offerings ?? [];
  });
}

export function RosieCompetitivePanel({
  columns,
  rows,
  sourceUrl
}: RosieCompetitivePanelProps) {
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
  const [mapping, setMapping] = useState<RosieCompetitiveMapping>(() =>
    guessMapping(columns)
  );
  const [verifiedOntario, setVerifiedOntario] = useState(false);
  const [dataset, setDataset] = useState<OntarioDetailerDataset | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMapping((current) => sanitizeMapping(current, columns));
  }, [columns]);

  useEffect(() => {
    let cancelled = false;

    void loadOntarioDetailerDataset()
      .then((loaded) => {
        if (!cancelled) {
          setDataset(loaded);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setMessage(
            reason instanceof Error
              ? reason.message
              : "Ontario detailer storage is unavailable."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(() => {
    if (!mapping.offeringNameKey || !includedRows.length) {
      return { offerings: [] as OntarioCompetitorOffering[], error: null as string | null };
    }

    try {
      return {
        offerings: normalizeRosieCompetitiveRows({
          sourceUrl,
          retrievedAt: new Date().toISOString(),
          mapping,
          rows: includedRows.map((row) => ({
            sourceIndex: row.sourceIndex,
            values: { ...row.values }
          }))
        }),
        error: null
      };
    } catch (reason) {
      return {
        offerings: [] as OntarioCompetitorOffering[],
        error:
          reason instanceof Error
            ? reason.message
            : "Unable to normalize the reviewed rows."
      };
    }
  }, [includedRows, mapping, sourceUrl]);

  const stats = useMemo(() => {
    if (!dataset) {
      return {
        businesses: 0,
        series: 0,
        offerings: 0,
        changes: 0
      };
    }

    const offerings = latestOfferings(dataset);
    return {
      businesses: new Set(dataset.series.map((series) => series.businessKey)).size,
      series: dataset.series.length,
      offerings: offerings.length,
      changes: dataset.series.reduce(
        (total, series) => total + series.changes.length,
        0
      )
    };
  }, [dataset]);

  const recentChanges = useMemo(() => {
    if (!dataset) {
      return [];
    }

    return dataset.series
      .flatMap((series) => series.changes)
      .sort((left, right) => right.detectedAt.localeCompare(left.detectedAt))
      .slice(0, 10);
  }, [dataset]);

  function updateMapping(key: MappingKey, value: string) {
    setMapping((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  async function saveCapture() {
    setPending(true);
    setMessage(null);

    try {
      const result = await saveOntarioCompetitiveCapture({
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        verifiedOntario,
        mapping,
        rows: includedRows.map((row) => ({
          sourceIndex: row.sourceIndex,
          values: { ...row.values }
        }))
      });

      setDataset(result.dataset);
      setMessage(
        "Ontario dataset updated · " +
          result.summary.offeringsCaptured +
          " normalized offerings · " +
          result.summary.businessCount +
          " detailers retained · " +
          result.summary.added +
          " added · " +
          result.summary.removed +
          " removed · " +
          result.summary.changed +
          " changed."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to update the Ontario competitive-intelligence dataset."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rosieCompetitive">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 014</p>
          <h2>Rosie Dazzlers competitive intelligence</h2>
        </div>
        <span className="rosieCompetitiveBadge">Ontario</span>
      </div>

      <p className="rosieCompetitiveIntro">
        Convert included reviewed rows into a normalized Ontario auto-detailing
        dataset for package, price, service, vehicle-size, mobile/location and
        service-area comparison. Source evidence stays attached and nothing is
        written into Rosie Dazzlers production records.
      </p>

      <div className="rosieMapping">
        {MAPPING_FIELDS.map((field) => (
          <label key={field.key}>
            <span>
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <select
              disabled={pending}
              onChange={(event) =>
                updateMapping(field.key, event.target.value)
              }
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

      <label className="rosieOntarioVerify">
        <input
          checked={verifiedOntario}
          disabled={pending}
          onChange={(event) => setVerifiedOntario(event.target.checked)}
          type="checkbox"
        />
        <span>
          I have reviewed the included rows and verified that these businesses
          are Ontario auto detailers using public business information.
        </span>
      </label>

      <div className="rosiePreviewHeader">
        <strong>Normalized preview</strong>
        <span>
          {preview.offerings.length} offering
          {preview.offerings.length === 1 ? "" : "s"}
        </span>
      </div>

      {preview.error ? (
        <p className="rosieCompetitiveError">{preview.error}</p>
      ) : preview.offerings.length ? (
        <div className="rosiePreview">
          {preview.offerings.slice(0, 6).map((offering) => (
            <article key={offering.id}>
              <div>
                <strong>{offering.businessName}</strong>
                <span>
                  {offering.offeringKind} · {offering.category}
                </span>
              </div>
              <b>{offering.offeringName}</b>
              <small>
                {formatPrice(offering)} · {offering.vehicleSize} ·{" "}
                {offering.deliveryMode}
              </small>
              {offering.serviceArea.locations.length ? (
                <small>
                  Areas: {offering.serviceArea.locations.slice(0, 5).join(", ")}
                </small>
              ) : null}
              {offering.packageContents.length ? (
                <small>
                  Includes: {offering.packageContents.join(", ")}
                </small>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rosieCompetitiveEmpty">
          Map the required service/package field to preview normalized records.
        </p>
      )}

      <button
        className="rosieSaveDataset"
        disabled={
          pending ||
          !verifiedOntario ||
          !mapping.offeringNameKey ||
          !includedRows.length ||
          Boolean(preview.error)
        }
        onClick={saveCapture}
        type="button"
      >
        {pending ? "Saving Ontario dataset…" : "Save reviewed rows to Ontario dataset"}
      </button>

      <div className="rosieDatasetStats">
        <div>
          <strong>{stats.businesses}</strong>
          <span>detailers</span>
        </div>
        <div>
          <strong>{stats.series}</strong>
          <span>source series</span>
        </div>
        <div>
          <strong>{stats.offerings}</strong>
          <span>latest offerings</span>
        </div>
        <div>
          <strong>{stats.changes}</strong>
          <span>change events</span>
        </div>
      </div>

      <div className="rosieChangesHeader">
        <strong>Competitor change history</strong>
        <span>{recentChanges.length ? "most recent 10" : "no changes yet"}</span>
      </div>

      {recentChanges.length ? (
        <div className="rosieChanges">
          {recentChanges.map((change) => (
            <article key={change.id}>
              <div>
                <span className={"rosieChangeKind rosieChangeKind-" + change.kind}>
                  {change.kind}
                </span>
                <strong>{change.businessName}</strong>
              </div>
              <b>{change.offeringName}</b>
              <small>
                v{change.fromVersion ?? "—"} → v{change.toVersion} ·{" "}
                {new Date(change.detectedAt).toLocaleString()}
              </small>
              {change.fields.length ? (
                <ul>
                  {change.fields.slice(0, 4).map((field) => (
                    <li key={field.field}>
                      {field.field}: {field.before || "∅"} → {field.after || "∅"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rosieCompetitiveEmpty">
          The first saved source becomes its baseline. Later reviewed captures
          from the same source record added, removed and changed offerings.
        </p>
      )}

      {message ? (
        <p className="rosieCompetitiveStatus" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
