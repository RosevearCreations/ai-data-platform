"use client";

import { useState, type FormEvent } from "react";

type ApplicationOption = {
  sourceId: string;
  displayName: string;
  modules: string[];
};

async function postAcceptance(body: Record<string, unknown>) {
  const response = await fetch("/api/role-device-acceptance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error ?? "role_device_acceptance_operation_failed"
    );
  }
  return result;
}

export function RoleDeviceAcceptanceRecorder({
  applications
}: {
  applications: ApplicationOption[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await postAcceptance({
        sourceId: data.get("sourceId"),
        moduleId: data.get("moduleId"),
        role: data.get("role"),
        device: data.get("device"),
        state: data.get("state"),
        evidenceURI: data.get("evidenceURI"),
        reviewer: data.get("reviewer"),
        confidence: Number(data.get("confidence")),
        observedAt: new Date(
          String(data.get("observedAt") ?? "")
        ).toISOString(),
        expiresAt: new Date(
          String(data.get("expiresAt") ?? "")
        ).toISOString(),
        branch: data.get("branch"),
        commitSha: data.get("commitSha"),
        notes: data.get("notes")
      });
      setMessage("Acceptance evidence recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "role_device_acceptance_operation_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Append-only evidence</p>
          <h2>Record role/device acceptance</h2>
        </div>
      </div>
      <form className="reviewBatchSummary" onSubmit={submit}>
        <label>
          Source
          <select name="sourceId" required>
            {applications.map((application) => (
              <option value={application.sourceId} key={application.sourceId}>
                {application.displayName} · {application.sourceId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Module ID (optional; blank = application-wide)
          <input
            name="moduleId"
            list="role-device-module-ids"
            placeholder="Leave blank for application-wide evidence"
          />
          <datalist id="role-device-module-ids">
            {applications.flatMap((application) =>
              application.modules.map((moduleId) => (
                <option
                  value={moduleId}
                  key={application.sourceId + ":" + moduleId}
                />
              ))
            )}
          </datalist>
        </label>
        <label>
          Role
          <select name="role" defaultValue="customer" required>
            <option value="customer">Customer</option>
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label>
          Device
          <select name="device" defaultValue="mobile" required>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>
        <label>
          Acceptance state
          <select name="state" defaultValue="ACCEPTED" required>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>
        <label>
          Evidence URI
          <input
            name="evidenceURI"
            placeholder="urn:rosevear:evidence:..."
            required
          />
        </label>
        <label>
          Reviewer
          <input name="reviewer" required />
        </label>
        <label>
          Confidence (0–1)
          <input
            type="number"
            name="confidence"
            min="0"
            max="1"
            step="0.01"
            defaultValue="1"
            required
          />
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
        <button className="primaryButton" type="submit" disabled={busy}>
          {busy ? "Recording…" : "Record acceptance evidence"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
