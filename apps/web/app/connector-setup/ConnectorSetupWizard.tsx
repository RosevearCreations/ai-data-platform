"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ConnectorSetupDraft,
  ConnectorSetupWizardModel
} from "@/lib/connector-setup-contract";

const STORAGE_KEY = "ai-data-platform.connector-setup-draft.v1";

function defaultDraft(model: ConnectorSetupWizardModel): ConnectorSetupDraft {
  const first = model.applications[0];
  return {
    schema: "ai-data-platform.connector-setup-draft.v1",
    applicationId: first?.applicationId ?? "",
    environment: "preview",
    connectionType: "repository-metadata",
    connectorKey: null
  };
}

function readSavedDraft(
  model: ConnectorSetupWizardModel
): ConnectorSetupDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ConnectorSetupDraft>;
    if (value.schema !== "ai-data-platform.connector-setup-draft.v1") return null;
    const application = model.applications.find(
      (item) => item.applicationId === value.applicationId
    );
    if (!application) return null;
    const environment = application.environments.find(
      (item) => item.environment === value.environment
    );
    const connection = application.connectionOptions.find(
      (item) => item.type === value.connectionType
    );
    if (!environment || !connection) return null;
    if (
      value.connectorKey !== null &&
      value.connectorKey !== undefined &&
      !model.connectorManifests.some((item) => item.key === value.connectorKey)
    ) {
      return null;
    }
    return {
      schema: "ai-data-platform.connector-setup-draft.v1",
      applicationId: application.applicationId,
      environment: environment.environment,
      connectionType: connection.type,
      connectorKey: value.connectorKey ?? null
    };
  } catch {
    return null;
  }
}

