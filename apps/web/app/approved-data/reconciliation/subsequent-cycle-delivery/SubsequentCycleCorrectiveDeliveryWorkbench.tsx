"use client";

import { useMemo, useState } from "react";

import type {
  SubsequentCycleCorrectiveDeliveryActivation,
  SubsequentCycleCorrectiveDeliveryModel,
  SubsequentCycleCorrectiveLiveDelivery
} from "@/lib/subsequent-cycle-corrective-delivery-execution";
import type { SubsequentCycleCorrectiveDeliveryPlan } from "@/lib/following-cycle-recurrence-planning";

function activationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "ACTIVATE " + target.toUpperCase() + " SUBSEQUENT-CYCLE CORRECTIVE";
}

function executionPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "EXECUTE " + target.toUpperCase() + " SUBSEQUENT-CYCLE CORRECTIVE";
}

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/subsequent-cycle-delivery",
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
        : "Subsequent-cycle delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestActivation(
  activations: SubsequentCycleCorrectiveDeliveryActivation[],
  plan: SubsequentCycleCorrectiveDeliveryPlan
) {
  return activations.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.subsequentCyclePlanId === plan.subsequentCyclePlanId &&
      item.status === "active" &&
      new Date(item.expiresAt).getTime() > Date.now()
  );
}

function deliveryFor(
  deliveries: SubsequentCycleCorrectiveLiveDelivery[],
  plan: SubsequentCycleCorrectiveDeliveryPlan
) {
  return deliveries.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.subsequentCyclePlanId === plan.subsequentCyclePlanId
  );
}

