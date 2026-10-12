"use client";

import { useMemo, useState } from "react";

import type {
  LiveDeliveryReconciliation,
  PostDeliveryReconciliationModel
} from "@/lib/post-delivery-reconciliation";
import type { ControlledLiveDelivery } from "@/lib/controlled-live-delivery";

import { HelpInfo } from "../../help/HelpInfo";

async function verifyState(
  workspaceId: string,
  deliveryId: string
) {
  const response = await fetch("/api/approved-data/reconciliation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "verify-state",
      workspaceId,
      deliveryId
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Consumer state verification failed."
    );
  }
  return payload as Record<string, unknown>;
}

function latestByDelivery(
  reconciliations: LiveDeliveryReconciliation[]
) {
  const map = new Map<string, LiveDeliveryReconciliation>();
  for (const item of reconciliations) {
    const key = item.workspaceId + ":" + item.deliveryId;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

function deliveryLabel(delivery: ControlledLiveDelivery) {
  return delivery.target + " · " + delivery.packageId;
}

export function PostDeliveryReconciliationWorkbench({
  initialModel
}: {
  initialModel: PostDeliveryReconciliationModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const acceptedDeliveries = useMemo(
    () => model.live.deliveries.filter((delivery) => delivery.status === "accepted"),
    [model.live.deliveries]
  );
  const latest = useMemo(
    () => latestByDelivery(model.reconciliations),
    [model.reconciliations]
  );

  async function runVerification(delivery: ControlledLiveDelivery) {
    const key = delivery.workspaceId + ":" + delivery.deliveryId;
    setBusy(key);
    setMessage("");
    try {
      const payload = await verifyState(delivery.workspaceId, delivery.deliveryId);
      if (payload.model) {
        setModel(payload.model as unknown as PostDeliveryReconciliationModel);
      }
      const counts =
        payload.counts && typeof payload.counts === "object"
          ? (payload.counts as Record<string, unknown>)
          : {};
      setMessage(
        payload.result === "matched"
          ? "Consumer state matches the delivered package for every governed field."
          : "Verification completed with drift: " +
              String(counts.mismatched ?? 0) +
              " mismatched and " +
              String(counts.missing ?? 0) +
              " missing record(s). No corrective write was performed."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Consumer state verification did not complete."
      );
      const response = await fetch("/api/approved-data/reconciliation", {
        cache: "no-store"
      });
      if (response.ok) {
        setModel(
          (await response.json()) as PostDeliveryReconciliationModel
        );
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="reconciliationSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Read-only verification</p>
            <h2>Reconciliation status</h2>
          </div>
          <HelpInfo topic="post-delivery-reconciliation-overview" />
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.totals.acceptedLiveDeliveries}</strong>
            <span>accepted live deliveries</span>
          </article>
          <article>
            <strong>{model.totals.neverVerified}</strong>
            <span>never verified</span>
          </article>
          <article>
            <strong>{model.totals.matchedLatest}</strong>
            <span>latest state matched</span>
          </article>
          <article>
            <strong>{model.totals.driftLatest}</strong>
            <span>latest state drifted</span>
          </article>
          <article>
            <strong>{model.totals.verificationErrors}</strong>
            <span>verification errors</span>
          </article>
        </div>
      </section>

      <section className="reconciliationNotice">
        <strong>Verification is read-only</strong>
        <p>
          Build 052 asks the configured consumer for the current values of only the
          integration keys and mapped fields from the accepted live package. A mismatch
          creates evidence; it never triggers an automatic repair, retry, rollback or
          new delivery.
        </p>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="reconciliationSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Accepted Build 051 deliveries</p>
            <h2>Verify consumer state</h2>
          </div>
          <HelpInfo topic="post-delivery-reconciliation-verify" />
        </div>

        <div className="publicationList">
          {acceptedDeliveries.map((delivery) => {
            const key = delivery.workspaceId + ":" + delivery.deliveryId;
            const current = latest.get(key);
            const contract = model.live.bridge.contracts.find(
              (item) => item.target === delivery.target
            );
            const consumerMatches =
              contract?.configured &&
              contract.endpointOrigin === delivery.consumerId;
            return (
              <article className="publicationCard reconciliationCard" key={delivery.deliveryId}>
                <header>
                  <div>
                    <span
                      className={
                        "publishState publishState-" +
                        (current?.status === "matched" ? "published" : "withdrawn")
                      }
                    >
                      {current ? current.status : "unverified"}
                    </span>
                    <h3>{deliveryLabel(delivery)}</h3>
                    <p>{delivery.workspaceName}</p>
                  </div>
                  <span className="badge">
                    {consumerMatches ? "consumer identity current" : "consumer identity changed"}
                  </span>
                </header>

                <dl className="publicationEvidence">
                  <div><dt>Consumer</dt><dd>{delivery.consumerId}</dd></div>
                  <div><dt>Replay key</dt><dd>{delivery.replayKey}</dd></div>
                  <div><dt>Package fingerprint</dt><dd>{delivery.packageFingerprint}</dd></div>
                  <div><dt>Accepted</dt><dd>{delivery.consumerReceivedAt ? new Date(delivery.consumerReceivedAt).toLocaleString() : new Date(delivery.updatedAt).toLocaleString()}</dd></div>
                </dl>

                {current ? (
                  <div className="reconciliationCounts">
                    <span>{current.matchedCount} matched</span>
                    <span>{current.mismatchedCount} mismatched</span>
                    <span>{current.missingCount} missing</span>
                  </div>
                ) : null}

                <button
                  className="primary"
                  type="button"
                  disabled={Boolean(busy) || !consumerMatches}
                  onClick={() => void runVerification(delivery)}
                >
                  {busy === key ? "Verifying…" : "Verify current consumer state"}
                </button>
              </article>
            );
          })}

          {!acceptedDeliveries.length ? (
            <div className="emptyState">
              No accepted Build 051 live delivery is available for reconciliation.
            </div>
          ) : null}
        </div>
      </section>

      <section className="reconciliationSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable evidence</p>
            <h2>Reconciliation history</h2>
          </div>
          <HelpInfo topic="post-delivery-reconciliation-evidence" />
        </div>

        <div className="publicationList">
          {model.reconciliations.map((item) => (
            <article className="publicationCard reconciliationCard" key={item.reconciliationId}>
              <header>
                <div>
                  <span
                    className={
                      "publishState publishState-" +
                      (item.status === "matched" ? "published" : "withdrawn")
                    }
                  >
                    {item.status}
                  </span>
                  <h3>{item.target} · {item.packageId}</h3>
                  <p>{item.workspaceName} · {item.validationCode}</p>
                </div>
                <span className="badge">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </header>

              <div className="reconciliationCounts">
                <span>{item.matchedCount} matched</span>
                <span>{item.mismatchedCount} mismatched</span>
                <span>{item.missingCount} missing</span>
              </div>

              {item.recordResults.length ? (
                <div className="reconciliationResults">
                  {item.recordResults.map((record) => (
                    <div key={record.integrationKey}>
                      <strong>{record.integrationKey}</strong>
                      <span>{record.status}</span>
                      {record.differingFields.length ? (
                        <small>
                          Fields: {record.differingFields.join(", ")}
                        </small>
                      ) : null}
                      <code>
                        expected {record.expectedFingerprint}
                        {record.observedFingerprint
                          ? " · observed " + record.observedFingerprint
                          : ""}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bridgeHint">
                  No per-record comparison was available for this {item.status} outcome.
                </p>
              )}

              <code className="reconciliationFingerprint">
                {item.verificationFingerprint}
              </code>
            </article>
          ))}

          {!model.reconciliations.length ? (
            <div className="emptyState">
              No post-delivery reconciliation evidence has been recorded.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
