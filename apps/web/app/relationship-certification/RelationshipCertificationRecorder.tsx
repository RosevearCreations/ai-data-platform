"use client";

import { useState, type FormEvent } from "react";

const DIMENSIONS = [
  ["contract", "Contract"],
  ["identity", "Identity"],
  ["replay", "Replay"],
  ["expiry", "Expiry"],
  ["audience", "Audience"],
  ["tenant-isolation", "Tenant isolation"]
] as const;

async function postCertification(body: Record<string, unknown>) {
  const response = await fetch("/api/relationship-certification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error ?? "relationship_certification_operation_failed"
    );
  }
  return result;
}

export function RelationshipCertificationRecorder({
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
        relationshipId: data.get("relationshipId"),
        pattern: data.get("pattern"),
        sourceIds: data.getAll("sourceIds"),
        destinationIds: data.getAll("destinationIds"),
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

      setMessage("Relationship certification evidence recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "relationship_certification_operation_failed"
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
          <h2>Record relationship certification run</h2>
        </div>
      </div>

      <form className="reviewBatchSummary" onSubmit={submit}>
        <label>
          Relationship ID
          <input
            name="relationshipId"
            placeholder="e.g. booking-to-notification"
            required
          />
        </label>

        <label>
          Relationship pattern
          <select name="pattern" defaultValue="one-to-one" required>
            <option value="one-to-one">One-to-One</option>
            <option value="one-to-many">One-to-Many</option>
            <option value="many-to-one">Many-to-One</option>
            <option value="many-to-many">Many-to-Many</option>
          </select>
        </label>

        <label>
          Source applications
          <select name="sourceIds" multiple required size={6}>
            {sourceIds.map((sourceId) => (
              <option value={sourceId} key={"source:" + sourceId}>
                {sourceId}
              </option>
            ))}
          </select>
        </label>

        <label>
          Destination applications
          <select name="destinationIds" multiple required size={6}>
            {sourceIds.map((sourceId) => (
              <option value={sourceId} key={"destination:" + sourceId}>
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
                <textarea
                  name={"detail:" + dimension}
                  required
                />
              </label>
            </article>
          ))}
        </div>

        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Recording…" : "Record certification run"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
