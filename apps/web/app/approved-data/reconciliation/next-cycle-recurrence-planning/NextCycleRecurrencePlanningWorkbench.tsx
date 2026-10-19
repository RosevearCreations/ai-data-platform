"use client";

import { useMemo, useState } from "react";

import type {
  NextCycleRecurrenceRetriage,
  NextCycleRecurrencePlanningModel,
  FollowingCycleCorrectiveDeliveryPlan
} from "@/lib/next-cycle-recurrence-planning";

type Draft = Pick<
  NextCycleRecurrenceRetriage,
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
    "/api/approved-data/reconciliation/next-cycle-recurrence-planning",
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

export function NextCycleRecurrencePlanningWorkbench({
  initialModel
}: {
  initialModel: NextCycleRecurrencePlanningModel;
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
          item.workspaceId + ":" + item.nextCycleRecurrenceId,
          item
        ])
      ),
    [model.retriage]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as NextCycleRecurrencePlanningModel
    );
  }

  function draftFor(item: NextCycleRecurrenceRetriage): Draft {
    return (
      drafts[item.nextCycleRetriageId] ?? {
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: item.investigationNote
      }
    );
  }

  function patchDraft(
    item: NextCycleRecurrenceRetriage,
    patch: Partial<Draft>
  ) {
    setDrafts((current) => ({
      ...current,
      [item.nextCycleRetriageId]: {
        ...draftFor(item),
        ...patch
      }
    }));
  }

  async function createRetriage(
    workspaceId: string,
    nextCycleRecurrenceId: string
  ) {
    const key = "retriage:" + nextCycleRecurrenceId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-next-cycle-recurrence-retriage",
          workspaceId,
          nextCycleRecurrenceId
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
    item: NextCycleRecurrenceRetriage,
    status: "open" | "dismissed" = "open"
  ) {
    const key = "save:" + item.nextCycleRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const draft = draftFor(item);
      apply(
        await api("PATCH", {
          action: "update-next-cycle-recurrence-retriage",
          workspaceId: item.workspaceId,
          nextCycleRetriageId: item.nextCycleRetriageId,
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

  async function createPlan(item: NextCycleRecurrenceRetriage) {
    const key = "plan:" + item.nextCycleRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-following-cycle-plan",
          workspaceId: item.workspaceId,
          nextCycleRetriageId: item.nextCycleRetriageId,
          rationale: rationales[item.nextCycleRetriageId] ?? ""
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
    item: FollowingCycleCorrectiveDeliveryPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    const key = "review:" + item.followingCyclePlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "review-following-cycle-plan",
          workspaceId: item.workspaceId,
          followingCyclePlanId: item.followingCyclePlanId,
          decision,
          reviewNote: reviewNotes[item.followingCyclePlanId] ?? ""
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
            <p className="eyebrow">Build 085 next-cycle recurrence handoff</p>
            <h2>Re-triage & following-cycle planning</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.recurrence.recurrences.length}</strong>
            <span>governed next-cycle recurrences</span>
          </article>
          <article>
            <strong>{model.totals.recurrencesWithoutRetriage}</strong>
            <span>await re-triage</span>
          </article>
          <article>
            <strong>{model.totals.activeRetriage}</strong>
            <span>active next-cycle recurrence cycles</span>
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
        <strong>A next-cycle recurrence starts a continuation corrective generation</strong>
        <p>
          Build 085 never edits or reuses the Build 081 plan. It starts from the
          exact Build 084 recurrence and limits corrective scope to fields proven
          recurrent by that newest read-back and already governed by the approved
          Build 081 plan.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 084 handoff</p>
            <h2>Re-triage next-cycle recurrences</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.recurrence.recurrences.map((recurrence) => {
            const cycle = retriageByRecurrence.get(
              recurrence.workspaceId +
                ":" +
                recurrence.nextCycleRecurrenceId
            );

            if (!cycle) {
              return (
                <article
                  className="publicationCard correctiveCard"
                  key={recurrence.nextCycleRecurrenceId}
                >
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">
                        next-cycle recurrence
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
                      <dd>{recurrence.nextCycleRecurrenceId}</dd>
                    </div>
                    <div>
                      <dt>Subsequent-generation re-closure</dt>
                      <dd>{recurrence.nextCycleReclosureId}</dd>
                    </div>
                    <div>
                      <dt>Recurring check</dt>
                      <dd>
                        {recurrence.nextCycleReclosureRegressionCheckId}
                      </dd>
                    </div>
                    <div>
                      <dt>Recurrence fingerprint</dt>
                      <dd>{recurrence.nextCycleRecurrenceFingerprint}</dd>
                    </div>
                  </dl>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !recurrence.canManage}
                    onClick={() =>
                      void createRetriage(
                        recurrence.workspaceId,
                        recurrence.nextCycleRecurrenceId
                      )
                    }
                  >
                    {busy ===
                    "retriage:" + recurrence.nextCycleRecurrenceId
                      ? "Creating next-cycle recurrence re-triage…"
                      : "Start next-cycle recurrence re-triage"}
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
                key={cycle.nextCycleRetriageId}
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
                    <dd>{cycle.nextCycleRecurrenceId}</dd>
                  </div>
                  <div>
                    <dt>Subsequent-generation recurrence fingerprint</dt>
                    <dd>{cycle.nextCycleRecurrenceFingerprint}</dd>
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
                        "save:" + cycle.nextCycleRetriageId
                          ? "Saving next-cycle recurrence re-triage…"
                          : "Save next-cycle recurrence re-triage"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle, "dismissed")}
                      >
                        {busy ===
                        "save:" + cycle.nextCycleRetriageId
                          ? "Updating next-cycle recurrence cycle…"
                          : "Dismiss next-cycle recurrence cycle"}
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
                            rationales[cycle.nextCycleRetriageId] ?? ""
                          }
                          onChange={(event) =>
                            setRationales((current) => ({
                              ...current,
                              [cycle.nextCycleRetriageId]:
                                event.target.value
                            }))
                          }
                          placeholder="Why should this next-cycle recurrence enter a continuation corrective generation?"
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void createPlan(cycle)}
                      >
                        {busy ===
                        "plan:" + cycle.nextCycleRetriageId
                          ? "Freezing following-cycle plan…"
                          : "Create following-cycle corrective plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!model.recurrence.recurrences.length ? (
            <div className="emptyState">
              No governed Build 084 next-cycle recurrence is available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable next-cycle recurrence scope</p>
            <h2>Successive-generation corrective plans</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article
              className="publicationCard correctiveCard"
              key={plan.followingCyclePlanId}
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
                  <dd>{plan.followingCyclePlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor next-cycle plan</dt>
                  <dd>{plan.predecessorNextCyclePlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor next-cycle delivery</dt>
                  <dd>{plan.predecessorNextCycleDeliveryId}</dd>
                </div>
                <div>
                  <dt>Source next-cycle recurrence</dt>
                  <dd>{plan.sourceNextCycleRecurrenceFingerprint}</dd>
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
                        reviewNotes[plan.followingCyclePlanId] ?? ""
                      }
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [plan.followingCyclePlanId]:
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
                          "review:" + plan.followingCyclePlanId
                            ? "Recording following-cycle review…"
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
              No following-cycle corrective plan has been created.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
