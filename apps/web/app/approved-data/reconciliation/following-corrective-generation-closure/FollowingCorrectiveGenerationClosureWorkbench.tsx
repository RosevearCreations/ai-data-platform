"use client";

import { useMemo, useState } from "react";

import type {
  FollowingCorrectiveGenerationClosureModel,
  FollowingCorrectiveGenerationDeliveryReconciliation
} from "@/lib/following-corrective-generation-delivery-reconciliation";
import type { FollowingCorrectiveGenerationLiveDelivery } from "@/lib/following-corrective-generation-delivery-execution";

function confirmationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "RE-CLOSE FOLLOWING-CORRECTIVE-GENERATION " + target.toUpperCase() + " EXCEPTION";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/following-corrective-generation-closure",
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
        : "Following corrective-generation reconciliation request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: FollowingCorrectiveGenerationDeliveryReconciliation[]
) {
  const result = new Map<string, FollowingCorrectiveGenerationDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.followingCorrectiveGenerationDeliveryId;
    if (!result.has(key)) result.set(key, item);
  }
  return result;
}

export function FollowingCorrectiveGenerationClosureWorkbench({
  initialModel
}: {
  initialModel: FollowingCorrectiveGenerationClosureModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const accepted = useMemo(
    () =>
      model.followingCorrectiveGeneration.deliveries.filter(
        (delivery) => delivery.status === "accepted"
      ),
    [model.followingCorrectiveGeneration.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );
  const closedRecurrences = useMemo(
    () => new Set(model.reclosures.map((item) => item.nextCorrectiveGenerationRecurrenceId)),
    [model.reclosures]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as FollowingCorrectiveGenerationClosureModel);
    } else {
      setModel(payload as unknown as FollowingCorrectiveGenerationClosureModel);
    }
  }

  async function verify(delivery: FollowingCorrectiveGenerationLiveDelivery) {
    const key = "verify:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "verify-following-corrective-generation-state",
        workspaceId: delivery.workspaceId,
        followingCorrectiveGenerationDeliveryId: delivery.deliveryId
      });
      apply(payload);
      setMessage(
        payload.result === "matched"
          ? "Following corrective-generation consumer state matches the exact delivered package."
          : "Following corrective-generation read-back recorded without closing the exception."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy("");
    }
  }

  async function reclose(
    delivery: FollowingCorrectiveGenerationLiveDelivery,
    reconciliation: FollowingCorrectiveGenerationDeliveryReconciliation
  ) {
    const key = "reclose:" + delivery.deliveryId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "reclose-following-corrective-generation-exception",
        workspaceId: delivery.workspaceId,
        caseId: reconciliation.caseId,
        followingCorrectiveGenerationDeliveryId: delivery.deliveryId,
        followingCorrectiveGenerationReconciliationId:
          reconciliation.followingCorrectiveGenerationReconciliationId,
        reclosureNote: notes[delivery.deliveryId] ?? "",
        confirmation: confirmations[delivery.deliveryId] ?? ""
      });
      apply(payload);
      setMessage(
        "Verified following-corrective-generation re-closure recorded. All predecessor closure, recurrence, plan and delivery evidence remains immutable."
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
            <p className="eyebrow">Build 107 independent read-back</p>
            <h2>Following corrective-generation re-closure readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.acceptedFollowingCorrectiveGenerationDeliveries}</strong><span>accepted following-corrective-generation deliveries</span></article>
          <article><strong>{model.totals.neverVerified}</strong><span>await read-back</span></article>
          <article><strong>{model.totals.matchedLatest}</strong><span>latest matches</span></article>
          <article><strong>{model.totals.driftLatest}</strong><span>latest drift</span></article>
          <article><strong>{model.totals.verifiedReclosures}</strong><span>verified re-closures</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Accepted delivery still does not authorize closure</strong>
        <p>
          Build 107 independently reads the consumer state back against the exact
          Build 106 package. Only the newest matched verification for the newest
          recurrence generation may create the new re-closure evidence required by
          the database case-close trigger.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Accepted Build 106 deliveries</p><h2>Verify & re-close</h2></div>
        </div>
        <div className="publicationList">
          {accepted.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const reconciliation = latest.get(key);
            const plan = model.followingCorrectiveGeneration.planning.plans.find(
              (item) =>
                item.workspaceId === delivery.workspaceId &&
                item.followingCorrectiveGenerationPlanId === delivery.followingCorrectiveGenerationPlanId
            );
            const isClosed = plan
              ? closedRecurrences.has(plan.nextCorrectiveGenerationRecurrenceId)
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
                    <h3>{delivery.target} · following-corrective-generation read-back</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">{isClosed ? "verified closure" : "independent verification"}</span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                  <div><dt>Plan</dt><dd>{delivery.followingCorrectiveGenerationPlanId}</dd></div>
                  <div><dt>Package</dt><dd>{delivery.followingCorrectiveGenerationPackageId}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.followingCorrectiveGenerationPackageFingerprint}</dd></div>
                  {reconciliation ? (
                    <>
                      <div><dt>Latest verification</dt><dd>{reconciliation.followingCorrectiveGenerationReconciliationId}</dd></div>
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
                          ? "Run fresh following-corrective-generation verification"
                          : "Verify following-corrective-generation consumer state"}
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
                        ? "Recording following-corrective-generation re-closure…"
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
              No accepted Build 106 following-corrective-generation delivery is available for verification.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
