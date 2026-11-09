"use client";

import { useState, type FormEvent } from "react";

const PREREQUISITES = [
  ["original-source-owned-evidence", "Original source-owned evidence"],
  ["source-registry-readiness", "Source registry readiness"],
  ["security-certification", "Build 347 security certification"],
  ["recovery-readiness", "Recovery readiness"],
  ["rollback-readiness", "Rollback readiness"],
  ["owner-pilot-authorization", "Owner pilot authorization"]
] as const;

async function postOnboarding(body: Record<string, unknown>) {
  const response = await fetch("/api/source-onboarding-pilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "source_onboarding_operation_failed");
  }
  return result;
}

function isoOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

export function SourceOnboardingPilotRecorder({
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
      const assertions = PREREQUISITES.map(([prerequisite]) => ({
        prerequisite,
        outcome: data.get("outcome:" + prerequisite),
        evidenceURI: data.get("evidenceURI:" + prerequisite),
        detail: data.get("detail:" + prerequisite)
      }));

      await postOnboarding({
        sourceId: data.get("sourceId"),
        reviewer: data.get("reviewer"),
        observedAt: new Date(String(data.get("observedAt") ?? "")).toISOString(),
        expiresAt: new Date(String(data.get("expiresAt") ?? "")).toISOString(),
        branch: data.get("branch"),
        commitSha: data.get("commitSha"),
        notes: data.get("notes"),
        pilotOutcome: data.get("pilotOutcome"),
        pilotStartedAt: isoOrNull(data.get("pilotStartedAt")),
        pilotEndedAt: isoOrNull(data.get("pilotEndedAt")),
        pilotEvidenceURI: data.get("pilotEvidenceURI"),
        pilotDetail: data.get("pilotDetail"),
        assertions
      });

      setMessage("Source onboarding evidence recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "source_onboarding_operation_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">One source at a time</p>
          <h2>Record onboarding / supervised pilot evidence</h2>
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
          {PREREQUISITES.map(([prerequisite, label]) => (
            <article className="reviewBatchSummary" key={prerequisite}>
              <h3>{label}</h3>
              <label>
                Outcome
                <select
                  name={"outcome:" + prerequisite}
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
                  name={"evidenceURI:" + prerequisite}
                  placeholder="urn:rosevear:evidence:..."
                  required
                />
              </label>
              <label>
                Evidence detail
                <textarea name={"detail:" + prerequisite} required />
              </label>
            </article>
          ))}
        </div>

        <article className="reviewBatchSummary">
          <h3>Supervised production pilot</h3>
          <p>
            Leave the outcome as NOT RUN until all prerequisites are independently
            evidenced. Pilot windows may not overlap another source pilot.
          </p>
          <label>
            Pilot outcome
            <select name="pilotOutcome" defaultValue="not-run" required>
              <option value="not-run">NOT RUN</option>
              <option value="pass">PASS</option>
              <option value="fail">FAIL</option>
              <option value="blocked">BLOCKED / HOLD</option>
            </select>
          </label>
          <label>
            Pilot started at
            <input type="datetime-local" name="pilotStartedAt" />
          </label>
          <label>
            Pilot ended at
            <input type="datetime-local" name="pilotEndedAt" />
          </label>
          <label>
            Pilot evidence URI
            <input name="pilotEvidenceURI" placeholder="urn:rosevear:evidence:..." />
          </label>
          <label>
            Pilot evidence detail
            <textarea name="pilotDetail" />
          </label>
        </article>

        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Recording…" : "Record onboarding evidence"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
