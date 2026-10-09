"use client";

import { useMemo, useState } from "react";

type Manifest = {
  key: string;
  version: string;
  displayName: string;
  description: string;
  capabilities: Array<"import" | "enrichment" | "export">;
  configSchema: Array<{
    key: string;
    label: string;
    description: string;
    type: "string" | "number" | "boolean";
    required: boolean;
    defaultValue?: string | number | boolean;
    allowedValues?: string[];
  }>;
  secrets: Array<{
    key: string;
    label: string;
    environmentVariable: string;
    required: boolean;
  }>;
};

type Installation = {
  connectorKey: string;
  enabled: boolean;
  config: Record<string, unknown>;
  grantedCapabilities: string[];
  secretRefs: Record<string, unknown>;
  connectorVersion: string;
};

type Audit = {
  auditId: string;
  connectorKey: string;
  capability: string;
  status: string;
  durationMs: number;
  errorCode: string | null;
  createdAt: string;
};

type Workspace = {
  id: string;
  name: string;
  role: string;
  installations: Installation[];
  audit: Audit[];
};

async function requestJson(method: string, body: unknown) {
  const response = await fetch("/api/connectors", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Connector request failed.");
  }
  return payload;
}

function defaultConfig(manifest: Manifest) {
  return Object.fromEntries(
    manifest.configSchema
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.key, field.defaultValue])
  );
}

export function ConnectorManager({
  manifests,
  workspaces
}: {
  manifests: Manifest[];
  workspaces: Workspace[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  useMemo(() => new Map(manifests.map((manifest) => [manifest.key, manifest])), [manifests]);

  async function act(key: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setMessage("");
    try {
      await operation();
      setMessage("Connector state saved. Reloading current evidence.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connector request failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {message ? <p className="barcodeMessage" role="status">{message}</p> : null}
      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Registry</p>
          <h2>Available connector manifests</h2>
        </div>
        <div className="grid">
          {manifests.map((manifest) => (
            <article className="card" key={manifest.key}>
              <h3>{manifest.displayName}</h3>
              <p>{manifest.description}</p>
              <p>Capabilities: {manifest.capabilities.join(" · ")}</p>
              <span className="badge">
                {manifest.key} · v{manifest.version} · SDK v1
              </span>
            </article>
          ))}
        </div>
      </section>

      {workspaces.map((workspace) => (
        <section key={workspace.id}>
          <div className="sectionHeading">
            <p className="eyebrow">Workspace connectors</p>
            <h2>{workspace.name}</h2>
          </div>
          <div className="grid">
            {manifests.map((manifest) => {
              const installed = workspace.installations.find(
                (item) => item.connectorKey === manifest.key
              );
              const admin = workspace.role === "owner" || workspace.role === "admin";
              const stateText = installed
                ? (installed.enabled ? "enabled" : "disabled") +
                  " · grants " + installed.grantedCapabilities.join(", ")
                : "Not configured for this workspace.";
              return (
                <article className="card" key={manifest.key}>
                  <h3>{manifest.displayName}</h3>
                  <p>{stateText}</p>
                  {manifest.secrets.length ? (
                    <p>
                      Secret references:{" "}
                      {manifest.secrets.map((secret) => secret.environmentVariable).join(", ")}
                    </p>
                  ) : (
                    <p>No secrets required.</p>
                  )}

                  {admin ? (
                    <div className="heroActions">
                      {!installed ? (
                        <button
                          className="secondaryButton"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            act("configure-" + workspace.id + "-" + manifest.key, () =>
                              requestJson("POST", {
                                workspaceId: workspace.id,
                                connectorKey: manifest.key,
                                config: defaultConfig(manifest),
                                grantedCapabilities: manifest.capabilities,
                                secretRefs: {}
                              })
                            )
                          }
                        >
                          Configure sample
                        </button>
                      ) : (
                        <>
                          <button
                            className="secondaryButton"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              act("toggle-" + workspace.id + "-" + manifest.key, () =>
                                requestJson("PATCH", {
                                  workspaceId: workspace.id,
                                  connectorKey: manifest.key,
                                  enabled: !installed.enabled
                                })
                              )
                            }
                          >
                            {installed.enabled ? "Disable connector" : "Enable connector"}
                          </button>
                          <button
                            className="secondaryButton"
                            disabled={Boolean(busy) || !installed.enabled}
                            onClick={() =>
                              act("test-" + workspace.id + "-" + manifest.key, () =>
                                requestJson("PUT", {
                                  workspaceId: workspace.id,
                                  connectorKey: manifest.key,
                                  capability: installed.grantedCapabilities[0],
                                  payload: {
                                    records: [
                                      { name: "  Example   Record  ", category: "  Demo " }
                                    ]
                                  }
                                })
                              )
                            }
                          >
                            Run bounded test
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="badge">read-only membership</span>
                  )}
                </article>
              );
            })}
          </div>

          <div className="sectionHeading">
            <p className="eyebrow">Append-only audit</p>
            <h2>Recent connector executions</h2>
          </div>
          {workspace.audit.length ? (
            <div className="grid">
              {workspace.audit.slice(0, 12).map((event) => (
                <article className="card" key={event.auditId}>
                  <h3>{event.connectorKey}</h3>
                  <p>
                    {event.capability} · {event.status} · {event.durationMs} ms
                  </p>
                  {event.errorCode ? <p>{event.errorCode}</p> : null}
                  <span className="badge">{new Date(event.createdAt).toLocaleString()}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <p>No connector execution evidence exists for this workspace yet.</p>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
