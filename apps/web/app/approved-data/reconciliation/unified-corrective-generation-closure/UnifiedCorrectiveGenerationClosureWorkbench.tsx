"use client";

import { useMemo, useState } from "react";

import type {
  UnifiedCorrectiveGenerationClosureModel,
  UnifiedCorrectiveGenerationDeliveryReconciliation
} from "@/lib/unified-corrective-generation-delivery-reconciliation";
import type { UnifiedCorrectiveGenerationLiveDelivery } from "@/lib/unified-corrective-generation-delivery-execution";

function confirmation(target: "rosie-dazzlers" | "devil-n-dove") {
  return "RE-CLOSE UNIFIED-CORRECTIVE-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/unified-corrective-generation-closure",
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
        : "Unified corrective-generation reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestFor(
  reconciliations: UnifiedCorrectiveGenerationDeliveryReconciliation[],
  delivery: UnifiedCorrectiveGenerationLiveDelivery
) {
  return reconciliations.find(
    (item) =>
      item.workspaceId === delivery.workspaceId &&
      item.deliveryId === delivery.deliveryId
  );
}

export function UnifiedCorrectiveGenerationClosureWorkbench({
  initialModel
}: {
  initialModel: UnifiedCorrectiveGenerationClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const reclosedSuccessors = useMemo(
    () => new Set(model.reclosures.map((item) => item.workspaceId + ":" + item.successorSourceId)),
    [model.reclosures]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as UnifiedCorrectiveGenerationClosureModel);
    } else {
      setModel(payload as unknown as UnifiedCorrectiveGenerationClosureModel);
    }
  }

  async function verify(delivery: UnifiedCorrectiveGenerationLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "verify-unified-corrective-generation-state",
        workspaceId: delivery.workspaceId,
        deliveryId: delivery.deliveryId
      });
      apply(payload);
      setMessage(
        payload.result === "matched"
          ? "Independent consumer read-back matches the exact Build 111 package."
          : "Consumer read-back completed and preserved drift evidence."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
      const refresh = await fetch(
        "/api/approved-data/reconciliation/unified-corrective-generation-closure",
        { cache: "no-store" }
      );
      if (refresh.ok) {
        setModel((await refresh.json()) as UnifiedCorrectiveGenerationClosureModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function reclose(
    delivery: UnifiedCorrectiveGenerationLiveDelivery,
    reconciliation: UnifiedCorrectiveGenerationDeliveryReconciliation
  ) {
    const key = "reclose:" + reconciliation.reconciliationId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("PATCH", {
        action: "reclose-unified-corrective-generation-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        deliveryId: delivery.deliveryId,
        reconciliationId: reconciliation.reconciliationId,
        confirmation: confirmations[reconciliation.reconciliationId] ?? "",
        reclosureNote: notes[reconciliation.reconciliationId] ?? ""
      });
      apply(payload);
      setMessage("Verified unified corrective-generation exception re-closed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-closure failed.");
    } finally {
      setBusy("");
    }
  }

  const accepted = model.unifiedCorrectiveGeneration.deliveries.filter(
    (delivery) => delivery.status === "accepted"
  );

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 112 verification gate</p>
            <h2>Independent reconciliation & verified re-closure</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted unified deliveries</span></article>
          <article><strong>{model.totals.neverVerified}</strong><span>never verified</span></article>
          <article><strong>{model.totals.matchedLatest}</strong><span>matched latest</span></article>
          <article><strong>{model.totals.driftLatest}</strong><span>drift latest</span></article>
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Delivery acceptance is not closure evidence</strong>
        <p>
          Build 112 asks the configured consumer to independently read the fields governed
          by the exact Build 111 package. Only the newest matched read-back for the newest
          successor source can re-close the exception. Drift, missing records, rejected
          verification, or a newer successor source keep the exception open.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Accepted Build 111 deliveries</p>
            <h2>Verify consumer state</h2>
          </div>
        </div>
        <div className="publicationList">
          {accepted.map((delivery) => {
            const reconciliation = latestFor(model.reconciliations, delivery);
            const alreadyReclosed =
              reconciliation &&
              reclosedSuccessors.has(
                reconciliation.workspaceId + ":" + reconciliation.successorSourceId
              );
            return (
              <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
                <header>
                  <div>
                    <span className={
                      "publishState publishState-" +
                      (alreadyReclosed
                        ? "published"
                        : reconciliation?.status === "matched"
                          ? "published"
                          : "draft")
                    }>
                      {alreadyReclosed ? "re-closed" : reconciliation?.status ?? "accepted"}
                    </span>
                    <h3>G{delivery.generationNumber} · {delivery.target}</h3>
                    <p>{delivery.unifiedPackageId}</p>
                  </div>
                  <span className="badge">attempt {delivery.attemptCount}</span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                  <div><dt>Plan</dt><dd>{delivery.correctiveGenerationPlanId}</dd></div>
                  <div><dt>Replay key</dt><dd>{delivery.unifiedReplayKey}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.unifiedPackageFingerprint}</dd></div>
                  {reconciliation ? (
                    <>
                      <div><dt>Latest verification</dt><dd>{reconciliation.reconciliationId}</dd></div>
                      <div><dt>Successor source</dt><dd>{reconciliation.successorSourceId}</dd></div>
                      <div><dt>Matched</dt><dd>{reconciliation.matchedCount}/{reconciliation.expectedRecordCount}</dd></div>
                      <div><dt>Validation</dt><dd>{reconciliation.validationCode}</dd></div>
                    </>
                  ) : null}
                </dl>

                {!alreadyReclosed ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void verify(delivery)}
                    >
                      {busy === "verify:" + delivery.deliveryId
                        ? "Reading consumer state…"
                        : reconciliation
                          ? "Run fresh independent verification"
                          : "Verify consumer state"}
                    </button>
                  </div>
                ) : null}

                {reconciliation?.status === "matched" && !alreadyReclosed ? (
                  <div className="correctiveAction">
                    <label>
                      Re-closure note
                      <textarea
                        value={notes[reconciliation.reconciliationId] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [reconciliation.reconciliationId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{confirmation(reconciliation.target)}</code>
                      <input
                        value={confirmations[reconciliation.reconciliationId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [reconciliation.reconciliationId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !reconciliation.canManage}
                      onClick={() => void reclose(delivery, reconciliation)}
                    >
                      {busy === "reclose:" + reconciliation.reconciliationId
                        ? "Recording verified re-closure…"
                        : "Re-close verified exception"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!accepted.length ? (
            <div className="emptyState">
              No accepted Build 111 unified corrective-generation delivery is ready for reconciliation.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable Build 112 evidence</p>
            <h2>Reconciliation & re-closure ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.reclosures.map((item) => (
            <article className="publicationCard correctiveCard" key={item.reclosureId}>
              <header>
                <div>
                  <span className="publishState publishState-published">re-closed</span>
                  <h3>G{item.generationNumber} · {item.target}</h3>
                  <p>{item.reclosureNote}</p>
                </div>
                <span className="badge">{new Date(item.closedAt).toLocaleString()}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Re-closure</dt><dd>{item.reclosureId}</dd></div>
                <div><dt>Successor source</dt><dd>{item.successorSourceId}</dd></div>
                <div><dt>Delivery</dt><dd>{item.deliveryId}</dd></div>
                <div><dt>Verification</dt><dd>{item.verificationFingerprint}</dd></div>
                <div><dt>Re-closure fingerprint</dt><dd>{item.reclosureFingerprint}</dd></div>
              </dl>
            </article>
          ))}
          {!model.reclosures.length ? (
            <div className="emptyState">No Build 112 verified re-closure evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
