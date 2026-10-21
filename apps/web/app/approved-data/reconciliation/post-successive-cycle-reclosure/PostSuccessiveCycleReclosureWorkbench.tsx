"use client";

import { useMemo, useState } from "react";

import type {
  SuccessiveCycleExceptionRecurrence,
  PostSuccessiveCycleReclosureCheck,
  PostSuccessiveCycleReclosureModel
} from "@/lib/post-successive-cycle-reclosure-regression";
import type { SuccessiveCycleReconciliationExceptionReclosure } from "@/lib/successive-cycle-corrective-delivery-reconciliation";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN SUCCESSIVE-CYCLE RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-successive-cycle-reclosure",
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
        : "Post-successive-cycle re-closure request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByReclosure(checks: PostSuccessiveCycleReclosureCheck[]) {
  const map = new Map<string, PostSuccessiveCycleReclosureCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.successiveCycleReclosureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function recurrenceByReclosure(recurrences: SuccessiveCycleExceptionRecurrence[]) {
  return new Map(
    recurrences.map((item) => [
      item.workspaceId + ":" + item.successiveCycleReclosureId,
      item
    ])
  );
}

export function PostSuccessiveCycleReclosureWorkbench({
  initialModel
}: {
  initialModel: PostSuccessiveCycleReclosureModel;
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
      (payload.model ?? payload) as unknown as PostSuccessiveCycleReclosureModel
    );
  }

  async function verify(reclosure: SuccessiveCycleReconciliationExceptionReclosure) {
    const key = "verify:" + reclosure.successiveCycleReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-post-successive-cycle-reclosure-state",
        workspaceId: reclosure.workspaceId,
        successiveCycleReclosureId: reclosure.successiveCycleReclosureId
      });
      apply(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-successive-cycle re-closure state remains stable."
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
    reclosure: SuccessiveCycleReconciliationExceptionReclosure,
    check: PostSuccessiveCycleReclosureCheck
  ) {
    const key = "recur:" + reclosure.successiveCycleReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-successive-cycle-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        successiveCycleReclosureId: reclosure.successiveCycleReclosureId,
        successiveCycleReclosureRegressionCheckId:
          check.successiveCycleReclosureRegressionCheckId,
        recurrenceReason: reasons[reclosure.successiveCycleReclosureId] ?? "",
        confirmation: confirmations[reclosure.successiveCycleReclosureId] ?? ""
      });
      apply(payload);
      setMessage(
        "Governed successive-cycle recurrence recorded. The case is reopened and direct closure is blocked until a new corrective generation produces fresh verified closure evidence."
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
            <p className="eyebrow">Build 096 recurrence watch</p>
            <h2>Post-successive-cycle re-closure health</h2>
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
        <strong>A successive-cycle verified re-closure can regress again</strong>
        <p>
          Build 096 monitors the exact Build 094 package that justified Build 095
          re-closure. Drift never reopens automatically. Only the newest recurrent
          read-back can support an explicit owner/admin recurrence action, and once
          that action is recorded, the current Build 093–091 successive-cycle generation is frozen.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const key =
              reclosure.workspaceId + ":" + reclosure.successiveCycleReclosureId;
            const check = latest.get(key);
            const recurrence = recurrences.get(key);
            const phrase = confirmationPhrase(reclosure.target);
            const canRecur = check?.status === "recurred" && !recurrence;

            return (
              <article className="publicationCard correctiveCard" key={reclosure.successiveCycleReclosureId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (recurrence ? "withdrawn" : check?.status === "stable" ? "published" : "draft")}>
                      {recurrence ? "recurrence governed" : check?.status ?? "awaiting monitoring"}
                    </span>
                    <h3>{reclosure.target} · post-successive-cycle re-closure</h3>
                    <p>{reclosure.workspaceName}</p>
                  </div>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Following-cycle re-closure</dt><dd>{reclosure.successiveCycleReclosureId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.successiveCycleReclosureFingerprint}</dd></div>
                  <div><dt>Build 092 subsequent-cycle recurrence</dt><dd>{reclosure.subsequentCycleRecurrenceId}</dd></div>
                  <div><dt>Build 094 delivery</dt><dd>{reclosure.successiveCycleDeliveryId}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest monitor</dt><dd>{check.successiveCycleReclosureRegressionCheckId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{check.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{check.matchedCount} matched · {check.mismatchedCount} mismatched · {check.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {recurrence ? (
                    <>
                      <div><dt>Build 096 recurrence</dt><dd>{recurrence.successiveCycleRecurrenceId}</dd></div>
                      <div><dt>Recurrence fingerprint</dt><dd>{recurrence.successiveCycleRecurrenceFingerprint}</dd></div>
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
                      {busy === "verify:" + reclosure.successiveCycleReclosureId
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
                        value={reasons[reclosure.successiveCycleReclosureId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [reclosure.successiveCycleReclosureId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reclosure.successiveCycleReclosureId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reclosure.successiveCycleReclosureId]: event.target.value
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
                      {busy === "recur:" + reclosure.successiveCycleReclosureId
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
              No Build 095 successive-cycle re-closure is available for monitoring.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
