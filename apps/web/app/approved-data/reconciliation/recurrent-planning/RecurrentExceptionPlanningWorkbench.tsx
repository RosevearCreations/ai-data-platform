"use client";

import { useMemo, useState } from "react";

import type {
  NextGenerationCorrectiveDeliveryPlan,
  RecurrentExceptionPlanningModel,
  RecurrentExceptionRetriage
} from "@/lib/recurrent-exception-planning";

type Draft = Pick<
  RecurrentExceptionRetriage,
  "classification" | "severity" | "resolutionIntent" | "summary" | "investigationNote"
>;

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/recurrent-planning",
    {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Recurrent planning request failed."
    );
  }
  return payload as Record<string, unknown>;
}

export function RecurrentExceptionPlanningWorkbench({
  initialModel
}: {
  initialModel: RecurrentExceptionPlanningModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const retriageByRecurrence = useMemo(
    () =>
      new Map(
        model.retriage.map((item) => [
          item.workspaceId + ":" + item.recurrenceId,
          item
        ])
      ),
    [model.retriage]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as RecurrentExceptionPlanningModel
    );
  }

  function draftFor(item: RecurrentExceptionRetriage): Draft {
    return (
      drafts[item.recurrenceRetriageId] ?? {
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: item.investigationNote
      }
    );
  }

  function patchDraft(item: RecurrentExceptionRetriage, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [item.recurrenceRetriageId]: {
        ...draftFor(item),
        ...patch
      }
    }));
  }

  async function createRetriage(workspaceId: string, recurrenceId: string) {
    const key = "retriage:" + recurrenceId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-recurrence-retriage",
          workspaceId,
          recurrenceId
        })
      );
      setMessage("Recurring exception re-triage created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-triage failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(
    item: RecurrentExceptionRetriage,
    status: "open" | "dismissed" = "open"
  ) {
    const key = "save:" + item.recurrenceRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const draft = draftFor(item);
      apply(
        await api("PATCH", {
          action: "update-recurrence-retriage",
          workspaceId: item.workspaceId,
          recurrenceRetriageId: item.recurrenceRetriageId,
          status,
          ...draft
        })
      );
      setMessage(
        status === "dismissed"
          ? "Recurring re-triage dismissed."
          : "Recurring re-triage saved."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: RecurrentExceptionRetriage) {
    const key = "plan:" + item.recurrenceRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-next-generation-plan",
          workspaceId: item.workspaceId,
          recurrenceRetriageId: item.recurrenceRetriageId,
          rationale: rationales[item.recurrenceRetriageId] ?? ""
        })
      );
      setMessage("Next-generation corrective plan frozen for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(
    item: NextGenerationCorrectiveDeliveryPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    const key = "review:" + item.nextGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "review-next-generation-plan",
          workspaceId: item.workspaceId,
          nextGenerationPlanId: item.nextGenerationPlanId,
          decision,
          reviewNote: reviewNotes[item.nextGenerationPlanId] ?? ""
        })
      );
      setMessage("Next-generation plan review recorded: " + decision + ".");
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
            <p className="eyebrow">Build 061 recurrence handoff</p>
            <h2>Re-triage & next-generation planning</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.recurrence.recurrences.length}</strong><span>governed recurrences</span></article>
          <article><strong>{model.totals.recurrencesWithoutRetriage}</strong><span>await re-triage</span></article>
          <article><strong>{model.totals.activeRetriage}</strong><span>active recurrence cycles</span></article>
          <article><strong>{model.totals.proposedPlans}</strong><span>proposed next-gen plans</span></article>
          <article><strong>{model.totals.approvedPlans}</strong><span>approved next-gen plans</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Recurrence starts another evidence generation</strong>
        <p>
          Build 061 never reuses or edits the Build 057 successor plan. It derives a
          new decision cycle only from the latest Build 060 recurrence, and limits
          corrective scope to fields that were both governed by the accepted
          predecessor successor plan and proven recurrent by the newest read-back.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Build 060 handoff</p><h2>Re-triage recurrent exceptions</h2></div>
        </div>
        <div className="publicationList">
          {model.recurrence.recurrences.map((recurrence) => {
            const cycle = retriageByRecurrence.get(
              recurrence.workspaceId + ":" + recurrence.recurrenceId
            );
            if (!cycle) {
              return (
                <article className="publicationCard correctiveCard" key={recurrence.recurrenceId}>
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">recurrent</span>
                      <h3>{recurrence.target} · {recurrence.caseId}</h3>
                      <p>{recurrence.recurrenceReason}</p>
                    </div>
                    <span className="badge">{new Date(recurrence.recurredAt).toLocaleString()}</span>
                  </header>
                  <dl className="publicationEvidence">
                    <div><dt>Recurrence</dt><dd>{recurrence.recurrenceId}</dd></div>
                    <div><dt>Re-closure</dt><dd>{recurrence.reclosureId}</dd></div>
                    <div><dt>Recurring check</dt><dd>{recurrence.reclosureRegressionCheckId}</dd></div>
                    <div><dt>Recurrence fingerprint</dt><dd>{recurrence.recurrenceFingerprint}</dd></div>
                  </dl>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !recurrence.canManage}
                    onClick={() => void createRetriage(recurrence.workspaceId, recurrence.recurrenceId)}
                  >
                    {busy === "retriage:" + recurrence.recurrenceId
                      ? "Creating recurrence re-triage…"
                      : "Start recurrence re-triage"}
                  </button>
                </article>
              );
            }

            const draft = draftFor(cycle);
            const locked = cycle.status === "approved" || cycle.status === "dismissed";
            return (
              <article className="publicationCard correctiveCard" key={cycle.recurrenceRetriageId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (cycle.status === "approved" ? "published" : "withdrawn")}>
                      {cycle.status}
                    </span>
                    <h3>{cycle.target} · {cycle.caseId}</h3>
                    <p>{cycle.workspaceName}</p>
                  </div>
                  <span className="badge">{cycle.affectedRecordCount} recurrent record(s)</span>
                </header>
                <dl className="publicationEvidence">
                  <div><dt>Recurrence</dt><dd>{cycle.recurrenceId}</dd></div>
                  <div><dt>Recurrence fingerprint</dt><dd>{cycle.recurrenceFingerprint}</dd></div>
                  <div><dt>Recurring verification</dt><dd>{cycle.regressionFingerprint}</dd></div>
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
                    <textarea
                      disabled={locked}
                      value={draft.summary}
                      onChange={(event) => patchDraft(cycle, { summary: event.target.value })}
                    />
                  </label>
                  <label>
                    Investigation note
                    <textarea
                      disabled={locked}
                      value={draft.investigationNote}
                      onChange={(event) => patchDraft(cycle, { investigationNote: event.target.value })}
                    />
                  </label>

                  {!locked ? (
                    <div className="heroActions">
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle)}
                      >
                        {busy === "save:" + cycle.recurrenceRetriageId
                          ? "Saving recurrence re-triage…"
                          : "Save recurrence re-triage"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle, "dismissed")}
                      >
                        {busy === "save:" + cycle.recurrenceRetriageId
                          ? "Updating recurrence cycle…"
                          : "Dismiss recurrence cycle"}
                      </button>
                    </div>
                  ) : null}

                  {!locked && draft.resolutionIntent === "plan-correction" ? (
                    <>
                      <label>
                        Next-generation plan rationale
                        <textarea
                          value={rationales[cycle.recurrenceRetriageId] ?? ""}
                          onChange={(event) =>
                            setRationales((current) => ({
                              ...current,
                              [cycle.recurrenceRetriageId]: event.target.value
                            }))
                          }
                          placeholder="Why should this recurrent drift enter another corrective generation?"
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void createPlan(cycle)}
                      >
                        {busy === "plan:" + cycle.recurrenceRetriageId
                          ? "Freezing next-generation plan…"
                          : "Create next-generation corrective plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!model.recurrence.recurrences.length ? (
            <div className="emptyState">No governed Build 060 recurrence is available.</div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Immutable recurrence scope</p><h2>Next-generation corrective plans</h2></div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article className="publicationCard correctiveCard" key={plan.nextGenerationPlanId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (plan.status === "approved" ? "published" : "withdrawn")}>
                    {plan.status}
                  </span>
                  <h3>{plan.target} · {plan.caseId}</h3>
                  <p>{plan.rationale}</p>
                </div>
                <span className="badge">{plan.correctionScope.length} scoped record(s)</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Next-generation plan</dt><dd>{plan.nextGenerationPlanId}</dd></div>
                <div><dt>Predecessor successor plan</dt><dd>{plan.predecessorSuccessorPlanId}</dd></div>
                <div><dt>Predecessor successor delivery</dt><dd>{plan.predecessorSuccessorDeliveryId}</dd></div>
                <div><dt>Source successor package</dt><dd>{plan.sourceSuccessorPackageId}</dd></div>
                <div><dt>Source recurrence</dt><dd>{plan.sourceRecurrenceFingerprint}</dd></div>
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
                      value={reviewNotes[plan.nextGenerationPlanId] ?? ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [plan.nextGenerationPlanId]: event.target.value
                        }))
                      }
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
                        {busy === "review:" + plan.nextGenerationPlanId
                          ? "Recording next-generation review…"
                          : decision}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!model.plans.length ? (
            <div className="emptyState">No next-generation corrective plan has been created.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
