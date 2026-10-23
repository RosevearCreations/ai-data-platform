"use client";

import { useState } from "react";

import type {
  LegacyCorrectiveGenerationCandidate,
  LegacyCorrectiveGenerationCompatibilityModel
} from "@/lib/legacy-corrective-generation-compatibility";

function statusText(item: LegacyCorrectiveGenerationCandidate) {
  switch (item.status) {
    case "compatible":
      return "Compatible";
    case "missing-lineage":
      return "Missing lineage";
    case "late-recurrence-unbridged":
      return "Late recurrence needs bridge";
    case "missing-successor":
      return "G3 successor missing";
    case "conflict":
      return "Evidence conflict";
  }
}

export function LegacyCorrectiveGenerationCompatibilityWorkbench({
  initialModel
}: {
  initialModel: LegacyCorrectiveGenerationCompatibilityModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function refresh() {
    setMessage("Refreshing legacy compatibility audit…");
    try {
      const response = await fetch(
        "/api/approved-data/reconciliation/legacy-corrective-generation-compatibility",
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Compatibility refresh failed.");
      setModel(payload as LegacyCorrectiveGenerationCompatibilityModel);
      setMessage("Legacy compatibility audit refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Compatibility refresh failed.");
    }
  }

  async function bridge(item: LegacyCorrectiveGenerationCandidate) {
    const key = item.workspaceId + ":" + item.planId;
    setBusy(key);
    setMessage("Bridging exact legacy evidence into the immutable lineage model…");
    try {
      const response = await fetch(
        "/api/approved-data/reconciliation/legacy-corrective-generation-compatibility",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "bridge-legacy-corrective-generation",
            workspaceId: item.workspaceId,
            sourceKind: item.sourceKind,
            planId: item.planId
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Legacy bridge failed.");
      setModel(payload.model as LegacyCorrectiveGenerationCompatibilityModel);
      const action = typeof payload?.bridgeResult?.action === "string"
        ? payload.bridgeResult.action
        : "verified";
      setMessage("Legacy compatibility bridge complete: " + action + ".");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Legacy bridge failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Immutable compatibility audit</p>
            <h2>Legacy lineage standing</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={refresh}>Refresh</button>
        </div>
        <div className="metricGrid">
          <article className="metricCard"><strong>{model.summary.total}</strong><span>Completed legacy generations</span></article>
          <article className="metricCard"><strong>{model.summary.compatible}</strong><span>Compatible</span></article>
          <article className="metricCard"><strong>{model.summary.missingLineage}</strong><span>Missing lineage</span></article>
          <article className="metricCard"><strong>{model.summary.lateRecurrenceUnbridged}</strong><span>Late recurrence bridges</span></article>
          <article className="metricCard"><strong>{model.summary.missingSuccessor}</strong><span>Missing G3 successors</span></article>
          <article className="metricCard"><strong>{model.summary.conflicts}</strong><span>Conflicts</span></article>
          <article className="metricCard"><strong>{model.summary.bridgeable}</strong><span>Bridgeable now</span></article>
        </div>
        <p className="muted">
          Build 114 never updates or deletes Build 109 registry rows. A recurrence discovered after
          registration is attached as a separate append-only terminal event and must match the exact
          recurrence/regression fingerprints before unified planning can consume it.
        </p>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="panel">
        <h2>Legacy G1/G2 compatibility ledger</h2>
        {model.candidates.length === 0 ? (
          <p className="muted">No completed legacy corrective generations are available to audit.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Case</th>
                  <th>Generation</th>
                  <th>Legacy source</th>
                  <th>Registered state</th>
                  <th>Terminal recurrence</th>
                  <th>G3 successor</th>
                  <th>Standing</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {model.candidates.map((item) => {
                  const key = item.workspaceId + ":" + item.planId;
                  return (
                    <tr key={key}>
                      <td>{item.workspaceName}</td>
                      <td><code>{item.caseId}</code></td>
                      <td>G{item.generationNumber}</td>
                      <td>{item.sourceKind}</td>
                      <td>{item.registeredState ?? "not registered"}</td>
                      <td>{item.terminalRecurrenceId ? <code>{item.terminalRecurrenceId}</code> : "none"}</td>
                      <td>{item.successorSourceId ? <code>{item.successorSourceId}</code> : "none"}</td>
                      <td>{statusText(item)}</td>
                      <td>
                        {item.canBridge ? (
                          <button
                            className="secondaryButton"
                            type="button"
                            disabled={busy === key}
                            onClick={() => bridge(item)}
                          >
                            {busy === key ? "Bridging…" : "Bridge evidence"}
                          </button>
                        ) : item.status === "conflict" ? (
                          <span className="muted">Manual review required</span>
                        ) : (
                          <span className="muted">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
