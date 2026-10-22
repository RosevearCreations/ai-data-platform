"use client";

import { useMemo, useState } from "react";

import type {
  NextCorrectiveGenerationClosureModel,
  NextCorrectiveGenerationDeliveryReconciliation
} from "@/lib/next-corrective-generation-delivery-reconciliation";
import type { NextCorrectiveGenerationLiveDelivery } from "@/lib/next-corrective-generation-delivery-execution";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "RE-CLOSE NEXT-CORRECTIVE-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/next-corrective-generation-closure",
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
        : "Next corrective-generation reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: NextCorrectiveGenerationDeliveryReconciliation[]
) {
  const result = new Map<string, NextCorrectiveGenerationDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.nextCorrectiveGenerationDeliveryId;
    if (!result.has(key)) result.set(key, item);
  }
  return result;
}

export function NextCorrectiveGenerationClosureWorkbench({
  initialModel
}: {
  initialModel: NextCorrectiveGenerationClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const accepted = useMemo(
    () =>
      model.nextCorrectiveGeneration.deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ),
    [model.nextCorrectiveGeneration.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );
  const closedRecurrences = useMemo(
    () => new Set(model.reclosures.map((item) => item.continuationCycleRecurrenceId)),
    [model.reclosures]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as NextCorrectiveGenerationClosureModel);
    } else {
      setModel(payload as unknown as NextCorrectiveGenerationClosureModel);
    }
  }

  async function verify(delivery: NextCorrectiveGenerationLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-next-corrective-generation-state",
        workspaceId: delivery.workspaceId,
        nextCorrectiveGenerationDeliveryId: delivery.deliveryId
      });
      apply(payload);
      setMessage(
        payload.result === "matched"
          ? "Next corrective-generation consumer state matches the exact delivered package."
          : "Next corrective-generation read-back recorded without closing the exception."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy("");
    }
  }

  async function reclose(
    delivery: NextCorrectiveGenerationLiveDelivery,
    reconciliation: NextCorrectiveGenerationDeliveryReconciliation
  ) {
    const key = "reclose:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reclose-next-corrective-generation-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        nextCorrectiveGenerationDeliveryId: delivery.deliveryId,
        nextCorrectiveGenerationReconciliationId:
          reconciliation.nextCorrectiveGenerationReconciliationId,
        reclosureNote: notes[delivery.deliveryId] ?? "",
        confirmation: confirmations[delivery.deliveryId] ?? ""
      });
      apply(payload);
      setMessage(
        "Verified next-corrective-generation re-closure recorded. All predecessor closure, recurrence, plan and delivery evidence remains immutable."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Re-closure failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 103 independent read-back</p>
            <h2>Next corrective-generation re-closure readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.acceptedNextCorrectiveGenerationDeliveries}</strong><span>accepted next-corrective-generation deliveries</span></article>
          <article><strong>{model.totals.neverVerified}</strong><span>await read-back</span></article>
          <article><strong>{model.totals.matchedLatest}</strong><span>latest matches</span></article>
          <article><strong>{model.totals.driftLatest}</strong><span>latest drift</span></article>
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Accepted delivery still does not authorize closure</strong>
        <p>
          Build 103 independently reads the consumer state back against the exact
          Build 102 package. Only the newest matched verification for the newest
          recurrence generation may create the new re-closure evidence required by
          the database case-close trigger.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Accepted Build 102 deliveries</p><h2>Verify & re-close</h2></div>
        </div>
        <div className="publicationList">
          {accepted.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const reconciliation = latest.get(key);
            const plan = model.nextCorrectiveGeneration.planning.plans.find(
              (item) =>
                item.workspaceId === delivery.workspaceId &&
                item.nextCorrectiveGenerationPlanId === delivery.nextCorrectiveGenerationPlanId
            );
            const isClosed = plan
              ? closedRecurrences.has(plan.continuationCycleRecurrenceId)
              : false;
            const canReclose =
              reconciliation?.status === "matched" && !isClosed;
            const phrase = confirmationPhrase(delivery.target);

            return (
              <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (isClosed || reconciliation?.status === "matched" ? "published" : "withdrawn")}>
                      {isClosed ? "re-closed" : reconciliation?.status ?? "awaiting verification"}
                    </span>
                    <h3>{delivery.target} · next-corrective-generation read-back</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">{isClosed ? "verified closure" : "independent verification"}</span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                  <div><dt>Plan</dt><dd>{delivery.nextCorrectiveGenerationPlanId}</dd></div>
                  <div><dt>Package</dt><dd>{delivery.nextCorrectiveGenerationPackageId}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.nextCorrectiveGenerationPackageFingerprint}</dd></div>
                  {reconciliation ? (
                    <>
                      <div><dt>Latest verification</dt><dd>{reconciliation.nextCorrectiveGenerationReconciliationId}</dd></div>
                      <div><dt>Verification fingerprint</dt><dd>{reconciliation.verificationFingerprint}</dd></div>
                      <div><dt>Counts</dt><dd>{reconciliation.matchedCount} matched · {reconciliation.mismatchedCount} mismatched · {reconciliation.missingCount} missing</dd></div>
                    </>
                  ) : null}
                </dl>

                {!isClosed ? (
                  <div className="correctiveAction">
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void verify(delivery)}
                    >
                      {busy === "verify:" + delivery.deliveryId
                        ? "Checking consumer state…"
                        : reconciliation
                          ? "Run fresh next-corrective-generation verification"
                          : "Verify next-corrective-generation consumer state"}
                    </button>
                  </div>
                ) : null}

                {canReclose && reconciliation ? (
                  <div className="correctiveAction">
                    <label>
                      Re-closure note
                      <textarea
                        value={notes[delivery.deliveryId] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [delivery.deliveryId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      Type <code>{phrase}</code>
                      <input
                        value={confirmations[delivery.deliveryId] ?? ""}
                        onChange={(event) =>
                          setConfirmations((current) => ({
                            ...current,
                            [delivery.deliveryId]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !delivery.canManage}
                      onClick={() => void reclose(delivery, reconciliation)}
                    >
                      {busy === "reclose:" + delivery.deliveryId
                        ? "Recording next-corrective-generation re-closure…"
                        : "Re-close verified exception"}
                    </button>
                  </div>
                ) : null}

                {reconciliation && reconciliation.status !== "matched" ? (
                  <p className="bridgeHint">
                    Re-closure remains blocked because the newest read-back is {reconciliation.status}.
                  </p>
                ) : null}
              </article>
            );
          })}
          {!accepted.length ? (
            <div className="emptyState">
              No accepted Build 102 next-corrective-generation delivery is available for verification.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
