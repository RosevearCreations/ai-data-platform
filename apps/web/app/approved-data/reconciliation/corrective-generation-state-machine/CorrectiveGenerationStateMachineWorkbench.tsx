"use client";

import { useState } from "react";

import type {
  CorrectiveGenerationMachinePhase,
  CorrectiveGenerationStateMachineModel
} from "@/lib/corrective-generation-state-machine";

function phaseLabel(phase: CorrectiveGenerationMachinePhase) {
  return phase
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CorrectiveGenerationStateMachineWorkbench({
  initialModel
}: {
  initialModel: CorrectiveGenerationStateMachineModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [message, setMessage] = useState("");

  async function refresh() {
    setMessage("Refreshing corrective-generation state machine…");
    try {
      const response = await fetch(
        "/api/approved-data/reconciliation/corrective-generation-state-machine",
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "State-machine refresh failed.");
      setModel(payload as CorrectiveGenerationStateMachineModel);
      setMessage("Corrective-generation state machine refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "State-machine refresh failed.");
    }
  }

  return (
    <>
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Canonical lifecycle</p>
            <h2>State-machine standing</h2>
          </div>
          <button className="secondaryButton" type="button" onClick={refresh}>Refresh</button>
        </div>
        <div className="metricGrid">
          <article className="metricCard"><strong>{model.summary.cycles}</strong><span>Generic successor cycles</span></article>
          <article className="metricCard"><strong>{model.summary.activeCycles}</strong><span>Active cycles</span></article>
          <article className="metricCard"><strong>{model.summary.completedCycles}</strong><span>Completed / monitored</span></article>
          <article className="metricCard"><strong>{model.summary.recurrentCycles}</strong><span>Governed recurrences</span></article>
          <article className="metricCard"><strong>{model.summary.criticalViolations}</strong><span>Critical invariant violations</span></article>
          <article className="metricCard"><strong>{model.summary.warnings}</strong><span>Invariant warnings</span></article>
        </div>
        <p className="muted">
          Build 115 derives lifecycle phase from durable evidence. The enforcement layer rejects
          invalid ancestry or illegal terminal-state reversals before they can be committed.
        </p>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="panel">
        <h2>Generic corrective-generation cycles</h2>
        {model.cycles.length === 0 ? (
          <p className="muted">No generic successor cycles are registered yet.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Case</th>
                  <th>Generation</th>
                  <th>Source</th>
                  <th>Phase</th>
                  <th>Case</th>
                  <th>Plan</th>
                  <th>Delivery</th>
                  <th>Reconciliation</th>
                  <th>Monitor</th>
                  <th>Next</th>
                </tr>
              </thead>
              <tbody>
                {model.cycles.map((item) => (
                  <tr key={item.workspaceId + ":" + item.successorSourceId}>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber}</td>
                    <td>{item.sourceRecurrenceKind}</td>
                    <td>{phaseLabel(item.phase)}</td>
                    <td>{item.caseStatus}</td>
                    <td>{item.planStatus ?? "—"}</td>
                    <td>
                      {item.deliveryStatus ?? "—"}
                      {item.deliveryAttemptCount != null
                        ? <span className="muted"> · attempt {item.deliveryAttemptCount}</span>
                        : null}
                    </td>
                    <td>{item.reconciliationStatus ?? "—"}</td>
                    <td>{item.regressionStatus ?? (item.reclosureId ? "awaiting check" : "—")}</td>
                    <td>{item.nextSuccessorSourceId ? "G" + (item.generationNumber + 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Cross-generation invariant audit</h2>
        <p className="muted">
          Critical findings indicate structural identity or ancestry problems. Warnings identify
          case-state drift that should be reconciled with the latest generation lifecycle.
        </p>
        {model.violations.length === 0 ? (
          <p className="muted">No cross-generation invariant violations detected.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Workspace</th>
                  <th>Case</th>
                  <th>Generation</th>
                  <th>Invariant</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {model.violations.map((item, index) => (
                  <tr key={item.workspaceId + ":" + item.caseId + ":" + item.code + ":" + index}>
                    <td>{item.severity}</td>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber}</td>
                    <td><code>{item.code}</code></td>
                    <td>{item.detail}</td>
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
