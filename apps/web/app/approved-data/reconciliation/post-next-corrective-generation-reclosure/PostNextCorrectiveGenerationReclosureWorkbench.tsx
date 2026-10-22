"use client";

import { useMemo, useState } from "react";

import type {
  NextCorrectiveGenerationExceptionRecurrence,
  PostNextCorrectiveGenerationReclosureCheck,
  PostNextCorrectiveGenerationReclosureModel
} from "@/lib/post-next-corrective-generation-reclosure-regression";
import type { NextCorrectiveGenerationExceptionReclosure } from "@/lib/next-corrective-generation-delivery-reconciliation";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "REOPEN NEXT-CORRECTIVE-GENERATION RECURRENT " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/post-next-corrective-generation-reclosure",
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
        : "Post-next-corrective-generation re-closure request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByReclosure(checks: PostNextCorrectiveGenerationReclosureCheck[]) {
  const map = new Map<string, PostNextCorrectiveGenerationReclosureCheck>();
  for (const item of checks) {
    const key = item.workspaceId + ":" + item.nextCorrectiveGenerationReclosureId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function recurrenceByReclosure(recurrences: NextCorrectiveGenerationExceptionRecurrence[]) {
  return new Map(
    recurrences.map((item) => [
      item.workspaceId + ":" + item.nextCorrectiveGenerationReclosureId,
      item
    ])
  );
}

export function PostNextCorrectiveGenerationReclosureWorkbench({
  initialModel
}: {
  initialModel: PostNextCorrectiveGenerationReclosureModel;
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
      (payload.model ?? payload) as unknown as PostNextCorrectiveGenerationReclosureModel
    );
  }

  async function verify(reclosure: NextCorrectiveGenerationExceptionReclosure) {
    const key = "verify:" + reclosure.nextCorrectiveGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-post-next-corrective-generation-reclosure-state",
        workspaceId: reclosure.workspaceId,
        nextCorrectiveGenerationReclosureId: reclosure.nextCorrectiveGenerationReclosureId
      });
      apply(payload);
      setMessage(
        payload.result === "stable"
          ? "Post-next-corrective-generation re-closure state remains stable."
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
    reclosure: NextCorrectiveGenerationExceptionReclosure,
    check: PostNextCorrectiveGenerationReclosureCheck
  ) {
    const key = "recur:" + reclosure.nextCorrectiveGenerationReclosureId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reopen-next-corrective-generation-recurrent-exception",
        workspaceId: reclosure.workspaceId,
        nextCorrectiveGenerationReclosureId: reclosure.nextCorrectiveGenerationReclosureId,
        nextCorrectiveGenerationReclosureRegressionCheckId:
          check.nextCorrectiveGenerationReclosureRegressionCheckId,
        recurrenceReason: reasons[reclosure.nextCorrectiveGenerationReclosureId] ?? "",
        confirmation: confirmations[reclosure.nextCorrectiveGenerationReclosureId] ?? ""
      });
      apply(payload);
      setMessage(
        "Governed next-corrective-generation recurrence recorded. The case is reopened and direct closure is blocked until a new corrective generation produces fresh verified closure evidence."
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
            <p className="eyebrow">Build 104 recurrence watch</p>
            <h2>Post-next-corrective-generation re-closure health</h2>
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
        <strong>A next-corrective-generation verified re-closure can regress again</strong>
        <p>
          Build 104 monitors the exact Build 102 package that justified Build 103
          re-closure. Drift never reopens automatically. Only the newest recurrent
          read-back can support an explicit owner/admin recurrence action, and once
          that action is recorded, the current Build 101–103 next corrective-generation is frozen.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="publicationList">
          {model.closure.reclosures.map((reclosure) => {
            const key =
              reclosure.workspaceId + ":" + reclosure.nextCorrectiveGenerationReclosureId;
            const check = latest.get(key);
            const recurrence = recurrences.get(key);
            const phrase = confirmationPhrase(reclosure.target);
            const canRecur = check?.status === "recurred" && !recurrence;

            return (
              <article className="publicationCard correctiveCard" key={reclosure.nextCorrectiveGenerationReclosureId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (recurrence ? "withdrawn" : check?.status === "stable" ? "published" : "draft")}>
                      {recurrence ? "recurrence governed" : check?.status ?? "awaiting monitoring"}
                    </span>
                    <h3>{reclosure.target} · post-next-corrective-generation re-closure</h3>
                    <p>{reclosure.workspaceName}</p>
                  </div>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Next corrective-generation re-closure</dt><dd>{reclosure.nextCorrectiveGenerationReclosureId}</dd></div>
                  <div><dt>Re-closure fingerprint</dt><dd>{reclosure.nextCorrectiveGenerationReclosureFingerprint}</dd></div>
                  <div><dt>Build 100 continuation-cycle recurrence</dt><dd>{reclosure.continuationCycleRecurrenceId}</dd></div>
                  <div><dt>Build 102 delivery</dt><dd>{reclosure.nextCorrectiveGenerationDeliveryId}</dd></div>
                  {check ? (
                    <>
                      <div><dt>Latest monitor</dt><dd>{check.nextCorrectiveGenerationReclosureRegressionCheckId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{check.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{check.matchedCount} matched · {check.mismatchedCount} mismatched · {check.missingCount} missing</dd></div>
                    </>
                  ) : null}
                  {recurrence ? (
                    <>
                      <div><dt>Build 104 recurrence</dt><dd>{recurrence.nextCorrectiveGenerationRecurrenceId}</dd></div>
                      <div><dt>Recurrence fingerprint</dt><dd>{recurrence.nextCorrectiveGenerationRecurrenceFingerprint}</dd></div>
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
                      {busy === "verify:" + reclosure.nextCorrectiveGenerationReclosureId
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
                        value={reasons[reclosure.nextCorrectiveGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [reclosure.nextCorrectiveGenerationReclosureId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[reclosure.nextCorrectiveGenerationReclosureId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reclosure.nextCorrectiveGenerationReclosureId]: event.target.value
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
                      {busy === "recur:" + reclosure.nextCorrectiveGenerationReclosureId
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
              No Build 103 next-corrective-generation re-closure is available for monitoring.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
