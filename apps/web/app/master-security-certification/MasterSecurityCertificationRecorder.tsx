"use client";

import { useState, type FormEvent } from "react";

const DIMENSIONS = [
  ["source-signing-trust", "Source signing & trust"],
  ["role-authorization", "Role authorization"],
  ["consent", "Consent"],
  ["sensitive-data-handling", "Sensitive-data handling"],
  ["audit-evidence", "Audit evidence"],
  ["fail-closed-controls", "Fail-closed controls"]
] as const;

async function postCertification(body: Record<string, unknown>) {
  const response = await fetch("/api/master-security-certification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error ?? "master_security_certification_operation_failed"
    );
  }
  return result;
}

export function MasterSecurityCertificationRecorder({
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

      await postCertification({
        sourceId: data.get("sourceId"),
        reviewer: data.get("reviewer"),
        observedAt: new Date(
          String(data.get("observedAt") ?? "")
        ).toISOString(),
        expiresAt: new Date(
          String(data.get("expiresAt") ?? "")
        ).toISOString(),
        branch: data.get("branch"),
        commitSha: data.get("commitSha"),
        notes: data.get("notes"),
        assertions
      });

      setMessage("Master security certification evidence recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "master_security_certification_operation_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Append-only certification</p>
          <h2>Record source security certification</h2>
        </div>
      </div>

      <form className="reviewBatchSummary" onSubmit={submit}>
        <label>
          Source application
          <select name="sourceId" required>
            {sourceIds.map((sourceId) => (
              <option value={sourceId} key={sourceId}>
                {sourceId}
              </option>
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
                  <option value="blocked">BLOCKED</option>
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

        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Recording…" : "Record security certification"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
