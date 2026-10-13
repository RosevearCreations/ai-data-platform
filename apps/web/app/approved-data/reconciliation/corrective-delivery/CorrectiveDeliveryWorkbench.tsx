"use client";

import { useMemo, useState } from "react";

import type {
  CorrectiveDeliveryActivation,
  CorrectiveDeliveryModel,
  CorrectiveLiveDelivery
} from "@/lib/corrective-delivery-execution";
import type { CorrectiveDeliveryPlan } from "@/lib/reconciliation-exception-triage";

import { HelpInfo } from "../../../help/HelpInfo";

function correctiveActivationConfirmation(
  target: "rosie-dazzlers" | "devil-n-dove"
) {
  return "ACTIVATE " + target.toUpperCase() + " CORRECTIVE";
}

function correctiveExecutionConfirmation(
  target: "rosie-dazzlers" | "devil-n-dove"
) {
  return "EXECUTE " + target.toUpperCase() + " CORRECTIVE";
}

async function callApi(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch(
    "/api/approved-data/reconciliation/corrective-delivery",
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
        : "Corrective delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function activeByPlan(activations: CorrectiveDeliveryActivation[]) {
  const map = new Map<string, CorrectiveDeliveryActivation>();
  const now = Date.now();
  for (const activation of activations) {
    if (
      activation.status === "active" &&
      new Date(activation.expiresAt).getTime() > now
    ) {
      map.set(activation.workspaceId + ":" + activation.planId, activation);
    }
  }
  return map;
}

function latestByPlan(deliveries: CorrectiveLiveDelivery[]) {
  const map = new Map<string, CorrectiveLiveDelivery>();
  for (const delivery of deliveries) {
    const key = delivery.workspaceId + ":" + delivery.planId;
    if (!map.has(key)) map.set(key, delivery);
  }
  return map;
}

export function CorrectiveDeliveryWorkbench({
  initialModel
}: {
  initialModel: CorrectiveDeliveryModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmations, setConfirmations] = useState<Record<string, string>>({});

  const approvedPlans = useMemo(
    () => model.triage.plans.filter((plan) => plan.status === "approved"),
    [model.triage.plans]
  );
  const active = useMemo(
    () => activeByPlan(model.activations),
    [model.activations]
  );
  const latest = useMemo(
    () => latestByPlan(model.deliveries),
    [model.deliveries]
  );

  function applyModel(payload: Record<string, unknown>) {
    if (payload.model) {
      setModel(payload.model as unknown as CorrectiveDeliveryModel);
    } else if (payload.triage) {
      setModel(payload as unknown as CorrectiveDeliveryModel);
    }
  }

  async function activate(plan: CorrectiveDeliveryPlan) {
    const key = plan.workspaceId + ":" + plan.planId + ":activate";
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "activate-corrective",
        workspaceId: plan.workspaceId,
        planId: plan.planId,
        confirmation: confirmations[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        "Corrective activation created after a fresh capability check and accepted external dry-run."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Corrective activation failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function execute(plan: CorrectiveDeliveryPlan) {
    const key = plan.workspaceId + ":" + plan.planId + ":execute";
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("POST", {
        action: "execute-corrective",
        workspaceId: plan.workspaceId,
        planId: plan.planId,
        confirmation: confirmations[key] ?? ""
      });
      applyModel(payload);
      setMessage(
        payload.idempotent
          ? "Existing terminal corrective delivery returned without another mutation."
          : "Corrective delivery completed and durable evidence was recorded."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Corrective execution failed."
      );
      const response = await fetch(
        "/api/approved-data/reconciliation/corrective-delivery",
        { cache: "no-store" }
      );
      if (response.ok) {
        setModel((await response.json()) as CorrectiveDeliveryModel);
      }
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: CorrectiveDeliveryActivation) {
    const key = "revoke:" + activation.activationId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await callApi("PATCH", {
        action: "revoke-corrective",
        workspaceId: activation.workspaceId,
        activationId: activation.activationId,
        note: "Revoked from Build 054 corrective delivery workbench."
      });
      setModel(payload as unknown as CorrectiveDeliveryModel);
      setMessage("Corrective activation revoked.");
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
            <p className="eyebrow">Controlled correction</p>
            <h2>Execution readiness</h2>
          </div>
          <HelpInfo topic="corrective-delivery-overview" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.approvedPlans}</strong><span>approved plans</span></article>
          <article><strong>{model.totals.approvedPlansWithoutActiveActivation}</strong><span>need activation</span></article>
          <article><strong>{model.totals.activeActivations}</strong><span>active corrective windows</span></article>
          <article><strong>{model.totals.acceptedDeliveries}</strong><span>accepted corrections</span></article>
          <article><strong>{model.totals.retryableTransportErrors}</strong><span>same-key retries available</span></article>
        </div>
      </section>

      <section className="correctiveNotice">
        <strong>Plan approval still does not equal permission to write</strong>
        <p>
          Build 054 requires a fresh consumer capability check, an accepted dry-run
          of the exact corrective package, a one-hour activation, and a separate
          typed execution confirmation. A newer reconciliation supersedes the plan
          and blocks activation.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Approved Build 053 plans</p>
            <h2>Activate & execute</h2>
          </div>
          <HelpInfo topic="corrective-delivery-activation" />
        </div>

        <div className="publicationList">
          {approvedPlans.map((plan) => {
            const planKey = plan.workspaceId + ":" + plan.planId;
            const activation = active.get(planKey);
            const delivery = latest.get(planKey);
            const contract = model.triage.reconciliation.live.bridge.contracts.find(
              (item) => item.target === plan.target
            );
            const sourceDelivery = model.triage.reconciliation.live.deliveries.find(
              (item) => item.deliveryId === plan.deliveryId
            );
            const consumerMatches =
              Boolean(contract?.configured) &&
              contract?.endpointOrigin === sourceDelivery?.consumerId;
            const hasManualReview = plan.correctionScope.some(
              (item) => item.proposedAction === "manual-review"
            );
            const activateKey = planKey + ":activate";
            const executeKey = planKey + ":execute";
            const activationPhrase = correctiveActivationConfirmation(plan.target);
            const executionPhrase = correctiveExecutionConfirmation(plan.target);
            const terminal = delivery?.status === "accepted" || delivery?.status === "rejected";
            return (
              <article className="publicationCard correctiveCard" key={plan.planId}>
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (delivery?.status === "accepted" ? "published" : "withdrawn")
                      }
                    >
                      {delivery?.status ?? (activation ? "activated" : "approved plan")}
                    </span>
                    <h3>{plan.target} · corrective plan</h3>
                    <p>{plan.workspaceName} · {plan.rationale}</p>
                  </div>
                  <span className="badge">
                    {consumerMatches ? "consumer identity current" : "consumer blocked"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Plan</dt><dd>{plan.planId}</dd></div>
                  <div><dt>Plan fingerprint</dt><dd>{plan.planFingerprint}</dd></div>
                  <div><dt>Source delivery</dt><dd>{plan.deliveryId}</dd></div>
                  <div><dt>Scope</dt><dd>{plan.correctionScope.length} record(s)</dd></div>
                  {activation ? (
                    <>
                      <div><dt>Corrective package</dt><dd>{activation.correctivePackageId}</dd></div>
                      <div><dt>Corrective replay key</dt><dd>{activation.correctiveReplayKey}</dd></div>
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

                {hasManualReview ? (
                  <p className="bridgeHint">
                    Execution blocked: this approved plan still contains a
                    manual-review item. Create and approve a new fully executable
                    plan instead of guessing create semantics.
                  </p>
                ) : null}

                {!activation && !terminal ? (
                  <div className="correctiveAction">
                    <label>
                      Type <code>{activationPhrase}</code>
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
                      disabled={
                        Boolean(busy) ||
                        hasManualReview ||
                        !consumerMatches ||
                        !plan.canManage
                      }
                      onClick={() => void activate(plan)}
                    >
                      {busy === activateKey
                        ? "Dry-running & activating…"
                        : "Dry-run and activate corrective delivery"}
                    </button>
                  </div>
                ) : null}

                {activation && !terminal ? (
                  <div className="correctiveAction">
                    <label>
                      Type <code>{executionPhrase}</code>
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
                        disabled={Boolean(busy) || !plan.canManage}
                        onClick={() => void execute(plan)}
                      >
                        {busy === executeKey
                          ? "Executing…"
                          : delivery?.status === "transport-error"
                            ? "Retry with same idempotency key"
                            : "Execute corrective delivery"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !plan.canManage}
                        onClick={() => void revoke(activation)}
                      >
                        {busy === "revoke:" + activation.activationId
                          ? "Revoking…"
                          : "Revoke activation"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {delivery ? (
                  <p className="bridgeHint">
                    Attempt {delivery.attemptCount} · {delivery.validationCode}
                    {delivery.status === "accepted"
                      ? " · terminal: another execution will return this result without resending."
                      : delivery.status === "rejected"
                        ? " · terminal: rejected corrective packages are not automatically resent."
                        : delivery.status === "transport-error"
                          ? " · retry is permitted only with the identical corrective replay key."
                          : ""}
                  </p>
                ) : null}
              </article>
            );
          })}

          {!approvedPlans.length ? (
            <div className="emptyState">
              No approved Build 053 corrective plan is available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="correctiveSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable execution identity</p>
            <h2>Corrective delivery ledger</h2>
          </div>
          <HelpInfo topic="corrective-delivery-idempotency" />
        </div>

        <div className="publicationList">
          {model.deliveries.map((delivery) => (
            <article className="publicationCard correctiveCard" key={delivery.deliveryId}>
              <header>
                <div>
                  <span
                    className={
                      "publishState publishState-" +
                      (delivery.status === "accepted" ? "published" : "withdrawn")
                    }
                  >
                    {delivery.status}
                  </span>
                  <h3>{delivery.target} · {delivery.correctivePackageId}</h3>
                  <p>{delivery.workspaceName}</p>
                </div>
                <span className="badge">attempt {delivery.attemptCount}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Plan fingerprint</dt><dd>{delivery.planFingerprint}</dd></div>
                <div><dt>Activation fingerprint</dt><dd>{delivery.activationFingerprint}</dd></div>
                <div><dt>Replay / idempotency</dt><dd>{delivery.idempotencyKey}</dd></div>
                <div><dt>Corrective fingerprint</dt><dd>{delivery.correctivePackageFingerprint}</dd></div>
                <div><dt>Updated</dt><dd>{new Date(delivery.updatedAt).toLocaleString()}</dd></div>
              </dl>
            </article>
          ))}
          {!model.deliveries.length ? (
            <div className="emptyState">No corrective live delivery evidence exists yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
