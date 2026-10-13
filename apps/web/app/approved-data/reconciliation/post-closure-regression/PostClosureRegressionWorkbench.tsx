"use client";

import { useMemo, useState } from "react";

import type {
  PostClosureRegressionCheck,
  PostClosureRegressionModel
} from "@/lib/post-closure-regression";

function reopenConfirmation(
  target: "rosie-dazzlers" | "devil-n-dove"
) {
  return "REOPEN REGRESSED " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-closure-regression",
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
        : "Post-closure regression request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByClosure(checks: PostClosureRegressionCheck[]) {
  const map = new Map<string, PostClosureRegressionCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.closureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

export function PostClosureRegressionWorkbench({
  initialModel
}: {
  initialModel: PostClosureRegressionModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const latest = useMemo(
    () => latestByClosure(model.checks),
    [model.checks]
  );
  const reopenedClosures = useMemo(
    () =>
      new Set(
        model.reopens.map((item) => item.workspaceId + ":" + item.closureId)
      ),
    [model.reopens]
  );
  const caseStatus = useMemo(
    () =>
      new Map(
        model.closure.corrective.triage.cases.map((item) => [
          item.workspaceId + ":" + item.caseId,
          item.status
        ])
      ),
    [model.closure.corrective.triage.cases]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as PostClosureRegressionModel);
    }
  }

  async function checkState(
    workspaceId: string,
    closureId: string
  ) {
    const key = "check:" + closureId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "check-closed-state",
        workspaceId,
        closureId
      });
      applyModel(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-closure read-back is still stable."
          : payload.result === "regressed"
            ? "Regression evidence recorded. Reopen governance is now available."
            : "The regression check did not produce trusted current-state evidence."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Post-closure regression check failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/post-closure-regression",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as PostClosureRegressionModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function reopen(check: PostClosureRegressionCheck) {
    const key = "reopen:" + check.closureId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-regressed-exception",
        workspaceId: check.workspaceId,
        closureId: check.closureId,
        regressionCheckId: check.regressionCheckId,
        reopenReason: reasons[key] ?? "",
        confirmation: confirmations[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Exception reopened with immutable Build 056 regression and operator evidence."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Governed reopen failed."
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
            <p className="eyebrow">Post-closure watch</p>
            <h2>Regression readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.totals.closedExceptions}</strong>
            <span>verified closures</span>
          </article>
          <article>
            <strong>{model.totals.neverChecked}</strong>
            <span>never checked after closure</span>
          </article>
          <article>
            <strong>{model.totals.stableLatest}</strong>
            <span>latest stable</span>
          </article>
          <article>
            <strong>{model.totals.regressedLatest}</strong>
            <span>latest regressed</span>
          </article>
          <article>
            <strong>{model.totals.reopened}</strong>
            <span>governed reopens</span>
          </article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Monitoring is read-only; reopening is explicit</strong>
        <p>
          Build 056 never resends a corrective package and never reopens a case
          automatically. It independently reads the same governed fields that
          supported closure. Only the newest regressed check can support a
          manager-confirmed reopen.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Verified Build 055 closures</p>
            <h2>Check for regression</h2>
          </div>
        </div>

        <div className="publicationList">
          {model.closure.closures.map((closure) => {
            const key = closure.workspaceId + ":" + closure.closureId;
            const current = latest.get(key);
            const reopened = reopenedClosures.has(key);
            const status =
              caseStatus.get(closure.workspaceId + ":" + closure.caseId) ??
              "unknown";
            const reopenKey = "reopen:" + closure.closureId;
            const phrase = current
              ? reopenConfirmation(current.target)
              : "";

            return (
              <article
                className="publicationCard correctiveCard"
                key={closure.closureId}
              >
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (reopened
                          ? "withdrawn"
                          : current?.status === "regressed"
                            ? "withdrawn"
                            : "published")
                      }
                    >
                      {reopened
                        ? "reopened"
                        : current?.status ?? "post-closure check needed"}
                    </span>
                    <h3>{closure.target} · {closure.caseId}</h3>
                    <p>{closure.workspaceName}</p>
                  </div>
                  <span className="badge">case {status}</span>
                </header>

                <dl className="publicationEvidence">
                  <div>
                    <dt>Closure</dt>
                    <dd>{closure.closureId}</dd>
                  </div>
                  <div>
                    <dt>Closure fingerprint</dt>
                    <dd>{closure.closureFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Latest post-closure check</dt>
                    <dd>
                      {current
                        ? new Date(current.createdAt).toLocaleString()
                        : "never"}
                    </dd>
                  </div>
                  {current ? (
                    <div>
                      <dt>Counts</dt>
                      <dd>
                        {current.matchedCount} matched ·{" "}
                        {current.mismatchedCount} mismatched ·{" "}
                        {current.missingCount} missing
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {!reopened && status === "closed" ? (
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !closure.canManage}
                    onClick={() =>
                      void checkState(closure.workspaceId, closure.closureId)
                    }
                  >
                    {busy === "check:" + closure.closureId
                      ? "Checking current state…"
                      : "Check post-closure state"}
                  </button>
                ) : null}

                {current?.status === "regressed" &&
                !reopened &&
                status === "closed" ? (
                  <div className="correctiveAction">
                    <label>
                      Reopen reason
                      <textarea
                        value={reasons[reopenKey] ?? ""}
                        onChange={(event) =>
                          setReasons((values) => ({
                            ...values,
                            [reopenKey]: event.target.value
                          }))
                        }
                        placeholder="Explain why this new regression warrants reopening."
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reopenKey] ?? ""}
                        onChange={(event) =>
                          setConfirmations((values) => ({
                            ...values,
                            [reopenKey]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !current.canManage}
                      onClick={() => void reopen(current)}
                    >
                      {busy === reopenKey
                        ? "Reopening with evidence…"
                        : "Reopen regressed exception"}
                    </button>
                  </div>
                ) : null}

                {reopened ? (
                  <p className="bridgeHint">
                    This closure has already been reopened. Historical Build 055
                    closure evidence remains immutable and cannot be reused to
                    silently close the reopened case.
                  </p>
                ) : null}
              </article>
            );
          })}

          {!model.closure.closures.length ? (
            <div className="emptyState">
              No verified Build 055 closure is available for regression monitoring.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2>Regression check history</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.checks.map((item) => (
            <article
              className="publicationCard correctiveCard"
              key={item.regressionCheckId}
            >
              <header>
                <div>
                  <span
                    className={
                      "publishState publishState-" +
                      (item.status === "stable" ? "published" : "withdrawn")
                    }
                  >
                    {item.status}
                  </span>
                  <h3>{item.target} · {item.caseId}</h3>
                  <p>{item.workspaceName}</p>
                </div>
                <span className="badge">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div>
                  <dt>Regression check</dt>
                  <dd>{item.regressionCheckId}</dd>
                </div>
                <div>
                  <dt>Verification fingerprint</dt>
                  <dd>{item.verificationFingerprint}</dd>
                </div>
                <div>
                  <dt>Counts</dt>
                  <dd>
                    {item.matchedCount} / {item.mismatchedCount} /{" "}
                    {item.missingCount}
                  </dd>
                </div>
              </dl>
              {item.recordResults.map((record) => (
                <p className="bridgeHint" key={record.integrationKey}>
                  {record.integrationKey} · {record.status}
                  {record.differingFields.length
                    ? " · " + record.differingFields.join(", ")
                    : ""}
                </p>
              ))}
            </article>
          ))}
          {!model.checks.length ? (
            <div className="emptyState">No post-closure checks recorded yet.</div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Operator accountability</p>
            <h2>Exception reopen ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.reopens.map((item) => (
            <article
              className="publicationCard correctiveCard"
              key={item.reopenId}
            >
              <header>
                <div>
                  <span className="publishState publishState-withdrawn">
                    governed reopen
                  </span>
                  <h3>{item.target} · {item.caseId}</h3>
                  <p>{item.reopenReason}</p>
                </div>
                <span className="badge">
                  {new Date(item.reopenedAt).toLocaleString()}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div>
                  <dt>Regression check</dt>
                  <dd>{item.regressionCheckId}</dd>
                </div>
                <div>
                  <dt>Regression fingerprint</dt>
                  <dd>{item.regressionFingerprint}</dd>
                </div>
                <div>
                  <dt>Reopen fingerprint</dt>
                  <dd>{item.reopenFingerprint}</dd>
                </div>
              </dl>
            </article>
          ))}
          {!model.reopens.length ? (
            <div className="emptyState">No exception has been reopened.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
