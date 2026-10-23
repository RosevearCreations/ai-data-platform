"use client";

import { useMemo, useState } from "react";

import type {
  PostUnifiedCorrectiveGenerationReclosureCheck,
  PostUnifiedCorrectiveGenerationReclosureModel
} from "@/lib/post-unified-corrective-generation-reclosure-regression";
import type { UnifiedCorrectiveGenerationExceptionReclosure } from "@/lib/unified-corrective-generation-delivery-reconciliation";

function confirmation(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN UNIFIED-CORRECTIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function api(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-unified-corrective-generation-reclosure",
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
        : "Build 113 request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestFor(
  checks: PostUnifiedCorrectiveGenerationReclosureCheck[],
  reclosure: UnifiedCorrectiveGenerationExceptionReclosure
) {
  return checks.find(
    (item) =>
      item.workspaceId === reclosure.workspaceId &&
      item.reclosureId === reclosure.reclosureId
  );
}

export function PostUnifiedCorrectiveGenerationReclosureWorkbench({
  initialModel
}: {
  initialModel: PostUnifiedCorrectiveGenerationReclosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const recurredReclosures = useMemo(
    () =>
      new Set(
        model.recurrences.map((item) => item.workspaceId + ":" + item.reclosureId)
      ),
    [model.recurrences]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as PostUnifiedCorrectiveGenerationReclosureModel);
    } else {
      setModel(payload as unknown as PostUnifiedCorrectiveGenerationReclosureModel);
    }
  }

  async function verify(reclosure: UnifiedCorrectiveGenerationExceptionReclosure) {
    const key = "verify:" + reclosure.reclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "verify-post-unified-corrective-generation-state",
        workspaceId: reclosure.workspaceId,
        reclosureId: reclosure.reclosureId
      });
      apply(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-re-closure read-back is stable."
          : "Post-re-closure read-back found recurrence evidence."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
      const refresh = await fetch(
        "/api/approved-data/reconciliation/post-unified-corrective-generation-reclosure",
        { cache: "no-store" }
      );
      if (refresh.ok) {
        setModel(
          (await refresh.json()) as PostUnifiedCorrectiveGenerationReclosureModel
        );
      }
    } finally {
      setBusy("");
    }
  }

  async function recur(
    reclosure: UnifiedCorrectiveGenerationExceptionReclosure,
    check: PostUnifiedCorrectiveGenerationReclosureCheck
  ) {
    const key = "recur:" + check.regressionCheckId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("PATCH", {
        action: "reopen-unified-corrective-generation-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        reclosureId: reclosure.reclosureId,
        regressionCheckId: check.regressionCheckId,
        recurrenceReason: reasons[check.regressionCheckId] ?? "",
        confirmation: confirmations[check.regressionCheckId] ?? ""
      });
      apply(payload);
      setMessage(
        "Recurrence governed: the case reopened and the next generic successor source was registered."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recurrence governance failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 113 recurrence governance</p>
            <h2>Post-re-closure regression monitoring</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
          <article><strong>{model.totals.neverChecked}</strong><span>never checked</span></article>
          <article><strong>{model.totals.stableLatest}</strong><span>stable latest</span></article>
          <article><strong>{model.totals.recurredLatest}</strong><span>recurred latest</span></article>
          <article><strong>{model.totals.governedRecurrences}</strong><span>governed recurrences</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A verified re-closure is not assumed permanent</strong>
        <p>
          Build 113 independently reads the exact Build 111 package again after Build 112
          re-closure. Stable state remains closed. Verified drift can be explicitly governed
          as a recurrence, which atomically registers the completed generic generation,
          creates the next generic successor source, and reopens the case for the next
          planning cycle.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 112 re-closures</p>
            <h2>Monitor for recurrence</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const check = latestFor(model.checks, reclosure);
            const governed = recurredReclosures.has(
              reclosure.workspaceId + ":" + reclosure.reclosureId
            );
            return (
              <article className="publicationCard correctiveCard" key={reclosure.reclosureId}>
                <header>
                  <div>
                    <span className={
                      "publishState publishState-" +
                      (governed || check?.status === "recurred" ? "draft" : "published")
                    }>
                      {governed ? "recurrence governed" : check?.status ?? "re-closed"}
                    </span>
                    <h3>G{reclosure.generationNumber} · {reclosure.target}</h3>
                    <p>{reclosure.reclosureNote}</p>
                  </div>
                  <span className="badge">{new Date(reclosure.closedAt).toLocaleString()}</span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Re-closure</dt><dd>{reclosure.reclosureId}</dd></div>
                  <div><dt>Successor source</dt><dd>{reclosure.successorSourceId}</dd></div>
                  <div><dt>Plan</dt><dd>{reclosure.correctiveGenerationPlanId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.reclosureFingerprint}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest regression check</dt><dd>{check.regressionCheckId}</dd></div>
                      <div><dt>Matched</dt><dd>{check.matchedCount}/{check.expectedRecordCount}</dd></div>
                      <div><dt>Validation</dt><dd>{check.validationCode}</dd></div>
                    </>
                  ) : null}
                </dl>

                {!governed ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !reclosure.canManage}
                      onClick={() => void verify(reclosure)}
                    >
                      {busy === "verify:" + reclosure.reclosureId
                        ? "Checking post-re-closure state…"
                        : check
                          ? "Run fresh regression check"
                          : "Check for recurrence"}
                    </button>
                  </div>
                ) : null}

                {check?.status === "recurred" && !governed ? (
                  <div className="correctiveAction">
                    <label>
                      Recurrence reason
                      <textarea
                        value={reasons[check.regressionCheckId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [check.regressionCheckId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{confirmation(check.target)}</code>
                      <input
                        value={confirmations[check.regressionCheckId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [check.regressionCheckId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !check.canManage}
                      onClick={() => void recur(reclosure, check)}
                    >
                      {busy === "recur:" + check.regressionCheckId
                        ? "Registering next generation…"
                        : "Govern recurrence & reopen"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!model.closure.reclosures.length ? (
            <div className="emptyState">
              No Build 112 verified re-closure is ready for post-closure monitoring.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable Build 113 evidence</p>
            <h2>Governed recurrence ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.recurrences.map((item) => (
            <article className="publicationCard correctiveCard" key={item.recurrenceId}>
              <header>
                <div>
                  <span className="publishState publishState-draft">recurred</span>
                  <h3>G{item.generationNumber} → G{item.generationNumber + 1} · {item.target}</h3>
                  <p>{item.recurrenceReason}</p>
                </div>
                <span className="badge">{new Date(item.recurredAt).toLocaleString()}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Recurrence</dt><dd>{item.recurrenceId}</dd></div>
                <div><dt>Prior successor source</dt><dd>{item.successorSourceId}</dd></div>
                <div><dt>Regression fingerprint</dt><dd>{item.regressionFingerprint}</dd></div>
                <div><dt>Recurrence fingerprint</dt><dd>{item.recurrenceFingerprint}</dd></div>
              </dl>
            </article>
          ))}
          {!model.recurrences.length ? (
            <div className="emptyState">No governed generic recurrence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
