"use client";

import { useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type RouteCandidate = {
  routeId: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  subscriptionName: string;
  destinationApplicationId: string;
  eventType: string;
  eventId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  nextAttemptNumber: number;
  createdAt: string;
};

type DeadLetter = {
  deadLetterId: string;
  workspaceId: string;
  failureId: string;
  routeId: string;
  publicationId: string;
  subscriptionId: string;
  subscriptionName: string;
  destinationApplicationId: string;
  eventType: string;
  eventId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  failureCategory:
    | "transient"
    | "permanent"
    | "policy"
    | "unknown";
  failureCode: string;
  failureSummary: string;
  attemptNumber: number;
  replayable: boolean;
  replayCount: number;
  dismissed: boolean;
  enteredAt: string;
};

type ReplayRoute = {
  replayRouteId: string;
  workspaceId: string;
  replayRequestId: string;
  deadLetterId: string;
  originalRouteId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: string;
  deliveryMode: "internal-queue";
  state: "held";
  holdReason: "recovery-replay-not-authorized";
  replayNumber: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  createdAt: string;
};

type Model = {
  workspaces: Workspace[];
  routeCandidates: RouteCandidate[];
  deadLetters: DeadLetter[];
  replayRoutes: ReplayRoute[];
  summary: {
    recoverableRoutes: number;
    deadLetters: number;
    openDeadLetters: number;
    replayableDeadLetters: number;
    replayRoutes: number;
    heldReplayRoutes: number;
  };
  policy: {
    appendOnlyFailureEvidence: boolean;
    reviewedReplayOnly: boolean;
    replayLimitPerDeadLetter: number;
    replayableCategories: string[];
    permanentAndPolicyRequireDisposition: boolean;
    replayRoutesHeld: boolean;
    outboundNetworkDelivery: boolean;
    automaticRetry: boolean;
    automaticConnectionActivation: boolean;
    ql266Resumed: boolean;
  };
};

async function recoveryRequest(
  body: Record<string, unknown>
) {
  const response = await fetch("/api/event-recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Recovery request failed."
    );
  }
  return payload;
}

