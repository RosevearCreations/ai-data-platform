import { useEffect, useMemo, useState } from "react";

import {
  extractDetailFields,
  normalizeDetailUrl,
  sameOrigin
} from "./detail-engine";
import { SpreadsheetReview } from "./SpreadsheetReview";
import type {
  DetailEnrichedRecord,
  DetailEnrichmentResult,
  DetailExtractionSource,
  DetailFieldRecipe,
  ExtractionFieldRecipe,
  ExtractionRecipe,
  ExtractionRunResult,
  ExtractionTransform
} from "./types";

interface DetailEnrichmentProps {
  fields: ExtractionFieldRecipe[];
  recipe: ExtractionRecipe;
  run: ExtractionRunResult;
}

const TRANSFORMS: Array<{
  value: ExtractionTransform;
  label: string;
}> = [
  { value: "trim", label: "Trim" },
  { value: "collapse-whitespace", label: "Collapse spaces" },
  { value: "lowercase", label: "Lowercase" },
  { value: "uppercase", label: "Uppercase" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" }
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueKey(
  parentFields: ExtractionFieldRecipe[],
  detailFields: DetailFieldRecipe[],
  requested: string
) {
  const base =
    requested
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "detail_field";
  const existing = new Set([
    ...parentFields.map((field) => field.key),
    ...detailFields.map((field) => field.key)
  ]);

  if (!existing.has(base)) {
    return base;
  }

  let counter = 2;
  while (existing.has(`${base}_${counter}`)) {
    counter += 1;
  }

  return `${base}_${counter}`;
}

function createCustomField(
  parentFields: ExtractionFieldRecipe[],
  detailFields: DetailFieldRecipe[]
): DetailFieldRecipe {
  const index = detailFields.length + 1;

  return {
    id: makeId("detail"),
    key: uniqueKey(parentFields, detailFields, `detail_field_${index}`),
    label: `Detail field ${index}`,
    selector: "h1",
    source: "text",
    attribute: "",
    required: false,
    transforms: ["trim", "collapse-whitespace"]
  };
}

function sourceOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function originPattern(origin: string) {
  return origin ? `${origin}/*` : "";
}

function mergedReviewRun(
  run: ExtractionRunResult,
  result: DetailEnrichmentResult
): ExtractionRunResult {
  const fields = result.detailFields;
  let populatedCells = 0;
  let emptyCells = 0;
  let requiredMissingCells = 0;

  for (const record of result.records) {
    for (const [key, value] of Object.entries(record.values)) {
      if (value === null || value === undefined || value === "") {
        emptyCells += 1;
        if (fields.some((field) => field.key === key && field.required)) {
          requiredMissingCells += 1;
        }
      } else {
        populatedCells += 1;
      }
    }
  }

  return {
    recipeVersion: 1,
    sourceUrl: run.sourceUrl,
    recordSelector: run.recordSelector,
    recordCount: result.records.length,
    fieldCount: Object.keys(result.records[0]?.values ?? {}).length,
    records: result.records,
    warnings: result.warnings,
    stats: {
      populatedCells,
      emptyCells,
      requiredMissingCells
    },
    truncated: false
  };
}

export function DetailEnrichment({
  fields,
  recipe,
  run
}: DetailEnrichmentProps) {
  const [sourceFieldKey, setSourceFieldKey] = useState(
    fields.find((field) => field.source === "link")?.key ?? fields[0]?.key ?? ""
  );
  const [detailFields, setDetailFields] = useState<DetailFieldRecipe[]>([]);
  const [maxPages, setMaxPages] = useState(100);
  const [delayMs, setDelayMs] = useState(300);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [dedupeRows, setDedupeRows] = useState(false);
  const [permission, setPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DetailEnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = useMemo(() => sourceOrigin(run.sourceUrl), [run.sourceUrl]);

  const reviewFields = useMemo<ExtractionFieldRecipe[]>(
    () => [
      ...fields,
      ...detailFields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        selector: field.selector,
        source:
          field.source === "meta"
            ? ("attribute" as const)
            : field.source,
        attribute: field.attribute,
        required: field.required,
        transforms: field.transforms
      }))
    ],
    [detailFields, fields]
  );

  const reviewRun = useMemo(
    () => (result ? mergedReviewRun(run, result) : null),
    [result, run]
  );

  useEffect(() => {
    void checkPermission();
  }, [origin]);

  async function checkPermission() {
    if (!origin) {
      setPermission("denied");
      return false;
    }

    const pattern = originPattern(origin);
    const granted = await chrome.permissions.contains({
      origins: [pattern]
    });
    setPermission(granted ? "granted" : "denied");
    return granted;
  }

  async function requestPermission() {
    setError(null);

    if (!origin) {
      setPermission("denied");
      setError("The source origin is unavailable.");
      return;
    }

    try {
      const granted = await chrome.permissions.request({
        origins: [originPattern(origin)]
      });

      setPermission(granted ? "granted" : "denied");

      if (!granted) {
        setError("Chrome did not grant detail-page access for this site.");
      }
    } catch (reason) {
      setPermission("denied");
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to request detail-page access."
      );
    }
  }

  async function removePermission() {
    setError(null);

    if (!origin) {
      return;
    }

    try {
      await chrome.permissions.remove({
        origins: [originPattern(origin)]
      });
      setPermission("denied");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove detail-page access."
      );
    }
  }

  function addPreset(type: "h1" | "description" | "custom") {
    const field =
      type === "h1"
        ? ({
            id: makeId("detail-h1"),
            key: uniqueKey(fields, detailFields, "detail_title"),
            label: "Detail page title",
            selector: "h1",
            source: "text",
            attribute: "",
            required: false,
            transforms: ["trim", "collapse-whitespace"]
          } satisfies DetailFieldRecipe)
        : type === "description"
          ? ({
              id: makeId("detail-description"),
              key: uniqueKey(fields, detailFields, "meta_description"),
              label: "Meta description",
              selector: 'meta[name="description"]',
              source: "meta",
              attribute: "",
              required: false,
              transforms: ["trim", "collapse-whitespace"]
            } satisfies DetailFieldRecipe)
          : createCustomField(fields, detailFields);

    setDetailFields((current) => [...current, field]);
    setResult(null);
  }

  function updateField(
    id: string,
    updater: (field: DetailFieldRecipe) => DetailFieldRecipe
  ) {
    setDetailFields((current) =>
      current.map((field) => (field.id === id ? updater(field) : field))
    );
    setResult(null);
  }

  function toggleTransform(
    field: DetailFieldRecipe,
    transform: ExtractionTransform
  ) {
    updateField(field.id, (current) => ({
      ...current,
      transforms: current.transforms.includes(transform)
        ? current.transforms.filter((value) => value !== transform)
        : [...current.transforms, transform]
    }));
  }

  async function fetchDetailPage(url: string) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        credentials: "omit",
        redirect: "follow",
        cache: "no-store",
        headers: {
          Accept: "text/html,application/xhtml+xml"
        },
        signal: controller.signal
      });

      const finalUrl = response.url || url;

      if (!sameOrigin(finalUrl, origin)) {
        throw new Error("Detail request redirected to a different origin.");
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.toLowerCase().includes("text/html")) {
        throw new Error(
          `Detail response is not HTML (${contentType || "unknown type"}).`
        );
      }

      if (!response.ok) {
        throw new Error(`Detail page returned HTTP ${response.status}.`);
      }

      return {
        html: await response.text(),
        finalUrl,
        status: response.status
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function runEnrichment() {
    setError(null);
    setResult(null);

    if (!sourceFieldKey) {
      setError("Choose a parent field that contains the detail-page URL.");
      return;
    }

    if (!detailFields.length) {
      setError("Add at least one detail field before enrichment.");
      return;
    }

    if (!(await checkPermission())) {
      setError("Allow this site for detail-page enrichment first.");
      return;
    }

    const normalizedMaxPages = Math.max(
      1,
      Math.min(500, Math.floor(maxPages) || 1)
    );
    const normalizedDelay = Math.max(
      0,
      Math.min(5000, Math.floor(delayMs) || 0)
    );
    const normalizedTimeout = Math.max(
      2000,
      Math.min(30000, Math.floor(timeoutMs) || 10000)
    );

    setMaxPages(normalizedMaxPages);
    setDelayMs(normalizedDelay);
    setTimeoutMs(normalizedTimeout);
    setPending(true);

    const startedAt = new Date().toISOString();
    const warnings: string[] = [];
    const output: DetailEnrichedRecord[] = [];
    const cache = new Map<
      string,
      {
        values: Record<string, string | number | null>;
        warnings: string[];
        finalUrl: string;
        status: number;
        pageIndex: number;
      }
    >();
    const seenParentDetailUrls = new Set<string>();
    let attemptedPages = 0;
    let fetchedPages = 0;
    let reusedPages = 0;
    let skippedRows = 0;
    let failedPages = 0;

    try {
      for (const parent of run.records) {
        const detailUrl = normalizeDetailUrl(
          parent.values[sourceFieldKey],
          run.sourceUrl
        );

        if (!detailUrl) {
          skippedRows += 1;
          output.push({
            ...parent,
            detailUrl: "",
            detailPageIndex: null,
            evidence: {
              requestedUrl: "",
              finalUrl: "",
              status: 0,
              fetched: false,
              reused: false,
              error: "Missing or invalid detail URL."
            },
            warnings: [
              ...parent.warnings,
              "Detail enrichment: missing or invalid detail URL."
            ]
          });
          continue;
        }

        if (!sameOrigin(detailUrl, origin)) {
          skippedRows += 1;
          output.push({
            ...parent,
            detailUrl,
            detailPageIndex: null,
            evidence: {
              requestedUrl: detailUrl,
              finalUrl: "",
              status: 0,
              fetched: false,
              reused: false,
              error: "Cross-origin detail URL was blocked."
            },
            warnings: [
              ...parent.warnings,
              "Detail enrichment: cross-origin detail URL was blocked."
            ]
          });
          continue;
        }

        if (dedupeRows && seenParentDetailUrls.has(detailUrl)) {
          skippedRows += 1;
          continue;
        }

        seenParentDetailUrls.add(detailUrl);

        let cached = cache.get(detailUrl);
        const reused = Boolean(cached);
        let evidenceError = "";

        if (!cached) {
          if (attemptedPages >= normalizedMaxPages) {
            warnings.push(
              `Detail enrichment stopped at the ${normalizedMaxPages}-page limit.`
            );
            skippedRows += 1;
            output.push({
              ...parent,
              detailUrl,
              detailPageIndex: null,
              evidence: {
                requestedUrl: detailUrl,
                finalUrl: "",
                status: 0,
                fetched: false,
                reused: false,
                error: "Detail-page limit reached."
              },
              warnings: [
                ...parent.warnings,
                "Detail enrichment: detail-page limit reached."
              ]
            });
            continue;
          }

          if (attemptedPages > 0 && normalizedDelay > 0) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, normalizedDelay)
            );
          }

          attemptedPages += 1;

          try {
            const fetched = await fetchDetailPage(detailUrl);
            const extracted = extractDetailFields(
              fetched.html,
              fetched.finalUrl,
              detailFields
            );
            fetchedPages += 1;
            cached = {
              values: extracted.values,
              warnings: extracted.warnings,
              finalUrl: fetched.finalUrl,
              status: fetched.status,
              pageIndex: fetchedPages
            };
            cache.set(detailUrl, cached);
          } catch (reason) {
            failedPages += 1;
            evidenceError =
              reason instanceof Error
                ? reason.message
                : "Detail page could not be fetched.";
          }
        } else {
          reusedPages += 1;
        }

        if (!cached) {
          output.push({
            ...parent,
            detailUrl,
            detailPageIndex: null,
            evidence: {
              requestedUrl: detailUrl,
              finalUrl: "",
              status: 0,
              fetched: false,
              reused: false,
              error: evidenceError
            },
            warnings: [
              ...parent.warnings,
              `Detail enrichment: ${evidenceError}`
            ]
          });
          continue;
        }

        output.push({
          ...parent,
          index: output.length,
          values: {
            ...parent.values,
            ...cached.values
          },
          warnings: [...parent.warnings, ...cached.warnings],
          detailUrl,
          detailPageIndex: cached.pageIndex,
          evidence: {
            requestedUrl: detailUrl,
            finalUrl: cached.finalUrl,
            status: cached.status,
            fetched: true,
            reused,
            error: ""
          }
        });
      }

      setResult({
        startedAt,
        finishedAt: new Date().toISOString(),
        sourceFieldKey,
        sourceOrigin: origin,
        parentRows: run.records.length,
        uniqueDetailUrls: seenParentDetailUrls.size,
        fetchedPages,
        reusedPages,
        skippedRows,
        failedPages,
        records: output,
        detailFields,
        warnings
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Detail enrichment failed."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="detailEnrichment">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 010</p>
          <h2>Detail / subpage enrichment</h2>
        </div>
        <span className="detailBadge">
          {permission === "granted" ? "site allowed" : "site access needed"}
        </span>
      </div>

      <p className="detailIntro">
        Follow a parent record URL, fetch public HTML from the same site without
        cookies, extract extra fields, and merge them back into the parent row.
      </p>

      <label className="detailSource">
        Parent detail-URL field
        <select
          disabled={pending}
          onChange={(event) => {
            setSourceFieldKey(event.target.value);
            setResult(null);
          }}
          value={sourceFieldKey}
        >
          {fields.map((field) => (
            <option key={field.id} value={field.key}>
              {field.label} ({field.key})
            </option>
          ))}
        </select>
      </label>

      <div className="detailPermission">
        <div>
          <strong>Public detail-page access</strong>
          <p>
            Required so the extension can fetch detail pages without navigating
            your active tab. Requests omit cookies and stay on {origin || "the current origin"}.
          </p>
        </div>
        {permission === "granted" ? (
          <button
            className="detailPermissionRemove"
            disabled={pending}
            onClick={removePermission}
            type="button"
          >
            Remove site access
          </button>
        ) : (
          <button
            className="detailPermissionGrant"
            disabled={pending || !origin}
            onClick={requestPermission}
            type="button"
          >
            Allow this site for detail enrichment
          </button>
        )}
      </div>

      <div className="detailPresetActions">
        <button disabled={pending} onClick={() => addPreset("h1")} type="button">
          Add H1 title
        </button>
        <button
          disabled={pending}
          onClick={() => addPreset("description")}
          type="button"
        >
          Add meta description
        </button>
        <button
          disabled={pending}
          onClick={() => addPreset("custom")}
          type="button"
        >
          Add custom detail field
        </button>
      </div>

      <div className="detailFields">
        {detailFields.map((field, index) => (
          <article key={field.id}>
            <div className="detailFieldHeader">
              <strong>Detail field {index + 1}</strong>
              <button
                disabled={pending}
                onClick={() => {
                  setDetailFields((current) =>
                    current.filter((item) => item.id !== field.id)
                  );
                  setResult(null);
                }}
                type="button"
              >
                Remove
              </button>
            </div>

            <div className="detailFieldGrid">
              <label>
                Label
                <input
                  disabled={pending}
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      label: event.target.value
                    }))
                  }
                  value={field.label}
                />
              </label>
              <label>
                Key
                <input
                  disabled={pending}
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      key: event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]+/g, "_")
                        .replace(/^_+/, "")
                    }))
                  }
                  value={field.key}
                />
              </label>
            </div>

            <label>
              Detail-page selector
              <input
                className="monoInput"
                disabled={pending}
                onChange={(event) =>
                  updateField(field.id, (current) => ({
                    ...current,
                    selector: event.target.value
                  }))
                }
                value={field.selector}
              />
            </label>

            <div className="detailFieldGrid">
              <label>
                Extract
                <select
                  disabled={pending}
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      source: event.target.value as DetailExtractionSource
                    }))
                  }
                  value={field.source}
                >
                  <option value="text">Text</option>
                  <option value="meta">Meta content</option>
                  <option value="link">Link href</option>
                  <option value="image">Image src</option>
                  <option value="attribute">Attribute</option>
                </select>
              </label>

              {field.source === "attribute" ? (
                <label>
                  Attribute
                  <input
                    disabled={pending}
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        attribute: event.target.value
                      }))
                    }
                    placeholder="data-sku"
                    value={field.attribute}
                  />
                </label>
              ) : (
                <label className="requiredToggle">
                  <input
                    checked={field.required}
                    disabled={pending}
                    onChange={(event) =>
                      updateField(field.id, (current) => ({
                        ...current,
                        required: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  Required
                </label>
              )}
            </div>

            {field.source === "attribute" ? (
              <label className="requiredToggle">
                <input
                  checked={field.required}
                  disabled={pending}
                  onChange={(event) =>
                    updateField(field.id, (current) => ({
                      ...current,
                      required: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Required
              </label>
            ) : null}

            <div className="transformList">
              <span>Transforms</span>
              <div>
                {TRANSFORMS.map((transform) => (
                  <label key={transform.value}>
                    <input
                      checked={field.transforms.includes(transform.value)}
                      disabled={pending}
                      onChange={() => toggleTransform(field, transform.value)}
                      type="checkbox"
                    />
                    {transform.label}
                  </label>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="detailLimits">
        <label>
          Max unique detail pages
          <input
            disabled={pending}
            max={500}
            min={1}
            onChange={(event) => setMaxPages(Number(event.target.value))}
            type="number"
            value={maxPages}
          />
        </label>
        <label>
          Delay between fetches (ms)
          <input
            disabled={pending}
            max={5000}
            min={0}
            onChange={(event) => setDelayMs(Number(event.target.value))}
            step={100}
            type="number"
            value={delayMs}
          />
        </label>
        <label>
          Timeout per page (ms)
          <input
            disabled={pending}
            max={30000}
            min={2000}
            onChange={(event) => setTimeoutMs(Number(event.target.value))}
            step={1000}
            type="number"
            value={timeoutMs}
          />
        </label>
      </div>

      <label className="detailDedupe">
        <input
          checked={dedupeRows}
          disabled={pending}
          onChange={(event) => setDedupeRows(event.target.checked)}
          type="checkbox"
        />
        Keep only the first parent row for each identical detail URL
      </label>

      <button
        className="detailRun"
        disabled={
          pending ||
          permission !== "granted" ||
          !sourceFieldKey ||
          detailFields.length === 0
        }
        onClick={runEnrichment}
        type="button"
      >
        {pending ? "Enriching detail pages…" : "Run bounded detail enrichment"}
      </button>

      {error ? (
        <div className="errorBox" role="alert">
          <strong>Detail enrichment error</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="detailResult">
          <div className="detailStats">
            <div>
              <strong>{result.records.length}</strong>
              <span>merged rows</span>
            </div>
            <div>
              <strong>{result.fetchedPages}</strong>
              <span>pages fetched</span>
            </div>
            <div>
              <strong>{result.reusedPages}</strong>
              <span>fetches reused</span>
            </div>
            <div>
              <strong>{result.failedPages}</strong>
              <span>failed pages</span>
            </div>
          </div>

          <p className="detailSummary">
            {result.parentRows} parent rows · {result.uniqueDetailUrls} unique
            detail URLs · {result.skippedRows} skipped rows
          </p>

          {reviewRun ? (
            <SpreadsheetReview
              fields={reviewFields}
              recipeName={`${recipe.name} — detail enriched`}
              run={reviewRun}
            />
          ) : null}

          <details className="recipeJson">
            <summary>Detail enrichment evidence</summary>
            <pre>{JSON.stringify(result.records.map((row) => ({
              index: row.index,
              detailUrl: row.detailUrl,
              detailPageIndex: row.detailPageIndex,
              evidence: row.evidence
            })), null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
