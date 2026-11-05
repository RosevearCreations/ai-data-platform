"use client";

import { useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type Subscription = {
  subscriptionId: string;
  workspaceId: string;
  name: string;
  sourceApplicationId: string | null;
  destinationApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventTypes: string[];
  deliveryMode: "internal-queue";
  state: "draft" | "active" | "paused";
  createdAt: string;
  updatedAt: string;
};

type Publication = {
  publicationId: string;
  workspaceId: string;
  webhookReceiptId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  bodySha256: string;
  publishedAt: string;
};

type Route = {
  routeId: string;
  workspaceId: string;
  publicationId: string;
  subscriptionId: string;
  destinationApplicationId: string;
  deliveryMode: "internal-queue";
  state: "pending" | "held";
  holdReason: string;
  createdAt: string;
};

type Receipt = {
  receiptId: string;
  workspaceId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventId: string;
  eventType: string;
  bodySha256: string;
  receivedAt: string;
};

type Model = {
  workspaces: Workspace[];
  sourceApplications: string[];
  subscriptions: Subscription[];
  publications: Publication[];
  routes: Route[];
  availableReceipts: Receipt[];
  summary: {
    subscriptions: number;
    activeSubscriptions: number;
    publications: number;
    heldRoutes: number;
    unpublishedReceipts: number;
  };
  policy: {
    reviewedReceiptPublicationOnly: boolean;
    explicitSubscriptionActivation: boolean;
    exactEventTypeMatching: boolean;
    workspaceEnvironmentTenantIsolation: boolean;
    directPointToPointWiring: boolean;
    outboundNetworkDelivery: boolean;
    routedEventsHeld: boolean;
    automaticConnectionActivation: boolean;
    ql266Resumed: boolean;
  };
};

async function request(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/event-bus", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Event bus request failed."
    );
  }
  return payload;
}