export function SubsequentCycleCorrectiveDeliveryWorkbench({
  initialModel
}: {
  initialModel: SubsequentCycleCorrectiveDeliveryModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});
  const [revokeNotes, setRevokeNotes] = useState<Record<string, string>>({});

  const contracts = useMemo(
    () => new Map(model.contracts.map((item) => [item.target, item])),
    [model.contracts]
  );

  function apply(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as SubsequentCycleCorrectiveDeliveryModel);
    } else {
      setModel(payload as unknown as SubsequentCycleCorrectiveDeliveryModel);
    }
  }

  async function activate(plan: SubsequentCycleCorrectiveDeliveryPlan) {
    const key = "activate:" + plan.subsequentCyclePlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "activate-subsequent-cycle",
        workspaceId: plan.workspaceId,
        subsequentCyclePlanId: plan.subsequentCyclePlanId,
        confirmation: confirmations[plan.subsequentCyclePlanId] ?? ""
      });
      apply(payload);
      setMessage(
        "Subsequent-cycle activation recorded after a fresh capability check and accepted dry-run."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation failed.");
    } finally {
      setBusy("");
    }
  }

  async function execute(plan: SubsequentCycleCorrectiveDeliveryPlan) {
    const key = "execute:" + plan.subsequentCyclePlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "execute-subsequent-cycle",
        workspaceId: plan.workspaceId,
        subsequentCyclePlanId: plan.subsequentCyclePlanId,
        confirmation: confirmations[plan.subsequentCyclePlanId] ?? ""
      });
      apply(payload);
      setMessage(
        payload.idempotent
          ? "The terminal subsequent-cycle delivery was returned without another send."
          : "Subsequent-cycle corrective delivery completed."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
      const refresh = await fetch(
        "/api/approved-data/reconciliation/subsequent-cycle-delivery",
        { cache: "no-store" }
      );
      if (refresh.ok) {
        setModel(
          (await refresh.json()) as SubsequentCycleCorrectiveDeliveryModel
        );
      }
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: SubsequentCycleCorrectiveDeliveryActivation) {
    const key = "revoke:" + activation.activationId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "revoke-subsequent-cycle",
          workspaceId: activation.workspaceId,
          activationId: activation.activationId,
          note: revokeNotes[activation.activationId] ?? ""
        })
      );
      setMessage("Subsequent-cycle activation revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revocation failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="correctiveSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Build 090 controlled execution</p>
            <h2>Subsequent-cycle delivery readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedPlans}</strong><span>approved subsequent-cycle plans</span></article>
          <article><strong>{model.totals.approvedPlansWithoutActiveActivation}</strong><span>await activation</span></article>
          <article><strong>{model.totals.activeActivations}</strong><span>active windows</span></article>
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted deliveries</span></article>
          <article><strong>{model.totals.retryableTransportErrors}</strong><span>retryable transport errors</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Approval is not delivery authority</strong>
        <p>
          Build 090 derives a fresh package identity from the approved Build 089
          plan, performs a fresh authenticated consumer capability check and
          accepted dry-run before opening a short activation window, then reserves
          one durable delivery before any live request. Retries reuse the exact
          replay/idempotency key and stop after five attempts. Accepted or rejected
          deliveries are terminal.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Approved Build 089 plans</p><h2>Activate & execute</h2></div>
        </div>
        <div className="publicationList">
          {model.planning.plans
            .filter((plan) => plan.status === "approved")
            .map((plan) => {
              const activation = latestActivation(model.activations, plan);
              const delivery = deliveryFor(model.deliveries, plan);
              const configured = contracts.get(plan.target);
              const terminal =
                delivery?.status === "accepted" || delivery?.status === "rejected";
              const phrase = activation
                ? executionPhrase(plan.target)
                : activationPhrase(plan.target);

              return (
                <article
                  className="publicationCard correctiveCard"
                  key={plan.subsequentCyclePlanId}
                >
                  <header>
                    <div>
                      <span className={
                        "publishState publishState-" +
                        (delivery?.status === "accepted"
                          ? "published"
                          : delivery?.status === "rejected"
                            ? "withdrawn"
                            : activation
                              ? "published"
                              : "draft")
                      }>
                        {delivery?.status ?? (activation ? "active" : "approved")}
                      </span>
                      <h3>{plan.target} · {plan.caseId}</h3>
                      <p>{plan.rationale}</p>
                    </div>
                    <span className="badge">
                      {configured?.configured ? "consumer configured" : "consumer not configured"}
                    </span>
                  </header>

                  <dl className="publicationEvidence">
                    <div><dt>Subsequent-cycle plan</dt><dd>{plan.subsequentCyclePlanId}</dd></div>
                    <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
                    <div><dt>Source recurrence</dt><dd>{plan.sourceFollowingCycleRecurrenceFingerprint}</dd></div>
                    <div><dt>Predecessor following-cycle delivery</dt><dd>{plan.predecessorFollowingCycleDeliveryId}</dd></div>
                    <div><dt>Predecessor following-cycle package</dt><dd>{plan.sourceFollowingCyclePackageId}</dd></div>
                    {activation ? (
                      <>
                        <div><dt>Activation</dt><dd>{activation.activationId}</dd></div>
                        <div><dt>New package</dt><dd>{activation.subsequentCyclePackageId}</dd></div>
                        <div><dt>New replay key</dt><dd>{activation.subsequentCycleReplayKey}</dd></div>
                        <div><dt>Activation expires</dt><dd>{new Date(activation.expiresAt).toLocaleString()}</dd></div>
                      </>
                    ) : null}
                    {delivery ? (
                      <>
                        <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                        <div><dt>Attempts</dt><dd>{delivery.attemptCount}</dd></div>
                        <div><dt>Validation</dt><dd>{delivery.validationCode}</dd></div>
                      </>
                    ) : null}
                  </dl>

                  {!terminal ? (
                    <div className="correctiveAction">
                      <label>
                        Type <code>{phrase}</code>
                        <input
                          value={confirmations[plan.subsequentCyclePlanId] ?? ""}
                          onChange={(event) =>
                            setConfirmations((current) => ({
                              ...current,
                              [plan.subsequentCyclePlanId]: event.target.value
                            }))
                          }
                        />
                      </label>

                      {!activation ? (
                        <button
                          className="primary"
                          type="button"
                          disabled={Boolean(busy) || !plan.canManage || !configured?.configured}
                          onClick={() => void activate(plan)}
                        >
                          {busy === "activate:" + plan.subsequentCyclePlanId
                            ? "Checking capability & dry-run…"
                            : "Activate subsequent-cycle delivery"}
                        </button>
                      ) : (
                        <button
                          className="primary"
                          type="button"
                          disabled={Boolean(busy) || !plan.canManage}
                          onClick={() => void execute(plan)}
                        >
                          {busy === "execute:" + plan.subsequentCyclePlanId
                            ? "Reserving & delivering…"
                            : delivery?.status === "transport-error"
                              ? "Retry subsequent-cycle delivery"
                              : "Execute subsequent-cycle delivery"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  {activation && !terminal ? (
                    <div className="correctiveAction">
                      <label>
                        Revocation note
                        <textarea
                          value={revokeNotes[activation.activationId] ?? ""}
                          onChange={(event) =>
                            setRevokeNotes((current) => ({
                              ...current,
                              [activation.activationId]: event.target.value
                            }))
                          }
                        />
                      </label>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !activation.canManage}
                        onClick={() => void revoke(activation)}
                      >
                        {busy === "revoke:" + activation.activationId
                          ? "Revoking activation…"
                          : "Revoke activation"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          {!model.planning.plans.some((plan) => plan.status === "approved") ? (
            <div className="emptyState">
              No approved Build 089 subsequent-cycle corrective plan is ready for execution.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div><p className="eyebrow">Immutable execution evidence</p><h2>Activation & delivery ledger</h2></div>
        </div>
        <div className="publicationList">
          {model.deliveries.map((delivery) => (
            <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (delivery.status === "accepted" ? "published" : "withdrawn")}>
                    {delivery.status}
                  </span>
                  <h3>{delivery.target} · attempt {delivery.attemptCount}</h3>
                  <p>{delivery.subsequentCyclePackageId}</p>
                </div>
                <span className="badge">{new Date(delivery.updatedAt).toLocaleString()}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                <div><dt>Activation</dt><dd>{delivery.activationId}</dd></div>
                <div><dt>Replay/idempotency key</dt><dd>{delivery.subsequentCycleReplayKey}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{delivery.subsequentCyclePackageFingerprint}</dd></div>
                <div><dt>Validation</dt><dd>{delivery.validationCode}</dd></div>
              </dl>
            </article>
          ))}
          {!model.deliveries.length ? (
            <div className="emptyState">No Build 090 live delivery evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
