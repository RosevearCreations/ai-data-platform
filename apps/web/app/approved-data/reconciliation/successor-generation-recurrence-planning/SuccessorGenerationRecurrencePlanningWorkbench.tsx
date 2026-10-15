"use client";

import { useMemo, useState } from "react";

import type {
  SuccessorGenerationRecurrenceRetriage,
  SuccessorGenerationRecurrencePlanningModel,
  SubsequentGenerationCorrectiveDeliveryPlan
} from "@/lib/successor-generation-recurrence-planning";

type Draft = Pick<
  SuccessorGenerationRecurrenceRetriage,
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
    "/api/approved-data/reconciliation/successor-generation-recurrence-planning",
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
        : "Successor-generation recurrence planning request failed."
    );
  }
  return payload as Record<string, unknown>;
}

export function SuccessorGenerationRecurrencePlanningWorkbench({
  initialModel
}: {
  initialModel: SuccessorGenerationRecurrencePlanningModel;
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
          item.workspaceId + ":" + item.successorGenerationRecurrenceId,
          item
        ])
      ),
    [model.retriage]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as SuccessorGenerationRecurrencePlanningModel
    );
  }

  function draftFor(item: SuccessorGenerationRecurrenceRetriage): Draft {
    return (
      drafts[item.successorGenerationRetriageId] ?? {
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: item.investigationNote
      }
    );
  }

  function patchDraft(
    item: SuccessorGenerationRecurrenceRetriage,
    patch: Partial<Draft>
  ) {
    setDrafts((current) => ({
      ...current,
      [item.successorGenerationRetriageId]: {
        ...draftFor(item),
        ...patch
      }
    }));
  }

  async function createRetriage(
    workspaceId: string,
    successorGenerationRecurrenceId: string
  ) {
    const key = "retriage:" + successorGenerationRecurrenceId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-successor-generation-recurrence-retriage",
          workspaceId,
          successorGenerationRecurrenceId
        })
      );
      setMessage("Successor-generation recurrence re-triage created.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Successor-generation recurrence re-triage failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(
    item: SuccessorGenerationRecurrenceRetriage,
    status: "open" | "dismissed" = "open"
  ) {
    const key = "save:" + item.successorGenerationRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const draft = draftFor(item);
      apply(
        await api("PATCH", {
          action: "update-successor-generation-recurrence-retriage",
          workspaceId: item.workspaceId,
          successorGenerationRetriageId: item.successorGenerationRetriageId,
          status,
          ...draft
        })
      );
      setMessage(
        status === "dismissed"
          ? "Successor-generation recurrence cycle dismissed."
          : "Successor-generation recurrence re-triage saved."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: SuccessorGenerationRecurrenceRetriage) {
    const key = "plan:" + item.successorGenerationRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-subsequent-generation-plan",
          workspaceId: item.workspaceId,
          successorGenerationRetriageId: item.successorGenerationRetriageId,
          rationale: rationales[item.successorGenerationRetriageId] ?? ""
        })
      );
      setMessage("Subsequent-generation corrective plan frozen for review.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Plan creation failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(
    item: SubsequentGenerationCorrectiveDeliveryPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    const key = "review:" + item.subsequentGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "review-subsequent-generation-plan",
          workspaceId: item.workspaceId,
          subsequentGenerationPlanId: item.subsequentGenerationPlanId,
          decision,
          reviewNote: reviewNotes[item.subsequentGenerationPlanId] ?? ""
        })
      );
      setMessage(
        "Subsequent-generation plan review recorded: " + decision + "."
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
            <p className="eyebrow">Build 069 successor-generation recurrence handoff</p>
            <h2>Re-triage & subsequent-generation planning</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.recurrence.recurrences.length}</strong>
            <span>governed successor-generation recurrences</span>
          </article>
          <article>
            <strong>{model.totals.recurrencesWithoutRetriage}</strong>
            <span>await re-triage</span>
          </article>
          <article>
            <strong>{model.totals.activeRetriage}</strong>
            <span>active successor-generation recurrence cycles</span>
          </article>
          <article>
            <strong>{model.totals.proposedPlans}</strong>
            <span>proposed subsequent-gen plans</span>
          </article>
          <article>
            <strong>{model.totals.approvedPlans}</strong>
            <span>approved subsequent-gen plans</span>
          </article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A successor-generation recurrence starts a subsequent corrective generation</strong>
        <p>
          Build 069 never edits or reuses the Build 065 plan. It starts from the
          exact Build 068 recurrence and limits corrective scope to fields proven
          recurrent by that newest read-back and already governed by the approved
          Build 065 plan.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 068 handoff</p>
            <h2>Re-triage successor-generation recurrences</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.recurrence.recurrences.map((recurrence) => {
            const cycle = retriageByRecurrence.get(
              recurrence.workspaceId +
                ":" +
                recurrence.successorGenerationRecurrenceId
            );

            if (!cycle) {
              return (
                <article
                  className="publicationCard correctiveCard"
                  key={recurrence.successorGenerationRecurrenceId}
                >
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">
                        successor-generation recurrence
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
                      <dt>Successor-generation recurrence</dt>
                      <dd>{recurrence.successorGenerationRecurrenceId}</dd>
                    </div>
                    <div>
                      <dt>Successor-generation re-closure</dt>
                      <dd>{recurrence.successorGenerationReclosureId}</dd>
                    </div>
                    <div>
                      <dt>Recurring check</dt>
                      <dd>
                        {recurrence.successorGenerationReclosureRegressionCheckId}
                      </dd>
                    </div>
                    <div>
                      <dt>Recurrence fingerprint</dt>
                      <dd>{recurrence.successorGenerationRecurrenceFingerprint}</dd>
                    </div>
                  </dl>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !recurrence.canManage}
                    onClick={() =>
                      void createRetriage(
                        recurrence.workspaceId,
                        recurrence.successorGenerationRecurrenceId
                      )
                    }
                  >
                    {busy ===
                    "retriage:" + recurrence.successorGenerationRecurrenceId
                      ? "Creating successor-generation recurrence re-triage…"
                      : "Start successor-generation recurrence re-triage"}
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
                key={cycle.successorGenerationRetriageId}
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
                    <dt>Successor-generation recurrence</dt>
                    <dd>{cycle.successorGenerationRecurrenceId}</dd>
                  </div>
                  <div>
                    <dt>Successor-generation recurrence fingerprint</dt>
                    <dd>{cycle.successorGenerationRecurrenceFingerprint}</dd>
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
                        "save:" + cycle.successorGenerationRetriageId
                          ? "Saving successor-generation recurrence re-triage…"
                          : "Save successor-generation recurrence re-triage"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle, "dismissed")}
                      >
                        {busy ===
                        "save:" + cycle.successorGenerationRetriageId
                          ? "Updating successor-generation recurrence cycle…"
                          : "Dismiss successor-generation recurrence cycle"}
                      </button>
                    </div>
                  ) : null}

                  {!locked &&
                  draft.resolutionIntent === "plan-correction" ? (
                    <>
                      <label>
                        Subsequent-generation plan rationale
                        <textarea
                          value={
                            rationales[cycle.successorGenerationRetriageId] ?? ""
                          }
                          onChange={(event) =>
                            setRationales((current) => ({
                              ...current,
                              [cycle.successorGenerationRetriageId]:
                                event.target.value
                            }))
                          }
                          placeholder="Why should this successor-generation recurrence enter a subsequent corrective generation?"
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void createPlan(cycle)}
                      >
                        {busy ===
                        "plan:" + cycle.successorGenerationRetriageId
                          ? "Freezing subsequent-generation plan…"
                          : "Create subsequent-generation corrective plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!model.recurrence.recurrences.length ? (
            <div className="emptyState">
              No governed Build 068 successor-generation recurrence is available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable successor-generation recurrence scope</p>
            <h2>Subsequent-generation corrective plans</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article
              className="publicationCard correctiveCard"
              key={plan.subsequentGenerationPlanId}
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
                  <dt>Subsequent-generation plan</dt>
                  <dd>{plan.subsequentGenerationPlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor successor-generation plan</dt>
                  <dd>{plan.predecessorSuccessorGenerationPlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor successor-generation delivery</dt>
                  <dd>{plan.predecessorSuccessorGenerationDeliveryId}</dd>
                </div>
                <div>
                  <dt>Source successor-generation recurrence</dt>
                  <dd>{plan.sourceSuccessorGenerationRecurrenceFingerprint}</dd>
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
                        reviewNotes[plan.subsequentGenerationPlanId] ?? ""
                      }
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [plan.subsequentGenerationPlanId]:
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
                          "review:" + plan.subsequentGenerationPlanId
                            ? "Recording subsequent-generation review…"
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
              No subsequent-generation corrective plan has been created.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
