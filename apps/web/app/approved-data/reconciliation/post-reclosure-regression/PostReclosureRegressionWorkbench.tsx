"use client";

import { useMemo, useState } from "react";

import type {
  PostReclosureRegressionCheck,
  PostReclosureRegressionModel,
  ReconciliationExceptionRecurrence
} from "@/lib/post-reclosure-regression";
import type { ReconciliationExceptionReclosure } from "@/lib/successor-corrective-delivery-reconciliation";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-reclosure-regression",
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
        : "Post-re-closure regression request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByReclosure(checks: PostReclosureRegressionCheck[]) {
  const map = new Map<string, PostReclosureRegressionCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.reclosureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function recurrenceByReclosure(
  recurrences: ReconciliationExceptionRecurrence[]
) {
  return new Map(
    recurrences.map((item) => [
      item.workspaceId + ":" + item.reclosureId,
      item
    ])
  );
}

export function PostReclosureRegressionWorkbench({
  initialModel
}: {
  initialModel: PostReclosureRegressionModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const latest = useMemo(
    () => latestByReclosure(model.checks),
    [model.checks]
  );
  const recurrences = useMemo(
    () => recurrenceByReclosure(model.recurrences),
    [model.recurrences]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as PostReclosureRegressionModel);
    } else if (payload.closure) {
      setModel(payload as unknown as PostReclosureRegressionModel);
    }
  }

  async function verify(reclosure: ReconciliationExceptionReclosure) {
    const key = "verify:" + reclosure.reclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-post-reclosure-state",
        workspaceId: reclosure.workspaceId,
        reclosureId: reclosure.reclosureId
      });
      applyModel(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-re-closure consumer state remains stable."
          : payload.result === "recurred"
            ? "Recurring drift recorded. Reopen remains an explicit governed action."
            : "Post-re-closure verification evidence recorded."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Post-re-closure verification failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/post-reclosure-regression",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as PostReclosureRegressionModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function recur(
    reclosure: ReconciliationExceptionReclosure,
    check: PostReclosureRegressionCheck
  ) {
    const key = "recur:" + reclosure.reclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        reclosureId: reclosure.reclosureId,
        reclosureRegressionCheckId: check.reclosureRegressionCheckId,
        recurrenceReason: reasons[reclosure.reclosureId] ?? "",
        confirmation: confirmations[reclosure.reclosureId] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Governed recurrence recorded and the case reopened for a new corrective generation."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Governed recurrence reopen failed."
      );
    } finally {
      setBusy("");
    }
  }

  const cases =
    model.closure.successor.planning.regression.closure.corrective.triage.cases;

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 060 recurrence watch</p>
            <h2>Post-re-closure health</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
          <article><strong>{model.totals.neverChecked}</strong><span>await monitoring</span></article>
          <article><strong>{model.totals.stableLatest}</strong><span>latest stable</span></article>
          <article><strong>{model.totals.recurredLatest}</strong><span>latest recurrent drift</span></article>
          <article><strong>{model.totals.governedRecurrences}</strong><span>governed recurrences</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A re-closed exception can regress again</strong>
        <p>
          Build 060 monitors the exact successor package that justified Build 059
          re-closure. Stable checks remain read-only evidence. Recurring drift does
          not silently reopen the case: an owner or admin must explicitly record a
          recurrence from the newest recurrent check, preserving every prior
          closure, reopen, successor plan, delivery and re-closure.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Re-closed exceptions</p>
            <h2>Monitor & govern recurrence</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const key = reclosure.workspaceId + ":" + reclosure.reclosureId;
            const check = latest.get(key);
            const recurrence = recurrences.get(key);
            const caseRecord = cases.find(
              (item) =>
                item.workspaceId === reclosure.workspaceId &&
                item.caseId === reclosure.caseId
            );
            const canRecur =
              check?.status === "recurred" &&
              caseRecord?.status === "closed" &&
              !recurrence;
            const phrase = confirmationPhrase(reclosure.target);

            return (
              <article
                className="publicationCard correctiveCard"
                key={reclosure.reclosureId}
              >
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (recurrence
                          ? "withdrawn"
                          : check?.status === "stable"
                            ? "published"
                            : check?.status === "recurred"
                              ? "withdrawn"
                              : "draft")
                      }
                    >
                      {recurrence
                        ? "recurrence governed"
                        : check?.status ?? "awaiting monitoring"}
                    </span>
                    <h3>{reclosure.target} · post-re-closure monitor</h3>
                    <p>{reclosure.workspaceName}</p>
                  </div>
                  <span className="badge">
                    case {caseRecord?.status ?? "unknown"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Re-closure</dt><dd>{reclosure.reclosureId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.reclosureFingerprint}</dd></div>
                  <div><dt>Successor delivery</dt><dd>{reclosure.successorDeliveryId}</dd></div>
                  <div><dt>Successor package fingerprint</dt><dd>{reclosure.successorPackageFingerprint}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest monitor</dt><dd>{check.reclosureRegressionCheckId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{check.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{check.matchedCount} matched · {check.mismatchedCount} mismatched · {check.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {recurrence ? (
                    <>
                      <div><dt>Recurrence</dt><dd>{recurrence.recurrenceId}</dd></div>
                      <div><dt>Recurrence fingerprint</dt><dd>{recurrence.recurrenceFingerprint}</dd></div>
                      <div><dt>Reopened</dt><dd>{new Date(recurrence.recurredAt).toLocaleString()}</dd></div>
                    </>
                  ) : null}
                </dl>

                {!recurrence && caseRecord?.status === "closed" ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !reclosure.canManage}
                      onClick={() => void verify(reclosure)}
                    >
                      {busy === "verify:" + reclosure.reclosureId
                        ? "Checking re-closed state…"
                        : check
                          ? "Run fresh post-re-closure check"
                          : "Verify post-re-closure state"}
                    </button>
                  </div>
                ) : null}

                {canRecur && check ? (
                  <div className="correctiveAction">
                    <label>
                      Recurrence reason
                      <textarea
                        value={reasons[reclosure.reclosureId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [reclosure.reclosureId]: event.target.value
                          }))
                        }
                        placeholder="Why does the newest recurring read-back justify reopening this re-closed exception?"
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reclosure.reclosureId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reclosure.reclosureId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !reclosure.canManage}
                      onClick={() => void recur(reclosure, check)}
                    >
                      {busy === "recur:" + reclosure.reclosureId
                        ? "Recording governed recurrence…"
                        : "Reopen recurrent exception"}
                    </button>
                  </div>
                ) : null}

                {check && check.status !== "stable" && check.status !== "recurred" ? (
                  <p className="bridgeHint">
                    The latest monitor is {check.status}. No recurrence action is
                    available until a newer accepted state read-back proves drift.
                  </p>
                ) : null}
              </article>
            );
          })}
          {!model.closure.reclosures.length ? (
            <div className="emptyState">
              No Build 059 verified re-closure is available for recurrence monitoring.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable recurrence evidence</p>
            <h2>Monitoring & recurrence ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.checks.map((item) => (
            <article
              className="publicationCard correctiveCard"
              key={item.reclosureRegressionCheckId}
            >
              <header>
                <div>
                  <span className={"publishState publishState-" + (item.status === "stable" ? "published" : "withdrawn")}>
                    {item.status}
                  </span>
                  <h3>{item.target} · {item.successorPackageId}</h3>
                  <p>{item.workspaceName}</p>
                </div>
                <span className="badge">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Re-closure</dt><dd>{item.reclosureId}</dd></div>
                <div><dt>Check</dt><dd>{item.reclosureRegressionCheckId}</dd></div>
                <div><dt>Re-closure fingerprint</dt><dd>{item.reclosureFingerprint}</dd></div>
                <div><dt>Verification fingerprint</dt><dd>{item.verificationFingerprint}</dd></div>
              </dl>
            </article>
          ))}
          {!model.checks.length ? (
            <div className="emptyState">
              No Build 060 post-re-closure monitoring evidence exists yet.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