export function EventBusManager({
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
  const [name, setName] = useState("");
  const [sourceApplicationId, setSourceApplicationId] =
    useState("");
  const [
    destinationApplicationId,
    setDestinationApplicationId
  ] = useState(model.sourceApplications[0] ?? "");
  const [environment, setEnvironment] =
    useState<"nonproduction" | "production">("nonproduction");
  const [tenantId, setTenantId] = useState("");
  const [eventTypes, setEventTypes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createSubscription() {
    setBusy(true);
    setMessage("");
    try {
      await request("POST", {
        action: "create-subscription",
        workspaceId,
        name,
        sourceApplicationId: sourceApplicationId || null,
        destinationApplicationId,
        environment,
        tenantId: tenantId || null,
        eventTypes: eventTypes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      });
      setMessage("Subscription created as draft. Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Subscription creation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeState(
    subscription: Subscription,
    state: "draft" | "active" | "paused"
  ) {
    setBusy(true);
    setMessage("");
    try {
      await request("PATCH", {
        subscriptionId: subscription.subscriptionId,
        state
      });
      setMessage("Subscription state updated. Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Subscription update failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishReceipt(receipt: Receipt) {
    setBusy(true);
    setMessage("");
    try {
      const result = await request("POST", {
        action: "publish-receipt",
        receiptId: receipt.receiptId
      });
      const routed = Array.isArray(result.routes)
        ? result.routes.length
        : 0;
      setMessage(
        `Receipt published. ${routed} held route(s) created. Reloading.`
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Receipt publication failed."
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
            <p className="eyebrow">Bus standing</p>
            <h2>Governed routing status</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.subscriptions}</strong>
            <span>subscriptions</span>
          </article>
          <article>
            <strong>
              {model.summary.activeSubscriptions}
            </strong>
            <span>active</span>
          </article>
          <article>
            <strong>{model.summary.publications}</strong>
            <span>publications</span>
          </article>
          <article>
            <strong>{model.summary.heldRoutes}</strong>
            <span>held routes</span>
          </article>
          <article>
            <strong>
              {model.summary.unpublishedReceipts}
            </strong>
            <span>reviewable receipts</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Subscriptions</p>
            <h2>Create governed subscription</h2>
          </div>
        </div>
        {adminWorkspaces.length ? (
          <div className="card">
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
              <label>
                Subscription name
                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Booking events to Comms Hub"
                />
              </label>
              <label>
                Source application
                <select
                  value={sourceApplicationId}
                  onChange={(event) =>
                    setSourceApplicationId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any source in workspace
                  </option>
                  {model.sourceApplications.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination application
                <select
                  value={destinationApplicationId}
                  onChange={(event) =>
                    setDestinationApplicationId(
                      event.target.value
                    )
                  }
                >
                  {model.sourceApplications.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Environment
                <select
                  value={environment}
                  onChange={(event) =>
                    setEnvironment(
                      event.target.value as
                        | "nonproduction"
                        | "production"
                    )
                  }
                >
                  <option value="nonproduction">
                    nonproduction
                  </option>
                  <option value="production">
                    production
                  </option>
                </select>
              </label>
              <label>
                Tenant filter (optional)
                <input
                  value={tenantId}
                  onChange={(event) =>
                    setTenantId(event.target.value)
                  }
                />
              </label>
              <label>
                Exact event types
                <input
                  value={eventTypes}
                  onChange={(event) =>
                    setEventTypes(event.target.value)
                  }
                  placeholder="booking.created, booking.updated"
                />
              </label>
            </div>
            <div className="heroActions">
              <button
                className="primaryButton"
                disabled={busy}
                onClick={createSubscription}
              >
                Create draft subscription
              </button>
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <p>
              Owner/admin membership is required to create or
              activate subscriptions.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Subscription registry</p>
            <h2>Routing rules</h2>
          </div>
        </div>
        <div className="grid">
          {model.subscriptions.map((subscription) => {
            const canManage = adminWorkspaces.some(
              (workspace) =>
                workspace.id === subscription.workspaceId
            );
            return (
              <article
                className="card"
                key={subscription.subscriptionId}
              >
                <h3>{subscription.name}</h3>
                <p>
                  {subscription.sourceApplicationId ??
                    "any source"}{" "}
                  → {subscription.destinationApplicationId}
                </p>
                <p>
                  {subscription.environment}
                  {subscription.tenantId
                    ? " · tenant " + subscription.tenantId
                    : " · any tenant"}
                </p>
                <p>
                  Events: {subscription.eventTypes.join(", ")}
                </p>
                <span className="badge">
                  {subscription.state}
                </span>
                {canManage ? (
                  <div className="heroActions">
                    {subscription.state !== "active" ? (
                      <button
                        className="secondaryButton"
                        disabled={busy}
                        onClick={() =>
                          changeState(
                            subscription,
                            "active"
                          )
                        }
                      >
                        Activate subscription
                      </button>
                    ) : (
                      <button
                        className="secondaryButton"
                        disabled={busy}
                        onClick={() =>
                          changeState(
                            subscription,
                            "paused"
                          )
                        }
                      >
                        Pause subscription
                      </button>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Reviewed Build 290 intake</p>
            <h2>Publish accepted receipts</h2>
          </div>
        </div>
        {model.availableReceipts.length ? (
          <div className="grid">
            {model.availableReceipts
              .slice(0, 30)
              .map((receipt) => {
                const canManage = adminWorkspaces.some(
                  (workspace) =>
                    workspace.id === receipt.workspaceId
                );
                return (
                  <article
                    className="card"
                    key={receipt.receiptId}
                  >
                    <h3>{receipt.eventType}</h3>
                    <p>
                      {receipt.sourceApplicationId} ·{" "}
                      {receipt.environment}
                    </p>
                    <p>{receipt.eventId}</p>
                    <p>
                      SHA-256{" "}
                      {receipt.bodySha256.slice(0, 12)}…
                    </p>
                    {canManage ? (
                      <div className="heroActions">
                        <button
                          className="primaryButton"
                          disabled={busy}
                          onClick={() =>
                            publishReceipt(receipt)
                          }
                        >
                          Publish reviewed receipt
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
          </div>
        ) : (
          <div className="emptyState">
            <p>
              No unpublished Build 290 webhook receipts are
              currently available.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Durable routes</p>
            <h2>Held publish/subscribe matches</h2>
          </div>
        </div>
        {model.routes.length ? (
          <div className="grid">
            {model.routes.slice(0, 40).map((route) => (
              <article
                className="card"
                key={route.routeId}
              >
                <h3>{route.destinationApplicationId}</h3>
                <p>
                  Subscription {route.subscriptionId.slice(0, 8)}…
                </p>
                <p>
                  Publication {route.publicationId.slice(0, 8)}…
                </p>
                <span className="badge">
                  {route.state} · {route.holdReason}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No durable event-bus routes exist yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
