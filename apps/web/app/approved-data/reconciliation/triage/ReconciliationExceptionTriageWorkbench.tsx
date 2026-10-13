"use client";

import { useMemo, useState } from "react";

import type {
  CorrectiveDeliveryPlan,
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity,
  ReconciliationExceptionCase,
  ReconciliationExceptionTriageModel
} from "@/lib/reconciliation-exception-triage";
import type { LiveDeliveryReconciliation } from "@/lib/post-delivery-reconciliation";

import { HelpInfo } from "../../../help/HelpInfo";

type DraftCase = {
  classification: ExceptionClassification;
  severity: ExceptionSeverity;
  resolutionIntent: ExceptionResolutionIntent;
  summary: string;
};

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/approved-data/reconciliation/triage", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Reconciliation triage request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function defaultDraft(item: LiveDeliveryReconciliation): DraftCase {
  const missingOnly =
    item.missingCount > 0 && item.mismatchedCount === 0;
  return {
    classification: missingOnly ? "consumer-missing" : "consumer-drift",
    severity: item.missingCount > 0 ? "high" : "medium",
    resolutionIntent: "investigate",
    summary:
      "Review " +
      item.mismatchedCount +
      " mismatched and " +
      item.missingCount +
      " missing record(s) from reconciliation " +
      item.reconciliationId +
      "."
  };
}

