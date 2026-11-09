"use client";

import { FormEvent, useMemo, useState } from "react";

type Requirement = {
  requirementId: string;
  revisionNumber: number;
  sourceId: string;
  moduleId: string | null;
  requirementKey: string;
  title: string;
  applicability: string;
  requiredAxes: string[];
  weight: number;
  critical: boolean;
};

const SOURCES = [
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
  "ai-data-platform",
  "rosevear-ai-hub"
];

const AXES = [
  "design",
  "implementation",
  "automated-testing",
  "integration-verification",
  "security",
  "accessibility-device-acceptance",
  "production-user-acceptance"
];

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/master-completion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.error ?? "master_completion_operation_failed"
    );
  }
  return result;
}

export function CompletionConsole({
  requirements
}: {
  requirements: Requirement[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requiredRequirements = useMemo(
    () =>
      requirements.filter(
        (item) => item.applicability === "required"
      ),
    [requirements]
  );

  async function submit(
    key: string,
    body: Record<string, unknown>
  ) {
    setBusy(key);
    setMessage(null);
    try {
      await post(body);
      setMessage("Recorded successfully.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "master_completion_operation_failed"
      );
    } finally {
      setBusy(null);
    }
  }

  function formData(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    return new FormData(form);
  }

  return (
    <>
      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Requirement registry</p>
            <h2>Record a requirement revision</h2>
          </div>
        </div>
        <form
          className="reviewBatchSummary"
          onSubmit={(event) => {
            event.preventDefault();
            const data = formData(event);
            const applicability = String(
              data.get("applicability") ?? "required"
            );
            const requiredAxes =
              applicability === "required"
                ? AXES.filter(
                    (axis) =>
                      data.get("axis:" + axis) === "on"
                  )
                : [];
            void submit("requirement", {
              action: "record-requirement-revision",
              sourceId: data.get("sourceId"),
              moduleId: data.get("moduleId"),
              requirementKey: data.get("requirementKey"),
              title: data.get("title"),
              description: data.get("description"),
              applicability,
              requiredAxes,
              weight: Number(data.get("weight")),
              critical: data.get("critical") === "on"
            });
          }}
        >
          <label>
            Source
            <select name="sourceId" required>
              {SOURCES.map((source) => (
                <option value={source} key={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label>
            Module ID (optional)
            <input name="moduleId" />
          </label>
          <label>
            Stable requirement key
            <input
              name="requirementKey"
              placeholder="customer.booking.mobile"
              required
            />
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Description
            <textarea name="description" required />
          </label>
          <label>
            Applicability
            <select name="applicability" defaultValue="required">
              <option value="required">required</option>
              <option value="not-applicable">
                not-applicable
              </option>
              <option value="unscoped">unscoped</option>
            </select>
          </label>
          <fieldset>
            <legend>Required evidence axes</legend>
            {AXES.map((axis) => (
              <label key={axis}>
                <input
                  type="checkbox"
                  name={"axis:" + axis}
                  defaultChecked
                />{" "}
                {axis}
              </label>
            ))}
          </fieldset>
          <label>
            Weight
            <input
              type="number"
              name="weight"
              min="0.001"
              max="100"
              step="0.001"
              defaultValue="1"
              required
            />
          </label>
          <label>
            <input type="checkbox" name="critical" /> Critical
          </label>
          <button
            className="primaryButton"
            disabled={busy !== null}
            type="submit"
          >
            {busy === "requirement"
              ? "Recording…"
              : "Record requirement revision"}
          </button>
        </form>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Approved denominator</p>
            <h2>Pin what counts for a scope</h2>
          </div>
        </div>
        <form
          className="reviewBatchSummary"
          onSubmit={(event) => {
            event.preventDefault();
            const data = formData(event);
            void submit("denominator", {
              action: "approve-denominator",
              sourceId: data.get("sourceId"),
              moduleId: data.get("moduleId"),
              scopeDate: data.get("scopeDate"),
              branch: data.get("branch"),
              commitSha: data.get("commitSha"),
              approvedBy: data.get("approvedBy"),
              requirementIds: requiredRequirements
                .filter(
                  (item) =>
                    data.get(
                      "requirement:" + item.requirementId
                    ) === "on"
                )
                .map((item) => item.requirementId)
            });
          }}
        >
          <label>
            Source
            <select name="sourceId" required>
              {SOURCES.map((source) => (
                <option value={source} key={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label>
            Module ID (optional; blank = source-wide scope)
            <input name="moduleId" />
          </label>
          <label>
            Scope date
            <input type="date" name="scopeDate" required />
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
            Approved by
            <input name="approvedBy" required />
          </label>
          <fieldset>
            <legend>Explicit denominator requirements</legend>
            {requiredRequirements.length ? (
              requiredRequirements.map((item) => (
                <label key={item.requirementId}>
                  <input
                    type="checkbox"
                    name={"requirement:" + item.requirementId}
                  />{" "}
                  <code>{item.requirementId}</code> · {item.sourceId}
                  {item.moduleId ? " / " + item.moduleId : ""} ·{" "}
                  {item.title} · rev {item.revisionNumber}
                </label>
              ))
            ) : (
              <p>No required requirements are registered yet.</p>
            )}
          </fieldset>
          <button
            className="primaryButton"
            disabled={busy !== null}
            type="submit"
          >
            {busy === "denominator"
              ? "Approving…"
              : "Approve denominator"}
          </button>
        </form>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Evidence axes</p>
            <h2>Record independently scoped evidence</h2>
          </div>
        </div>
        <form
          className="reviewBatchSummary"
          onSubmit={(event) => {
            event.preventDefault();
            const data = formData(event);
            void submit("evidence", {
              action: "record-evidence",
              requirementId: data.get("requirementId"),
              axis: data.get("axis"),
              state: data.get("state"),
              evidenceURI: data.get("evidenceURI"),
              reviewer: data.get("reviewer"),
              confidence: Number(data.get("confidence")),
              observedAt: new Date(
                String(data.get("observedAt"))
              ).toISOString(),
              expiresAt: new Date(
                String(data.get("expiresAt"))
              ).toISOString(),
              branch: data.get("branch"),
              commitSha: data.get("commitSha"),
              notes: data.get("notes")
            });
          }}
        >
          <label>
            Requirement
            <select name="requirementId" required>
              {requiredRequirements.map((item) => (
                <option
                  value={item.requirementId}
                  key={item.requirementId}
                >
                  {item.sourceId} · {item.title} · rev{" "}
                  {item.revisionNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Axis
            <select name="axis" required>
              {AXES.map((axis) => (
                <option value={axis} key={axis}>
                  {axis}
                </option>
              ))}
            </select>
          </label>
          <label>
            State
            <select name="state" defaultValue="SATISFIED">
              <option value="SATISFIED">SATISFIED</option>
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
              step="0.001"
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
          <button
            className="primaryButton"
            disabled={busy !== null}
            type="submit"
          >
            {busy === "evidence"
              ? "Recording…"
              : "Record evidence"}
          </button>
        </form>
      </section>

      {message ? <p role="status">{message}</p> : null}
    </>
  );
}
