"use client";

import { useMemo, useState } from "react";

import type {
  SubsequentCycleRecurrenceRetriage,
  SubsequentCycleRecurrencePlanningModel,
  SuccessiveCycleCorrectiveDeliveryPlan
} from "@/lib/subsequent-cycle-recurrence-planning";

type Draft = Pick<
  SubsequentCycleRecurrenceRetriage,
  | "classification"
  | "severity"
  | "resolutionIntent"
  | "summary"
  | "investigationNote"
>;

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/subsequent-cycle-recurrence-planning",
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
        : "Subsequent-generation recurrence planning request failed."
    );
  }
  return payload as Record<string, unknown>;
}

export function SubsequentCycleRecurrencePlanningWorkbench({
  initialModel
}: {
  initialModel: SubsequentCycleRecurrencePlanningModel;
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
          item.workspaceId + ":" + item.subsequentCycleRecurrenceId,
          item
        ])
      ),
    [model.retriage]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as SubsequentCycleRecurrencePlanningModel
    );
  }

  function draftFor(item: SubsequentCycleRecurrenceRetriage): Draft {
    return (
      drafts[item.subsequentCycleRetriageId] ?? {
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: item.investigationNote
      }
    );
  }

  function patchDraft(
    item: SubsequentCycleRecurrenceRetriage,
    patch: Partial<Draft>
  ) {
    setDrafts((current) => ({
      ...current,
      [item.subsequentCycleRetriageId]: {
        ...draftFor(item),
        ...patch
      }
    }));
  }

  async function createRetriage(
    workspaceId: string,
    subsequentCycleRecurrenceId: string
  ) {
    const key = "retriage:" + subsequentCycleRecurrenceId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-subsequent-cycle-recurrence-retriage",
          workspaceId,
          subsequentCycleRecurrenceId
        })
      );
      setMessage("Subsequent-generation recurrence re-triage created.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Subsequent-generation recurrence re-triage failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(
    item: SubsequentCycleRecurrenceRetriage,
    status: "open" | "dismissed" = "open"
  ) {
    const key = "save:" + item.subsequentCycleRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const draft = draftFor(item);
      apply(
        await api("PATCH", {
          action: "update-subsequent-cycle-recurrence-retriage",
          workspaceId: item.workspaceId,
          subsequentCycleRetriageId: item.subsequentCycleRetriageId,
          status,
          ...draft
        })
      );
      setMessage(
        status === "dismissed"
          ? "Subsequent-generation recurrence cycle dismissed."
          : "Subsequent-generation recurrence re-triage saved."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: SubsequentCycleRecurrenceRetriage) {
    const key = "plan:" + item.subsequentCycleRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-successive-cycle-plan",
          workspaceId: item.workspaceId,
          subsequentCycleRetriageId: item.subsequentCycleRetriageId,
          rationale: rationales[item.subsequentCycleRetriageId] ?? ""
        })
      );
      setMessage("Successive-generation corrective plan frozen for review.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Plan creation failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(
    item: SuccessiveCycleCorrectiveDeliveryPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    const key = "review:" + item.successiveCyclePlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "review-successive-cycle-plan",
          workspaceId: item.workspaceId,
          successiveCyclePlanId: item.successiveCyclePlanId,
          decision,
          reviewNote: reviewNotes[item.successiveCyclePlanId] ?? ""
        })
      );
      setMessage(
        "Successive-generation plan review recorded: " + decision + "."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Plan review failed."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 093 subsequent-cycle recurrence handoff</p>
            <h2>Re-triage & successive-cycle planning</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.recurrence.recurrences.length}</strong>
            <span>governed subsequent-cycle recurrences</span>
          </article>
          <article>
            <strong>{model.totals.recurrencesWithoutRetriage}</strong>
            <span>await re-triage</span>
          </article>
          <article>
            <strong>{model.totals.activeRetriage}</strong>
            <span>active subsequent-cycle recurrence cycles</span>
          </article>
          <article>
            <strong>{model.totals.proposedPlans}</strong>
            <span>proposed successive-gen plans</span>
          </article>
          <article>
            <strong>{model.totals.approvedPlans}</strong>
            <span>approved successive-gen plans</span>
          </article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A subsequent-cycle recurrence starts a subsequent corrective cycle</strong>
        <p>
          Build 093 never edits or reuses the Build 089 plan. It starts from the
          exact Build 092 recurrence and limits corrective scope to fields proven
          recurrent by that newest read-back and already governed by the approved
          Build 089 plan.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 092 handoff</p>
            <h2>Re-triage subsequent-cycle recurrences</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.recurrence.recurrences.map((recurrence) => {
            const cycle = retriageByRecurrence.get(
              recurrence.workspaceId +
                ":" +
                recurrence.subsequentCycleRecurrenceId
            );

            if (!cycle) {
              return (
                <article
                  className="publicationCard correctiveCard"
                  key={recurrence.subsequentCycleRecurrenceId}
                >
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">
                        subsequent-cycle recurrence
                      </span>
                      <h3>
                        {recurrence.target} · {recurrence.caseId}
                      </h3>
                      <p>{recurrence.recurrenceReason}</p>
                    </div>
                    <span className="badge">
                      {new Date(recurrence.recurredAt).toLocaleString()}
                    </span>
                  </header>
                  <dl className="publicationEvidence">
                    <div>
                      <dt>Subsequent-generation recurrence</dt>
                      <dd>{recurrence.subsequentCycleRecurrenceId}</dd>
                    </div>
                    <div>
                      <dt>Subsequent-generation re-closure</dt>
                      <dd>{recurrence.subsequentCycleReclosureId}</dd>
                    </div>
                    <div>
                      <dt>Recurring check</dt>
                      <dd>
                        {recurrence.subsequentCycleReclosureRegressionCheckId}
                      </dd>
                    </div>
                    <div>
                      <dt>Recurrence fingerprint</dt>
                      <dd>{recurrence.subsequentCycleRecurrenceFingerprint}</dd>
                    </div>
                  </dl>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !recurrence.canManage}
                    onClick={() =>
                      void createRetriage(
                        recurrence.workspaceId,
                        recurrence.subsequentCycleRecurrenceId
                      )
                    }
                  >
                    {busy ===
                    "retriage:" + recurrence.subsequentCycleRecurrenceId
                      ? "Creating subsequent-cycle recurrence re-triage…"
                      : "Start subsequent-cycle recurrence re-triage"}
                  </button>
                </article>
              );
            }

            const draft = draftFor(cycle);
            const locked =
              cycle.status === "approved" || cycle.status === "dismissed";

            return (
              <article
                className="publicationCard correctiveCard"
                key={cycle.subsequentCycleRetriageId}
              >
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (cycle.status === "approved"
                          ? "published"
                          : "withdrawn")
                      }
                    >
                      {cycle.status}
                    </span>
                    <h3>
                      {cycle.target} · {cycle.caseId}
                    </h3>
                    <p>{cycle.workspaceName}</p>
                  </div>
                  <span className="badge">
                    {cycle.affectedRecordCount} recurrent record(s)
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div>
                    <dt>Subsequent-generation recurrence</dt>
                    <dd>{cycle.subsequentCycleRecurrenceId}</dd>
                  </div>
                  <div>
                    <dt>Subsequent-generation recurrence fingerprint</dt>
                    <dd>{cycle.subsequentCycleRecurrenceFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Recurring verification</dt>
                    <dd>{cycle.regressionFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Keys</dt>
                    <dd>{cycle.affectedIntegrationKeys.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Fields</dt>
                    <dd>{cycle.affectedFields.join(", ")}</dd>
                  </div>
                </dl>

                <div className="correctiveAction">
                  <label>
                    Classification
                    <select
                      disabled={locked}
                      value={draft.classification}
                      onChange={(event) =>
                        patchDraft(cycle, {
                          classification:
                            event.target.value as Draft["classification"]
                        })
                      }
                    >
                      {[
                        "consumer-drift",
                        "consumer-missing",
                        "expected-change",
                        "source-superseded",
                        "mixed",
                        "unknown"
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Severity
                    <select
                      disabled={locked}
                      value={draft.severity}
                      onChange={(event) =>
                        patchDraft(cycle, {
                          severity: event.target.value as Draft["severity"]
                        })
                      }
                    >
                      {["low", "medium", "high", "critical"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Resolution intent
                    <select
                      disabled={locked}
                      value={draft.resolutionIntent}
                      onChange={(event) =>
                        patchDraft(cycle, {
                          resolutionIntent:
                            event.target.value as Draft["resolutionIntent"]
                        })
                      }
                    >
                      {[
                        "investigate",
                        "accept-drift",
                        "plan-correction",
                        "no-action"
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Summary
                    <textarea
                      disabled={locked}
                      value={draft.summary}
                      onChange={(event) =>
                        patchDraft(cycle, { summary: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    Investigation note
                    <textarea
                      disabled={locked}
                      value={draft.investigationNote}
                      onChange={(event) =>
                        patchDraft(cycle, {
                          investigationNote: event.target.value
                        })
                      }
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
                        {busy ===
                        "save:" + cycle.subsequentCycleRetriageId
                          ? "Saving subsequent-cycle recurrence re-triage…"
                          : "Save subsequent-cycle recurrence re-triage"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle, "dismissed")}
                      >
                        {busy ===
                        "save:" + cycle.subsequentCycleRetriageId
                          ? "Updating subsequent-cycle recurrence cycle…"
                          : "Dismiss subsequent-cycle recurrence cycle"}
                      </button>
                    </div>
                  ) : null}

                  {!locked &&
                  draft.resolutionIntent === "plan-correction" ? (
                    <>
                      <label>
                        Successive-generation plan rationale
                        <textarea
                          value={
                            rationales[cycle.subsequentCycleRetriageId] ?? ""
                          }
                          onChange={(event) =>
                            setRationales((current) => ({
                              ...current,
                              [cycle.subsequentCycleRetriageId]:
                                event.target.value
                            }))
                          }
                          placeholder="Why should this subsequent-cycle recurrence enter a subsequent corrective cycle?"
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void createPlan(cycle)}
                      >
                        {busy ===
                        "plan:" + cycle.subsequentCycleRetriageId
                          ? "Freezing successive-cycle plan…"
                          : "Create successive-cycle corrective plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!model.recurrence.recurrences.length ? (
            <div className="emptyState">
              No governed Build 092 subsequent-cycle recurrence is available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable subsequent-cycle recurrence scope</p>
            <h2>Successive-generation corrective plans</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article
              className="publicationCard correctiveCard"
              key={plan.successiveCyclePlanId}
            >
              <header>
                <div>
                  <span
                    className={
                      "publishState publishState-" +
                      (plan.status === "approved"
                        ? "published"
                        : "withdrawn")
                    }
                  >
                    {plan.status}
                  </span>
                  <h3>
                    {plan.target} · {plan.caseId}
                  </h3>
                  <p>{plan.rationale}</p>
                </div>
                <span className="badge">
                  {plan.correctionScope.length} scoped record(s)
                </span>
              </header>

              <dl className="publicationEvidence">
                <div>
                  <dt>Successive-generation plan</dt>
                  <dd>{plan.successiveCyclePlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor subsequent-cycle plan</dt>
                  <dd>{plan.predecessorSubsequentCyclePlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor subsequent-cycle delivery</dt>
                  <dd>{plan.predecessorSubsequentCycleDeliveryId}</dd>
                </div>
                <div>
                  <dt>Source subsequent-cycle recurrence</dt>
                  <dd>{plan.sourceSubsequentCycleRecurrenceFingerprint}</dd>
                </div>
                <div>
                  <dt>Plan fingerprint</dt>
                  <dd>{plan.planFingerprint}</dd>
                </div>
              </dl>

              {plan.correctionScope.map((scope) => (
                <p className="bridgeHint" key={scope.integrationKey}>
                  {scope.integrationKey} · {scope.issueStatus} ·{" "}
                  {scope.proposedAction} · {scope.governedFields.join(", ")}
                </p>
              ))}

              {plan.status === "proposed" ? (
                <div className="correctiveAction">
                  <label>
                    Review note
                    <textarea
                      value={
                        reviewNotes[plan.successiveCyclePlanId] ?? ""
                      }
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [plan.successiveCyclePlanId]:
                            event.target.value
                        }))
                      }
                    />
                  </label>
                  <div className="heroActions">
                    {(["approved", "rejected", "withdrawn"] as const).map(
                      (decision) => (
                        <button
                          className={
                            decision === "approved"
                              ? "primary"
                              : "secondaryButton"
                          }
                          type="button"
                          key={decision}
                          disabled={Boolean(busy) || !plan.canManage}
                          onClick={() => void reviewPlan(plan, decision)}
                        >
                          {busy ===
                          "review:" + plan.successiveCyclePlanId
                            ? "Recording successive-cycle review…"
                            : decision}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </article>
          ))}

          {!model.plans.length ? (
            <div className="emptyState">
              No successive-cycle corrective plan has been created.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