export function ReconciliationExceptionTriageWorkbench({
  initialModel
}: {
  initialModel: ReconciliationExceptionTriageModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [caseDrafts, setCaseDrafts] = useState<Record<string, DraftCase>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const caseByReconciliation = useMemo(
    () =>
      new Map(
        model.cases.map((item) => [
          item.workspaceId + ":" + item.reconciliationId,
          item
        ])
      ),
    [model.cases]
  );

  const uncoveredDrift = model.reconciliation.reconciliations.filter(
    (item) =>
      item.status === "drift" &&
      !caseByReconciliation.has(item.workspaceId + ":" + item.reconciliationId)
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as ReconciliationExceptionTriageModel);
    }
  }

  async function createCase(item: LiveDeliveryReconciliation) {
    const key = item.workspaceId + ":" + item.reconciliationId;
    const draft = caseDrafts[key] ?? defaultDraft(item);
    setBusy("case:" + key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "create-case",
        workspaceId: item.workspaceId,
        reconciliationId: item.reconciliationId,
        ...draft
      });
      applyModel(payload);
      setMessage("Exception case created from immutable Build 052 drift evidence.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Case creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveCase(item: ReconciliationExceptionCase) {
    setBusy("save:" + item.caseId);
    setMessage("");
    try {
      const next = await api("PATCH", {
        action: "update-case",
        workspaceId: item.workspaceId,
        caseId: item.caseId,
        status: item.status,
        classification: item.classification,
        severity: item.severity,
        resolutionIntent: item.resolutionIntent,
        summary: item.summary,
        investigationNote: notes[item.caseId] ?? item.investigationNote
      });
      setModel(next as unknown as ReconciliationExceptionTriageModel);
      setMessage("Triage case notes updated. Source reconciliation evidence was not changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Case update failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: ReconciliationExceptionCase) {
    setBusy("plan:" + item.caseId);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "create-plan",
        workspaceId: item.workspaceId,
        caseId: item.caseId,
        rationale:
          rationales[item.caseId] ??
          "Prepare a corrective plan for the governed fields identified by this reconciliation drift."
      });
      applyModel(payload);
      setMessage(
        "Corrective plan frozen for review. No consumer call or corrective mutation was performed."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(
    item: CorrectiveDeliveryPlan,
    decision: "approved" | "rejected" | "withdrawn"
  ) {
    setBusy("review:" + item.planId);
    setMessage("");
    try {
      const next = await api("PATCH", {
        action: "review-plan",
        workspaceId: item.workspaceId,
        planId: item.planId,
        decision,
        reviewNote:
          reviewNotes[item.planId] ??
          (decision === "approved"
            ? "Reviewed and approved as a planning artifact only. No execution authorized."
            : "Reviewed and not approved for corrective execution.")
      });
      setModel(next as unknown as ReconciliationExceptionTriageModel);
      setMessage(
        decision === "approved"
          ? "Plan approved as evidence only. Build 053 still cannot execute it."
          : "Plan review recorded."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan review failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="triageSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exception workflow</p>
            <h2>Triage status</h2>
          </div>
          <HelpInfo topic="reconciliation-triage-overview" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.driftWithoutCase}</strong><span>drift without case</span></article>
          <article><strong>{model.totals.openCases}</strong><span>open / planned cases</span></article>
          <article><strong>{model.totals.proposedPlans}</strong><span>plans awaiting review</span></article>
          <article><strong>{model.totals.approvedPlans}</strong><span>approved planning artifacts</span></article>
        </div>
      </section>

      <section className="triageNotice">
        <strong>Approval is not execution</strong>
        <p>
          Build 053 can classify drift and approve a frozen corrective plan, but it has
          no endpoint that sends that plan to Rosie Dazzlers, Devil n Dove, or any
          other consumer.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="triageSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Untriaged Build 052 drift</p>
            <h2>Create exception cases</h2>
          </div>
          <HelpInfo topic="reconciliation-triage-case" />
        </div>
        <div className="publicationList">
          {uncoveredDrift.map((item) => {
            const key = item.workspaceId + ":" + item.reconciliationId;
            const draft = caseDrafts[key] ?? defaultDraft(item);
            return (
              <article className="publicationCard triageCard" key={key}>
                <header>
                  <div>
                    <span className="publishState publishState-withdrawn">drift</span>
                    <h3>{item.target} · {item.packageId}</h3>
                    <p>{item.workspaceName}</p>
                  </div>
                  <span className="badge">{item.mismatchedCount} mismatched · {item.missingCount} missing</span>
                </header>
                <div className="triageGrid">
                  <label>
                    Classification
                    <select value={draft.classification} onChange={(event) =>
                      setCaseDrafts((values) => ({
                        ...values,
                        [key]: { ...draft, classification: event.target.value as ExceptionClassification }
                      }))
                    }>
                      {["consumer-drift","consumer-missing","expected-change","source-superseded","mixed","unknown"].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Severity
                    <select value={draft.severity} onChange={(event) =>
                      setCaseDrafts((values) => ({
                        ...values,
                        [key]: { ...draft, severity: event.target.value as ExceptionSeverity }
                      }))
                    }>
                      {["low","medium","high","critical"].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    Intent
                    <select value={draft.resolutionIntent} onChange={(event) =>
                      setCaseDrafts((values) => ({
                        ...values,
                        [key]: { ...draft, resolutionIntent: event.target.value as ExceptionResolutionIntent }
                      }))
                    }>
                      {["investigate","accept-drift","plan-correction","no-action"].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>
                <textarea value={draft.summary} onChange={(event) =>
                  setCaseDrafts((values) => ({
                    ...values,
                    [key]: { ...draft, summary: event.target.value }
                  }))
                } />
                <button className="primary" type="button" disabled={Boolean(busy)} onClick={() => void createCase(item)}>
                  {busy === "case:" + key ? "Creating…" : "Create triage case"}
                </button>
              </article>
            );
          })}
          {!uncoveredDrift.length ? <div className="emptyState">No untriaged drift reconciliation remains.</div> : null}
        </div>
      </section>

      <section className="triageSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Case investigation</p>
            <h2>Exception cases</h2>
          </div>
          <HelpInfo topic="reconciliation-triage-planning" />
        </div>
        <div className="publicationList">
          {model.cases.map((item) => (
            <article className="publicationCard triageCard" key={item.caseId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (item.status === "approved" ? "published" : "withdrawn")}>{item.status}</span>
                  <h3>{item.classification} · {item.severity}</h3>
                  <p>{item.summary}</p>
                </div>
                <span className="badge">{item.affectedRecordCount} affected record(s)</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Reconciliation</dt><dd>{item.reconciliationId}</dd></div>
                <div><dt>Package</dt><dd>{item.packageId}</dd></div>
                <div><dt>Affected keys</dt><dd>{item.affectedIntegrationKeys.join(", ")}</dd></div>
                <div><dt>Affected fields</dt><dd>{item.affectedFields.join(", ")}</dd></div>
              </dl>
              <textarea
                value={notes[item.caseId] ?? item.investigationNote}
                onChange={(event) => setNotes((values) => ({ ...values, [item.caseId]: event.target.value }))}
                placeholder="Investigation notes"
              />
              <div className="heroActions">
                <button className="secondaryButton" type="button" disabled={Boolean(busy)} onClick={() => void saveCase(item)}>
                  {busy === "save:" + item.caseId ? "Saving…" : "Save notes"}
                </button>
              </div>
              {item.resolutionIntent === "plan-correction" && item.status !== "closed" && item.status !== "dismissed" ? (
                <div className="triagePlanDraft">
                  <textarea
                    value={rationales[item.caseId] ?? ""}
                    onChange={(event) => setRationales((values) => ({ ...values, [item.caseId]: event.target.value }))}
                    placeholder="Why is a corrective delivery plan appropriate?"
                  />
                  <button className="primary" type="button" disabled={Boolean(busy)} onClick={() => void createPlan(item)}>
                    {busy === "plan:" + item.caseId ? "Freezing plan…" : "Create frozen corrective plan"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!model.cases.length ? <div className="emptyState">No Build 053 exception case exists yet.</div> : null}
        </div>
      </section>

      <section className="triageSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Frozen planning evidence</p>
            <h2>Corrective delivery plans</h2>
          </div>
          <HelpInfo topic="reconciliation-triage-review" />
        </div>
        <div className="publicationList">
          {model.plans.map((item) => (
            <article className="publicationCard triageCard" key={item.planId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (item.status === "approved" ? "published" : "withdrawn")}>{item.status}</span>
                  <h3>{item.target} · {item.packageId}</h3>
                  <p>{item.rationale}</p>
                </div>
                <span className="badge">{item.correctionScope.length} scoped record(s)</span>
              </header>
              <div className="triageScope">
                {item.correctionScope.map((scope) => (
                  <div key={scope.integrationKey}>
                    <strong>{scope.integrationKey}</strong>
                    <span>{scope.issueStatus} · {scope.proposedAction}</span>
                    <small>Fields: {scope.governedFields.join(", ")}</small>
                    <code>{JSON.stringify(scope.desiredValues)}</code>
                  </div>
                ))}
              </div>
              <code className="reconciliationFingerprint">{item.planFingerprint}</code>
              {item.status === "proposed" ? (
                <>
                  <textarea
                    value={reviewNotes[item.planId] ?? ""}
                    onChange={(event) => setReviewNotes((values) => ({ ...values, [item.planId]: event.target.value }))}
                    placeholder="Review note"
                  />
                  <div className="heroActions">
                    <button className="primary" type="button" disabled={Boolean(busy)} onClick={() => void reviewPlan(item, "approved")}>
                      {busy === "review:" + item.planId ? "Reviewing…" : "Approve plan only"}
                    </button>
                    <button className="secondaryButton" type="button" disabled={Boolean(busy)} onClick={() => void reviewPlan(item, "rejected")}>Reject plan</button>
                    <button className="secondaryButton" type="button" disabled={Boolean(busy)} onClick={() => void reviewPlan(item, "withdrawn")}>Withdraw plan</button>
                  </div>
                </>
              ) : (
                <p className="bridgeHint">
                  Reviewed {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : ""}. This status does not authorize execution.
                </p>
              )}
            </article>
          ))}
          {!model.plans.length ? <div className="emptyState">No corrective delivery plan has been frozen.</div> : null}
        </div>
      </section>
    </>
  );
}
