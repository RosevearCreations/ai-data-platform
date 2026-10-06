import { useMemo, useState } from "react";

import { BusinessIntegrationsPanel } from "./BusinessIntegrationsPanel";
import { inspectPage } from "./inspect-page";
import { RecipeBuilder } from "./RecipeBuilder";
import { SavedScrapersPanel } from "./SavedScrapersPanel";
import { ScheduledJobsPanel } from "./ScheduledJobsPanel";
import {
  detectRepeatingRecords,
  previewRecordGroup
} from "./record-detector";
import {
  cancelVisualPicker,
  previewSelector,
  startVisualPicker
} from "./visual-picker";
import type {
  ExtractionRecipe,
  PageInspection,
  RecordDetectionResult,
  RecordGroupCandidate,
  RecordPreviewResult,
  SelectorPreviewResult,
  VisualPickResult
} from "./types";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active browser tab is available.");
  }

  return tab.id;
}

function savedRecipeCandidate(recipe: ExtractionRecipe): RecordGroupCandidate {
  return {
    containerSelector: recipe.recordSelector,
    recordSelector: recipe.recordSelector,
    source: "auto",
    recordCount: 0,
    visibleRecordCount: 0,
    confidence: 1,
    metrics: {
      repeatRatio: 1,
      structuralConsistency: 1,
      textCoverage: 1,
      linkCoverage: 0,
      imageCoverage: 0,
      averageDescendants: 0
    },
    diagnostics: ["Loaded from the local saved scraper library."],
    samples: []
  };
}

function normalizeChromeError(reason: unknown) {
  const message =
    reason instanceof Error
      ? reason.message
      : "The current page cannot be inspected.";

  if (
    message.includes("Cannot access") ||
    message.includes("chrome://") ||
    message.includes("The extensions gallery cannot be scripted")
  ) {
    return "Chrome does not allow extensions to inspect this page.";
  }

  return message;
}

