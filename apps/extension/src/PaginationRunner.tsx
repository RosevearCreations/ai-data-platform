import { useMemo, useRef, useState } from "react";

import {
  inspectPagination,
  performPaginationStep,
  probePagination
} from "./pagination-engine";
import { executeExtractionRecipe } from "./recipe-engine";
import { SpreadsheetReview } from "./SpreadsheetReview";
import type {
  ExtractionRecipe,
  ExtractionRunResult,
  PaginatedExtractionRecord,
  PaginatedExtractionResult,
  PaginationInspection,
  PaginationMode,
  PaginationProbe
} from "./types";

interface PaginationRunnerProps {
  initialRun: ExtractionRunResult;
  recipe: ExtractionRecipe;
}

const DEFAULT_LIMITS = {
  maxPages: 10,
  maxRecords: 1000,
  waitMs: 5000,
  maxStalledSteps: 2
};

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active browser tab is available.");
  }

  return tab;
}

function originPattern(url: string | undefined) {
  if (!url) {
    throw new Error("The active tab URL is unavailable.");
  }

  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Pagination site access is only available for HTTP(S) pages.");
  }

  return `${parsed.origin}/*`;
}

async function injectWithArgs<T>(
  tabId: number,
  func: (...args: never[]) => unknown,
  args: unknown[]
): Promise<T> {
  const injection = {
    target: { tabId },
    func,
    args
  } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

  const results = await chrome.scripting.executeScript(injection);
  const result = results[0]?.result as T | undefined;

  if (result === undefined) {
    throw new Error("The active page did not return a pagination result.");
  }

  return result;
}

function rowFingerprint(
  record: ExtractionRunResult["records"][number],
  recipe: ExtractionRecipe
) {
  return JSON.stringify([
    record.index,
    ...recipe.fields.map((field) => record.values[field.key] ?? null)
  ]);
}

function pageFingerprint(run: ExtractionRunResult, recipe: ExtractionRecipe) {
  const samples = [
    run.records[0],
    run.records[1],
    run.records.at(-1)
  ].filter((record): record is ExtractionRunResult["records"][number] =>
    Boolean(record)
  );

  return JSON.stringify([
    run.records.length,
    ...samples.map((record) =>
      recipe.fields.map((field) => record.values[field.key] ?? null)
    )
  ]);
}

function normalizedLimits(
  maxPages: number,
  maxRecords: number,
  waitMs: number
) {
  return {
    maxPages: Math.max(1, Math.min(50, Math.floor(maxPages) || 1)),
    maxRecords: Math.max(1, Math.min(5000, Math.floor(maxRecords) || 1)),
    waitMs: Math.max(1000, Math.min(15000, Math.floor(waitMs) || 1000)),
    maxStalledSteps: DEFAULT_LIMITS.maxStalledSteps
  };
}

