"use client";

import { useState } from "react";

import type {
  CorrectiveGenerationRetriage,
  UnifiedCorrectiveGenerationPlanningModel,
  UnifiedCorrectiveGenerationPlan
} from "@/lib/unified-corrective-generation-planning";
import type {
  ExceptionClassification,
  ExceptionResolutionIntent,
  ExceptionSeverity
} from "@/lib/reconciliation-exception-triage";

const classifications: ExceptionClassification[] = [
  "consumer-drift","consumer-missing","expected-change","source-superseded","mixed","unknown"
];
const severities: ExceptionSeverity[] = ["low","medium","high","critical"];
const intents: ExceptionResolutionIntent[] = ["investigate","accept-drift","plan-correction","no-action"];

export function UnifiedCorrectiveGenerationPlanningWorkbench({
  initialModel
}: {
  initialModel: UnifiedCorrectiveGenerationPlanningModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [rationales, setRationales] = useState<Record<string,string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string,string>>({});

  async function request(method: "POST" | "PATCH", body: Record<string,unknown>) {
    setMessage("");
    const response = await fetch("/api/approved-data/reconciliation/unified-corrective-generation-planning", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error ?? "Corrective-generation planning request failed.");
    const next = (payload.model ?? payload) as UnifiedCorrectiveGenerationPlanningModel;
    setModel(next);
  }

  async function createRetriage(workspaceId: string, successorSourceId: string) {
    setBusy("retriage:" + successorSourceId);
    try {
      await request("POST", { action:"create-corrective-generation-retriage", workspaceId, successorSourceId });
      setMessage("Successor recurrence moved into unified re-triage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-triage failed.");
    } finally {
      setBusy("");
    }
  }

  async function saveRetriage(item: CorrectiveGenerationRetriage) {
    setBusy("save:" + item.correctiveGenerationRetriageId);
    try {
      await request("PATCH", {
        action:"update-corrective-generation-retriage",
        workspaceId:item.workspaceId,
        correctiveGenerationRetriageId:item.correctiveGenerationRetriageId,
        status:item.status === "dismissed" ? "dismissed" : "open",
        classification:item.classification,
        severity:item.severity,
        resolutionIntent:item.resolutionIntent,
        summary:item.summary,
        investigationNote:item.investigationNote
      });
      setMessage("Unified corrective-generation re-triage saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-triage update failed.");
    } finally {
      setBusy("");
    }
  }

  async function createPlan(item: CorrectiveGenerationRetriage) {
    setBusy("plan:" + item.correctiveGenerationRetriageId);
    try {
      await request("POST", {
        action:"create-corrective-generation-plan",
        workspaceId:item.workspaceId,
        correctiveGenerationRetriageId:item.correctiveGenerationRetriageId,
        rationale:rationales[item.correctiveGenerationRetriageId] ?? ""
      });
      setMessage("Unified corrective-generation plan created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function reviewPlan(item: UnifiedCorrectiveGenerationPlan, decision: "approved" | "rejected" | "withdrawn") {
    setBusy("review:" + item.correctiveGenerationPlanId);
    try {
      await request("PATCH", {
        action:"review-corrective-generation-plan",
        workspaceId:item.workspaceId,
        correctiveGenerationPlanId:item.correctiveGenerationPlanId,
        decision,
        reviewNote:reviewNotes[item.correctiveGenerationPlanId] ?? ""
      });
      setMessage("Unified corrective-generation plan review recorded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan review failed.");
    } finally {
      setBusy("");
    }
  }

  function patchRetriage(id: string, patch: Partial<CorrectiveGenerationRetriage>) {
    setModel((current) => ({
      ...current,
      retriage: current.retriage.map((item) =>
        item.correctiveGenerationRetriageId === id ? { ...item, ...patch } : item
      )
    }));
  }

  const retriaged = new Set(model.retriage.map((item) => item.workspaceId + ":" + item.successorSourceId));

  return (
    <>
      <section className="panel">
        <div className="metricGrid">
          <article className="metricCard"><strong>{model.totals.successorsWithoutRetriage}</strong><span>Successors awaiting re-triage</span></article>
          <article className="metricCard"><strong>{model.totals.activeRetriage}</strong><span>Active re-triage</span></article>
          <article className="metricCard"><strong>{model.totals.proposedPlans}</strong><span>Proposed plans</span></article>
          <article className="metricCard"><strong>{model.totals.approvedPlans}</strong><span>Approved plans</span></article>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 109 successor sources</p>
            <h2>Successors ready for unified re-triage</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.lineage.successors.map((source) => {
            const key = source.workspaceId + ":" + source.successorSourceId;
            return (
              <article className="publicationCard correctiveCard" key={key}>
                <header>
                  <div>
                    <span className="publishState publishState-published">G{source.generationNumber}</span>
                    <h3>{source.target} · {source.caseId}</h3>
                    <p>{source.sourceRecurrenceKind}</p>
                  </div>
                  <span className="badge">{source.status}</span>
                </header>
                <dl className="publicationEvidence">
                  <div><dt>Successor source</dt><dd>{source.successorSourceId}</dd></div>
                  <div><dt>Predecessor lineage</dt><dd>{source.predecessorGenerationLineageId}</dd></div>
                  <div><dt>Recurrence fingerprint</dt><dd>{source.sourceRecurrenceFingerprint}</dd></div>
                </dl>
                {!retriaged.has(key) ? (
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !(source.role === "owner" || source.role === "admin")}
                    onClick={() => void createRetriage(source.workspaceId, source.successorSourceId)}
                  >
                    {busy === "retriage:" + source.successorSourceId ? "Creating re-triage…" : "Create unified re-triage"}
                  </button>
                ) : null}
              </article>
            );
          })}
          {!model.lineage.successors.length ? <div className="emptyState">No governed successor source is ready.</div> : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading"><div><p className="eyebrow">Generation-agnostic governance</p><h2>Re-triage</h2></div></div>
        <div className="publicationList">
          {model.retriage.map((item) => (
            <article className="publicationCard correctiveCard" key={item.correctiveGenerationRetriageId}>
              <header>
                <div>
                  <span className="publishState publishState-published">G{item.generationNumber} · {item.status}</span>
                  <h3>{item.target} · {item.caseId}</h3>
                  <p>{item.summary}</p>
                </div>
                <span className="badge">{item.affectedRecordCount} affected</span>
              </header>
              <div className="correctiveAction">
                <label>Classification
                  <select value={item.classification} disabled={!item.canManage || item.status === "approved" || item.status === "dismissed"}
                    onChange={(e)=>patchRetriage(item.correctiveGenerationRetriageId,{classification:e.target.value as ExceptionClassification})}>
                    {classifications.map((value)=><option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>Severity
                  <select value={item.severity} disabled={!item.canManage || item.status === "approved" || item.status === "dismissed"}
                    onChange={(e)=>patchRetriage(item.correctiveGenerationRetriageId,{severity:e.target.value as ExceptionSeverity})}>
                    {severities.map((value)=><option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>Resolution intent
                  <select value={item.resolutionIntent} disabled={!item.canManage || item.status === "approved" || item.status === "dismissed"}
                    onChange={(e)=>patchRetriage(item.correctiveGenerationRetriageId,{resolutionIntent:e.target.value as ExceptionResolutionIntent})}>
                    {intents.map((value)=><option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label>Summary
                  <textarea value={item.summary} disabled={!item.canManage || item.status === "approved" || item.status === "dismissed"}
                    onChange={(e)=>patchRetriage(item.correctiveGenerationRetriageId,{summary:e.target.value})}/>
                </label>
                <label>Investigation note
                  <textarea value={item.investigationNote} disabled={!item.canManage || item.status === "approved" || item.status === "dismissed"}
                    onChange={(e)=>patchRetriage(item.correctiveGenerationRetriageId,{investigationNote:e.target.value})}/>
                </label>
                {item.status !== "approved" && item.status !== "dismissed" ? (
                  <div className="heroActions">
                    <button className="secondaryButton" type="button" disabled={Boolean(busy)||!item.canManage} onClick={()=>void saveRetriage(item)}>
                      {busy === "save:" + item.correctiveGenerationRetriageId ? "Saving…" : "Save re-triage"}
                    </button>
                    {item.resolutionIntent === "plan-correction" ? (
                      <>
                        <textarea
                          value={rationales[item.correctiveGenerationRetriageId] ?? ""}
                          onChange={(e)=>setRationales((current)=>({...current,[item.correctiveGenerationRetriageId]:e.target.value}))}
                          placeholder="Why should this successor enter the next corrective generation?"
                        />
                        <button className="primary" type="button" disabled={Boolean(busy)||!item.canManage} onClick={()=>void createPlan(item)}>
                          {busy === "plan:" + item.correctiveGenerationRetriageId ? "Creating plan…" : "Create corrective-generation plan"}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!model.retriage.length ? <div className="emptyState">No unified re-triage records yet.</div> : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading"><div><p className="eyebrow">Immutable successor scope</p><h2>Unified corrective-generation plans</h2></div></div>
        <div className="publicationList">
          {model.plans.map((plan) => (
            <article className="publicationCard correctiveCard" key={plan.correctiveGenerationPlanId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (plan.status === "approved" ? "published" : "withdrawn")}>{plan.status}</span>
                  <h3>G{plan.generationNumber} · {plan.target} · {plan.caseId}</h3>
                  <p>{plan.rationale}</p>
                </div>
                <span className="badge">{plan.correctionScope.length} scoped record(s)</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Corrective-generation plan</dt><dd>{plan.correctiveGenerationPlanId}</dd></div>
                <div><dt>Predecessor plan</dt><dd>{plan.predecessorPlanId}</dd></div>
                <div><dt>Predecessor package</dt><dd>{plan.predecessorPackageId}</dd></div>
                <div><dt>Source recurrence</dt><dd>{plan.sourceRecurrenceFingerprint}</dd></div>
                <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
              </dl>
              {plan.status === "proposed" ? (
                <div className="correctiveAction">
                  <label>Review note
                    <textarea value={reviewNotes[plan.correctiveGenerationPlanId] ?? ""}
                      onChange={(e)=>setReviewNotes((current)=>({...current,[plan.correctiveGenerationPlanId]:e.target.value}))}/>
                  </label>
                  <div className="heroActions">
                    {(["approved","rejected","withdrawn"] as const).map((decision)=>(
                      <button
                        className={decision === "approved" ? "primary" : "secondaryButton"}
                        type="button"
                        key={decision}
                        disabled={Boolean(busy)||!plan.canManage}
                        onClick={()=>void reviewPlan(plan,decision)}
                      >
                        {busy === "review:" + plan.correctiveGenerationPlanId ? "Recording review…" : decision}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!model.plans.length ? <div className="emptyState">No unified corrective-generation plan has been created.</div> : null}
        </div>
      </section>
    </>
  );
}
