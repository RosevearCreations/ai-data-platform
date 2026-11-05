"use client";

import { useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type Endpoint = {
  endpointId: string;
  endpointKey: string;
  workspaceId: string;
  sourceApplicationId: string;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  displayName: string;
  keyId: string;
  secretEnvVar: string;
  enabled: boolean;
  allowedEventTypes: string[];
  maxBodyBytes: number;
  createdAt: string;
  updatedAt: string;
};

type Receipt = {
  receiptId: string;
  endpointId: string;
  workspaceId: string;
  sourceApplicationId: string;
  environment: string;
  tenantId: string | null;
  eventId: string;
  eventType: string;
  requestTimestampMs: number;
  bodySha256: string;
  payloadSizeBytes: number;
  receiptSignature: string;
  receivedAt: string;
};

type Audit = {
  auditId: string;
  endpointId: string;
  workspaceId: string;
  eventId: string | null;
  eventType: string | null;
  outcome: "accepted" | "denied";
  reasonCode: string;
  identityVerified: boolean;
  httpStatus: number;
  occurredAt: string;
};

type Model = {
  workspaces: Workspace[];
  endpoints: Endpoint[];
  receipts: Receipt[];
  audit: Audit[];
  sourceApplications: string[];
  contract: {
    request: string;
    event: string;
    receipt: string;
    signature: string;
    timestampSkewMs: number;
    maximumBodyBytes: number;
  };
  summary: {
    endpoints: number;
    enabled: number;
    disabled: number;
    receipts: number;
    accepted: number;
    denied: number;
    replayDenied: number;
  };
  policy: {
    explicitEndpointCreationOnly: boolean;
    explicitEnablementOnly: boolean;
    rawSecretValuesStored: boolean;
    signedRequestsRequired: boolean;
    signedReceipts: boolean;
    atomicReplaySuppression: boolean;
    downstreamDispatch: boolean;
    automaticConnectionActivation: boolean;
    ql266Resumed: boolean;
  };
};

async function mutate(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/webhook-gateway", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Webhook gateway request failed."
    );
  }
  return payload;
}

