"use client";

import { useMemo, useState } from "react";

import type { CorrectiveGenerationOperationsModel } from "@/lib/corrective-generation-operations";

type Filters = {
  workspaceId: string;
  caseId: string;
  target: string;
  generation: string;
  phase: string;
  severity: string;
  eventType: string;
};

const emptyFilters: Filters = {
  workspaceId: "",
  caseId: "",
  target: "",
  generation: "",
  phase: "",
  severity: "",
  eventType: ""
};

function pretty(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function filterModel(model: CorrectiveGenerationOperationsModel, filters: Filters) {
  const generation = filters.generation ? Number(filters.generation) : null;
  const cycles = model.stateMachine.cycles.filter(
    (item) =>
      (!filters.workspaceId || item.workspaceId === filters.workspaceId) &&
      (!filters.caseId || item.caseId === filters.caseId) &&
      (!filters.target || item.target === filters.target) &&
      (generation == null || item.generationNumber === generation) &&
      (!filters.phase || item.phase === filters.phase)
  );
  const cycleKeys = new Set(
    cycles.map(
      (item) =>
        item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
    )
  );
  const violations = model.stateMachine.violations.filter(
    (item) =>
      (!filters.workspaceId || item.workspaceId === filters.workspaceId) &&
      (!filters.caseId || item.caseId === filters.caseId) &&
      (!filters.target || item.target === filters.target) &&
      (generation == null || item.generationNumber === generation) &&
      (!filters.severity || item.severity === filters.severity) &&
      (!filters.phase ||
        cycleKeys.has(
          item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
        ))
  );
  const timeline = model.timeline.filter(
    (item) =>
      (!filters.workspaceId || item.workspaceId === filters.workspaceId) &&
      (!filters.caseId || item.caseId === filters.caseId) &&
      (!filters.target || item.target === filters.target) &&
      (generation == null || item.generationNumber === generation) &&
      (!filters.eventType || item.eventType === filters.eventType) &&
      (!filters.phase ||
        cycleKeys.has(
          item.workspaceId + ":" + item.caseId + ":" + String(item.generationNumber)
        ))
  );
  return { cycles, violations, timeline };
}

export function CorrectiveGenerationOperationsWorkbench({
  initialModel
}: {
  initialModel: CorrectiveGenerationOperationsModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => filterModel(model, filters), [model, filters]);
  const cases = useMemo(
    () =>
      model.cases.filter(
        (item) =>
          (!filters.workspaceId || item.workspaceId === filters.workspaceId) &&
          (!filters.target || item.target === filters.target)
      ),
    [model.cases, filters.workspaceId, filters.target]
  );

  const generations = useMemo(
    () =>
      [...new Set(model.timeline.map((item) => item.generationNumber))].sort(
        (left, right) => left - right
      ),
    [model.timeline]
  );

  const phases = useMemo(
    () =>
      [...new Set(model.stateMachine.cycles.map((item) => item.phase))].sort(),
    [model.stateMachine.cycles]
  );

  const eventTypes = useMemo(
    () => [...new Set(model.timeline.map((item) => item.eventType))].sort(),
    [model.timeline]
  );

  const exportQuery = useMemo(() => {
    const query = new URLSearchParams();
    if (filters.workspaceId) query.set("workspaceId", filters.workspaceId);
    if (filters.caseId) query.set("caseId", filters.caseId);
    if (filters.target) query.set("target", filters.target);
    if (filters.generation) query.set("generation", filters.generation);
    if (filters.phase) query.set("phase", filters.phase);
    if (filters.severity) query.set("severity", filters.severity);
    if (filters.eventType) query.set("eventType", filters.eventType);
    return query;
  }, [filters]);

  async function refresh() {
    setMessage("Refreshing corrective-generation operations evidence…");
    try {
      const response = await fetch(
        "/api/approved-data/reconciliation/corrective-generation-operations",
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Operations refresh failed.");
      setModel(payload as CorrectiveGenerationOperationsModel);
      setMessage("Corrective-generation operations evidence refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operations refresh failed.");
    }
  }

  function exportHref(format: "json" | "csv") {
    const query = new URLSearchParams(exportQuery);
    query.set("format", format);
    return (
      "/api/approved-data/reconciliation/corrective-generation-operations/export?" +
      query.toString()
    );
  }

  return (
    <>
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Operational evidence</p>
            <h2>Corrective-generation console</h2>
          </div>
          <div className="heroActions">
            <button className="secondaryButton" type="button" onClick={refresh}>
              Refresh
            </button>
            <a className="secondaryButton" href={exportHref("json")}>Export JSON audit</a>
            <a className="secondaryButton" href={exportHref("csv")}>Export CSV audit</a>
          </div>
        </div>

        <div className="metricGrid">
          <article className="metricCard"><strong>{model.summary.workspaces}</strong><span>Workspaces</span></article>
          <article className="metricCard"><strong>{model.summary.cases}</strong><span>Cases</span></article>
          <article className="metricCard"><strong>{filtered.cycles.length}</strong><span>Filtered cycles</span></article>
          <article className="metricCard"><strong>{filtered.timeline.length}</strong><span>Timeline events</span></article>
          <article className="metricCard"><strong>{filtered.violations.filter((item) => item.severity === "critical").length}</strong><span>Critical findings</span></article>
          <article className="metricCard"><strong>{filtered.violations.filter((item) => item.severity === "warning").length}</strong><span>Warnings</span></article>
        </div>

        <div className="formGrid">
          <label>
            Workspace
            <select
              value={filters.workspaceId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  workspaceId: event.target.value,
                  caseId: ""
                }))
              }
            >
              <option value="">All workspaces</option>
              {model.workspaces.map((item) => (
                <option key={item.workspaceId} value={item.workspaceId}>
                  {item.workspaceName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Case
            <select
              value={filters.caseId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, caseId: event.target.value }))
              }
            >
              <option value="">All cases</option>
              {cases.map((item) => (
                <option key={item.workspaceId + ":" + item.caseId} value={item.caseId}>
                  {item.caseId} · G{item.latestGenerationNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target
            <select
              value={filters.target}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  target: event.target.value,
                  caseId: ""
                }))
              }
            >
              <option value="">All targets</option>
              <option value="rosie-dazzlers">Rosie Dazzlers</option>
              <option value="devil-n-dove">Devil n Dove</option>
            </select>
          </label>
          <label>
            Generation
            <select
              value={filters.generation}
              onChange={(event) =>
                setFilters((current) => ({ ...current, generation: event.target.value }))
              }
            >
              <option value="">All generations</option>
              {generations.map((generation) => (
                <option key={generation} value={generation}>G{generation}</option>
              ))}
            </select>
          </label>
          <label>
            Phase
            <select
              value={filters.phase}
              onChange={(event) =>
                setFilters((current) => ({ ...current, phase: event.target.value }))
              }
            >
              <option value="">All phases</option>
              {phases.map((phase) => (
                <option key={phase} value={phase}>{pretty(phase)}</option>
              ))}
            </select>
          </label>
          <label>
            Finding severity
            <select
              value={filters.severity}
              onChange={(event) =>
                setFilters((current) => ({ ...current, severity: event.target.value }))
              }
            >
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </label>
          <label>
            Timeline event
            <select
              value={filters.eventType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, eventType: event.target.value }))
              }
            >
              <option value="">All event types</option>
              {eventTypes.map((eventType) => (
                <option key={eventType} value={eventType}>{pretty(eventType)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="heroActions">
          <button className="secondaryButton" type="button" onClick={() => setFilters(emptyFilters)}>
            Clear filters
          </button>
        </div>
        <p className="muted">
          JSON and CSV exports apply these same filters. JSON includes the full structured
          evidence package; CSV flattens cycles, findings and timeline rows. Both carry the same
          SHA-256 audit digest in their content or response headers.
        </p>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="panel">
        <h2>Current cycle standing</h2>
        {filtered.cycles.length === 0 ? (
          <p className="muted">No cycles match the current filters.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Case</th>
                  <th>Generation</th>
                  <th>Phase</th>
                  <th>Case</th>
                  <th>Plan</th>
                  <th>Delivery</th>
                  <th>Reconciliation</th>
                  <th>Monitor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.cycles.map((item) => (
                  <tr key={item.workspaceId + ":" + item.successorSourceId}>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber}</td>
                    <td>{pretty(item.phase)}</td>
                    <td>{item.caseStatus}</td>
                    <td>{item.planStatus ?? "—"}</td>
                    <td>{item.deliveryStatus ?? "—"}</td>
                    <td>{item.reconciliationStatus ?? "—"}</td>
                    <td>{item.regressionStatus ?? (item.reclosureId ? "awaiting check" : "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Invariant findings</h2>
        {filtered.violations.length === 0 ? (
          <p className="muted">No invariant findings match the current filters.</p>
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
                {filtered.violations.map((item, index) => (
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

      <section className="panel">
        <h2>Evidence timeline</h2>
        <p className="muted">Newest evidence is shown first. Export retains this exact evidence ordering.</p>
        {filtered.timeline.length === 0 ? (
          <p className="muted">No timeline events match the current filters.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Workspace</th>
                  <th>Case</th>
                  <th>Generation</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.timeline.map((item) => (
                  <tr key={item.eventType + ":" + item.entityId + ":" + item.occurredAt}>
                    <td>{new Date(item.occurredAt).toLocaleString()}</td>
                    <td>{item.workspaceName}</td>
                    <td><code>{item.caseId}</code></td>
                    <td>G{item.generationNumber}</td>
                    <td>
                      <strong>{item.title}</strong>
                      <div className="muted">{item.detail}</div>
                    </td>
                    <td>{item.status}</td>
                    <td>
                      <code>{item.entityId}</code>
                      {item.evidenceFingerprint ? (
                        <div className="muted"><code>{item.evidenceFingerprint}</code></div>
                      ) : null}
                    </td>
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
