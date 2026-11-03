"use client";

import { useMemo, useState } from "react";

type VaultModel = {
  schema: "ai-data-platform.credential-reference-vault.v1";
  build: 284;
  applications: Array<{ applicationId: string; displayName: string }>;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    canManage: boolean;
  }>;
  references: Array<{
    workspaceId: string;
    workspaceName: string;
    credentialRefId: string;
    applicationId: string;
    environment: "local" | "preview" | "production";
    label: string;
    providerName: string;
    referenceKind:
      | "environment-variable"
      | "external-vault-reference"
      | "provider-managed-reference";
    referenceLocator: string;
    lifecycleStatus: "active" | "revoked";
    replacementState: "not-planned" | "prepared";
    rotationDueAt: string | null;
    expiresAt: string | null;
    lastRotatedAt: string | null;
    updatedAt: string;
    riskState:
      | "active"
      | "replacement-prepared"
      | "rotation-soon"
      | "rotation-due"
      | "expired"
      | "revoked";
    canManage: boolean;
  }>;
  events: Array<{
    eventId: string;
    credentialRefId: string;
    eventType: string;
    createdAt: string;
  }>;
  summary: {
    references: number;
    active: number;
    attention: number;
    prepared: number;
    revoked: number;
  };
};

async function requestJson(method: "POST" | "PATCH", body: unknown) {
  const response = await fetch("/api/credential-vault", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Credential vault request failed."
    );
  }
  return payload;
}

function optionalIsoDate(value: string) {
  return value ? new Date(value + "T12:00:00Z").toISOString() : null;
}

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "not scheduled";
}