export function PaginationRunner({
  initialRun,
  recipe
}: PaginationRunnerProps) {
  const [inspection, setInspection] = useState<PaginationInspection | null>(
    null
  );
  const [mode, setMode] = useState<PaginationMode>("none");
  const [selectedSelector, setSelectedSelector] = useState("");
  const [maxPages, setMaxPages] = useState(DEFAULT_LIMITS.maxPages);
  const [maxRecords, setMaxRecords] = useState(DEFAULT_LIMITS.maxRecords);
  const [waitMs, setWaitMs] = useState(DEFAULT_LIMITS.waitMs);
  const [running, setRunning] = useState(false);
  const [sitePermission, setSitePermission] = useState<
    "not-required" | "unknown" | "granted" | "denied"
  >("unknown");
  const [result, setResult] = useState<PaginatedExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const reviewRun = useMemo<ExtractionRunResult | null>(() => {
    if (!result) {
      return null;
    }

    let populatedCells = 0;
    let emptyCells = 0;
    let requiredMissingCells = 0;

    for (const row of result.rows) {
      for (const field of recipe.fields) {
        const value = row.values[field.key];

        if (value === null || value === undefined || value === "") {
          emptyCells += 1;
          if (field.required) {
            requiredMissingCells += 1;
          }
        } else {
          populatedCells += 1;
        }
      }
    }

    return {
      recipeVersion: 1,
      sourceUrl: result.rows[0]?.sourceUrl ?? initialRun.sourceUrl,
      recordSelector: recipe.recordSelector,
      recordCount: result.rows.length,
      fieldCount: recipe.fields.length,
      records: result.rows,
      warnings: result.warnings,
      stats: {
        populatedCells,
        emptyCells,
        requiredMissingCells
      },
      truncated: false
    };
  }, [initialRun.sourceUrl, recipe, result]);

  async function inspect() {
    setError(null);

    try {
      const tab = await getActiveTab();
      const value = await injectWithArgs<PaginationInspection>(
        tab.id!,
        inspectPagination as (...args: never[]) => unknown,
        [recipe.recordSelector]
      );

      setInspection(value);

      if (value.recommendedMode !== "none") {
        setMode(value.recommendedMode);
        setSelectedSelector(value.recommendedSelector);
        await refreshSitePermission(value.recommendedMode);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to inspect pagination."
      );
    }
  }

  async function refreshSitePermission(targetMode: PaginationMode) {
    if (
      targetMode === "none" ||
      targetMode === "load-more" ||
      targetMode === "infinite-scroll"
    ) {
      setSitePermission("not-required");
      return true;
    }

    try {
      const tab = await getActiveTab();
      const pattern = originPattern(tab.url);
      const granted = await chrome.permissions.contains({
        origins: [pattern]
      });

      setSitePermission(granted ? "granted" : "denied");
      return granted;
    } catch {
      setSitePermission("denied");
      return false;
    }
  }

  async function requestSitePermission() {
    setError(null);

    try {
      const tab = await getActiveTab();
      const pattern = originPattern(tab.url);
      const granted = await chrome.permissions.request({
        origins: [pattern]
      });

      setSitePermission(granted ? "granted" : "denied");

      if (!granted) {
        setError("Chrome did not grant access to this site for pagination.");
      }
    } catch (reason) {
      setSitePermission("denied");
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to request pagination access for this site."
      );
    }
  }

  async function removeSitePermission() {
    setError(null);

    try {
      const tab = await getActiveTab();
      const pattern = originPattern(tab.url);
      await chrome.permissions.remove({
        origins: [pattern]
      });
      setSitePermission("denied");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove pagination access for this site."
      );
    }
  }

  async function probe(tabId: number) {
    return injectWithArgs<PaginationProbe>(
      tabId,
      probePagination as (...args: never[]) => unknown,
      [recipe.recordSelector]
    );
  }

  async function extract(tabId: number, pageUrl: string) {
    return injectWithArgs<ExtractionRunResult>(
      tabId,
      executeExtractionRecipe as (...args: never[]) => unknown,
      [
        {
          ...recipe,
          sourceUrl: pageUrl
        }
      ]
    );
  }

  async function waitForProgress(
    tabId: number,
    before: PaginationProbe,
    activeMode: PaginationMode,
    timeoutMs: number,
    initialOrigin: string
  ) {
    const deadline = Date.now() + timeoutMs;
    let latest: PaginationProbe | null = null;

    while (Date.now() < deadline) {
      if (cancelRef.current) {
        return { status: "cancelled" as const, probe: latest };
      }

      await sleep(300);

      try {
        latest = await probe(tabId);
      } catch {
        continue;
      }

      if (latest.origin !== initialOrigin) {
        return { status: "cross-origin" as const, probe: latest };
      }

      const urlChanged = latest.url !== before.url;
      const recordsChanged =
        latest.recordCount !== before.recordCount ||
        latest.recordSignature !== before.recordSignature;
      const heightChanged = latest.scrollHeight > before.scrollHeight;

      const progressed =
        activeMode === "next-button" || activeMode === "numbered-pages"
          ? urlChanged || recordsChanged
          : recordsChanged || heightChanged;

      if (progressed && latest.readyState !== "loading") {
        await sleep(350);
        return { status: "progress" as const, probe: latest };
      }
    }

    return { status: "stalled" as const, probe: latest };
  }

  async function runPagination() {
    if (mode === "none") {
      setError("Inspect pagination and choose a pagination mode first.");
      return;
    }

    const limits = normalizedLimits(maxPages, maxRecords, waitMs);
    setMaxPages(limits.maxPages);
    setMaxRecords(limits.maxRecords);
    setWaitMs(limits.waitMs);
    setRunning(true);
    setError(null);
    setResult(null);
    cancelRef.current = false;

    const startedAt = new Date().toISOString();
    const warnings: string[] = [];
    const rows: PaginatedExtractionRecord[] = [];
    const pageSummaries: PaginatedExtractionResult["pageSummaries"] = [];
    const seenNavigationStates = new Set<string>();
    const seenCumulativeRows = new Set<string>();
    const seenPageFingerprints = new Set<string>();
    let pagesVisited = 0;
    let stalledSteps = 0;
    let stopReason: PaginatedExtractionResult["stopReason"] = "completed";

    try {
      const tab = await getActiveTab();
      const tabId = tab.id!;

      if (
        (mode === "next-button" || mode === "numbered-pages") &&
        !(await refreshSitePermission(mode))
      ) {
        throw new Error(
          "Allow this site for pagination before running navigational pagination."
        );
      }

      const firstProbe = await probe(tabId);
      const initialOrigin = firstProbe.origin;
      let currentProbe = firstProbe;

      while (pagesVisited < limits.maxPages) {
        if (cancelRef.current) {
          stopReason = "cancelled";
          break;
        }

        if (currentProbe.origin !== initialOrigin) {
          stopReason = "cross-origin";
          warnings.push("Pagination moved to a different origin and was stopped.");
          break;
        }

        const pageNumber = pagesVisited + 1;
        const pageRun =
          pageNumber === 1 &&
          initialRun.sourceUrl === currentProbe.url
            ? initialRun
            : await extract(tabId, currentProbe.url);

        const fingerprint = pageFingerprint(pageRun, recipe);

        if (
          (mode === "next-button" || mode === "numbered-pages") &&
          seenPageFingerprints.has(fingerprint)
        ) {
          stopReason = "no-new-records";
          warnings.push("A repeated page payload was detected.");
          break;
        }

        seenPageFingerprints.add(fingerprint);

        let addedRows = 0;
        let duplicateRows = 0;

        for (const record of pageRun.records) {
          if (rows.length >= limits.maxRecords) {
            stopReason = "max-records";
            break;
          }

          const cumulativeMode =
            mode === "load-more" || mode === "infinite-scroll";
          const recordKey = rowFingerprint(record, recipe);

          if (cumulativeMode && seenCumulativeRows.has(recordKey)) {
            duplicateRows += 1;
            continue;
          }

          if (cumulativeMode) {
            seenCumulativeRows.add(recordKey);
          }

          rows.push({
            ...record,
            index: rows.length,
            page: pageNumber,
            sourceUrl: currentProbe.url
          });
          addedRows += 1;
        }

        pagesVisited += 1;
        pageSummaries.push({
          page: pageNumber,
          url: currentProbe.url,
          extractedRows: pageRun.records.length,
          addedRows,
          duplicateRows
        });

        if (stopReason === "max-records") {
          break;
        }

        if (
          pagesVisited >= limits.maxPages ||
          rows.length >= limits.maxRecords
        ) {
          stopReason =
            rows.length >= limits.maxRecords ? "max-records" : "max-pages";
          break;
        }

        if (
          (mode === "load-more" || mode === "infinite-scroll") &&
          addedRows === 0
        ) {
          stalledSteps += 1;
        } else {
          stalledSteps = 0;
        }

        if (stalledSteps >= limits.maxStalledSteps) {
          stopReason = "no-new-records";
          warnings.push("No new records were added across repeated pagination steps.");
          break;
        }

        const pageInspection = await injectWithArgs<PaginationInspection>(
          tabId,
          inspectPagination as (...args: never[]) => unknown,
          [recipe.recordSelector]
        );

        const modeCandidates = pageInspection.candidates.filter(
          (item) =>
            item.mode === mode &&
            !item.disabled &&
            item.sameOrigin
        );

        const candidate =
          mode === "infinite-scroll"
            ? modeCandidates[0]
            : pagesVisited === 1 && selectedSelector
              ? modeCandidates.find(
                  (item) => item.selector === selectedSelector
                ) ?? modeCandidates[0]
              : modeCandidates[0];

        if (!candidate) {
          stopReason = "no-next-control";
          break;
        }

        const before = await probe(tabId);
        const navigationKey = `${before.url}|${before.recordSignature}`;

        if (
          (mode === "next-button" || mode === "numbered-pages") &&
          seenNavigationStates.has(navigationKey)
        ) {
          stopReason = "repeated-url";
          warnings.push("A previously visited pagination state was detected.");
          break;
        }

        seenNavigationStates.add(navigationKey);

        await injectWithArgs(
          tabId,
          performPaginationStep as (...args: never[]) => unknown,
          [mode, candidate.selector, recipe.recordSelector]
        );

        const progress = await waitForProgress(
          tabId,
          before,
          mode,
          limits.waitMs,
          initialOrigin
        );

        if (progress.status === "cancelled") {
          stopReason = "cancelled";
          break;
        }

        if (progress.status === "cross-origin") {
          stopReason = "cross-origin";
          warnings.push("Cross-origin navigation was blocked.");
          break;
        }

        if (progress.status === "stalled" || !progress.probe) {
          stalledSteps += 1;

          if (stalledSteps >= limits.maxStalledSteps) {
            stopReason = "stalled";
            warnings.push("The page stopped changing after pagination actions.");
            break;
          }

          continue;
        }

        currentProbe = progress.probe;
      }

      setResult({
        startedAt,
        finishedAt: new Date().toISOString(),
        mode,
        pagesVisited,
        rows,
        pageSummaries,
        stopReason,
        warnings
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Pagination run failed.";

      setError(message);
      setResult({
        startedAt,
        finishedAt: new Date().toISOString(),
        mode,
        pagesVisited,
        rows,
        pageSummaries,
        stopReason: "error",
        warnings: [...warnings, message]
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="paginationRunner">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 009</p>
          <h2>Pagination & infinite scroll</h2>
        </div>
        <span className="paginationBadge">
          {inspection?.recommendedMode ?? "not inspected"}
        </span>
      </div>

      <p className="paginationIntro">
        This runner may navigate the active tab or scroll it to load more
        records. It stays on the original site origin and stops on hard limits
        or stalled growth.
      </p>

      <button
        className="paginationInspect"
        disabled={running}
        onClick={inspect}
        type="button"
      >
        Inspect pagination
      </button>

      {inspection ? (
        <>
          <div className="paginationInspection">
            <strong>
              {inspection.recordCount} current records ·{" "}
              {inspection.candidates.length} candidates
            </strong>
            <p>{inspection.url}</p>
          </div>

          <div className="paginationCandidates">
            {inspection.candidates.map((candidate, index) => (
              <button
                className={
                  mode === candidate.mode &&
                  candidate.selector === selectedSelector
                    ? "active"
                    : ""
                }
                disabled={candidate.disabled || !candidate.sameOrigin}
                key={`${candidate.mode}-${candidate.selector}-${index}`}
                onClick={() => {
                  setMode(candidate.mode);
                  setSelectedSelector(candidate.selector);
                  void refreshSitePermission(candidate.mode);
                }}
                type="button"
              >
                <strong>{candidate.mode}</strong>
                <span>{candidate.label}</span>
                <small>
                  confidence {candidate.confidence}
                  {!candidate.sameOrigin ? " · cross-origin blocked" : ""}
                  {candidate.disabled ? " · disabled" : ""}
                </small>
              </button>
            ))}
          </div>

          {inspection.diagnostics.length ? (
            <ul className="diagnostics">
              {inspection.diagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {(mode === "next-button" || mode === "numbered-pages") ? (
        <div className="paginationPermission">
          <div>
            <strong>Site access for navigation</strong>
            <p>
              Chrome revokes temporary active-tab access after navigation, so
              next-page automation needs an optional grant for this site only.
            </p>
          </div>
          {sitePermission === "granted" ? (
            <button
              className="paginationPermissionRemove"
              disabled={running}
              onClick={removeSitePermission}
              type="button"
            >
              Remove site access
            </button>
          ) : (
            <button
              className="paginationPermissionGrant"
              disabled={running}
              onClick={requestSitePermission}
              type="button"
            >
              Allow this site for pagination
            </button>
          )}
          <span>
            {sitePermission === "granted"
              ? "Granted for the current origin"
              : "Not granted"}
          </span>
        </div>
      ) : null}

      <div className="paginationLimits">
        <label>
          Max pages / steps
          <input
            disabled={running}
            max={50}
            min={1}
            onChange={(event) => setMaxPages(Number(event.target.value))}
            type="number"
            value={maxPages}
          />
        </label>
        <label>
          Max records
          <input
            disabled={running}
            max={5000}
            min={1}
            onChange={(event) => setMaxRecords(Number(event.target.value))}
            type="number"
            value={maxRecords}
          />
        </label>
        <label>
          Wait per step (ms)
          <input
            disabled={running}
            max={15000}
            min={1000}
            onChange={(event) => setWaitMs(Number(event.target.value))}
            step={500}
            type="number"
            value={waitMs}
          />
        </label>
      </div>

      <div className="paginationActions">
        <button
          className="paginationRun"
          disabled={
            running ||
            mode === "none" ||
            ((mode === "next-button" || mode === "numbered-pages") &&
              sitePermission !== "granted")
          }
          onClick={runPagination}
          type="button"
        >
          {running ? "Pagination running…" : "Run bounded pagination"}
        </button>
        {running ? (
          <button
            className="paginationCancel"
            onClick={() => {
              cancelRef.current = true;
            }}
            type="button"
          >
            Stop after current step
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="errorBox" role="alert">
          <strong>Pagination error</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="paginationResult">
          <div className="paginationResultSummary">
            <div>
              <strong>{result.rows.length} collected rows</strong>
              <span>
                {result.pagesVisited} pages / steps · {result.stopReason}
              </span>
            </div>
            <span>{result.mode}</span>
          </div>

          <div className="paginationPages">
            {result.pageSummaries.map((page) => (
              <article key={`${page.page}-${page.url}`}>
                <strong>Step {page.page}</strong>
                <span>{page.addedRows} rows added</span>
                <small>
                  {page.extractedRows} extracted · {page.duplicateRows} cumulative
                  duplicates skipped
                </small>
                <code>{page.url}</code>
              </article>
            ))}
          </div>

          {result.warnings.length ? (
            <ul className="diagnostics">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {reviewRun && result.rows.length ? (
            <SpreadsheetReview
              fields={recipe.fields}
              recipeName={`${recipe.name} — paginated`}
              run={reviewRun}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
