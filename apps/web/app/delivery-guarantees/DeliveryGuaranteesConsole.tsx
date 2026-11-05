"use client";

import { useMemo, useState } from "react";

type Model = {
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  intents: Array<{
    intentId: string;
    workspaceId: string;
    publicationId: string;
    subscriptionId: string;
    destinationApplicationId: string;
    idempotencyKeySha256: string;
    state: "held";
    holdReason: "delivery-not-authorized";
    createdAt: string;
  }>;
  reservations: Array<{
    reservationId: string;
    workspaceId: string;
    intentId: string;
    sourceKind: "original" | "replay";
    routeId: string | null;
    replayRouteId: string | null;
    attemptOrdinal: number;
    idempotencyKeySha256: string;
    attemptKeySha256: string;
    state: "held";
    holdReason:
      | "delivery-not-authorized"
      | "recovery-replay-not-authorized";
    reservedAt: string;
  }>;
  duplicateDecisions: Array<{
    decisionId: string;
    workspaceId: string;
    intentId: string;
    sourceKind: "original" | "replay";
    duplicateScope: "attempt-reservation";
    duplicateKeySha256: string;
    reason: "existing-attempt-reservation";
    observedAt: string;
  }>;
  summary: {
    intents: number;
    attemptReservations: number;
    duplicateSuppressions: number;
    heldReservations: number;
  };
  policy: {
    deterministicIdempotencyKey: boolean;
    exactlyOnceInternalIntent: boolean;
    atMostOnceReservationPerSourceRoute: boolean;
    duplicateAttemptSuppression: boolean;
    immutableEvidence: boolean;
    outboundNetworkDelivery: boolean;
    exactlyOnceExternalSideEffect: boolean;
    automaticRouteRelease: boolean;
    automaticConnectionActivation: boolean;
    ql266Resumed: boolean;
  };
};

export function DeliveryGuaranteesConsole({
  model
}: {
  model: Model;
}) {
  const adminWorkspaces = useMemo(
    () =>
      model.workspaces.filter(
        (workspace) =>
          workspace.role === "owner" ||
          workspace.role === "admin"
      ),
    [model.workspaces]
  );
  const [workspaceId, setWorkspaceId] = useState(
    adminWorkspaces[0]?.id ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reconcile() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/delivery-guarantees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile-held-routes",
          workspaceId
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Delivery guarantee reconciliation failed."
        );
      }
      const result = payload.result ?? {};
      setMessage(
        `Reconciliation complete: ${Number(
          result.intentsCreated ?? 0
        )} intent(s), ${Number(
          result.reservationsCreated ?? 0
        )} reservation(s), ${Number(
          result.duplicatesSuppressed ?? 0
        )} duplicate reservation(s) suppressed. Reloading.`
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Delivery guarantee reconciliation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message ? (
        <p className="barcodeMessage" role="status">
          {message}
        </p>
      ) : null}

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Guarantee standing</p>
            <h2>Exactly-once internal intent</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.intents}</strong>
            <span>logical intents</span>
          </article>
          <article>
            <strong>{model.summary.attemptReservations}</strong>
            <span>attempt reservations</span>
          </article>
          <article>
            <strong>{model.summary.duplicateSuppressions}</strong>
            <span>duplicates suppressed</span>
          </article>
          <article>
            <strong>{model.summary.heldReservations}</strong>
            <span>held reservations</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Legacy reconciliation</p>
            <h2>Protect existing held routes</h2>
          </div>
        </div>
        <div className="card">
          <p>
            Reconcile pre-Build-293 held routes into deterministic delivery
            intents and at-most-once attempt reservations. This creates no
            outbound request and releases no route.
          </p>
          {adminWorkspaces.length ? (
            <div className="formGrid">
              <label>
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) =>
                    setWorkspaceId(event.target.value)
                  }
                >
                  {adminWorkspaces.map((workspace) => (
                    <option
                      key={workspace.id}
                      value={workspace.id}
                    >
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primaryButton"
                type="button"
                disabled={busy || !workspaceId}
                onClick={reconcile}
              >
                {busy
                  ? "Reconciling…"
                  : "Reconcile held routes"}
              </button>
            </div>
          ) : (
            <p>Owner or admin access is required to reconcile.</p>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Logical delivery ledger</p>
            <h2>Durable idempotency identities</h2>
          </div>
        </div>
        <div className="cardGrid">
          {model.intents.length ? (
            model.intents.map((intent) => (
              <article className="card" key={intent.intentId}>
                <strong>
                  {intent.destinationApplicationId}
                </strong>
                <p>
                  State: <code>{intent.state}</code>
                </p>
                <p>
                  Intent key:{" "}
                  <code>
                    {intent.idempotencyKeySha256.slice(0, 16)}…
                  </code>
                </p>
                <p>
                  Publication:{" "}
                  <code>{intent.publicationId}</code>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No delivery intents have been recorded yet.</p>
            </article>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Attempt reservations</p>
            <h2>At-most-once source-route reservation</h2>
          </div>
        </div>
        <div className="cardGrid">
          {model.reservations.length ? (
            model.reservations.map((reservation) => (
              <article
                className="card"
                key={reservation.reservationId}
              >
                <strong>
                  {reservation.sourceKind} attempt #
                  {reservation.attemptOrdinal}
                </strong>
                <p>
                  State: <code>{reservation.state}</code>
                </p>
                <p>
                  Hold: <code>{reservation.holdReason}</code>
                </p>
                <p>
                  Attempt key:{" "}
                  <code>
                    {reservation.attemptKeySha256.slice(0, 16)}…
                  </code>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No attempt reservations have been recorded yet.</p>
            </article>
          )}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Delivery guarantee policy</strong>
        <p>
          Deterministic idempotency:{" "}
          {model.policy.deterministicIdempotencyKey ? "yes" : "no"} ·
          exactly-once internal intent:{" "}
          {model.policy.exactlyOnceInternalIntent ? "yes" : "no"} ·
          outbound delivery:{" "}
          {model.policy.outboundNetworkDelivery ? "enabled" : "disabled"} ·
          external exactly-once claim:{" "}
          {model.policy.exactlyOnceExternalSideEffect ? "yes" : "no"}.
        </p>
      </section>
    </>
  );
}
