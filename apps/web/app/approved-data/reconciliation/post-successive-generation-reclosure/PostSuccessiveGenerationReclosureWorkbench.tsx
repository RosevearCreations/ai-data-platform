"use client";

import { useMemo, useState } from "react";

import type {
  SuccessiveGenerationExceptionRecurrence,
  PostSuccessiveGenerationReclosureCheck,
  PostSuccessiveGenerationReclosureModel
} from "@/lib/post-successive-generation-reclosure-regression";
import type { SuccessiveGenerationReconciliationExceptionReclosure } from "@/lib/successive-generation-corrective-delivery-reconciliation";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN SUCCESSIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-successive-generation-reclosure",
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
        : "Post-successive-generation re-closure request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByReclosure(checks: PostSuccessiveGenerationReclosureCheck[]) {
  const map = new Map<string, PostSuccessiveGenerationReclosureCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.successiveGenerationReclosureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function recurrenceByReclosure(recurrences: SuccessiveGenerationExceptionRecurrence[]) {
  return new Map(
    recurrences.map((item) => [
      item.workspaceId + ":" + item.successiveGenerationReclosureId,
      item
    ])
  );
}

export function PostSuccessiveGenerationReclosureWorkbench({
  initialModel
}: {
  initialModel: PostSuccessiveGenerationReclosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const latest = useMemo(() => latestByReclosure(model.checks), [model.checks]);
  const recurrences = useMemo(
    () => recurrenceByReclosure(model.recurrences),
    [model.recurrences]
  );

  function apply(payload: Record<string, unknown>) {
    setModel(
      (payload.model ?? payload) as unknown as PostSuccessiveGenerationReclosureModel
    );
  }

  async function verify(reclosure: SuccessiveGenerationReconciliationExceptionReclosure) {
    const key = "verify:" + reclosure.successiveGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-post-successive-generation-reclosure-state",
        workspaceId: reclosure.workspaceId,
        successiveGenerationReclosureId: reclosure.successiveGenerationReclosureId
      });
      apply(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-successive-generation re-closure state remains stable."
          : payload.result === "recurred"
            ? "Recurring drift recorded. Reopen remains an explicit governed action."
            : "Monitoring evidence recorded."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy("");
    }
  }

  async function recur(
    reclosure: SuccessiveGenerationReconciliationExceptionReclosure,
    check: PostSuccessiveGenerationReclosureCheck
  ) {
    const key = "recur:" + reclosure.successiveGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-successive-generation-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        successiveGenerationReclosureId: reclosure.successiveGenerationReclosureId,
        successiveGenerationReclosureRegressionCheckId:
          check.successiveGenerationReclosureRegressionCheckId,
        recurrenceReason: reasons[reclosure.successiveGenerationReclosureId] ?? "",
        confirmation: confirmations[reclosure.successiveGenerationReclosureId] ?? ""
      });
      apply(payload);
      setMessage(
        "Governed successive-generation recurrence recorded. The case is reopened and direct closure is blocked until a new corrective generation produces fresh verified closure evidence."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Governed recurrence failed."
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
            <p className="eyebrow">Build 076 recurrence watch</p>
            <h2>Post-successive-generation re-closure health</h2>
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
        <strong>A successive-generation verified re-closure can regress again</strong>
        <p>
          Build 076 monitors the exact Build 074 package that justified Build 075
          re-closure. Drift never reopens automatically. Only the newest recurrent
          read-back can support an explicit owner/admin recurrence action, and once
          that action is recorded the current Build 073–071 generation is frozen.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const key =
              reclosure.workspaceId + ":" + reclosure.successiveGenerationReclosureId;
            const check = latest.get(key);
            const recurrence = recurrences.get(key);
            const phrase = confirmationPhrase(reclosure.target);
            const canRecur = check?.status === "recurred" && !recurrence;

            return (
              <article className="publicationCard correctiveCard" key={reclosure.successiveGenerationReclosureId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (recurrence ? "withdrawn" : check?.status === "stable" ? "published" : "draft")}>
                      {recurrence ? "recurrence governed" : check?.status ?? "awaiting monitoring"}
                    </span>
                    <h3>{reclosure.target} · post-successive-generation re-closure</h3>
                    <p>{reclosure.workspaceName}</p>
                  </div>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Subsequent-generation re-closure</dt><dd>{reclosure.successiveGenerationReclosureId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.successiveGenerationReclosureFingerprint}</dd></div>
                  <div><dt>Build 068 recurrence</dt><dd>{reclosure.subsequentGenerationRecurrenceId}</dd></div>
                  <div><dt>Build 074 delivery</dt><dd>{reclosure.successiveGenerationDeliveryId}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest monitor</dt><dd>{check.successiveGenerationReclosureRegressionCheckId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{check.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{check.matchedCount} matched · {check.mismatchedCount} mismatched · {check.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {recurrence ? (
                    <>
                      <div><dt>Build 076 recurrence</dt><dd>{recurrence.successiveGenerationRecurrenceId}</dd></div>
                      <div><dt>Recurrence fingerprint</dt><dd>{recurrence.successiveGenerationRecurrenceFingerprint}</dd></div>
                    </>
                  ) : null}
                </dl>

                {!recurrence ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !reclosure.canManage}
                      onClick={() => void verify(reclosure)}
                    >
                      {busy === "verify:" + reclosure.successiveGenerationReclosureId
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
                        value={reasons[reclosure.successiveGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [reclosure.successiveGenerationReclosureId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reclosure.successiveGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reclosure.successiveGenerationReclosureId]: event.target.value
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
                      {busy === "recur:" + reclosure.successiveGenerationReclosureId
                        ? "Recording governed recurrence…"
                        : "Reopen recurrent exception"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!model.closure.reclosures.length ? (
            <div className="emptyState">
              No Build 075 successive-generation re-closure is available for monitoring.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
