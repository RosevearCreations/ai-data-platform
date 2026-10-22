"use client";

import { useMemo, useState } from "react";

import type {
  NextCorrectiveGenerationRecurrenceRetriage,
  NextCorrectiveGenerationRecurrencePlanningModel,
  FollowingCorrectiveGenerationPlan
} from "@/lib/next-corrective-generation-recurrence-planning";

type Draft = Pick<
  NextCorrectiveGenerationRecurrenceRetriage,
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
    "/api/approved-data/reconciliation/next-corrective-generation-recurrence-planning",
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
        : "Continuation-cycle recurrence planning request failed."
    );
  }
  return payload as Record<string, unknown>;
}

export function NextCorrectiveGenerationRecurrencePlanningWorkbench({
  initialModel
}: {
  initialModel: NextCorrectiveGenerationRecurrencePlanningModel;
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
          item.workspaceId + ":" + item.nextCorrectiveGenerationRecurrenceId,
          item
        ])
      ),
    [model.retriage]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as NextCorrectiveGenerationRecurrencePlanningModel
    );
  }

  function draftFor(item: NextCorrectiveGenerationRecurrenceRetriage): Draft {
    return (
      drafts[item.nextCorrectiveGenerationRetriageId] ?? {
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: item.investigationNote
      }
    );
  }

  function patchDraft(
    item: NextCorrectiveGenerationRecurrenceRetriage,
    patch: Partial<Draft>
  ) {
    setDrafts((current) => ({
      ...current,
      [item.nextCorrectiveGenerationRetriageId]: {
        ...draftFor(item),
        ...patch
      }
    }));
  }

  async function createRetriage(
    workspaceId: string,
    nextCorrectiveGenerationRecurrenceId: string
  ) {
    const key = "retriage:" + nextCorrectiveGenerationRecurrenceId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-next-corrective-generation-recurrence-retriage",
          workspaceId,
          nextCorrectiveGenerationRecurrenceId
        })
      );
      setMessage("Continuation-cycle recurrence re-triage created.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Continuation-cycle recurrence re-triage failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(
    item: NextCorrectiveGenerationRecurrenceRetriage,
    status: "open" | "dismissed" = "open"
  ) {
    const key = "save:" + item.nextCorrectiveGenerationRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const draft = draftFor(item);
      apply(
        await api("PATCH", {
          action: "update-next-corrective-generation-recurrence-retriage",
          workspaceId: item.workspaceId,
          nextCorrectiveGenerationRetriageId: item.nextCorrectiveGenerationRetriageId,
          status,
          ...draft
        })
      );
      setMessage(
        status === "dismissed"
          ? "Continuation-cycle recurrence cycle dismissed."
          : "Continuation-cycle recurrence re-triage saved."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: NextCorrectiveGenerationRecurrenceRetriage) {
    const key = "plan:" + item.nextCorrectiveGenerationRetriageId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("POST", {
          action: "create-following-corrective-generation-plan",
          workspaceId: item.workspaceId,
          nextCorrectiveGenerationRetriageId: item.nextCorrectiveGenerationRetriageId,
          rationale: rationales[item.nextCorrectiveGenerationRetriageId] ?? ""
        })
      );
      setMessage("Following corrective-generation plan frozen for review.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Plan creation failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(
    item: FollowingCorrectiveGenerationPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    const key = "review:" + item.followingCorrectiveGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "review-following-corrective-generation-plan",
          workspaceId: item.workspaceId,
          followingCorrectiveGenerationPlanId: item.followingCorrectiveGenerationPlanId,
          decision,
          reviewNote: reviewNotes[item.followingCorrectiveGenerationPlanId] ?? ""
        })
      );
      setMessage(
        "Following corrective-generation plan review recorded: " + decision + "."
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
            <p className="eyebrow">Build 105 next-corrective-generation recurrence handoff</p>
            <h2>Re-triage & following corrective-generation planning</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.recurrence.recurrences.length}</strong>
            <span>governed next-corrective-generation recurrences</span>
          </article>
          <article>
            <strong>{model.totals.recurrencesWithoutRetriage}</strong>
            <span>await re-triage</span>
          </article>
          <article>
            <strong>{model.totals.activeRetriage}</strong>
            <span>active next-corrective-generation recurrence cycles</span>
          </article>
          <article>
            <strong>{model.totals.proposedPlans}</strong>
            <span>proposed following corrective-generation plans</span>
          </article>
          <article>
            <strong>{model.totals.approvedPlans}</strong>
            <span>approved following corrective-generation plans</span>
          </article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A next-corrective-generation recurrence starts a continuation corrective cycle</strong>
        <p>
          Build 105 never edits or reuses the Build 101 following corrective-generation plan. It starts from the
          exact Build 104 recurrence and limits corrective scope to fields proven
          recurrent by that newest read-back and already governed by the approved
          Build 101 plan and Build 102 accepted package.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 104 handoff</p>
            <h2>Re-triage next-corrective-generation recurrences</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.recurrence.recurrences.map((recurrence) => {
            const cycle = retriageByRecurrence.get(
              recurrence.workspaceId +
                ":" +
                recurrence.nextCorrectiveGenerationRecurrenceId
            );

            if (!cycle) {
              return (
                <article
                  className="publicationCard correctiveCard"
                  key={recurrence.nextCorrectiveGenerationRecurrenceId}
                >
                  <header>
                    <div>
                      <span className="publishState publishState-withdrawn">
                        next-corrective-generation recurrence
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
                      <dt>Continuation-cycle recurrence</dt>
                      <dd>{recurrence.nextCorrectiveGenerationRecurrenceId}</dd>
                    </div>
                    <div>
                      <dt>Continuation-cycle re-closure</dt>
                      <dd>{recurrence.nextCorrectiveGenerationReclosureId}</dd>
                    </div>
                    <div>
                      <dt>Recurring check</dt>
                      <dd>
                        {recurrence.nextCorrectiveGenerationReclosureRegressionCheckId}
                      </dd>
                    </div>
                    <div>
                      <dt>Recurrence fingerprint</dt>
                      <dd>{recurrence.nextCorrectiveGenerationRecurrenceFingerprint}</dd>
                    </div>
                  </dl>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !recurrence.canManage}
                    onClick={() =>
                      void createRetriage(
                        recurrence.workspaceId,
                        recurrence.nextCorrectiveGenerationRecurrenceId
                      )
                    }
                  >
                    {busy ===
                    "retriage:" + recurrence.nextCorrectiveGenerationRecurrenceId
                      ? "Creating next-corrective-generation recurrence re-triage…"
                      : "Start next-corrective-generation recurrence re-triage"}
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
                key={cycle.nextCorrectiveGenerationRetriageId}
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
                    <dt>Continuation-cycle recurrence</dt>
                    <dd>{cycle.nextCorrectiveGenerationRecurrenceId}</dd>
                  </div>
                  <div>
                    <dt>Continuation-cycle recurrence fingerprint</dt>
                    <dd>{cycle.nextCorrectiveGenerationRecurrenceFingerprint}</dd>
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
                        "save:" + cycle.nextCorrectiveGenerationRetriageId
                          ? "Saving next-corrective-generation recurrence re-triage…"
                          : "Save next-corrective-generation recurrence re-triage"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void saveRetriage(cycle, "dismissed")}
                      >
                        {busy ===
                        "save:" + cycle.nextCorrectiveGenerationRetriageId
                          ? "Updating next-corrective-generation recurrence cycle…"
                          : "Dismiss next-corrective-generation recurrence cycle"}
                      </button>
                    </div>
                  ) : null}

                  {!locked &&
                  draft.resolutionIntent === "plan-correction" ? (
                    <>
                      <label>
                        Following corrective-generation plan rationale
                        <textarea
                          value={
                            rationales[cycle.nextCorrectiveGenerationRetriageId] ?? ""
                          }
                          onChange={(event) =>
                            setRationales((current) => ({
                              ...current,
                              [cycle.nextCorrectiveGenerationRetriageId]:
                                event.target.value
                            }))
                          }
                          placeholder="Why should this next-corrective-generation recurrence enter a continuation corrective cycle?"
                        />
                      </label>
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !cycle.canManage}
                        onClick={() => void createPlan(cycle)}
                      >
                        {busy ===
                        "plan:" + cycle.nextCorrectiveGenerationRetriageId
                          ? "Freezing following corrective-generation plan…"
                          : "Create following corrective-generation plan"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!model.recurrence.recurrences.length ? (
            <div className="emptyState">
              No governed Build 104 next-corrective-generation recurrence is available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable next-corrective-generation recurrence scope</p>
            <h2>Following corrective-generation plans</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article
              className="publicationCard correctiveCard"
              key={plan.followingCorrectiveGenerationPlanId}
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
                  <dt>Following corrective-generation plan</dt>
                  <dd>{plan.followingCorrectiveGenerationPlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor following corrective-generation plan</dt>
                  <dd>{plan.predecessorNextCorrectiveGenerationPlanId}</dd>
                </div>
                <div>
                  <dt>Predecessor next-corrective-generation delivery</dt>
                  <dd>{plan.predecessorNextCorrectiveGenerationDeliveryId}</dd>
                </div>
                <div>
                  <dt>Source next-corrective-generation recurrence</dt>
                  <dd>{plan.sourceNextCorrectiveGenerationRecurrenceFingerprint}</dd>
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
                        reviewNotes[plan.followingCorrectiveGenerationPlanId] ?? ""
                      }
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [plan.followingCorrectiveGenerationPlanId]:
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
                          "review:" + plan.followingCorrectiveGenerationPlanId
                            ? "Recording next-corrective-generation review…"
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
              No following corrective-generation plan has been created.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