export function App() {
  const [inspection, setInspection] = useState<PageInspection | null>(null);
  const [pickedElement, setPickedElement] = useState<VisualPickResult | null>(
    null
  );
  const [preview, setPreview] = useState<SelectorPreviewResult | null>(null);
  const [recordDetection, setRecordDetection] =
    useState<RecordDetectionResult | null>(null);
  const [recordPreview, setRecordPreview] =
    useState<RecordPreviewResult | null>(null);
  const [selectedRecordGroup, setSelectedRecordGroup] =
    useState<RecordGroupCandidate | null>(null);
  const [initialRecipe, setInitialRecipe] = useState<ExtractionRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recordPending, setRecordPending] = useState(false);
  const [pickerActive, setPickerActive] = useState(false);

  const topCandidate = useMemo(
    () => inspection?.candidates[0] ?? null,
    [inspection]
  );

  async function analyzeCurrentPage() {
    setPending(true);
    setError(null);

    try {
      const tabId = await getActiveTabId();
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: inspectPage
      });

      const result = results[0]?.result as PageInspection | undefined;

      if (!result) {
        throw new Error("The page did not return inspection data.");
      }

      setInspection(result);
    } catch (reason) {
      setInspection(null);
      setError(normalizeChromeError(reason));
    } finally {
      setPending(false);
    }
  }

  async function pickElement() {
    setError(null);
    setPreview(null);
    setPickerActive(true);

    try {
      const tabId = await getActiveTabId();
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: startVisualPicker
      });
      const result = results[0]?.result as VisualPickResult | undefined;

      if (!result) {
        throw new Error("The page picker did not return a result.");
      }

      if (result.status === "picked") {
        setPickedElement(result);
      }
    } catch (reason) {
      setError(normalizeChromeError(reason));
    } finally {
      setPickerActive(false);
    }
  }

  async function cancelPicker() {
    try {
      const tabId = await getActiveTabId();
      await chrome.scripting.executeScript({
        target: { tabId },
        func: cancelVisualPicker
      });
    } catch (reason) {
      setError(normalizeChromeError(reason));
    }
  }

  async function runRecordDetection(inputSelector = "") {
    setRecordPending(true);
    setRecordPreview(null);
    setError(null);

    try {
      const tabId = await getActiveTabId();
      const injection = inputSelector
        ? ({
            target: { tabId },
            func: detectRepeatingRecords,
            args: [inputSelector]
          } as unknown as Parameters<typeof chrome.scripting.executeScript>[0])
        : ({
            target: { tabId },
            func: detectRepeatingRecords
          } as Parameters<typeof chrome.scripting.executeScript>[0]);

      const results = await chrome.scripting.executeScript(injection);
      const result = results[0]?.result as RecordDetectionResult | undefined;

      if (!result) {
        throw new Error("Record detection did not return a result.");
      }

      setRecordDetection(result);
    } catch (reason) {
      setRecordDetection(null);
      setError(normalizeChromeError(reason));
    } finally {
      setRecordPending(false);
    }
  }

  async function runRecordPreview(recordSelector: string) {
    setError(null);

    try {
      const tabId = await getActiveTabId();
      const injection = {
        target: { tabId },
        func: previewRecordGroup,
        args: [recordSelector]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

      const results = await chrome.scripting.executeScript(injection);
      const result = results[0]?.result as RecordPreviewResult | undefined;

      if (!result) {
        throw new Error("Record preview did not return a result.");
      }

      setRecordPreview(result);
    } catch (reason) {
      setError(normalizeChromeError(reason));
    }
  }

  async function runPreview(selector: string) {
    setError(null);

    try {
      const tabId = await getActiveTabId();
      const previewInjection = {
        target: { tabId },
        func: previewSelector,
        args: [selector]
      } as unknown as Parameters<typeof chrome.scripting.executeScript>[0];

      const results = await chrome.scripting.executeScript(previewInjection);
      const result = results[0]?.result as SelectorPreviewResult | undefined;

      if (!result) {
        throw new Error("Selector preview did not return a result.");
      }

      setPreview(result);
    } catch (reason) {
      setError(normalizeChromeError(reason));
    }
  }

  return (
    <main className="panel">
      <header className="header">
        <div>
          <p className="eyebrow">AI Data Platform</p>
          <h1>Element picker</h1>
        </div>
        <span className="build">018</span>
      </header>

      <section className="notice" aria-label="Inspection policy">
        <strong>Approve explicit business-system handoffs</strong>
        <p>
          Build 018 adds Rosie Dazzlers and Devil n Dove adapter contracts,
          dry-run diffs, user-owned field protection, explicit approval and
          local audit trails before any controlled integration package export.
        </p>
      </section>

      <section className="workspace">
        <label htmlFor="workspace">Workspace</label>
        <select id="workspace" defaultValue="rosiedazzlers" disabled>
          <option value="rosiedazzlers">Rosie Dazzlers</option>
          <option value="devilndove">Devil n Dove</option>
          <option value="personal">Personal</option>
        </select>
        <small>
          Workspace binding will be connected to the authenticated web session
          in a later build.
        </small>
      </section>

      {!selectedRecordGroup ? (
        <>
          <SavedScrapersPanel
            onApplyRecipe={(savedRecipe) => {
              setInitialRecipe(savedRecipe);
              setSelectedRecordGroup(savedRecipeCandidate(savedRecipe));
              setError(null);
            }}
          />
          <ScheduledJobsPanel
            onApplyRecipe={(scheduledRecipe) => {
              setInitialRecipe(scheduledRecipe);
              setSelectedRecordGroup(savedRecipeCandidate(scheduledRecipe));
              setError(null);
            }}
          />
          <BusinessIntegrationsPanel />
        </>
      ) : null}

      <div className="actionGrid">
        <button
          className="primary"
          disabled={pending || pickerActive}
          onClick={analyzeCurrentPage}
          type="button"
        >
          {pending ? "Inspecting…" : "Analyze page"}
        </button>
        <div className="recordActions">
        <button
          className="recordPrimary"
          disabled={recordPending || pickerActive}
          onClick={() => runRecordDetection()}
          type="button"
        >
          {recordPending ? "Detecting records…" : "Detect repeating records"}
        </button>
        <button
          className="recordSecondary"
          disabled={
            recordPending ||
            pickerActive ||
            !pickedElement ||
            pickedElement.generalizedMatchCount < 2
          }
          onClick={() =>
            runRecordDetection(pickedElement?.generalizedSelector ?? "")
          }
          type="button"
        >
          Detect around selected field
        </button>
      </div>

      {pickerActive ? (
          <button className="dangerButton" onClick={cancelPicker} type="button">
            Cancel picker
          </button>
        ) : (
          <button className="secondaryButton" onClick={pickElement} type="button">
            Pick an element
          </button>
        )}
      </div>

      {pickerActive ? (
        <section className="pickerActive" role="status">
          <span className="pulse" aria-hidden="true" />
          <div>
            <strong>Picker active on the page</strong>
            <p>Hover to highlight. Click to select. Escape cancels.</p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="errorBox" role="alert">
          <strong>Action unavailable</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {recordDetection ? (
        <section className="recordDetection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Repeating records</p>
              <h2>
                {recordDetection.candidates.length} candidate group
                {recordDetection.candidates.length === 1 ? "" : "s"}
              </h2>
            </div>
            <span className="modeBadge">
              {recordDetection.mode === "selected-field"
                ? "Field guided"
                : "Automatic"}
            </span>
          </div>

          <p className="recordSummary">
            Inspected {recordDetection.inspectedParents} possible containers.
            {recordDetection.truncated
              ? " Showing the strongest candidates."
              : ""}
          </p>

          {recordDetection.candidates.length ? (
            <div className="recordCandidateList">
              {recordDetection.candidates.map((candidate, index) => (
                <article
                  className="recordCandidateCard"
                  key={`${candidate.recordSelector}-${index}`}
                >
                  <div className="recordCandidateTop">
                    <div>
                      <span className="recordRank">#{index + 1}</span>
                      <strong>{candidate.recordCount} records</strong>
                      <small>
                        {candidate.visibleRecordCount} visible ·{" "}
                        {candidate.source === "selected-field"
                          ? "field-guided"
                          : "automatic"}
                      </small>
                    </div>
                    <span className="confidence">
                      {candidate.confidence}
                    </span>
                  </div>

                  <div className="recordSelector">
                    <span>Record selector</span>
                    <code>{candidate.recordSelector}</code>
                  </div>

                  <div className="recordMetrics">
                    <div>
                      <strong>
                        {formatPercent(candidate.metrics.repeatRatio)}
                      </strong>
                      <span>repeat</span>
                    </div>
                    <div>
                      <strong>
                        {formatPercent(
                          candidate.metrics.structuralConsistency
                        )}
                      </strong>
                      <span>structure</span>
                    </div>
                    <div>
                      <strong>
                        {formatPercent(candidate.metrics.linkCoverage)}
                      </strong>
                      <span>links</span>
                    </div>
                    <div>
                      <strong>
                        {formatPercent(candidate.metrics.imageCoverage)}
                      </strong>
                      <span>images</span>
                    </div>
                  </div>

                  {candidate.diagnostics.length ? (
                    <ul className="diagnostics">
                      {candidate.diagnostics.map((diagnostic) => (
                        <li key={diagnostic}>{diagnostic}</li>
                      ))}
                    </ul>
                  ) : null}

                  {candidate.samples.length ? (
                    <div className="recordSamples">
                      {candidate.samples.slice(0, 3).map((sample) => (
                        <div key={sample.index}>
                          <span>Record {sample.index + 1}</span>
                          <p>{sample.text || "(No visible text)"}</p>
                          {sample.fieldHints.length ? (
                            <small>{sample.fieldHints.join(" · ")}</small>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="recordCardActions">
                    <button
                      className="previewButton"
                      onClick={() =>
                        runRecordPreview(candidate.recordSelector)
                      }
                      type="button"
                    >
                      Preview record boundaries
                    </button>
                    <button
                      className="recipeStartButton"
                      onClick={() => {
                        setInitialRecipe(null);
                        setSelectedRecordGroup(candidate);
                        setError(null);
                      }}
                      type="button"
                    >
                      Build extraction recipe
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="emptyMessage">
              No reliable repeating record group was found. Pick a field from one
              record and try field-guided detection.
            </p>
          )}
        </section>
      ) : null}

      {recordPreview ? (
        <section className="recordPreview" role="status">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Record preview</p>
              <h2>
                {recordPreview.visibleMatchCount} visible of{" "}
                {recordPreview.matchCount} total
              </h2>
            </div>
            <span className="recordPreviewBadge">Previewed</span>
          </div>
          <p>
            Record boundaries are highlighted on the page for about two seconds.
            {recordPreview.truncated
              ? " Highlighting is capped at the first 60 visible records."
              : ""}
          </p>
          {recordPreview.sampleTexts.length ? (
            <div className="samples">
              {recordPreview.sampleTexts.map((sample, index) => (
                <blockquote key={`${index}-${sample}`}>
                  {sample}
                </blockquote>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedRecordGroup ? (
        <RecipeBuilder
          candidate={selectedRecordGroup}
          initialRecipe={initialRecipe}
          onClose={() => {
            setInitialRecipe(null);
            setSelectedRecordGroup(null);
          }}
          pickedElement={pickedElement}
        />
      ) : null}

      {pickedElement ? (
        <section className="pickedResult">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Selected element</p>
              <h2>
                {pickedElement.tagName}
                {pickedElement.text ? ` · ${pickedElement.text.slice(0, 54)}` : ""}
              </h2>
            </div>
            <span className="selectedBadge">Selected</span>
          </div>

          <div className="selectorBlock">
            <div className="selectorHeading">
              <strong>Exact selector</strong>
              <span>
                {pickedElement.selectorMatchCount} match
                {pickedElement.selectorMatchCount === 1 ? "" : "es"}
              </span>
            </div>
            <code>{pickedElement.selector}</code>
            <button
              className="previewButton"
              onClick={() => runPreview(pickedElement.selector)}
              type="button"
            >
              Preview exact selector
            </button>
          </div>

          <div className="selectorBlock">
            <div className="selectorHeading">
              <strong>Generalized selector</strong>
              <span>
                {pickedElement.generalizedMatchCount} match
                {pickedElement.generalizedMatchCount === 1 ? "" : "es"}
              </span>
            </div>
            <code>{pickedElement.generalizedSelector}</code>
            <button
              className="previewButton"
              onClick={() => runPreview(pickedElement.generalizedSelector)}
              type="button"
            >
              Preview all matches
            </button>
          </div>

          {pickedElement.text ? (
            <div className="pickedText">
              <strong>Visible text</strong>
              <p>{pickedElement.text}</p>
            </div>
          ) : null}

          {Object.keys(pickedElement.attributes).length ? (
            <div className="attributeList">
              <strong>Safe attributes</strong>
              {Object.entries(pickedElement.attributes).map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <code>{value}</code>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {preview ? (
        <section className="previewResult" role="status">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Selector preview</p>
              <h2>
                {preview.visibleMatchCount} visible of {preview.matchCount} total
              </h2>
            </div>
            <span className="score">{preview.matchCount}</span>
          </div>
          <p>
            Matching elements are highlighted on the page for a little over two
            seconds.
            {preview.truncated
              ? " Highlighting is capped at the first 50 visible matches."
              : ""}
          </p>
          {preview.sampleTexts.length ? (
            <div className="samples">
              {preview.sampleTexts.map((sample, index) => (
                <blockquote key={`${index}-${sample}`}>{sample}</blockquote>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {inspection ? (
        <>
          <section className="pageSummary">
            <p className="eyebrow">Current page</p>
            <h2>{inspection.title || "Untitled page"}</h2>
            <p className="url">{inspection.url}</p>

            <div className="metricGrid">
              <div>
                <strong>{inspection.counts.visibleElements}</strong>
                <span>visible elements</span>
              </div>
              <div>
                <strong>{inspection.counts.links}</strong>
                <span>links</span>
              </div>
              <div>
                <strong>{inspection.counts.images}</strong>
                <span>images</span>
              </div>
              <div>
                <strong>{inspection.candidates.length}</strong>
                <span>candidate lists</span>
              </div>
            </div>
          </section>

          {topCandidate ? (
            <section className="candidateHighlight">
              <div className="candidateHeader">
                <div>
                  <p className="eyebrow">Best candidate</p>
                  <h2>{topCandidate.selectorHint}</h2>
                </div>
                <span className="score">{topCandidate.score}</span>
              </div>
              <p>
                {topCandidate.repeatedChildren} repeated children ·{" "}
                {formatPercent(topCandidate.repeatRatio)} structural repeat
              </p>
              <div className="samples">
                {topCandidate.sampleTexts.map((sample) => (
                  <blockquote key={sample}>{sample}</blockquote>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
