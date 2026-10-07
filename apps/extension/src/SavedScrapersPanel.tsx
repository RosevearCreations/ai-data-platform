import { useEffect, useMemo, useState } from "react";

import { RecipeRepairWorkbench } from "./RecipeRepairWorkbench";
import { inspectSavedScraperCompatibility } from "./saved-scraper-engine";
import {
  BUILT_IN_SCRAPER_TEMPLATES,
  cloneExtractionRecipe,
  createSavedScraper,
  deleteSavedScraper,
  loadSavedScrapers,
  rollbackSavedScraperRevision,
  sourceOriginFor,
  updateSavedScraper,
  updateSavedScraperCheck
} from "./saved-scrapers";
import type {
  ExtractionRecipe,
  SavedScraper,
  SavedScraperKind,
  ScraperCompatibilityReport
} from "./types";

interface SavedScrapersPanelProps {
  currentRecipe?: ExtractionRecipe;
  onApplyRecipe: (recipe: ExtractionRecipe) => void;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab is available.");
  return tab;
}

function healthLabel(report: ScraperCompatibilityReport | null) {
  return report ? report.status : "not checked";
}

export function SavedScrapersPanel({
  currentRecipe,
  onApplyRecipe
}: SavedScrapersPanelProps) {
  const [items, setItems] = useState<SavedScraper[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [check, setCheck] = useState<ScraperCompatibilityReport | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh(preferredId = "") {
    const loaded = await loadSavedScrapers();
    setItems(loaded);
    if (preferredId && loaded.some((item) => item.id === preferredId)) {
      setSelectedId(preferredId);
    } else if (selectedId && loaded.some((item) => item.id === selectedId)) {
      setSelectedId(selectedId);
    } else {
      setSelectedId(loaded[0]?.id ?? "");
    }
  }

  useEffect(() => {
    void refresh();
    void getActiveTab().then((tab) => setCurrentUrl(tab.url ?? "")).catch(() => setCurrentUrl(""));

    const listener = (
      _changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local") {
        void refresh();
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );
  const currentOrigin = sourceOriginFor(currentUrl);
  const siteMatches = items.filter(
    (item) => Boolean(currentOrigin) && item.sourceOrigin === currentOrigin
  );

  async function saveCurrent(kind: SavedScraperKind) {
    if (!currentRecipe || !currentRecipe.fields.length) {
      setStatus("Add at least one field before saving a reusable scraper.");
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const tab = await getActiveTab();
      const saved = await createSavedScraper(
        currentRecipe,
        tab.url ?? currentRecipe.sourceUrl,
        kind
      );
      await refresh(saved.id);
      setStatus(kind === "template" ? "Saved as a reusable site template." : "Saved scraper revision 1.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to save scraper.");
    } finally {
      setPending(false);
    }
  }

  async function updateCurrent() {
    if (!currentRecipe || !selected) return;
    setPending(true);
    setStatus(null);
    try {
      const tab = await getActiveTab();
      const updated = await updateSavedScraper(
        selected.id,
        currentRecipe,
        tab.url ?? currentRecipe.sourceUrl
      );
      await refresh(updated.id);
      setCheck(null);
      setStatus("Saved revision " + updated.revision + ".");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to update scraper.");
    } finally {
      setPending(false);
    }
  }

  async function rollbackRevision(revisionNumber: number) {
    if (!selected) return;
    setPending(true);
    setStatus(null);
    try {
      const updated = await rollbackSavedScraperRevision(
        selected.id,
        revisionNumber
      );
      onApplyRecipe(cloneExtractionRecipe(updated.recipe));
      setCheck(null);
      await refresh(updated.id);
      setStatus(
        "Rolled back revision " +
          revisionNumber +
          " as new revision " +
          updated.revision +
          ". Scheduled jobs remain pinned to the prior revision until Refresh + re-review."
      );
    } catch (reason) {
      setStatus(
        reason instanceof Error
          ? reason.message
          : "Unable to roll back the saved scraper."
      );
    } finally {
      setPending(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    setPending(true);
    setStatus(null);
    try {
      await deleteSavedScraper(selected.id);
      setCheck(null);
      await refresh();
      setStatus("Saved item deleted.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to delete scraper.");
    } finally {
      setPending(false);
    }
  }

  async function checkSelected() {
    if (!selected) return;
    setPending(true);
    setStatus(null);
    try {
      const tab = await getActiveTab();
      const injection = {
        target: { tabId: tab.id! },
        func: inspectSavedScraperCompatibility,
        args: [selected.recipe, selected.lastCheck]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];
      const results = await chrome.scripting.executeScript(injection);
      const report = results[0]?.result as ScraperCompatibilityReport | undefined;
      if (!report) throw new Error("Compatibility check did not return a result.");
      setCurrentUrl(tab.url ?? "");
      setCheck(report);
      await updateSavedScraperCheck(selected.id, report);
      await refresh(selected.id);
      setStatus(
        report.status === "healthy"
          ? "Selectors look healthy on this page."
          : report.status === "degraded"
            ? "Selectors still run, but one or more matches weakened."
            : "Saved scraper appears broken on this page."
      );
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Unable to check saved scraper.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="savedScrapers">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 012 → 023</p>
          <h2>Saved scrapers & templates</h2>
        </div>
        <span className="savedBadge">{items.length} saved</span>
      </div>

      <p className="savedIntro">
        Saved recipes are workspace-persistent with local offline copies. Build
        023 tracks selector-health trends and structural drift, proposes bounded
        deterministic repairs, and requires explicit approval before a repair
        becomes a new revision.
      </p>

      {siteMatches.length ? (
        <p className="savedSiteMatch">
          {siteMatches.length} saved item{siteMatches.length === 1 ? "" : "s"} for this site.
        </p>
      ) : null}

      {items.length ? (
        <>
          <label className="savedSelect">
            Recipe library
            <select
              onChange={(event) => {
                setSelectedId(event.target.value);
                setCheck(null);
                setStatus(null);
              }}
              value={selectedId}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.kind} · r{item.revision}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="savedSelected">
              <div>
                <strong>{selected.name}</strong>
                <span>
                  {selected.kind} · revision {selected.revision} · {healthLabel(selected.lastCheck)}
                </span>
                {selected.sourceOrigin ? <small>{selected.sourceOrigin}</small> : null}
              </div>

              <div className="savedActions">
                <button disabled={pending} onClick={() => onApplyRecipe(cloneExtractionRecipe(selected.recipe))} type="button">
                  Load current
                </button>
                <button disabled={pending} onClick={checkSelected} type="button">
                  Check on this page
                </button>
                {currentRecipe ? (
                  <button disabled={pending || !currentRecipe.fields.length} onClick={updateCurrent} type="button">
                    Save new revision
                  </button>
                ) : null}
                <button className="savedDelete" disabled={pending} onClick={removeSelected} type="button">
                  Delete
                </button>
              </div>

              {selected.revisions.length ? (
                <details className="savedHistory">
                  <summary>Revision history ({selected.revisions.length})</summary>
                  <div>
                    {[...selected.revisions]
                      .sort((left, right) => right.revision - left.revision)
                      .map((revision) => (
                        <div
                          className="savedRevisionRow"
                          key={revision.revision}
                        >
                          <button
                            onClick={() =>
                              onApplyRecipe(
                                cloneExtractionRecipe(revision.recipe)
                              )
                            }
                            type="button"
                          >
                            Load r{revision.revision} ·{" "}
                            {new Date(revision.savedAt).toLocaleString()}
                            {revision.compatibility?.status === "healthy"
                              ? " · known-good"
                              : ""}
                            {revision.revisionKind
                              ? " · " + revision.revisionKind
                              : ""}
                          </button>
                          <button
                            disabled={pending}
                            onClick={() =>
                              void rollbackRevision(revision.revision)
                            }
                            type="button"
                          >
                            Roll back as new revision
                          </button>
                        </div>
                      ))}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="savedEmpty">
          No saved scrapers yet. Open a detected record group, add fields, and save the recipe here.
        </p>
      )}

      {check ? (
        <div className={"savedHealth savedHealth-" + check.status}>
          <strong>{check.status.toUpperCase()} · {check.recordMatches} record matches</strong>
          <span>Checked {check.sampledRecords} records · {new Date(check.checkedAt).toLocaleString()}</span>
          {check.fields.length ? (
            <div className="savedFieldHealth">
              {check.fields.map((field) => (
                <div key={field.key}>
                  <span>
                    {field.label}
                    <small>{field.trend}</small>
                  </span>
                  <strong>
                    {Math.round(field.coverage * 100)}%
                    {field.previousCoverage !== null
                      ? " ← " +
                        Math.round(field.previousCoverage * 100) +
                        "%"
                      : ""}
                  </strong>
                </div>
              ))}
            </div>
          ) : null}
          {check.warnings.length ? (
            <ul>{check.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          ) : null}
        </div>
      ) : null}

      {check && selected && check.issues.length ? (
        <RecipeRepairWorkbench
          onApplyRecipe={onApplyRecipe}
          onRepaired={(updated, message) => {
            setCheck(null);
            setStatus(message);
            void refresh(updated.id);
          }}
          report={check}
          scraper={selected}
        />
      ) : null}

      <div className="savedTemplates">
        <strong>Starter site templates</strong>
        <p>Load a starter recipe, adjust its selectors to the current site, then save it as your own.</p>
        <div>
          {BUILT_IN_SCRAPER_TEMPLATES.map((template) => (
            <button key={template.id} onClick={() => onApplyRecipe(cloneExtractionRecipe(template.recipe))} type="button">
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </div>

      {currentRecipe ? (
        <div className="savedCreate">
          <button disabled={pending || !currentRecipe.fields.length} onClick={() => saveCurrent("scraper")} type="button">
            Save as scraper
          </button>
          <button disabled={pending || !currentRecipe.fields.length} onClick={() => saveCurrent("template")} type="button">
            Save as site template
          </button>
        </div>
      ) : null}

      {status ? <p className="savedStatus" role="status">{status}</p> : null}
    </section>
  );
}
