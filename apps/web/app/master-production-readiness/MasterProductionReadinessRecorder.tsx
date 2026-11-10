"use client";

import { useState, type FormEvent } from "react";

const DIMENSIONS = [
  ["source-onboarding", "Build 348 source onboarding"],
  ["operational-recovery", "Operational recovery"],
  ["accessibility", "Accessibility"],
  ["production-safeguards", "Production safeguards"],
  ["rollback", "Rollback"]
] as const;

async function postReadiness(body: Record<string, unknown>) {
  const response = await fetch("/api/master-production-readiness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error ?? "master_production_readiness_operation_failed"
    );
  }
  return result;
}

function isoOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

export function MasterProductionReadinessRecorder({
  sourceIds
}: {
  sourceIds: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);

    try {
      const assertions = DIMENSIONS.map(([dimension]) => ({
        dimension,
        outcome: data.get("outcome:" + dimension),
        evidenceURI: data.get("evidenceURI:" + dimension),
        detail: data.get("detail:" + dimension)
      }));

      await postReadiness({
        sourceId: data.get("sourceId"),
        reviewer: data.get("reviewer"),
        observedAt: new Date(String(data.get("observedAt") ?? "")).toISOString(),
        expiresAt: new Date(String(data.get("expiresAt") ?? "")).toISOString(),
        branch: data.get("branch"),
        commitSha: data.get("commitSha"),
        notes: data.get("notes"),
        ownerDecision: data.get("ownerDecision"),
        ownerDecisionEvidenceURI: data.get("ownerDecisionEvidenceURI"),
        ownerDecisionDetail: data.get("ownerDecisionDetail"),
        ownerDecidedAt: isoOrNull(data.get("ownerDecidedAt")),
        assertions
      });

      setMessage("Master production readiness evidence recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "master_production_readiness_operation_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Append-only final readiness evidence</p>
          <h2>Record source readiness and owner decision</h2>
        </div>
      </div>

      <form className="reviewBatchSummary" onSubmit={submit}>
        <label>
          Source application
          <select name="sourceId" required>
            {sourceIds.map((sourceId) => (
              <option value={sourceId} key={sourceId}>{sourceId}</option>
            ))}
          </select>
        </label>

        <label>
          Reviewer
          <input name="reviewer" required />
        </label>

        <label>
          Observed at
          <input type="datetime-local" name="observedAt" required />
        </label>

        <label>
          Expires at
          <input type="datetime-local" name="expiresAt" required />
        </label>

        <label>
          Branch
          <input name="branch" defaultValue="main" required />
        </label>

        <label>
          Commit SHA
          <input name="commitSha" required />
        </label>

        <label>
          Notes (optional)
          <textarea name="notes" />
        </label>

        <div className="reviewBatchList">
          {DIMENSIONS.map(([dimension, label]) => (
            <article className="reviewBatchSummary" key={dimension}>
              <h3>{label}</h3>
              <label>
                Outcome
                <select
                  name={"outcome:" + dimension}
                  defaultValue="blocked"
                  required
                >
                  <option value="pass">PASS</option>
                  <option value="fail">FAIL</option>
                  <option value="blocked">BLOCKED / HOLD</option>
                </select>
              </label>
              <label>
                Evidence URI
                <input
                  name={"evidenceURI:" + dimension}
                  placeholder="urn:rosevear:evidence:..."
                  required
                />
              </label>
              <label>
                Evidence detail
                <textarea name={"detail:" + dimension} required />
              </label>
            </article>
          ))}
        </div>

        <article className="reviewBatchSummary">
          <h3>Explicit owner decision</h3>
          <p>
            ACCEPTED, REJECTED and HELD decisions require the authenticated suite
            owner. Leave NOT REVIEWED until the five readiness dimensions are
            independently complete.
          </p>
          <label>
            Owner decision
            <select name="ownerDecision" defaultValue="not-reviewed" required>
              <option value="not-reviewed">NOT REVIEWED</option>
              <option value="accepted">ACCEPTED</option>
              <option value="held">HELD</option>
              <option value="rejected">REJECTED</option>
            </select>
          </label>
          <label>
            Owner decision evidence URI
            <input
              name="ownerDecisionEvidenceURI"
              placeholder="urn:rosevear:evidence:..."
            />
          </label>
          <label>
            Owner decision detail
            <textarea name="ownerDecisionDetail" />
          </label>
          <label>
            Owner decided at
            <input type="datetime-local" name="ownerDecidedAt" />
          </label>
        </article>

        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Recording…" : "Record production readiness"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
