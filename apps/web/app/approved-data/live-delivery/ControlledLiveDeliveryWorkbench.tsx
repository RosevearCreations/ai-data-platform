"use client";

import { useMemo, useState } from "react";

import type {
  ConsumerLiveActivation,
  ControlledLiveDeliveryModel
} from "@/lib/controlled-live-delivery";
import type { PublicationDeliveryMapping } from "@/lib/publication-delivery-bridge";

import { HelpInfo } from "../../help/HelpInfo";

function activationPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "ACTIVATE " + target.toUpperCase() + " LIVE";
}

function deliveryPhrase(target: "rosie-dazzlers" | "devil-n-dove") {
  return "DELIVER " + target.toUpperCase() + " LIVE";
}

async function request(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/approved-data/live-delivery", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Controlled live-delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function activeActivationFor(
  model: ControlledLiveDeliveryModel,
  mapping: PublicationDeliveryMapping
) {
  return model.activations.find(
    (activation) =>
      activation.workspaceId === mapping.workspaceId &&
      activation.mappingId === mapping.mappingId &&
      activation.status === "active" &&
      !activation.expired
  ) ?? null;
}

function currentDeliveryFor(
  model: ControlledLiveDeliveryModel,
  mapping: PublicationDeliveryMapping
) {
  return model.deliveries.find(
    (delivery) =>
      delivery.workspaceId === mapping.workspaceId &&
      delivery.mappingId === mapping.mappingId
  ) ?? null;
}