export function CredentialVaultManager({ model }: { model: VaultModel }) {
  const manageable = useMemo(
    () => model.workspaces.filter((workspace) => workspace.canManage),
    [model.workspaces]
  );
  const [workspaceId, setWorkspaceId] = useState(manageable[0]?.id ?? "");
  const [applicationId, setApplicationId] = useState(
    model.applications[0]?.applicationId ?? ""
  );
  const [environment, setEnvironment] =
    useState<"local" | "preview" | "production">("preview");
  const [label, setLabel] = useState("");
  const [providerName, setProviderName] = useState("");
  const [referenceKind, setReferenceKind] =
    useState<
      | "environment-variable"
      | "external-vault-reference"
      | "provider-managed-reference"
    >("environment-variable");
  const [referenceLocator, setReferenceLocator] = useState("");
  const [rotationDueAt, setRotationDueAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedRef, setSelectedRef] = useState(
    model.references.find(
      (item) => item.canManage && item.lifecycleStatus === "active"
    )?.credentialRefId ?? ""
  );
  const [nextRotationDueAt, setNextRotationDueAt] = useState("");
  const [nextExpiresAt, setNextExpiresAt] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const selected = model.references.find(
    (item) => item.credentialRefId === selectedRef
  );

  async function act(key: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setMessage("");
    try {
      await operation();
      setMessage("Credential reference metadata saved. Reloading current evidence.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Credential vault request failed."
      );
    } finally {
      setBusy("");
    }
  }

  function locatorHelp() {
    if (referenceKind === "environment-variable") {
      return "Example format: PROVIDER_API_TOKEN";
    }
    if (referenceKind === "external-vault-reference") {
      return "Example format: vault:1password:rosevear/provider-token";
    }
    return "Example format: provider:meta:business-system-user-token";
  }

  return (
    <>
      <section className="reviewSummary" aria-label="Credential vault summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.references}</strong>
            <span>credential references</span>
          </article>
          <article>
            <strong>{model.summary.active}</strong>
            <span>active references</span>
          </article>
          <article>
            <strong>{model.summary.attention}</strong>
            <span>rotation attention</span>
          </article>
          <article>
            <strong>{model.summary.prepared}</strong>
            <span>replacement prepared</span>
          </article>
          <article>
            <strong>{model.summary.revoked}</strong>
            <span>revoked references</span>
          </article>
        </div>
      </section>

      <section className="reviewEditor" aria-labelledby="vault-create">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Reference-only intake</p>
            <h2 id="vault-create">Register a credential reference</h2>
          </div>
        </div>
        {manageable.length ? (
          <>
            <div className="formGrid">
              <label>
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                >
                  {manageable.map((workspace) => (
                    <option value={workspace.id} key={workspace.id}>
                      {workspace.name} · {workspace.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Application
                <select
                  value={applicationId}
                  onChange={(event) => setApplicationId(event.target.value)}
                >
                  {model.applications.map((application) => (
                    <option
                      value={application.applicationId}
                      key={application.applicationId}
                    >
                      {application.displayName}
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
                      event.target.value as "local" | "preview" | "production"
                    )
                  }
                >
                  <option value="local">local</option>
                  <option value="preview">preview</option>
                  <option value="production">production</option>
                </select>
              </label>
              <label>
                Reference type
                <select
                  value={referenceKind}
                  onChange={(event) =>
                    setReferenceKind(
                      event.target.value as
                        | "environment-variable"
                        | "external-vault-reference"
                        | "provider-managed-reference"
                    )
                  }
                >
                  <option value="environment-variable">Environment variable</option>
                  <option value="external-vault-reference">
                    External vault reference
                  </option>
                  <option value="provider-managed-reference">
                    Provider-managed reference
                  </option>
                </select>
              </label>
              <label>
                Friendly label
                <input
                  value={label}
                  maxLength={120}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Meta product publishing token"
                />
              </label>
              <label>
                Provider / system
                <input
                  value={providerName}
                  maxLength={120}
                  onChange={(event) => setProviderName(event.target.value)}
                  placeholder="Meta"
                />
              </label>
              <label>
                Reference locator
                <input
                  value={referenceLocator}
                  maxLength={240}
                  onChange={(event) => setReferenceLocator(event.target.value)}
                  placeholder={locatorHelp()}
                  autoComplete="off"
                />
              </label>
              <label>
                Rotation due
                <input
                  type="date"
                  value={rotationDueAt}
                  onChange={(event) => setRotationDueAt(event.target.value)}
                />
              </label>
              <label>
                Expires
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </label>
            </div>
            <div className="dataQualityPolicyNote">
              <strong>No secret values.</strong>
              <p>
                Enter only a reference locator such as an environment-variable name,
                external-vault record locator or provider-managed identifier. Never
                paste the password, token, HMAC key, API secret or credential value.
              </p>
            </div>
            <div className="heroActions">
              <button
                className="primary"
                type="button"
                disabled={
                  Boolean(busy) ||
                  !workspaceId ||
                  !applicationId ||
                  !label.trim() ||
                  !providerName.trim() ||
                  !referenceLocator.trim()
                }
                onClick={() =>
                  void act("create", () =>
                    requestJson("POST", {
                      workspaceId,
                      applicationId,
                      environment,
                      label,
                      providerName,
                      referenceKind,
                      referenceLocator,
                      rotationDueAt: optionalIsoDate(rotationDueAt),
                      expiresAt: optionalIsoDate(expiresAt)
                    })
                  )
                }
              >
                Register reference metadata
              </button>
            </div>
          </>
        ) : (
          <div className="emptyState">
            Owner or admin workspace access is required to register references.
          </div>
        )}
      </section>

      <section className="reviewQueue" aria-labelledby="vault-references">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Vault inventory</p>
            <h2 id="vault-references">Credential references &amp; rotation standing</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.references.map((item) => (
            <article className="reviewBatchSummary" key={item.credentialRefId}>
              <div>
                <span className="reviewStatus">{item.riskState}</span>
                <h3>{item.label}</h3>
                <p>
                  <strong>{item.providerName}</strong> · {item.applicationId} ·{" "}
                  {item.environment}
                </p>
                <p>
                  <strong>Reference:</strong> {item.referenceKind} ·{" "}
                  <code>{item.referenceLocator}</code>
                </p>
                <p>
                  <strong>Rotation due:</strong> {displayDate(item.rotationDueAt)} ·{" "}
                  <strong>Expires:</strong> {displayDate(item.expiresAt)}
                </p>
                <p>
                  <strong>Last rotated:</strong> {displayDate(item.lastRotatedAt)} ·{" "}
                  <strong>Replacement:</strong> {item.replacementState}
                </p>
                <p>
                  <strong>Workspace:</strong> {item.workspaceName}
                </p>
                {item.canManage && item.lifecycleStatus === "active" ? (
                  <div className="heroActions">
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => setSelectedRef(item.credentialRefId)}
                    >
                      Manage rotation
                    </button>
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void act("prepare-" + item.credentialRefId, () =>
                          requestJson("PATCH", {
                            action: "replacement-prepared",
                            workspaceId: item.workspaceId,
                            credentialRefId: item.credentialRefId
                          })
                        )
                      }
                    >
                      Mark replacement prepared
                    </button>
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void act("revoke-" + item.credentialRefId, () =>
                          requestJson("PATCH", {
                            action: "revoke",
                            workspaceId: item.workspaceId,
                            credentialRefId: item.credentialRefId
                          })
                        )
                      }
                    >
                      Revoke reference
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!model.references.length ? (
            <div className="emptyState">
              No credential-reference metadata exists yet. Secret values remain
              outside the platform.
            </div>
          ) : null}
        </div>
      </section>

      {selected?.canManage && selected.lifecycleStatus === "active" ? (
        <section className="reviewEditor" aria-labelledby="rotation-controls">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Owner-controlled rotation</p>
              <h2 id="rotation-controls">{selected.label}</h2>
            </div>
          </div>
          <p>
            This records dates and readiness only. Replace the real credential in
            its external storage location before recording rotation completion here.
          </p>
          <div className="formGrid">
            <label>
              Next rotation due
              <input
                type="date"
                value={nextRotationDueAt}
                onChange={(event) => setNextRotationDueAt(event.target.value)}
              />
            </label>
            <label>
              New expiry
              <input
                type="date"
                value={nextExpiresAt}
                onChange={(event) => setNextExpiresAt(event.target.value)}
              />
            </label>
          </div>
          <div className="heroActions">
            <button
              className="secondaryButton"
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void act("schedule-" + selected.credentialRefId, () =>
                  requestJson("PATCH", {
                    action: "schedule-rotation",
                    workspaceId: selected.workspaceId,
                    credentialRefId: selected.credentialRefId,
                    rotationDueAt: optionalIsoDate(nextRotationDueAt),
                    expiresAt: optionalIsoDate(nextExpiresAt)
                  })
                )
              }
            >
              Save rotation schedule
            </button>
            <button
              className="primary"
              type="button"
              disabled={
                Boolean(busy) || selected.replacementState !== "prepared"
              }
              onClick={() =>
                void act("complete-" + selected.credentialRefId, () =>
                  requestJson("PATCH", {
                    action: "rotation-completed",
                    workspaceId: selected.workspaceId,
                    credentialRefId: selected.credentialRefId,
                    nextRotationDueAt: optionalIsoDate(nextRotationDueAt),
                    expiresAt: optionalIsoDate(nextExpiresAt)
                  })
                )
              }
            >
              Record rotation completed
            </button>
          </div>
          {selected.replacementState !== "prepared" ? (
            <p className="reviewMessage">
              Mark replacement prepared first. Completion stays disabled until that
              owner/admin evidence exists.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="reviewQueue" aria-labelledby="rotation-evidence">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2 id="rotation-evidence">Recent credential-reference events</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.events.slice(0, 30).map((event) => (
            <article className="reviewBatchSummary" key={event.eventId}>
              <div>
                <span className="reviewStatus">{event.eventType}</span>
                <p>
                  {event.credentialRefId} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
          {!model.events.length ? (
            <div className="emptyState">
              No credential-reference evidence has been recorded yet.
            </div>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className="reviewMessage" role="status">
          {message}
        </p>
      ) : null}
    </>
  );
}
