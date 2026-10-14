"use client";

import { useMemo, useState } from "react";

import type {
  SuccessorGenerationCorrectiveDeliveryActivation,
  SuccessorGenerationCorrectiveDeliveryModel,
  SuccessorGenerationCorrectiveLiveDelivery
} from "@/lib/successor-generation-corrective-delivery-execution";
import type { SuccessorGenerationCorrectiveDeliveryPlan } from "@/lib/second-recurrence-planning";

function activationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "ACTIVATE " + target.toUpperCase() + " SUCCESSOR-GENERATION CORRECTIVE";
}

function executionPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "EXECUTE " + target.toUpperCase() + " SUCCESSOR-GENERATION CORRECTIVE";
}

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/successor-generation-delivery",
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
        : "Successor-generation delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestActivation(
  activations: SuccessorGenerationCorrectiveDeliveryActivation[],
  plan: SuccessorGenerationCorrectiveDeliveryPlan
) {
  return activations.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.successorGenerationPlanId === plan.successorGenerationPlanId &&
      item.status === "active" &&
      new Date(item.expiresAt).getTime() > Date.now()
  );
}

function deliveryFor(
  deliveries: SuccessorGenerationCorrectiveLiveDelivery[],
  plan: SuccessorGenerationCorrectiveDeliveryPlan
) {
  return deliveries.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.successorGenerationPlanId === plan.successorGenerationPlanId
  );
}

export function SuccessorGenerationCorrectiveDeliveryWorkbench({
  initialModel
}: {
  initialModel: SuccessorGenerationCorrectiveDeliveryModel;
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
      setModel(payload.model as unknown as SuccessorGenerationCorrectiveDeliveryModel);
    } else {
      setModel(payload as unknown as SuccessorGenerationCorrectiveDeliveryModel);
    }
  }

  async function activate(plan: SuccessorGenerationCorrectiveDeliveryPlan) {
    const key = "activate:" + plan.successorGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "activate-successor-generation",
        workspaceId: plan.workspaceId,
        successorGenerationPlanId: plan.successorGenerationPlanId,
        confirmation: confirmations[plan.successorGenerationPlanId] ?? ""
      });
      apply(payload);
      setMessage(
        "Successor-generation activation recorded after a fresh capability check and accepted dry-run."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation failed.");
    } finally {
      setBusy("");
    }
  }

  async function execute(plan: SuccessorGenerationCorrectiveDeliveryPlan) {
    const key = "execute:" + plan.successorGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "execute-successor-generation",
        workspaceId: plan.workspaceId,
        successorGenerationPlanId: plan.successorGenerationPlanId,
        confirmation: confirmations[plan.successorGenerationPlanId] ?? ""
      });
      apply(payload);
      setMessage(
        payload.idempotent
          ? "The terminal successor-generation delivery was returned without another send."
          : "Successor-generation corrective delivery completed."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
      const refresh = await fetch(
        "/api/approved-data/reconciliation/successor-generation-delivery",
        { cache: "no-store" }
      );
      if (refresh.ok) {
        setModel(
          (await refresh.json()) as SuccessorGenerationCorrectiveDeliveryModel
        );
      }
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: SuccessorGenerationCorrectiveDeliveryActivation) {
    const key = "revoke:" + activation.activationId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "revoke-successor-generation",
          workspaceId: activation.workspaceId,
          activationId: activation.activationId,
          note: revokeNotes[activation.activationId] ?? ""
        })
      );
      setMessage("Successor-generation activation revoked.");
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
            <p className="eyebrow">Build 066 controlled execution</p>
            <h2>Successor-generation delivery readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedPlans}</strong><span>approved successor-gen plans</span></article>
          <article><strong>{model.totals.approvedPlansWithoutActiveActivation}</strong><span>await activation</span></article>
          <article><strong>{model.totals.activeActivations}</strong><span>active windows</span></article>
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted deliveries</span></article>
          <article><strong>{model.totals.retryableTransportErrors}</strong><span>retryable transport errors</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Approval is not delivery authority</strong>
        <p>
          Build 066 derives a fresh package identity from the approved Build 061
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
          <div><p className="eyebrow">Approved Build 061 plans</p><h2>Activate & execute</h2></div>
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
                  key={plan.successorGenerationPlanId}
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
                    <div><dt>Successor-generation plan</dt><dd>{plan.successorGenerationPlanId}</dd></div>
                    <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
                    <div><dt>Source recurrence</dt><dd>{plan.sourceRecurrenceFingerprint}</dd></div>
                    <div><dt>Predecessor next-generation delivery</dt><dd>{plan.predecessorNextGenerationDeliveryId}</dd></div>
                    <div><dt>Predecessor successor package</dt><dd>{plan.sourceSuccessorPackageId}</dd></div>
                    {activation ? (
                      <>
                        <div><dt>Activation</dt><dd>{activation.activationId}</dd></div>
                        <div><dt>New package</dt><dd>{activation.successorGenerationPackageId}</dd></div>
                        <div><dt>New replay key</dt><dd>{activation.successorGenerationReplayKey}</dd></div>
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
                          value={confirmations[plan.successorGenerationPlanId] ?? ""}
                          onChange={(event) =>
                            setConfirmations((current) => ({
                              ...current,
                              [plan.successorGenerationPlanId]: event.target.value
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
                          {busy === "activate:" + plan.successorGenerationPlanId
                            ? "Checking capability & dry-run…"
                            : "Activate successor-generation delivery"}
                        </button>
                      ) : (
                        <button
                          className="primary"
                          type="button"
                          disabled={Boolean(busy) || !plan.canManage}
                          onClick={() => void execute(plan)}
                        >
                          {busy === "execute:" + plan.successorGenerationPlanId
                            ? "Reserving & delivering…"
                            : delivery?.status === "transport-error"
                              ? "Retry successor-generation delivery"
                              : "Execute successor-generation delivery"}
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
              No approved Build 061 successor-generation corrective plan is ready for execution.
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
                  <p>{delivery.successorGenerationPackageId}</p>
                </div>
                <span className="badge">{new Date(delivery.updatedAt).toLocaleString()}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                <div><dt>Activation</dt><dd>{delivery.activationId}</dd></div>
                <div><dt>Replay/idempotency key</dt><dd>{delivery.successorGenerationReplayKey}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{delivery.successorGenerationPackageFingerprint}</dd></div>
                <div><dt>Validation</dt><dd>{delivery.validationCode}</dd></div>
              </dl>
            </article>
          ))}
          {!model.deliveries.length ? (
            <div className="emptyState">No Build 066 live delivery evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