export function ControlledLiveDeliveryWorkbench({
  initialModel
}: {
  initialModel: ControlledLiveDeliveryModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [activationConfirmations, setActivationConfirmations] = useState<
    Record<string, string>
  >({});
  const [deliveryConfirmations, setDeliveryConfirmations] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const activeMappings = useMemo(
    () =>
      model.bridge.mappings.filter(
        (mapping) => mapping.status === "active"
      ),
    [model.bridge.mappings]
  );

  async function refresh() {
    const response = await fetch("/api/approved-data/live-delivery", {
      cache: "no-store"
    });
    if (!response.ok) return;
    setModel((await response.json()) as ControlledLiveDeliveryModel);
  }

  function latestAcceptedExternalDryRun(mapping: PublicationDeliveryMapping) {
    const contract = model.bridge.contracts.find(
      (item) => item.target === mapping.target
    );
    if (!contract?.endpointOrigin) return null;
    const threshold = Date.now() - 24 * 60 * 60 * 1000;
    return (
      model.bridge.receipts.find(
        (receipt) =>
          receipt.workspaceId === mapping.workspaceId &&
          receipt.mappingId === mapping.mappingId &&
          receipt.target === mapping.target &&
          receipt.transportMode === "live" &&
          receipt.consumerId === contract.endpointOrigin &&
          receipt.receiptStatus === "accepted" &&
          receipt.dryRun === true &&
          new Date(receipt.createdAt).getTime() >= threshold
      ) ?? null
    );
  }

  async function activate(mapping: PublicationDeliveryMapping) {
    setBusy("activate:" + mapping.mappingId);
    setMessage("");
    try {
      const payload = await request("POST", {
        action: "activate-live",
        workspaceId: mapping.workspaceId,
        mappingId: mapping.mappingId,
        confirmation: activationConfirmations[mapping.mappingId] ?? ""
      });
      setModel(payload.model as unknown as ControlledLiveDeliveryModel);
      setActivationConfirmations((values) => ({
        ...values,
        [mapping.mappingId]: ""
      }));
      setMessage(
        "Live delivery activated for 24 hours. The activation is pinned to the current publication, mapping, package and consumer origin."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation failed.");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function deliver(mapping: PublicationDeliveryMapping) {
    setBusy("deliver:" + mapping.mappingId);
    setMessage("");
    try {
      const payload = await request("POST", {
        action: "live-deliver",
        workspaceId: mapping.workspaceId,
        mappingId: mapping.mappingId,
        confirmation: deliveryConfirmations[mapping.mappingId] ?? ""
      });
      if (payload.model) {
        setModel(payload.model as unknown as ControlledLiveDeliveryModel);
      } else {
        await refresh();
      }
      setDeliveryConfirmations((values) => ({
        ...values,
        [mapping.mappingId]: ""
      }));
      setMessage(
        payload.idempotent === true
          ? "No second mutation was sent. The existing terminal live-delivery result was returned from the idempotency ledger."
          : "Live consumer acknowledgement recorded. Publication, mapping, activation and package fingerprints remain linked in durable evidence."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Live delivery did not complete."
      );
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function revoke(activation: ConsumerLiveActivation) {
    setBusy("revoke:" + activation.activationId);
    setMessage("");
    try {
      const next = await request("PATCH", {
        action: "revoke-live",
        workspaceId: activation.workspaceId,
        activationId: activation.activationId,
        note: "Revoked from the Build 051 controlled live-delivery workbench."
      });
      setModel(next as unknown as ControlledLiveDeliveryModel);
      setMessage("Live activation revoked. Existing receipts remain unchanged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revocation failed.");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="liveDeliverySummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Controlled mutation authority</p>
            <h2>Live-delivery status</h2>
          </div>
          <HelpInfo topic="controlled-live-delivery-overview" />
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.totals.activeActivations}</strong>
            <span>active live activations</span>
          </article>
          <article>
            <strong>{model.totals.expiringActivations}</strong>
            <span>expiring within 1 hour</span>
          </article>
          <article>
            <strong>{model.totals.acceptedLiveDeliveries}</strong>
            <span>accepted live deliveries</span>
          </article>
          <article>
            <strong>{model.totals.retryableTransportErrors}</strong>
            <span>retry-safe transport errors</span>
          </article>
        </div>
      </section>

      <section className="liveSafetyNotice">
        <strong>Live mutation gate</strong>
        <p>
          Activation requires a recent accepted external dry-run from Build 050,
          a fresh consumer handshake with live mutation enabled, and explicit
          replay-key idempotency that returns the original acknowledgement for a
          duplicate. A live send requires a second typed confirmation.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="liveDeliverySection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Activation + send</p>
            <h2>Consumer mappings</h2>
          </div>
          <HelpInfo topic="controlled-live-delivery-activation" />
        </div>

        <div className="publicationList">
          {activeMappings.map((mapping) => {
            const publication = model.bridge.publications.find(
              (item) =>
                item.workspaceId === mapping.workspaceId &&
                item.publicationId === mapping.publicationId
            );
            const contract = model.bridge.contracts.find(
              (item) => item.target === mapping.target
            );
            const dryRunReceipt = latestAcceptedExternalDryRun(mapping);
            const activation = activeActivationFor(model, mapping);
            const delivery = currentDeliveryFor(model, mapping);
            const activationExpected = activationPhrase(mapping.target);
            const deliveryExpected = deliveryPhrase(mapping.target);
            const terminalAccepted = delivery?.status === "accepted";
            const terminalRejected = delivery?.status === "rejected";
            const retryable =
              delivery?.status === "transport-error" &&
              delivery.attemptCount < 5;

            return (
              <article className="publicationCard liveDeliveryCard" key={mapping.mappingId}>
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (activation ? "published" : "withdrawn")
                      }
                    >
                      {activation ? "live active" : "live locked"}
                    </span>
                    <h3>{publication?.title ?? mapping.publicationId}</h3>
                    <p>
                      {mapping.workspaceName} · {mapping.target} · {mapping.operationAction}
                    </p>
                  </div>
                  <span className="badge">
                    {contract?.configured ? "consumer configured" : "consumer not configured"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div>
                    <dt>Publication fingerprint</dt>
                    <dd>{publication?.publicationFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Mapping fingerprint</dt>
                    <dd>{mapping.mappingFingerprint}</dd>
                  </div>
                  <div>
                    <dt>Consumer origin</dt>
                    <dd>{contract?.endpointOrigin ?? "not configured"}</dd>
                  </div>
                  <div>
                    <dt>External dry-run</dt>
                    <dd>
                      {dryRunReceipt
                        ? "accepted " + new Date(dryRunReceipt.createdAt).toLocaleString()
                        : "required within 24 hours"}
                    </dd>
                  </div>
                </dl>

                {!activation ? (
                  <div className="liveActionPanel">
                    <p className="bridgeHint">
                      Type <code>{activationExpected}</code> to activate this exact mapping
                      for 24 hours.
                    </p>
                    <input
                      value={activationConfirmations[mapping.mappingId] ?? ""}
                      onChange={(event) =>
                        setActivationConfirmations((values) => ({
                          ...values,
                          [mapping.mappingId]: event.target.value
                        }))
                      }
                      placeholder={activationExpected}
                      aria-label={"Activation confirmation for " + mapping.target}
                    />
                    <button
                      className="primary"
                      type="button"
                      disabled={
                        Boolean(busy) ||
                        !mapping.canManage ||
                        !mapping.readiness.ready ||
                        !contract?.configured ||
                        !dryRunReceipt ||
                        activationConfirmations[mapping.mappingId] !== activationExpected
                      }
                      onClick={() => void activate(mapping)}
                    >
                      {busy === "activate:" + mapping.mappingId
                        ? "Activating…"
                        : "Activate controlled live delivery"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="liveActivationEvidence">
                      <p>
                        Activation expires {new Date(activation.expiresAt).toLocaleString()}
                      </p>
                      <code>{activation.activationFingerprint}</code>
                    </div>

                    <div className="liveActionPanel">
                      <p className="bridgeHint">
                        Type <code>{deliveryExpected}</code> for this live send.
                        {retryable
                          ? " The prior transport result is uncertain; retry is safe only because the identical replay key is reused."
                          : ""}
                      </p>
                      <input
                        value={deliveryConfirmations[mapping.mappingId] ?? ""}
                        onChange={(event) =>
                          setDeliveryConfirmations((values) => ({
                            ...values,
                            [mapping.mappingId]: event.target.value
                          }))
                        }
                        placeholder={deliveryExpected}
                        aria-label={"Live-delivery confirmation for " + mapping.target}
                      />
                      <div className="heroActions">
                        <button
                          className="primary"
                          type="button"
                          disabled={
                            Boolean(busy) ||
                            !mapping.canManage ||
                            terminalAccepted ||
                            terminalRejected ||
                            deliveryConfirmations[mapping.mappingId] !== deliveryExpected
                          }
                          onClick={() => void deliver(mapping)}
                        >
                          {busy === "deliver:" + mapping.mappingId
                            ? "Sending…"
                            : terminalAccepted
                              ? "Already accepted — no resend"
                              : terminalRejected
                                ? "Rejected — new mapping required"
                                : retryable
                                  ? "Retry with same idempotency key"
                                  : "Send live delivery"}
                        </button>
                        <button
                          className="secondaryButton"
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => void revoke(activation)}
                        >
                          {busy === "revoke:" + activation.activationId
                            ? "Revoking…"
                            : "Revoke activation"}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {delivery ? (
                  <div className="liveDeliveryOutcome">
                    <strong>{delivery.status}</strong>
                    <span>
                      attempt {delivery.attemptCount} · {delivery.validationCode}
                    </span>
                    <code>{delivery.idempotencyKey}</code>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!activeMappings.length ? (
            <div className="emptyState">
              No active Build 050 mappings are available for controlled live activation.
            </div>
          ) : null}
        </div>
      </section>

      <section className="liveDeliverySection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Canonical idempotency evidence</p>
            <h2>Live delivery ledger</h2>
          </div>
          <HelpInfo topic="controlled-live-delivery-idempotency" />
        </div>

        <div className="publicationList">
          {model.deliveries.map((delivery) => (
            <article className="publicationCard" key={delivery.deliveryId}>
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
                  <h3>{delivery.target}</h3>
                  <p>
                    {delivery.workspaceName} · attempt {delivery.attemptCount}
                  </p>
                </div>
                <span className="badge">
                  {delivery.status === "transport-error" ? "retry-safe" : "terminal"}
                </span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Package</dt><dd>{delivery.packageId}</dd></div>
                <div><dt>Idempotency key</dt><dd>{delivery.idempotencyKey}</dd></div>
                <div><dt>Publication fingerprint</dt><dd>{delivery.publicationFingerprint}</dd></div>
                <div><dt>Mapping fingerprint</dt><dd>{delivery.mappingFingerprint}</dd></div>
                <div><dt>Activation fingerprint</dt><dd>{delivery.activationFingerprint}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{delivery.packageFingerprint}</dd></div>
              </dl>
              <small>
                Last attempt {new Date(delivery.lastAttemptAt).toLocaleString()}
                {delivery.consumerReceivedAt
                  ? " · consumer receipt " +
                    new Date(delivery.consumerReceivedAt).toLocaleString()
                  : ""}
              </small>
            </article>
          ))}

          {!model.deliveries.length ? (
            <div className="emptyState">
              No Build 051 live-delivery reservation has been created.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