export function WebhookGatewayCenter({
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
  const [sourceApplicationId, setSourceApplicationId] =
    useState(model.sourceApplications[0] ?? "");
  const [environment, setEnvironment] =
    useState<"nonproduction" | "production">("nonproduction");
  const [tenantId, setTenantId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [keyId, setKeyId] = useState("whk-key-primary");
  const [secretEnvVar, setSecretEnvVar] = useState("");
  const [eventTypes, setEventTypes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createEndpoint() {
    setBusy(true);
    setMessage("");
    try {
      const allowedEventTypes = eventTypes
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      await mutate("POST", {
        workspaceId,
        sourceApplicationId,
        environment,
        tenantId: tenantId || null,
        displayName,
        keyId,
        secretEnvVar,
        allowedEventTypes
      });
      setMessage("Webhook endpoint created disabled. Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Webhook endpoint creation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleEndpoint(endpoint: Endpoint) {
    setBusy(true);
    setMessage("");
    try {
      await mutate("PATCH", {
        endpointId: endpoint.endpointId,
        enabled: !endpoint.enabled
      });
      setMessage("Webhook endpoint state updated. Reloading.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Webhook endpoint update failed."
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
            <p className="eyebrow">Gateway standing</p>
            <h2>Signed intake status</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.endpoints}</strong>
            <span>endpoints</span>
          </article>
          <article>
            <strong>{model.summary.enabled}</strong>
            <span>enabled</span>
          </article>
          <article>
            <strong>{model.summary.receipts}</strong>
            <span>durable receipts</span>
          </article>
          <article>
            <strong>{model.summary.replayDenied}</strong>
            <span>replays denied</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Create endpoint</p>
            <h2>Owner/admin registration</h2>
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
                Source application
                <select
                  value={sourceApplicationId}
                  onChange={(event) =>
                    setSourceApplicationId(
                      event.target.value
                    )
                  }
                >
                  {model.sourceApplications.map((source) => (
                    <option key={source} value={source}>
                      {source}
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
                Tenant ID (optional)
                <input
                  value={tenantId}
                  onChange={(event) =>
                    setTenantId(event.target.value)
                  }
                />
              </label>
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  placeholder="Rosie booking events"
                />
              </label>
              <label>
                Key ID
                <input
                  value={keyId}
                  onChange={(event) =>
                    setKeyId(event.target.value)
                  }
                />
              </label>
              <label>
                Secret environment-variable reference
                <input
                  value={secretEnvVar}
                  onChange={(event) =>
                    setSecretEnvVar(event.target.value)
                  }
                  placeholder="ROSIE_WEBHOOK_SECRET"
                />
              </label>
              <label>
                Allowed event types
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
                onClick={createEndpoint}
              >
                Create disabled endpoint
              </button>
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <p>
              Owner/admin membership is required to create a webhook endpoint.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Registered intake</p>
            <h2>Webhook endpoints</h2>
          </div>
        </div>
        <div className="grid">
          {model.endpoints.map((endpoint) => {
            const canManage = adminWorkspaces.some(
              (workspace) =>
                workspace.id === endpoint.workspaceId
            );
            return (
              <article className="card" key={endpoint.endpointId}>
                <h3>{endpoint.displayName}</h3>
                <p>
                  {endpoint.sourceApplicationId} · {endpoint.environment}
                  {endpoint.tenantId
                    ? " · tenant " + endpoint.tenantId
                    : ""}
                </p>
                <p>
                  <strong>POST</strong>{" "}
                  <code>
                    /api/webhooks/{endpoint.endpointKey}
                  </code>
                </p>
                <p>
                  Allowed:{" "}
                  {endpoint.allowedEventTypes.join(", ")}
                </p>
                <p>
                  Key reference: {endpoint.keyId} ·{" "}
                  {endpoint.secretEnvVar}
                </p>
                <span className="badge">
                  {endpoint.enabled ? "enabled" : "disabled"}
                </span>
                {canManage ? (
                  <div className="heroActions">
                    <button
                      className="secondaryButton"
                      disabled={busy}
                      onClick={() => toggleEndpoint(endpoint)}
                    >
                      {endpoint.enabled
                        ? "Disable endpoint"
                        : "Enable endpoint"}
                    </button>
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
            <p className="eyebrow">Durable receipts</p>
            <h2>Recent accepted events</h2>
          </div>
        </div>
        {model.receipts.length ? (
          <div className="grid">
            {model.receipts.slice(0, 24).map((receipt) => (
              <article className="card" key={receipt.receiptId}>
                <h3>{receipt.eventType}</h3>
                <p>
                  {receipt.eventId} · {receipt.sourceApplicationId}
                </p>
                <p>
                  {receipt.payloadSizeBytes} bytes · SHA-256{" "}
                  {receipt.bodySha256.slice(0, 12)}…
                </p>
                <span className="badge">
                  {new Date(
                    receipt.receivedAt
                  ).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No accepted webhook receipts exist yet.</p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Replay &amp; validation audit</p>
            <h2>Recent intake decisions</h2>
          </div>
        </div>
        {model.audit.length ? (
          <div className="grid">
            {model.audit.slice(0, 30).map((event) => (
              <article className="card" key={event.auditId}>
                <h3>
                  {event.eventType ?? event.reasonCode}
                </h3>
                <p>
                  {event.outcome} · HTTP {event.httpStatus} ·{" "}
                  {event.reasonCode}
                </p>
                <p>
                  identity{" "}
                  {event.identityVerified
                    ? "verified"
                    : "not verified"}
                </p>
                <span className="badge">
                  {new Date(
                    event.occurredAt
                  ).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No webhook intake audit evidence exists yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
