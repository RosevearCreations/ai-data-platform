import { useMemo, useState } from "react";

import { inspectPage } from "./inspect-page";
import {
  cancelVisualPicker,
  previewSelector,
  startVisualPicker
} from "./visual-picker";
import type {
  PageInspection,
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
        <span className="build">004</span>
      </header>

      <section className="notice" aria-label="Inspection policy">
        <strong>Point, click, verify</strong>
        <p>
          Start the picker, hover the page until the field we want is
          highlighted, then click it. Press Escape or use Cancel to stop without
          selecting anything.
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

      <div className="actionGrid">
        <button
          className="primary"
          disabled={pending || pickerActive}
          onClick={analyzeCurrentPage}
          type="button"
        >
          {pending ? "Inspecting…" : "Analyze page"}
        </button>
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
