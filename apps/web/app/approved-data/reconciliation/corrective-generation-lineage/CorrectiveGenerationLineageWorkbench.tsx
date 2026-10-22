"use client";

import { useState } from "react";

import type { CorrectiveGenerationLineageModel } from "@/lib/corrective-generation-lineage";

export function CorrectiveGenerationLineageWorkbench({
  initialModel
}: {
  initialModel: CorrectiveGenerationLineageModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [message, setMessage] = useState("");

  async function refresh() {
    setMessage("Refreshing lineage registry…");
    try {
      const response = await fetch("/api/approved-data/reconciliation/corrective-generation-lineage", {
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Registry refresh failed.");
      setModel(payload as CorrectiveGenerationLineageModel);
      setMessage("Lineage registry refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registry refresh failed.");
    }
  }

  return (
    <>
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Generic corrective-generation model</p>
            <h2>Registry summary</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={refresh}>Refresh</button>
        </div>
        <div className="metricGrid">
          <article className="metricCard"><strong>{model.summary.registeredGenerations}</strong><span>Registered generations</span></article>
          <article className="metricCard"><strong>{model.summary.reclosedGenerations}</strong><span>Re-closed</span></article>
          <article className="metricCard"><strong>{model.summary.recurredGenerations}</strong><span>Recurred</span></article>
          <article className="metricCard"><strong>{model.summary.readySuccessors}</strong><span>Successors ready for planning</span></article>
          <article className="metricCard"><strong>{model.summary.highestGeneration}</strong><span>Highest completed generation</span></article>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="panel">
        <h2>Corrective-generation lineage</h2>
        {model.generations.length === 0 ? (
          <p className="muted">No completed corrective generations are registered yet.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th><th>Case</th><th>Generation</th><th>State</th>
                  <th>Origin</th><th>Plan</th><th>Delivery package</th><th>Re-closure</th>
                </tr>
              </thead>
              <tbody>
                {model.generations.map((item) => (
                  <tr key={item.workspaceId + ":" + item.generationLineageId}>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber} · {item.generationLabel}</td>
                    <td>{item.generationState}</td>
                    <td>{item.sourceKind}</td>
                    <td><code>{item.planId}</code></td>
                    <td><code>{item.packageId}</code></td>
                    <td><code>{item.reclosureId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Successor generation abstraction</h2>
        <p className="muted">
          These rows are planning inputs only. Build 109 does not execute a delivery or rewrite historical evidence.
        </p>
        {model.successors.length === 0 ? (
          <p className="muted">No governed successor recurrence is currently ready for planning.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th><th>Case</th><th>Next generation</th>
                  <th>Source recurrence</th><th>Status</th><th>Predecessor lineage</th>
                </tr>
              </thead>
              <tbody>
                {model.successors.map((item) => (
                  <tr key={item.workspaceId + ":" + item.successorSourceId}>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber}</td>
                    <td><code>{item.sourceRecurrenceId}</code></td>
                    <td>{item.status}</td>
                    <td><code>{item.predecessorGenerationLineageId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
