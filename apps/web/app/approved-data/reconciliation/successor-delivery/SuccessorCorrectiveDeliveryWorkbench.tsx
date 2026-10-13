"use client";

import { useMemo, useState } from "react";

import type {
  SuccessorCorrectiveDeliveryActivation,
  SuccessorCorrectiveDeliveryModel,
  SuccessorCorrectiveLiveDelivery
} from "@/lib/successor-corrective-delivery-execution";
import type { SuccessorCorrectiveDeliveryPlan } from "@/lib/reopened-exception-planning";

function activationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "ACTIVATE " + target.toUpperCase() + " SUCCESSOR CORRECTIVE";
}

function executionPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "EXECUTE " + target.toUpperCase() + " SUCCESSOR CORRECTIVE";
}

async function callApi(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch(
    "/api/approved-data/reconciliation/successor-delivery",
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
        : "Successor corrective delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function activeByPlan(activations: SuccessorCorrectiveDeliveryActivation[]) {
  const map = new Map<string, SuccessorCorrectiveDeliveryActivation>();
  const now = Date.now();
  for (const activation of activations) {
    if (
      activation.status === "active" &&
      new Date(activation.expiresAt).getTime() > now
    ) {
      map.set(
        activation.workspaceId + ":" + activation.successorPlanId,
        activation
      );
    }
  }
  return map;
}

function latestByPlan(deliveries: SuccessorCorrectiveLiveDelivery[]) {
  const map = new Map<string, SuccessorCorrectiveLiveDelivery>();
  for (const delivery of deliveries) {
    const key = delivery.workspaceId + ":" + delivery.successorPlanId;
    if (!map.has(key)) map.set(key, delivery);
  }
  return map;
}

export function SuccessorCorrectiveDeliveryWorkbench({
  initialModel
}: {
  initialModel: SuccessorCorrectiveDeliveryModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const approvedPlans = useMemo(
    () => model.planning.plans.filter((plan) => plan.status === "approved"),
    [model.planning.plans]
  );
  const active = useMemo(() => activeByPlan(model.activations), [model.activations]);
  const latest = useMemo(() => latestByPlan(model.deliveries), [model.deliveries]);

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as SuccessorCorrectiveDeliveryModel);
    } else if (payload.planning) {
      setModel(payload as unknown as SuccessorCorrectiveDeliveryModel);
    }
  }

  async function activate(plan: SuccessorCorrectiveDeliveryPlan) {
    const key = plan.workspaceId + ":" + plan.successorPlanId + ":activate";
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "activate-successor",
        workspaceId: plan.workspaceId,
        successorPlanId: plan.successorPlanId,
        confirmation: confirmations[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Successor activation recorded after a fresh capability check and accepted dry-run."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Successor activation failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function execute(plan: SuccessorCorrectiveDeliveryPlan) {
    const key = plan.workspaceId + ":" + plan.successorPlanId + ":execute";
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "execute-successor",
        workspaceId: plan.workspaceId,
        successorPlanId: plan.successorPlanId,
        confirmation: confirmations[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        payload.idempotent
          ? "The terminal successor delivery was returned without another send."
          : "Successor corrective delivery completed and its evidence was recorded."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Successor execution failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/successor-delivery",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as SuccessorCorrectiveDeliveryModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: SuccessorCorrectiveDeliveryActivation) {
    const key = "revoke:" + activation.activationId;
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "revoke-successor",
        workspaceId: activation.workspaceId,
        activationId: activation.activationId,
        note: "Revoked from Build 058 successor corrective delivery workbench."
      });
      setModel(payload as unknown as SuccessorCorrectiveDeliveryModel);
      setMessage("Successor corrective activation revoked.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Activation revocation failed."
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
            <p className="eyebrow">Successor correction</p>
            <h2>Execution readiness</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedPlans}</strong><span>approved successor plans</span></article>
          <article><strong>{model.totals.approvedPlansWithoutActiveActivation}</strong><span>need activation</span></article>
          <article><strong>{model.totals.activeActivations}</strong><span>active windows</span></article>
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted successor deliveries</span></article>
          <article><strong>{model.totals.retryableTransportErrors}</strong><span>same-key retries available</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>A reopened exception cannot reuse its old corrective execution</strong>
        <p>
          Build 058 reconstructs the accepted predecessor corrective package only as
          immutable source evidence. It then creates a distinct successor package,
          replay key, activation fingerprint and delivery ledger. A fresh dry-run
          and typed confirmation are required before the new live mutation.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Approved Build 057 plans</p>
            <h2>Activate & execute successor correction</h2>
          </div>
        </div>
        <div className="publicationList">
          {approvedPlans.map((plan) => {
            const planKey = plan.workspaceId + ":" + plan.successorPlanId;
            const activation = active.get(planKey);
            const delivery = latest.get(planKey);
            const contract = model.contracts.find(
              (item) => item.target === plan.target
            );
            const consumerMatches =
              Boolean(contract?.configured) &&
              contract?.endpointOrigin === activation?.consumerId;
            const noActivationConsumerReady =
              Boolean(contract?.configured) && Boolean(contract?.endpointOrigin);
            const activateKey = planKey + ":activate";
            const executeKey = planKey + ":execute";
            const terminal =
              delivery?.status === "accepted" || delivery?.status === "rejected";
            return (
              <article className="publicationCard correctiveCard" key={plan.successorPlanId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (delivery?.status === "accepted" ? "published" : "withdrawn")}>
                      {delivery?.status ?? (activation ? "activated" : "approved successor plan")}
                    </span>
                    <h3>{plan.target} · successor corrective plan</h3>
                    <p>{plan.workspaceName} · {plan.rationale}</p>
                  </div>
                  <span className="badge">
                    {activation
                      ? consumerMatches ? "consumer identity current" : "consumer blocked"
                      : noActivationConsumerReady ? "consumer configured" : "consumer blocked"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Successor plan</dt><dd>{plan.successorPlanId}</dd></div>
                  <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
                  <div><dt>Regression fingerprint</dt><dd>{plan.sourceRegressionFingerprint}</dd></div>
                  <div><dt>Predecessor delivery</dt><dd>{plan.predecessorCorrectiveDeliveryId}</dd></div>
                  <div><dt>Predecessor package</dt><dd>{plan.sourceCorrectivePackageId}</dd></div>
                  {activation ? (
                    <>
                      <div><dt>Successor package</dt><dd>{activation.successorPackageId}</dd></div>
                      <div><dt>Replay / idempotency</dt><dd>{activation.successorReplayKey}</dd></div>
                      <div><dt>Activation expires</dt><dd>{new Date(activation.expiresAt).toLocaleString()}</dd></div>
                    </>
                  ) : null}
                </dl>

                <div className="correctiveScope">
                  {plan.correctionScope.map((scope) => (
                    <div key={scope.integrationKey}>
                      <strong>{scope.integrationKey}</strong>
                      <span>{scope.issueStatus} · {scope.proposedAction}</span>
                      <small>{scope.governedFields.join(", ")}</small>
                    </div>
                  ))}
                </div>

                {!activation && !terminal ? (
                  <div className="correctiveAction">
                    <label>
                      Type <code>{activationPhrase(plan.target)}</code>
                      <input
                        value={confirmations[activateKey] ?? ""}
                        onChange={(event) =>
                          setConfirmations((values) => ({
                            ...values,
                            [activateKey]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      type="button"
                      disabled={Boolean(busy) || !noActivationConsumerReady || !plan.canManage}
                      onClick={() => void activate(plan)}
                    >
                      {busy === activateKey
                        ? "Checking, dry-running & activating…"
                        : "Dry-run and activate successor delivery"}
                    </button>
                  </div>
                ) : null}

                {activation && !terminal ? (
                  <div className="correctiveAction">
                    <label>
                      Type <code>{executionPhrase(plan.target)}</code>
                      <input
                        value={confirmations[executeKey] ?? ""}
                        onChange={(event) =>
                          setConfirmations((values) => ({
                            ...values,
                            [executeKey]: event.target.value
                          }))
                        }
                      />
                    </label>
                    <div className="heroActions">
                      <button
                        className="primary"
                        type="button"
                        disabled={Boolean(busy) || !consumerMatches || !plan.canManage}
                        onClick={() => void execute(plan)}
                      >
                        {busy === executeKey
                          ? "Executing successor correction…"
                          : delivery?.status === "transport-error"
                            ? "Retry with same idempotency key"
                            : "Execute successor corrective delivery"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !plan.canManage}
                        onClick={() => void revoke(activation)}
                      >
                        {busy === "revoke:" + activation.activationId
                          ? "Revoking activation…"
                          : "Revoke activation"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {delivery ? (
                  <p className="bridgeHint">
                    Attempt {delivery.attemptCount} · {delivery.validationCode}
                    {delivery.status === "accepted"
                      ? " · terminal: repeated execution returns this result without resending."
                      : delivery.status === "rejected"
                        ? " · terminal: rejected successor packages are not automatically resent."
                        : delivery.status === "transport-error"
                          ? " · retry is permitted only with the identical successor replay key."
                          : ""}
                  </p>
                ) : null}
              </article>
            );
          })}
          {!approvedPlans.length ? (
            <div className="emptyState">No approved Build 057 successor corrective plan is available.</div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable successor identity</p>
            <h2>Successor delivery ledger</h2>
          </div>
        </div>
        <div className="publicationList">
          {model.deliveries.map((delivery) => (
            <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (delivery.status === "accepted" ? "published" : "withdrawn")}>
                    {delivery.status}
                  </span>
                  <h3>{delivery.target} · {delivery.successorPackageId}</h3>
                  <p>{delivery.workspaceName}</p>
                </div>
                <span className="badge">attempt {delivery.attemptCount}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Successor plan fingerprint</dt><dd>{delivery.successorPlanFingerprint}</dd></div>
                <div><dt>Activation fingerprint</dt><dd>{delivery.activationFingerprint}</dd></div>
                <div><dt>Replay / idempotency</dt><dd>{delivery.idempotencyKey}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{delivery.successorPackageFingerprint}</dd></div>
                <div><dt>Updated</dt><dd>{new Date(delivery.updatedAt).toLocaleString()}</dd></div>
              </dl>
            </article>
          ))}
          {!model.deliveries.length ? (
            <div className="emptyState">No successor corrective live delivery evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
