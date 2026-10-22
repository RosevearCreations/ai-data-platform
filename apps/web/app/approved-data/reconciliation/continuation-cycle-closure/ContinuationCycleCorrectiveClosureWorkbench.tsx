"use client";

import { useMemo, useState } from "react";

import type {
  ContinuationCycleCorrectiveClosureModel,
  ContinuationCycleCorrectiveDeliveryReconciliation
} from "@/lib/continuation-cycle-corrective-delivery-reconciliation";
import type { ContinuationCycleCorrectiveLiveDelivery } from "@/lib/continuation-cycle-corrective-delivery-execution";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "RE-CLOSE CONTINUATION-CYCLE " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/continuation-cycle-closure",
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
        : "Continuation-cycle reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: ContinuationCycleCorrectiveDeliveryReconciliation[]
) {
  const result = new Map<string, ContinuationCycleCorrectiveDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.continuationCycleDeliveryId;
    if (!result.has(key)) result.set(key, item);
  }
  return result;
}

export function ContinuationCycleCorrectiveClosureWorkbench({
  initialModel
}: {
  initialModel: ContinuationCycleCorrectiveClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const accepted = useMemo(
    () =>
      model.continuationCycle.deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ),
    [model.continuationCycle.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );
  const closedRecurrences = useMemo(
    () => new Set(model.reclosures.map((item) => item.successiveCycleRecurrenceId)),
    [model.reclosures]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as ContinuationCycleCorrectiveClosureModel);
    } else {
      setModel(payload as unknown as ContinuationCycleCorrectiveClosureModel);
    }
  }

  async function verify(delivery: ContinuationCycleCorrectiveLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-continuation-cycle-state",
        workspaceId: delivery.workspaceId,
        continuationCycleDeliveryId: delivery.deliveryId
      });
      apply(payload);
      setMessage(
        payload.result === "matched"
          ? "Continuation-cycle consumer state matches the exact delivered package."
          : "Continuation-cycle read-back recorded without closing the exception."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy("");
    }
  }

  async function reclose(
    delivery: ContinuationCycleCorrectiveLiveDelivery,
    reconciliation: ContinuationCycleCorrectiveDeliveryReconciliation
  ) {
    const key = "reclose:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reclose-continuation-cycle-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        continuationCycleDeliveryId: delivery.deliveryId,
        continuationCycleReconciliationId:
          reconciliation.continuationCycleReconciliationId,
        reclosureNote: notes[delivery.deliveryId] ?? "",
        confirmation: confirmations[delivery.deliveryId] ?? ""
      });
      apply(payload);
      setMessage(
        "Verified continuation-cycle re-closure recorded. All predecessor closure, recurrence, plan and delivery evidence remains immutable."
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
            <p className="eyebrow">Build 099 independent read-back</p>
            <h2>Continuation-cycle re-closure readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.acceptedContinuationCycleDeliveries}</strong><span>accepted continuation-cycle deliveries</span></article>
          <article><strong>{model.totals.neverVerified}</strong><span>await read-back</span></article>
          <article><strong>{model.totals.matchedLatest}</strong><span>latest matches</span></article>
          <article><strong>{model.totals.driftLatest}</strong><span>latest drift</span></article>
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Accepted delivery still does not authorize closure</strong>
        <p>
          Build 099 independently reads the consumer state back against the exact
          Build 098 package. Only the newest matched verification for the newest
          recurrence generation may create the new re-closure evidence required by
          the database case-close trigger.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Accepted Build 098 deliveries</p><h2>Verify & re-close</h2></div>
        </div>
        <div className="publicationList">
          {accepted.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const reconciliation = latest.get(key);
            const plan = model.continuationCycle.planning.plans.find(
              (item) =>
                item.workspaceId === delivery.workspaceId &&
                item.continuationCyclePlanId === delivery.continuationCyclePlanId
            );
            const isClosed = plan
              ? closedRecurrences.has(plan.successiveCycleRecurrenceId)
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
                    <h3>{delivery.target} · continuation-cycle read-back</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">{isClosed ? "verified closure" : "independent verification"}</span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                  <div><dt>Plan</dt><dd>{delivery.continuationCyclePlanId}</dd></div>
                  <div><dt>Package</dt><dd>{delivery.continuationCyclePackageId}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.continuationCyclePackageFingerprint}</dd></div>
                  {reconciliation ? (
                    <>
                      <div><dt>Latest verification</dt><dd>{reconciliation.continuationCycleReconciliationId}</dd></div>
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
                          ? "Run fresh continuation-cycle verification"
                          : "Verify continuation-cycle consumer state"}
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
                        ? "Recording continuation-cycle re-closure…"
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
              No accepted Build 098 continuation-cycle delivery is available for verification.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
