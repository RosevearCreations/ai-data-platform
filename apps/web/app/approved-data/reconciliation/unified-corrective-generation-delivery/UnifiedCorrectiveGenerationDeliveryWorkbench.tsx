"use client";

import { useMemo, useState } from "react";

import type {
  UnifiedCorrectiveGenerationDeliveryActivation,
  UnifiedCorrectiveGenerationDeliveryModel,
  UnifiedCorrectiveGenerationLiveDelivery
} from "@/lib/unified-corrective-generation-delivery-execution";
import type { UnifiedCorrectiveGenerationPlan } from "@/lib/unified-corrective-generation-planning";

function activationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "ACTIVATE " + target.toUpperCase() + " UNIFIED-CORRECTIVE-GENERATION CORRECTIVE";
}

function executionPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "EXECUTE " + target.toUpperCase() + " UNIFIED-CORRECTIVE-GENERATION CORRECTIVE";
}

async function api(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(
    "/api/approved-data/reconciliation/unified-corrective-generation-delivery",
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
        : "Unified corrective-generation delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestActivation(
  activations: UnifiedCorrectiveGenerationDeliveryActivation[],
  plan: UnifiedCorrectiveGenerationPlan
) {
  return activations.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.correctiveGenerationPlanId === plan.correctiveGenerationPlanId &&
      item.status === "active" &&
      new Date(item.expiresAt).getTime() > Date.now()
  );
}

function deliveryFor(
  deliveries: UnifiedCorrectiveGenerationLiveDelivery[],
  plan: UnifiedCorrectiveGenerationPlan
) {
  return deliveries.find(
    (item) =>
      item.workspaceId === plan.workspaceId &&
      item.correctiveGenerationPlanId === plan.correctiveGenerationPlanId
  );
}