export function EventRecoveryConsole({
  model
}: {
  model: Model;
}) {
  const adminWorkspaceIds = useMemo(
    () =>
      new Set(
        model.workspaces
          .filter(
            (workspace) =>
              workspace.role === "owner" ||
              workspace.role === "admin"
          )
          .map((workspace) => workspace.id)
      ),
    [model.workspaces]
  );

  const adminRoutes = model.routeCandidates.filter(
    (route) => adminWorkspaceIds.has(route.workspaceId)
  );
  const [routeId, setRouteId] = useState(
    adminRoutes[0]?.routeId ?? ""
  );
  const selectedRoute =
    adminRoutes.find((route) => route.routeId === routeId) ??
    null;

  const [category, setCategory] = useState<
    "transient" | "permanent" | "policy" | "unknown"
  >("transient");
  const [code, setCode] = useState("delivery.timeout");
  const [summary, setSummary] = useState("");
  const [deadLetterId, setDeadLetterId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function recordFailure() {
    if (!selectedRoute) return;
    setBusy(true);
    setMessage("");
    try {
      await recoveryRequest({
        action: "record-failure",
        routeId: selectedRoute.routeId,
        category,
        code,
        summary,
        attemptNumber: selectedRoute.nextAttemptNumber,
        details: {
          source: "recovery-console",
          reviewed: true
        }
      });
      setMessage(
        "Failure recorded and moved into the dead-letter queue. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failure recording failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestReplay(item: DeadLetter) {
    setBusy(true);
    setMessage("");
    try {
      const result = await recoveryRequest({
        action: "request-replay",
        deadLetterId: item.deadLetterId,
        reason
      });
      setMessage(
        `Replay #${result.replayNumber} created as a held internal route. Reloading.`
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Replay request failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function dismissDeadLetter(item: DeadLetter) {
    setBusy(true);
    setMessage("");
    try {
      await recoveryRequest({
        action: "dismiss-dead-letter",
        deadLetterId: item.deadLetterId,
        reason
      });
      setMessage("Dead-letter disposition recorded. Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dead-letter disposition failed."
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
            <p className="eyebrow">Recovery standing</p>
            <h2>Failure and replay status</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.recoverableRoutes}</strong>
            <span>routes available</span>
          </article>
          <article>
            <strong>{model.summary.openDeadLetters}</strong>
            <span>open dead letters</span>
          </article>
          <article>
            <strong>{model.summary.replayableDeadLetters}</strong>
            <span>replayable cases</span>
          </article>
          <article>
            <strong>{model.summary.replayRoutes}</strong>
            <span>replay routes</span>
          </article>
          <article>
            <strong>{model.summary.heldReplayRoutes}</strong>
            <span>held replay routes</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Failure intake</p>
            <h2>Record reviewed internal route failure</h2>
          </div>
        </div>
        {adminRoutes.length ? (
          <div className="card">
            <div className="formGrid">
              <label>
                Event-bus route
                <select
                  value={routeId}
                  onChange={(event) =>
                    setRouteId(event.target.value)
                  }
                >
                  {adminRoutes.map((route) => (
                    <option
                      key={route.routeId}
                      value={route.routeId}
                    >
                      {route.eventType} →{" "}
                      {route.destinationApplicationId} · attempt{" "}
                      {route.nextAttemptNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Failure category
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value as
                        | "transient"
                        | "permanent"
                        | "policy"
                        | "unknown"
                    )
                  }
                >
                  <option value="transient">transient</option>
                  <option value="unknown">unknown</option>
                  <option value="permanent">permanent</option>
                  <option value="policy">policy</option>
                </select>
              </label>
              <label>
                Failure code
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  placeholder="delivery.timeout"
                />
              </label>
              <label>
                Reviewed summary
                <input
                  value={summary}
                  onChange={(event) =>
                    setSummary(event.target.value)
                  }
                  placeholder="What failed and what evidence was reviewed?"
                />
              </label>
            </div>
            {selectedRoute ? (
              <p>
                {selectedRoute.sourceApplicationId} →{" "}
                {selectedRoute.destinationApplicationId} ·{" "}
                {selectedRoute.environment} ·{" "}
                {selectedRoute.subscriptionName}
              </p>
            ) : null}
            <div className="heroActions">
              <button
                className="primaryButton"
                disabled={busy || !selectedRoute}
                onClick={recordFailure}
              >
                Record failure &amp; dead-letter
              </button>
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <p>No eligible event-bus routes are available for failure intake.</p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Dead-letter queue</p>
            <h2>Review and recover failures</h2>
          </div>
        </div>
        {model.deadLetters.length ? (
          <div className="grid">
            {model.deadLetters.map((item) => {
              const canManage = adminWorkspaceIds.has(
                item.workspaceId
              );
              const selected =
                deadLetterId === item.deadLetterId;
              const replayAllowed =
                item.replayable &&
                !item.dismissed &&
                item.replayCount <
                  model.policy.replayLimitPerDeadLetter;
              return (
                <article
                  className="card"
                  key={item.deadLetterId}
                >
                  <h3>{item.eventType}</h3>
                  <p>
                    {item.sourceApplicationId} →{" "}
                    {item.destinationApplicationId}
                  </p>
                  <p>
                    {item.failureCategory} · {item.failureCode} · attempt{" "}
                    {item.attemptNumber}
                  </p>
                  <p>{item.failureSummary}</p>
                  <p>
                    Replays: {item.replayCount}/
                    {model.policy.replayLimitPerDeadLetter}
                  </p>
                  <span className="badge">
                    {item.dismissed
                      ? "dismissed"
                      : replayAllowed
                        ? "replay eligible"
                        : "disposition required"}
                  </span>
                  {canManage && !item.dismissed ? (
                    <>
                      <div className="heroActions">
                        <button
                          className="secondaryButton"
                          disabled={busy}
                          onClick={() => {
                            setDeadLetterId(item.deadLetterId);
                            setReason("");
                          }}
                        >
                          Review recovery
                        </button>
                      </div>
                      {selected ? (
                        <div className="formGrid">
                          <label>
                            Recovery/disposition reason
                            <input
                              value={reason}
                              onChange={(event) =>
                                setReason(event.target.value)
                              }
                              placeholder="Reviewed evidence and recovery decision"
                            />
                          </label>
                          <div className="heroActions">
                            {replayAllowed ? (
                              <button
                                className="primaryButton"
                                disabled={busy}
                                onClick={() =>
                                  requestReplay(item)
                                }
                              >
                                Create held replay
                              </button>
                            ) : null}
                            <button
                              className="secondaryButton"
                              disabled={busy}
                              onClick={() =>
                                dismissDeadLetter(item)
                              }
                            >
                              Record disposition
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="emptyState">
            <p>No dead-letter cases have been recorded.</p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Replay ledger</p>
            <h2>Held recovery routes</h2>
          </div>
        </div>
        {model.replayRoutes.length ? (
          <div className="grid">
            {model.replayRoutes.map((route) => (
              <article
                className="card"
                key={route.replayRouteId}
              >
                <h3>
                  Replay #{route.replayNumber} →{" "}
                  {route.destinationApplicationId}
                </h3>
                <p>{route.reason}</p>
                <span className="badge">
                  {route.state} · {route.holdReason}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No replay routes exist yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
