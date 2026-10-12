"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type {
  CollectionRunConsoleModel,
  CollectionRunSourceModel
} from "@/lib/collection-runs";

import { HelpInfo } from "../help/HelpInfo";

async function jsonRequest(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Collection-run request failed."
    );
  }
  return payload;
}

function downloadReport(source: CollectionRunSourceModel) {
  const report = {
    schema: "ai-data-platform.collection-run-report.v1",
    generatedAt: new Date().toISOString(),
    workspace: {
      id: source.workspaceId,
      name: source.workspaceName,
      role: source.role
    },
    project: {
      id: source.projectId,
      name: source.projectName,
      status: source.projectStatus
    },
    source: {
      id: source.sourceId,
      name: source.displayName,
      url: source.sourceUrl,
      origin: source.sourceOrigin,
      method: source.collectionMethod,
      status: source.sourceStatus,
      readiness: source.readiness,
      savedScraperId: source.savedScraperId,
      sourcePolicyId: source.sourcePolicyId,
      policyPin: source.policyPin
    },
    localChrome: source.local,
    browserless: source.remote
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "collection-run-" +
    source.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    ".json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusLabel(status: string) {
  return status.replace("-", " ");
}

export function CollectionRunConsole({
  initialModel
}: {
  initialModel: CollectionRunConsoleModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const activeRemoteRuns = model.totals.activeRemoteRuns;

  async function refresh() {
    const next = (await jsonRequest("/api/collection-runs", "GET")) as CollectionRunConsoleModel;
    setModel(next);
  }

  useEffect(() => {
    if (!activeRemoteRuns) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [activeRemoteRuns]);

  const workspaceNames = useMemo(
    () => [...new Set(model.sources.map((source) => source.workspaceName))],
    [model.sources]
  );
  const projectNames = useMemo(
    () =>
      [...new Set(
        model.sources
          .filter((source) => !workspaceFilter || source.workspaceName === workspaceFilter)
          .map((source) => source.projectName)
      )],
    [model.sources, workspaceFilter]
  );
  const visible = model.sources.filter(
    (source) =>
      (!workspaceFilter || source.workspaceName === workspaceFilter) &&
      (!projectFilter || source.projectName === projectFilter)
  );

  async function runBrowserless(source: CollectionRunSourceModel, retry = false) {
    if (!source.policyPin) return;
    const key = (retry ? "retry-" : "run-") + source.sourceId;
    setBusy(key);
    setMessage("");
    try {
      await jsonRequest("/api/remote-execution/pilot", "POST", {
        workspaceId: source.workspaceId,
        sourceUrl: source.sourceUrl,
        policyId: source.policyPin.id,
        policyRevision: source.policyPin.revision,
        policyFingerprint: source.policyPin.fingerprint,
        savedScraperId: source.savedScraperId
      });
      setMessage(
        retry
          ? "Failed one-page Browserless attempt retried under the same current policy gate."
          : "Browserless run completed. Durable evidence has been refreshed."
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browserless run failed.");
      await refresh().catch(() => undefined);
    } finally {
      setBusy("");
    }
  }

  async function cancel(source: CollectionRunSourceModel) {
    if (!source.remote.activeJobId) return;
    setBusy("cancel-" + source.sourceId);
    setMessage("");
    try {
      await jsonRequest("/api/collection-runs", "PATCH", {
        action: "cancel",
        workspaceId: source.workspaceId,
        jobId: source.remote.activeJobId
      });
      setMessage("Cancellation requested. The active Browserless worker will stop fail-closed.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cancellation failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="runConsoleSummary" aria-labelledby="run-summary">
        <div className="sectionHeading">
          <p className="eyebrow">Live evidence</p>
          <h2 id="run-summary">Run status</h2>
          <HelpInfo topic="collection-runs-evidence" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.sources}</strong><span>project sources</span></article>
          <article><strong>{model.totals.activeRemoteRuns}</strong><span>active remote runs</span></article>
          <article><strong>{model.totals.localAttempts}</strong><span>synced Chrome attempts</span></article>
          <article><strong>{model.totals.remoteAttempts}</strong><span>Browserless attempts</span></article>
          <article><strong>{model.totals.rowsCollected}</strong><span>recorded rows</span></article>
          <article><strong>{model.totals.providerUnits}</strong><span>recorded provider units</span></article>
        </div>
        <p className="runRuntimeState">
          Browserless: {model.runtime.browserlessReady ? "ready" : "fail-closed"}
          {" · "}execution {model.runtime.browserlessExecutionEnabled ? "enabled" : "disabled"}
          {" · "}token {model.runtime.browserlessTokenConfigured ? "configured" : "missing"}
          {" · "}global kill switch {model.runtime.globalKillSwitchActive ? "ON" : "off"}
        </p>
      </section>

      <section className="runConsoleFilters" aria-label="Run console filters">
        <label>
          Workspace
          <select
            value={workspaceFilter}
            onChange={(event) => {
              setWorkspaceFilter(event.target.value);
              setProjectFilter("");
            }}
          >
            <option value="">All authorized workspaces</option>
            {workspaceNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>
          Project
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">All projects</option>
            {projectNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <button className="secondaryButton" type="button" onClick={() => void refresh()}>
          Refresh evidence
        </button>
      </section>

      {message ? <p className="runConsoleMessage">{message}</p> : null}

      <section className="runSourceList">
        {visible.length ? visible.map((source) => {
          const remoteBusy =
            busy === "run-" + source.sourceId || busy === "retry-" + source.sourceId;
          return (
            <article className="runSourceCard" key={source.projectId + ":" + source.sourceId}>
              <header>
                <div>
                  <p className="eyebrow">{source.workspaceName} · {source.projectName}</p>
                  <h3>{source.displayName}</h3>
                  <p className="runSourceUrl">{source.sourceUrl}</p>
                </div>
                <div className="runBadges">
                  <span className="badge">{source.readiness}</span>
                  <span className="badge">{source.collectionMethod}</span>
                </div>
              </header>

              <div className="runModeGrid">
                <section className="runModePanel">
                  <div className="sectionHeading">
                    <p className="eyebrow">Local Chrome</p>
                    <h3>Interactive extraction</h3>
                  </div>
                  <p>
                    {source.local.available
                      ? "The synchronized scheduled job is ready for an operator-present Chrome run."
                      : "Local Chrome is not ready yet."}
                  </p>
                  <div className="runEvidenceRow">
                    <span>{source.local.successes} succeeded</span>
                    <span>{source.local.failures} failed</span>
                    <span>{source.local.rowsCollected} rows</span>
                    <span>{source.local.due ? "due" : source.local.enabled ? "enabled" : "not enabled"}</span>
                  </div>
                  {source.local.blockers.length ? (
                    <ul className="runBlockers">
                      {source.local.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  ) : (
                    <p className="runGuidance">
                      Open this source in Chrome, open the AI Data Platform extension → Scheduled jobs,
                      and choose Run now. This web console observes the synchronized result.
                    </p>
                  )}
                  <div className="heroActions">
                    <Link className="secondaryButton" href="/recipe-builder">Review recipe</Link>
                    <Link className="secondaryButton" href="/intelligence">Synced evidence</Link>
                  </div>
                </section>

                <section className="runModePanel">
                  <div className="sectionHeading">
                    <p className="eyebrow">Browserless</p>
                    <h3>Controlled one-page run</h3>
                  </div>
                  <p>
                    {source.remote.activeJobId
                      ? "Run active; evidence refreshes automatically."
                      : source.remote.runnable
                        ? "All existing Browserless gates are currently satisfied."
                        : "Browserless remains fail-closed."}
                  </p>
                  <div className="runEvidenceRow">
                    <span>{source.remote.pagesAttempted} attempted</span>
                    <span>{source.remote.pagesSucceeded} succeeded</span>
                    <span>{source.remote.pagesFailed} failed</span>
                    <span>{source.remote.providerUnits} units</span>
                  </div>
                  {source.remote.blockers.length ? (
                    <ul className="runBlockers">
                      {source.remote.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  ) : null}
                  <div className="heroActions">
                    {source.remote.activeJobId ? (
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void cancel(source)}
                      >
                        {busy === "cancel-" + source.sourceId ? "Stopping…" : "Stop / cancel"}
                      </button>
                    ) : (
                      <button
                        className="primary"
                        type="button"
                        disabled={!source.remote.runnable || Boolean(busy)}
                        onClick={() => void runBrowserless(source)}
                      >
                        {remoteBusy ? "Running…" : "Run Browserless"}
                      </button>
                    )}
                    {source.remote.retryable ? (
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void runBrowserless(source, true)}
                      >
                        Retry failed page
                      </button>
                    ) : null}
                    <Link className="secondaryButton" href="/remote-execution">Run controls</Link>
                  </div>
                </section>
              </div>

              <section className="runHistory">
                <div className="sectionHeading">
                  <p className="eyebrow">Evidence trail</p>
                  <h3>Recent attempts</h3>
                </div>
                {[...source.remote.attempts, ...source.local.attempts]
                  .sort((a, b) =>
                    Date.parse(b.finishedAt ?? b.startedAt ?? "1970-01-01") -
                    Date.parse(a.finishedAt ?? a.startedAt ?? "1970-01-01")
                  )
                  .slice(0, 8)
                  .map((attempt) => (
                    <div className="runAttempt" key={attempt.mode + ":" + attempt.id}>
                      <strong>{attempt.mode === "browserless" ? "Browserless" : "Chrome"}</strong>
                      <span>{statusLabel(attempt.status)}</span>
                      <span>{attempt.recordCount} rows</span>
                      <span>{attempt.providerUnits ? attempt.providerUnits + " units" : "local"}</span>
                      <small>{attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleString() : "in progress"}</small>
                      {attempt.error ? <small className="runError">{attempt.error}</small> : null}
                    </div>
                  ))}
                {!source.remote.attempts.length && !source.local.attempts.length ? (
                  <p className="emptyState">No synchronized run evidence for this source yet.</p>
                ) : null}
              </section>

              <div className="heroActions">
                <button className="secondaryButton" type="button" onClick={() => downloadReport(source)}>
                  Download run report
                </button>
                {source.remote.latestError ? <span>Latest remote error: {source.remote.latestError}</span> : null}
              </div>
            </article>
          );
        }) : <div className="emptyState">No project sources match the current filters.</div>}
      </section>
    </>
  );
}