export function UnifiedCorrectiveGenerationDeliveryWorkbench({
  initialModel
}: {
  initialModel: UnifiedCorrectiveGenerationDeliveryModel;
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
      setModel(payload.model as unknown as UnifiedCorrectiveGenerationDeliveryModel);
    } else {
      setModel(payload as unknown as UnifiedCorrectiveGenerationDeliveryModel);
    }
  }

  async function activate(plan: UnifiedCorrectiveGenerationPlan) {
    const key = "activate:" + plan.correctiveGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "activate-unified-corrective-generation",
        workspaceId: plan.workspaceId,
        correctiveGenerationPlanId: plan.correctiveGenerationPlanId,
        confirmation: confirmations[plan.correctiveGenerationPlanId] ?? ""
      });
      apply(payload);
      setMessage(
        "Unified corrective-generation activation recorded after a fresh capability check and accepted dry-run."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation failed.");
    } finally {
      setBusy("");
    }
  }

  async function execute(plan: UnifiedCorrectiveGenerationPlan) {
    const key = "execute:" + plan.correctiveGenerationPlanId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await api("POST", {
        action: "execute-unified-corrective-generation",
        workspaceId: plan.workspaceId,
        correctiveGenerationPlanId: plan.correctiveGenerationPlanId,
        confirmation: confirmations[plan.correctiveGenerationPlanId] ?? ""
      });
      apply(payload);
      setMessage(
        payload.idempotent
          ? "The terminal unified corrective-generation delivery was returned without another send."
          : "Unified corrective-generation delivery completed."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
      const refresh = await fetch(
        "/api/approved-data/reconciliation/unified-corrective-generation-delivery",
        { cache: "no-store" }
      );
      if (refresh.ok) {
        setModel(
          (await refresh.json()) as UnifiedCorrectiveGenerationDeliveryModel
        );
      }
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: UnifiedCorrectiveGenerationDeliveryActivation) {
    const key = "revoke:" + activation.activationId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      apply(
        await api("PATCH", {
          action: "revoke-unified-corrective-generation",
          workspaceId: activation.workspaceId,
          activationId: activation.activationId,
          note: revokeNotes[activation.activationId] ?? ""
        })
      );
      setMessage("Unified corrective-generation activation revoked.");
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
            <p className="eyebrow">Build 111 controlled execution</p>
            <h2>Unified corrective-generation delivery readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedPlans}</strong><span>approved unified plans</span></article>
          <article><strong>{model.totals.approvedPlansWithoutActiveActivation}</strong><span>await activation</span></article>
          <article><strong>{model.totals.activeActivations}</strong><span>active windows</span></article>
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted deliveries</span></article>
          <article><strong>{model.totals.retryableTransportErrors}</strong><span>retryable transport errors</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Approval is not delivery authority</strong>
        <p>
          Build 111 reconstructs the accepted predecessor package from the Build 109
          lineage registry, derives a fresh generation package from the approved Build
          110 plan, verifies the configured consumer, requires an accepted dry-run,
          opens a short activation window, and reserves one durable delivery before a
          live request. Retries reuse the exact replay/idempotency key and stop after
          five attempts. Accepted and rejected deliveries are terminal.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Approved Build 110 plans</p>
            <h2>Activate & execute any corrective generation</h2>
          </div>
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
                  key={plan.correctiveGenerationPlanId}
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
                      <h3>G{plan.generationNumber} · {plan.target} · {plan.caseId}</h3>
                      <p>{plan.rationale}</p>
                    </div>
                    <span className="badge">
                      {configured?.configured ? "consumer configured" : "consumer not configured"}
                    </span>
                  </header>

                  <dl className="publicationEvidence">
                    <div><dt>Unified plan</dt><dd>{plan.correctiveGenerationPlanId}</dd></div>
                    <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
                    <div><dt>Successor source</dt><dd>{plan.successorSourceId}</dd></div>
                    <div><dt>Predecessor lineage</dt><dd>{plan.predecessorGenerationLineageId}</dd></div>
                    <div><dt>Predecessor delivery</dt><dd>{plan.predecessorDeliveryId}</dd></div>
                    <div><dt>Predecessor package</dt><dd>{plan.predecessorPackageId}</dd></div>
                    {activation ? (
                      <>
                        <div><dt>Activation</dt><dd>{activation.activationId}</dd></div>
                        <div><dt>New package</dt><dd>{activation.unifiedPackageId}</dd></div>
                        <div><dt>New replay key</dt><dd>{activation.unifiedReplayKey}</dd></div>
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
                          value={confirmations[plan.correctiveGenerationPlanId] ?? ""}
                          onChange={(event) =>
                            setConfirmations((current) => ({
                              ...current,
                              [plan.correctiveGenerationPlanId]: event.target.value
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
                          {busy === "activate:" + plan.correctiveGenerationPlanId
                            ? "Checking capability & dry-run…"
                            : "Activate unified corrective-generation delivery"}
                        </button>
                      ) : (
                        <button
                          className="primary"
                          type="button"
                          disabled={Boolean(busy) || !plan.canManage}
                          onClick={() => void execute(plan)}
                        >
                          {busy === "execute:" + plan.correctiveGenerationPlanId
                            ? "Reserving & delivering…"
                            : delivery?.status === "transport-error"
                              ? "Retry unified corrective-generation delivery"
                              : "Execute unified corrective-generation delivery"}
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
              No approved Build 110 unified corrective-generation plan is ready for execution.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable execution evidence</p>
            <h2>Unified activation & delivery ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.deliveries.map((delivery) => (
            <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
              <header>
                <div>
                  <span className={
                    "publishState publishState-" +
                    (delivery.status === "accepted" ? "published" : "withdrawn")
                  }>
                    {delivery.status}
                  </span>
                  <h3>G{delivery.generationNumber} · {delivery.target} · attempt {delivery.attemptCount}</h3>
                  <p>{delivery.unifiedPackageId}</p>
                </div>
                <span className="badge">{new Date(delivery.updatedAt).toLocaleString()}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Delivery</dt><dd>{delivery.deliveryId}</dd></div>
                <div><dt>Activation</dt><dd>{delivery.activationId}</dd></div>
                <div><dt>Replay/idempotency key</dt><dd>{delivery.unifiedReplayKey}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{delivery.unifiedPackageFingerprint}</dd></div>
                <div><dt>Validation</dt><dd>{delivery.validationCode}</dd></div>
              </dl>
            </article>
          ))}
          {!model.deliveries.length ? (
            <div className="emptyState">No Build 111 live delivery evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
