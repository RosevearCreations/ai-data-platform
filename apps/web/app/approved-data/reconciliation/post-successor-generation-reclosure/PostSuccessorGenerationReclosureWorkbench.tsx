"use client";

import { useMemo, useState } from "react";

import type {
  SuccessorGenerationExceptionRecurrence,
  PostSuccessorGenerationReclosureCheck,
  PostSuccessorGenerationReclosureModel
} from "@/lib/post-successor-generation-reclosure-regression";
import type { SuccessorGenerationReconciliationExceptionReclosure } from "@/lib/successor-generation-corrective-delivery-reconciliation";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN SUCCESSOR-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-successor-generation-reclosure",
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
        : "Post-successor-generation re-closure request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByReclosure(checks: PostSuccessorGenerationReclosureCheck[]) {
  const map = new Map<string, PostSuccessorGenerationReclosureCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.successorGenerationReclosureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function recurrenceByReclosure(recurrences: SuccessorGenerationExceptionRecurrence[]) {
  return new Map(
    recurrences.map((item) => [
      item.workspaceId + ":" + item.successorGenerationReclosureId,
      item
    ])
  );
}

export function PostSuccessorGenerationReclosureWorkbench({
  initialModel
}: {
  initialModel: PostSuccessorGenerationReclosureModel;
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
      (payload.model ?? payload) as unknown as PostSuccessorGenerationReclosureModel
    );
  }

  async function verify(reclosure: SuccessorGenerationReconciliationExceptionReclosure) {
    const key = "verify:" + reclosure.successorGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-post-successor-generation-reclosure-state",
        workspaceId: reclosure.workspaceId,
        successorGenerationReclosureId: reclosure.successorGenerationReclosureId
      });
      apply(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-successor-generation re-closure state remains stable."
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
    reclosure: SuccessorGenerationReconciliationExceptionReclosure,
    check: PostSuccessorGenerationReclosureCheck
  ) {
    const key = "recur:" + reclosure.successorGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-successor-generation-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        successorGenerationReclosureId: reclosure.successorGenerationReclosureId,
        successorGenerationReclosureRegressionCheckId:
          check.successorGenerationReclosureRegressionCheckId,
        recurrenceReason: reasons[reclosure.successorGenerationReclosureId] ?? "",
        confirmation: confirmations[reclosure.successorGenerationReclosureId] ?? ""
      });
      apply(payload);
      setMessage(
        "Governed successor-generation recurrence recorded. The case is reopened and direct closure is blocked until a new corrective generation produces fresh verified closure evidence."
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
            <p className="eyebrow">Build 068 recurrence watch</p>
            <h2>Post-successor-generation re-closure health</h2>
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
        <strong>A successor-generation verified re-closure can regress again</strong>
        <p>
          Build 068 monitors the exact Build 066 package that justified Build 067
          re-closure. Drift never reopens automatically. Only the newest recurrent
          read-back can support an explicit owner/admin recurrence action, and once
          that action is recorded the current Build 065–067 generation is frozen.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const key =
              reclosure.workspaceId + ":" + reclosure.successorGenerationReclosureId;
            const check = latest.get(key);
            const recurrence = recurrences.get(key);
            const phrase = confirmationPhrase(reclosure.target);
            const canRecur = check?.status === "recurred" && !recurrence;

            return (
              <article className="publicationCard correctiveCard" key={reclosure.successorGenerationReclosureId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (recurrence ? "withdrawn" : check?.status === "stable" ? "published" : "draft")}>
                      {recurrence ? "recurrence governed" : check?.status ?? "awaiting monitoring"}
                    </span>
                    <h3>{reclosure.target} · post-successor-generation re-closure</h3>
                    <p>{reclosure.workspaceName}</p>
                  </div>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Successor-generation re-closure</dt><dd>{reclosure.successorGenerationReclosureId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.successorGenerationReclosureFingerprint}</dd></div>
                  <div><dt>Build 064 recurrence</dt><dd>{reclosure.nextGenerationRecurrenceId}</dd></div>
                  <div><dt>Build 066 delivery</dt><dd>{reclosure.successorGenerationDeliveryId}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest monitor</dt><dd>{check.successorGenerationReclosureRegressionCheckId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{check.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{check.matchedCount} matched · {check.mismatchedCount} mismatched · {check.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {recurrence ? (
                    <>
                      <div><dt>Build 068 recurrence</dt><dd>{recurrence.successorGenerationRecurrenceId}</dd></div>
                      <div><dt>Recurrence fingerprint</dt><dd>{recurrence.successorGenerationRecurrenceFingerprint}</dd></div>
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
                      {busy === "verify:" + reclosure.successorGenerationReclosureId
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
                        value={reasons[reclosure.successorGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [reclosure.successorGenerationReclosureId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reclosure.successorGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reclosure.successorGenerationReclosureId]: event.target.value
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
                      {busy === "recur:" + reclosure.successorGenerationReclosureId
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
              No Build 067 successor-generation re-closure is available for monitoring.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
