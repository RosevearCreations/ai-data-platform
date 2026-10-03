import { useMemo, useState } from "react";

import { inspectPage } from "./inspect-page";
import type { PageInspection } from "./types";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function App() {
  const [inspection, setInspection] = useState<PageInspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const topCandidate = useMemo(
    () => inspection?.candidates[0] ?? null,
    [inspection]
  );

  async function analyzeCurrentPage() {
    setPending(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab?.id) {
        throw new Error("No active browser tab is available.");
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: inspectPage
      });

      const result = results[0]?.result as PageInspection | undefined;

      if (!result) {
        throw new Error("The page did not return inspection data.");
      }

      setInspection(result);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "The current page cannot be inspected.";

      setInspection(null);
      setError(
        message.includes("Cannot access")
          ? "Chrome does not allow extensions to inspect this page."
          : message
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="panel">
      <header className="header">
        <div>
          <p className="eyebrow">AI Data Platform</p>
          <h1>Page inspector</h1>
        </div>
        <span className="build">003</span>
      </header>

      <section className="notice" aria-label="Inspection policy">
        <strong>Temporary page access only</strong>
        <p>
          Inspection runs only after we invoke the extension on the active tab.
          It does not read form values, cookies, passwords, or page JavaScript
          state.
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

      <button
        className="primary"
        disabled={pending}
        onClick={analyzeCurrentPage}
        type="button"
      >
        {pending ? "Inspecting…" : "Analyze current page"}
      </button>

      {error ? (
        <section className="errorBox" role="alert">
          <strong>Inspection unavailable</strong>
          <p>{error}</p>
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

          <section>
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Detected structure</p>
                <h2>Candidate record containers</h2>
              </div>
              <span>{inspection.candidates.length}</span>
            </div>

            {inspection.candidates.length ? (
              <div className="candidateList">
                {inspection.candidates.map((candidate) => (
                  <article
                    className="candidateCard"
                    key={`${candidate.selectorHint}-${candidate.signature}`}
                  >
                    <div className="candidateHeader">
                      <div>
                        <strong>{candidate.selectorHint}</strong>
                        <small>{candidate.signature}</small>
                      </div>
                      <span className="score">{candidate.score}</span>
                    </div>
                    <p>
                      {candidate.repeatedChildren} of {candidate.childCount} children
                      repeat · {formatPercent(candidate.repeatRatio)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="emptyMessage">
                No strong repeating record container was detected on this page.
              </p>
            )}
          </section>

          <section className="captureSummary">
            <p className="eyebrow">Snapshot</p>
            <p>
              Captured {inspection.elements.length} bounded visible element
              summaries and {inspection.headings.length} headings.
              {inspection.truncated
                ? " The element sample was intentionally capped."
                : ""}
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