export function ConnectorSetupWizard({
  model
}: {
  model: ConnectorSetupWizardModel;
}) {
  const [draft, setDraft] = useState<ConnectorSetupDraft>(() =>
    defaultDraft(model)
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = readSavedDraft(model);
    if (saved) {
      setDraft(saved);
      setMessage("Restored browser-local setup draft.");
    }
  }, [model]);

  const application = useMemo(
    () =>
      model.applications.find(
        (item) => item.applicationId === draft.applicationId
      ) ?? model.applications[0],
    [draft.applicationId, model.applications]
  );

  const environment = application?.environments.find(
    (item) => item.environment === draft.environment
  );
  const connection = application?.connectionOptions.find(
    (item) => item.type === draft.connectionType
  );
  const manifest =
    draft.connectorKey === null
      ? null
      : model.connectorManifests.find(
          (item) => item.key === draft.connectorKey
        ) ?? null;

  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (!application) blockingReasons.push("Select a registered peer application.");
  if (!environment) blockingReasons.push("Select a canonical environment.");
  if (!connection) blockingReasons.push("Select a supported connection type.");
  if (connection && !connection.available) {
    blockingReasons.push(
      connection.blockingReason ?? "This connection type is unavailable."
    );
  }
  if (
    connection?.type === "integration-v1-discovery" &&
    environment &&
    !environment.integrationV1Eligible
  ) {
    blockingReasons.push(
      "Production is not eligible for the current nonproduction-only Integration v1 gateway."
    );
  }
  if (
    connection?.type === "connector-sdk-workspace" &&
    application?.workspace.state !== "mapped"
  ) {
    blockingReasons.push(
      "A durable AI Data Platform workspace binding is required."
    );
  }
  if (connection?.type === "connector-sdk-workspace" && !manifest) {
    blockingReasons.push("Select a registered Connector SDK manifest.");
  }
  if (environment?.environment === "production") {
    warnings.push(
      "Production remains preparation-only; this wizard grants no production connection authority."
    );
  }
  warnings.push(
    "Saving this draft does not install, enable, test or activate a connection."
  );

  const ready = blockingReasons.length === 0;

  function changeApplication(applicationId: string) {
    setDraft((current) => ({
      ...current,
      applicationId,
      connectionType: "repository-metadata",
      connectorKey: null
    }));
    setMessage("");
  }

  function saveDraft() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setMessage(
      "Saved browser-local setup draft. No credential, test or live connection was created."
    );
  }

  function clearDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setDraft(defaultDraft(model));
    setMessage("Browser-local setup draft cleared.");
  }

  return (
    <>
      <section className="reviewSummary" aria-label="Connector setup summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.applications}</strong>
            <span>peer applications</span>
          </article>
          <article>
            <strong>{model.summary.connectionOptions}</strong>
            <span>setup paths catalogued</span>
          </article>
          <article>
            <strong>{model.summary.immediatelyPreparableOptions}</strong>
            <span>paths preparable now</span>
          </article>
          <article>
            <strong>{model.summary.externalTestsExecuted}</strong>
            <span>external tests executed</span>
          </article>
          <article>
            <strong>{model.summary.liveConnectionsActivated}</strong>
            <span>live connections activated</span>
          </article>
        </div>
      </section>

      <section className="reviewEditor" aria-labelledby="connector-setup-steps">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Guided setup</p>
            <h2 id="connector-setup-steps">Connection preparation steps</h2>
          </div>
        </div>

        <div className="formGrid">
          <label>
            1. Application
            <select
              value={application?.applicationId ?? ""}
              onChange={(event) => changeApplication(event.target.value)}
            >
              {model.applications.map((item) => (
                <option key={item.applicationId} value={item.applicationId}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>

          <label>
            2. Environment
            <select
              value={draft.environment}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  environment: event.target.value as ConnectorSetupDraft["environment"]
                }))
              }
            >
              {application?.environments.map((item) => (
                <option key={item.environment} value={item.environment}>
                  {item.environment}
                  {item.integrationEnvironment
                    ? " · Integration v1 " + item.integrationEnvironment
                    : " · no Integration v1 transport"}
                </option>
              ))}
            </select>
          </label>

          <label>
            3. Connection type
            <select
              value={draft.connectionType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  connectionType:
                    event.target.value as ConnectorSetupDraft["connectionType"],
                  connectorKey:
                    event.target.value === "connector-sdk-workspace"
                      ? current.connectorKey
                      : null
                }))
              }
            >
              {application?.connectionOptions.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                  {item.available ? "" : " · unavailable"}
                </option>
              ))}
            </select>
          </label>

          {connection?.type === "connector-sdk-workspace" ? (
            <label>
              4. Connector manifest
              <select
                value={draft.connectorKey ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    connectorKey: event.target.value || null
                  }))
                }
              >
                <option value="">Select manifest</option>
                {model.connectorManifests.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.displayName} · v{item.version}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {application ? (
          <div className="grid">
            <article className="card">
              <h3>{application.displayName}</h3>
              <p>
                <strong>Identity:</strong> {application.identityKey}
              </p>
              <p>
                <strong>Logical tenant:</strong> {application.canonicalTenantKey}
              </p>
              <p>
                <strong>Repository:</strong> {application.repository}
              </p>
              <span className="badge">
                workspace {application.workspace.state}
              </span>
            </article>

            <article className="card">
              <h3>{connection?.label ?? "Select connection type"}</h3>
              <p>
                {connection?.description ??
                  "Choose a connection type to see its preparation requirements."}
              </p>
              <span className="badge">
                activation {connection?.activationState ?? "DISCONNECTED"}
              </span>
            </article>
          </div>
        ) : null}
      </section>

      <section className="reviewQueue" aria-labelledby="setup-requirements">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Required configuration</p>
            <h2 id="setup-requirements">Derived and review-only setup fields</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {connection?.requiredConfiguration.map((requirement) => (
            <article className="reviewBatchSummary" key={requirement.key}>
              <div>
                <span className="reviewStatus">{requirement.source}</span>
                <h3>{requirement.label}</h3>
                <p>{requirement.detail}</p>
                <p>
                  <strong>Secret value accepted:</strong> no
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {manifest ? (
        <section className="reviewQueue" aria-labelledby="manifest-review">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Manifest review</p>
              <h2 id="manifest-review">
                {manifest.displayName} · v{manifest.version}
              </h2>
            </div>
          </div>
          <div className="grid">
            <article className="card">
              <h3>Capabilities</h3>
              <p>{manifest.capabilities.join(" · ") || "none"}</p>
            </article>
            <article className="card">
              <h3>Configuration fields</h3>
              <p>
                {manifest.configFields.length
                  ? manifest.configFields
                      .map(
                        (field) =>
                          field.label +
                          (field.required ? " (required)" : "") +
                          (field.hasDefault ? " · default available" : "")
                      )
                      .join(" · ")
                  : "No configuration fields."}
              </p>
            </article>
            <article className="card">
              <h3>Credential references</h3>
              <p>
                {manifest.secretReferences.length
                  ? manifest.secretReferences
                      .map((item) => item.environmentVariable)
                      .join(" · ")
                  : "No secret references required."}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="dataQualityPolicyNote">
        <strong>
          {ready
            ? "Ready for safe test preparation — not execution."
            : "Setup draft has blocking requirements."}
        </strong>
        {blockingReasons.length ? (
          <ul>
            {[...new Set(blockingReasons)].map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>
            The selected path can move to a later bounded test-preparation step.
            Build 283 does not contact an external provider or activate the connection.
          </p>
        )}
        <ul>
          {[...new Set(warnings)].map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </section>

      <section className="reviewQueue" aria-labelledby="safe-test-plan">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Safe test preparation</p>
            <h2 id="safe-test-plan">Checklist for the later test gate</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {(connection?.safeTestPreparation ?? []).map((item, index) => (
            <article className="reviewBatchSummary" key={item}>
              <div>
                <span className="reviewStatus">step {index + 1}</span>
                <p>{item}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Browser-local saved state only.</strong>
        <p>
          The saved draft contains only application, environment, connection type
          and optional manifest key. It never stores passwords, API keys, tokens,
          HMAC material, provider credentials or authorization state.
        </p>
        <div className="heroActions">
          <button className="primary" type="button" onClick={saveDraft}>
            Save setup draft locally
          </button>
          <button className="secondaryButton" type="button" onClick={clearDraft}>
            Clear saved draft
          </button>
        </div>
        {message ? <p className="reviewMessage" role="status">{message}</p> : null}
      </section>
    </>
  );
}
