"use client";

import { useMemo, useState } from "react";

import type {
  ReopenedExceptionPlanningModel,
  ReopenedExceptionRetriage,
  SuccessorCorrectiveDeliveryPlan
} from "@/lib/reopened-exception-planning";

type Draft = Pick<
  ReopenedExceptionRetriage,
  "classification" | "severity" | "resolutionIntent" | "summary" | "investigationNote"
>;

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch("/api/approved-data/reconciliation/reopened-planning", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Reopened exception planning request failed."
    );
  }
  return payload as Record<string, unknown>;
}

export function ReopenedExceptionPlanningWorkbench({
  initialModel
}: {
  initialModel: ReopenedExceptionPlanningModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const retriageByReopen = useMemo(
    () => new Map(model.retriage.map((item) => [item.workspaceId + ":" + item.reopenId, item])),
    [model.retriage]
  );
  const regressionById = useMemo(
    () => new Map(model.regression.checks.map((item) => [item.workspaceId + ":" + item.regressionCheckId, item])),
    [model.regression.checks]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) setModel(payload.model as unknown as ReopenedExceptionPlanningModel);
  }
  function draftFor(item: ReopenedExceptionRetriage): Draft {
    return drafts[item.retriageId] ?? {
      classification: item.classification,
      severity: item.severity,
      resolutionIntent: item.resolutionIntent,
      summary: item.summary,
      investigationNote: item.investigationNote
    };
  }
  function patchDraft(item: ReopenedExceptionRetriage, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [item.retriageId]: { ...draftFor(item), ...patch } }));
  }

  async function createRetriage(workspaceId: string, reopenId: string) {
    const key = "retriage:" + reopenId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", { action: "create-retriage", workspaceId, reopenId });
      applyModel(payload);
      setMessage("Reopened exception re-triage cycle created from immutable Build 056 evidence.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-triage creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(item: ReopenedExceptionRetriage, status: "open" | "dismissed" = "open") {
    const key = "save:" + item.retriageId;
    const draft = draftFor(item);
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "update-retriage",
        workspaceId: item.workspaceId,
        retriageId: item.retriageId,
        status,
        ...draft
      });
      setModel(payload as unknown as ReopenedExceptionPlanningModel);
      setMessage(status === "dismissed" ? "Re-triage dismissed without downstream mutation." : "Re-triage saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-triage update failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: ReopenedExceptionRetriage) {
    const key = "plan:" + item.retriageId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "create-successor-plan",
        workspaceId: item.workspaceId,
        retriageId: item.retriageId,
        rationale: rationales[item.retriageId] ?? ""
      });
      applyModel(payload);
      setMessage("Successor corrective plan frozen from the regressed corrective-package scope.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Successor planning failed.");
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(plan: SuccessorCorrectiveDeliveryPlan, decision: "approved" | "rejected" | "withdrawn") {
    const key = "review:" + plan.successorPlanId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "review-successor-plan",
        workspaceId: plan.workspaceId,
        successorPlanId: plan.successorPlanId,
        decision,
        reviewNote: reviewNotes[plan.successorPlanId] ?? ""
      });
      setModel(payload as unknown as ReopenedExceptionPlanningModel);
      setMessage("Successor plan review recorded: " + decision + ".");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan review failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Reopened lifecycle</p>
            <h2>Successor planning readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.regression.reopens.length}</strong><span>governed reopens</span></article>
          <article><strong>{model.totals.reopenedWithoutRetriage}</strong><span>await re-triage</span></article>
          <article><strong>{model.totals.activeRetriage}</strong><span>active re-triage cycles</span></article>
          <article><strong>{model.totals.proposedPlans}</strong><span>proposed successor plans</span></article>
          <article><strong>{model.totals.approvedPlans}</strong><span>approved successor plans</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A reopen starts a new evidence cycle</strong>
        <p>
          Build 057 never rewrites the predecessor plan or closure and never calls a downstream consumer.
          Successor scope is limited to fields proven regressed by the Build 056 read-back and values frozen
          in the accepted predecessor corrective package.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Build 056 handoff</p><h2>Re-triage reopened exceptions</h2></div>
        </div>
        <div className="publicationList">
          {model.regression.reopens.map((reopen) => {
            const cycle = retriageByReopen.get(reopen.workspaceId + ":" + reopen.reopenId);
            const regression = regressionById.get(reopen.workspaceId + ":" + reopen.regressionCheckId);
            if (!cycle) {
              return (
                <article className="publicationCard correctiveCard" key={reopen.reopenId}>
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">reopened</span>
                      <h3>{reopen.target} · {reopen.caseId}</h3>
                      <p>{reopen.reopenReason}</p>
                    </div>
                    <span className="badge">{regression?.status ?? "regressed"}</span>
                  </header>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !reopen.canManage}
                    onClick={() => void createRetriage(reopen.workspaceId, reopen.reopenId)}
                  >
                    {busy === "retriage:" + reopen.reopenId ? "Creating re-triage…" : "Start reopened re-triage"}
                  </button>
                </article>
              );
            }

            const draft = draftFor(cycle);
            const locked = cycle.status === "approved" || cycle.status === "dismissed";
            return (
              <article className="publicationCard correctiveCard" key={cycle.retriageId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (cycle.status === "approved" ? "published" : "withdrawn")}>
                      {cycle.status}
                    </span>
                    <h3>{cycle.target} · {cycle.caseId}</h3>
                    <p>{cycle.workspaceName}</p>
                  </div>
                  <span className="badge">{cycle.affectedRecordCount} affected</span>
                </header>
                <dl className="publicationEvidence">
                  <div><dt>Reopen</dt><dd>{cycle.reopenId}</dd></div>
                  <div><dt>Regression fingerprint</dt><dd>{cycle.regressionFingerprint}</dd></div>
                  <div><dt>Keys</dt><dd>{cycle.affectedIntegrationKeys.join(", ")}</dd></div>
                  <div><dt>Fields</dt><dd>{cycle.affectedFields.join(", ")}</dd></div>
                </dl>
                <div className="correctiveAction">
                  <label>
                    Classification
                    <select
                      disabled={locked}
                      value={draft.classification}
                      onChange={(event) => patchDraft(cycle, { classification: event.target.value as Draft["classification"] })}
                    >
                      {["consumer-drift","consumer-missing","expected-change","source-superseded","mixed","unknown"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Severity
                    <select
                      disabled={locked}
                      value={draft.severity}
                      onChange={(event) => patchDraft(cycle, { severity: event.target.value as Draft["severity"] })}
                    >
                      {["low","medium","high","critical"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Resolution intent
                    <select
                      disabled={locked}
                      value={draft.resolutionIntent}
                      onChange={(event) => patchDraft(cycle, { resolutionIntent: event.target.value as Draft["resolutionIntent"] })}
                    >
                      {["investigate","accept-drift","plan-correction","no-action"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Summary
                    <textarea disabled={locked} value={draft.summary} onChange={(event) => patchDraft(cycle, { summary: event.target.value })} />
                  </label>
                  <label>
                    Investigation note
                    <textarea disabled={locked} value={draft.investigationNote} onChange={(event) => patchDraft(cycle, { investigationNote: event.target.value })} />
                  </label>
                  {!locked ? (
                    <div className="heroActions">
                      <button className="primary" type="button" disabled={Boolean(busy) || !cycle.canManage} onClick={() => void saveRetriage(cycle)}>
                        {busy === "save:" + cycle.retriageId ? "Saving re-triage…" : "Save re-triage"}
                      </button>
                      <button className="secondaryButton" type="button" disabled={Boolean(busy) || !cycle.canManage} onClick={() => void saveRetriage(cycle, "dismissed")}>
                        {busy === "save:" + cycle.retriageId ? "Updating…" : "Dismiss cycle"}
                      </button>
                    </div>
                  ) : null}
                  {cycle.status !== "dismissed" && draft.resolutionIntent === "plan-correction" && cycle.status !== "approved" ? (
                    <>
                      <label>
                        Successor-plan rationale
                        <textarea
                          value={rationales[cycle.retriageId] ?? ""}
                          onChange={(event) => setRationales((current) => ({ ...current, [cycle.retriageId]: event.target.value }))}
                          placeholder="Why is a successor corrective plan appropriate?"
                        />
                      </label>
                      <button className="primary" type="button" disabled={Boolean(busy) || !cycle.canManage} onClick={() => void createPlan(cycle)}>
                        {busy === "plan:" + cycle.retriageId ? "Freezing successor plan…" : "Create successor corrective plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!model.regression.reopens.length ? <div className="emptyState">No governed Build 056 reopen is available.</div> : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Immutable successor scope</p><h2>Successor corrective plans</h2></div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article className="publicationCard correctiveCard" key={plan.successorPlanId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (plan.status === "approved" ? "published" : "withdrawn")}>{plan.status}</span>
                  <h3>{plan.target} · {plan.caseId}</h3>
                  <p>{plan.rationale}</p>
                </div>
                <span className="badge">{plan.correctionScope.length} scoped record(s)</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Successor plan</dt><dd>{plan.successorPlanId}</dd></div>
                <div><dt>Predecessor plan</dt><dd>{plan.predecessorPlanId}</dd></div>
                <div><dt>Source package</dt><dd>{plan.sourceCorrectivePackageId}</dd></div>
                <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
              </dl>
              {plan.correctionScope.map((scope) => (
                <p className="bridgeHint" key={scope.integrationKey}>
                  {scope.integrationKey} · {scope.issueStatus} · {scope.proposedAction} · {scope.governedFields.join(", ")}
                </p>
              ))}
              {plan.status === "proposed" ? (
                <div className="correctiveAction">
                  <label>
                    Review note
                    <textarea
                      value={reviewNotes[plan.successorPlanId] ?? ""}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [plan.successorPlanId]: event.target.value }))}
                    />
                  </label>
                  <div className="heroActions">
                    {(["approved","rejected","withdrawn"] as const).map((decision) => (
                      <button
                        className={decision === "approved" ? "primary" : "secondaryButton"}
                        type="button"
                        key={decision}
                        disabled={Boolean(busy) || !plan.canManage}
                        onClick={() => void reviewPlan(plan, decision)}
                      >
                        {busy === "review:" + plan.successorPlanId ? "Recording review…" : decision}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!model.plans.length ? <div className="emptyState">No successor corrective plan has been created.</div> : null}
        </div>
      </section>
    </>
  );
}
