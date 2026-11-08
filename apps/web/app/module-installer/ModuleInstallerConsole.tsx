"use client";

import { useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type CredentialReference = {
  workspaceId: string;
  credentialRefId: string;
  label: string;
  referenceKind:
    | "environment-variable"
    | "external-vault-reference"
    | "provider-managed-reference";
  lifecycleStatus: "active" | "revoked";
  riskState: string;
};

type Enrollment = {
  enrollmentId: string;
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  hostTenantId: string;
  platformTenantId: string;
  adapterKind: string;
  defaultSurface: string;
  requestedCapabilities: string[];
  state:
    | "dry-run-held"
    | "dry-run-passed"
    | "approved"
    | "rejected";
  revision: number;
  dryRun: {
    state?: string;
    checks?: Array<{
      id: string;
      state: "pass" | "held";
      detail: string;
    }>;
    security?: Record<string, boolean>;
  };
  approvedAt: string | null;
  approvalReason: string | null;
  packageSha256: string | null;
  packageGeneratedAt: string | null;
  updatedAt: string;
};

type Model = {
  descriptor: {
    adapters: string[];
    surfaces: string[];
    capabilities: string[];
    transportKinds: string[];
  };
  workspaces: Workspace[];
  credentialReferences: CredentialReference[];
  enrollments: Enrollment[];
};

type Draft = {
  workspaceId: string;
  hostApplicationId: string;
  hostDisplayName: string;
  hostInstanceId: string;
  environment: "development" | "test" | "staging" | "production";
  hostTenantId: string;
  platformTenantId: string;
  framework: "react" | "nextjs" | "vite" | "vanilla" | "electron";
  defaultSurface: string;
  requestedCapabilities: string[];
  credentialRefId: string;
  transportId: string;
  transportDisplayName: string;
  transportKind:
    | "direct-https"
    | "trusted-local-relay"
    | "approved-cloud-relay";
  destinationOrigin: string;
  securityLevel: "standard" | "hardened";
  relayId: string;
  trustReference: string;
};

function emptyDraft(model: Model): Draft {
  return {
    workspaceId: model.workspaces[0]?.id ?? "",
    hostApplicationId: "",
    hostDisplayName: "",
    hostInstanceId: "",
    environment: "production",
    hostTenantId: "",
    platformTenantId: "",
    framework: "nextjs",
    defaultSurface:
      model.descriptor.surfaces[0] ?? "data-library",
    requestedCapabilities: ["manifest.read"],
    credentialRefId: "",
    transportId: "module.direct",
    transportDisplayName: "AI Data Platform direct HTTPS",
    transportKind: "direct-https",
    destinationOrigin: "https://",
    securityLevel: "standard",
    relayId: "",
    trustReference: ""
  };
}

export function ModuleInstallerConsole({
  initialModel
}: {
  initialModel: Model;
}) {
  const [model, setModel] = useState(initialModel);
  const [draft, setDraft] = useState(() =>
    emptyDraft(initialModel)
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [decisionReason, setDecisionReason] = useState(
    "Owner reviewed the dry run and approves preparation package generation."
  );
  const [packageJson, setPackageJson] = useState("");

  const credentialOptions = useMemo(
    () =>
      model.credentialReferences.filter(
        (item) =>
          item.workspaceId === draft.workspaceId &&
          item.lifecycleStatus === "active"
      ),
    [model.credentialReferences, draft.workspaceId]
  );

  async function refresh() {
    const response = await fetch("/api/module-installer", {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Unable to refresh host enrollments.");
    }
    setModel(await response.json());
  }

  async function post(
    payload: Record<string, unknown>,
    key: string
  ) {
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/module-installer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Installer operation failed."
        );
      }
      await refresh();
      return value;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Installer operation failed."
      );
      return null;
    } finally {
      setBusy("");
    }
  }

  function toggleCapability(capability: string) {
    setDraft((current) => {
      const present =
        current.requestedCapabilities.includes(capability);
      const requestedCapabilities = present
        ? current.requestedCapabilities.filter(
            (item) => item !== capability
          )
        : [...current.requestedCapabilities, capability];
      return {
        ...current,
        requestedCapabilities:
          requestedCapabilities.length > 0
            ? requestedCapabilities
            : ["manifest.read"]
      };
    });
  }

  async function prepare() {
    const selectedCredential =
      credentialOptions.find(
        (item) => item.credentialRefId === draft.credentialRefId
      ) ?? null;

    const credentialRequirements = selectedCredential
      ? [
          {
            requirementId: "host-auth-reference",
            label: "Host integration credential reference",
            required: true,
            acceptedReferenceKinds: [
              selectedCredential.referenceKind
            ]
          }
        ]
      : [];

    const credentialBindings = selectedCredential
      ? [
          {
            requirementId: "host-auth-reference",
            credentialRefId: selectedCredential.credentialRefId
          }
        ]
      : [];

    const localRelay =
      draft.transportKind === "trusted-local-relay"
        ? {
            relayId: draft.relayId.trim(),
            trustReference: draft.trustReference.trim()
          }
        : null;

    const value = await post(
      {
        action: "prepare-enrollment",
        manifest: {
          schema:
            "rosevear.ai-data-platform.host-install-manifest.v1",
          manifestVersion: 1,
          hostContractVersion: 1,
          protocolVersion: 1,
          hostApplication: {
            id: draft.hostApplicationId.trim(),
            instanceId: draft.hostInstanceId.trim(),
            environment: draft.environment,
            displayName: draft.hostDisplayName.trim()
          },
          tenancy: {
            hostTenantId: draft.hostTenantId.trim(),
            platformTenantId: draft.platformTenantId.trim(),
            workspaceId: draft.workspaceId
          },
          runtime: {
            framework: draft.framework
          },
          defaultSurface: draft.defaultSurface,
          requestedCapabilities:
            draft.requestedCapabilities,
          credentialRequirements,
          credentialBindings,
          transport: {
            transportId: draft.transportId.trim(),
            displayName: draft.transportDisplayName.trim(),
            kind: draft.transportKind,
            destinationOrigin:
              draft.destinationOrigin.trim(),
            securityLevel: draft.securityLevel,
            localRelay
          }
        }
      },
      "prepare"
    );

    if (value) {
      setMessage(
        value.state === "dry-run-passed"
          ? "Dry run passed. Owner approval is now eligible; no connection, trust or capability was activated."
          : "Dry run is held. Review the held checks before requesting owner approval."
      );
    }
  }

  async function decide(
    enrollmentId: string,
    decision: "approve" | "reject"
  ) {
    const value = await post(
      {
        action: "owner-decision",
        enrollmentId,
        decision,
        reason: decisionReason
      },
      "decision:" + enrollmentId
    );
    if (value) {
      setMessage(
        decision === "approve"
          ? "Preparation approved. This permits package generation only; it does not activate the host."
          : "Enrollment preparation rejected."
      );
    }
  }

  async function generatePackage(enrollmentId: string) {
    const value = await post(
      {
        action: "generate-package",
        enrollmentId
      },
      "package:" + enrollmentId
    );
    if (value) {
      setPackageJson(
        JSON.stringify(value.package, null, 2)
      );
      setMessage(
        "Owner-approved integration package generated. AI Data Platform did not write these files into the host."
      );
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
            <p className="eyebrow">
              Guided manifest discovery
            </p>
            <h2>Host identity &amp; runtime</h2>
          </div>
        </div>

        <div className="grid">
          <article className="card">
            <label>
              Workspace
              <select
                value={draft.workspaceId}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    workspaceId: event.target.value,
                    credentialRefId: ""
                  })
                }
              >
                {model.workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} · {workspace.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Host application ID
              <input
                value={draft.hostApplicationId}
                placeholder="rosevear.example"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostApplicationId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Display name
              <input
                value={draft.hostDisplayName}
                placeholder="Example Host"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostDisplayName: event.target.value
                  })
                }
              />
            </label>
            <label>
              Host instance ID
              <input
                value={draft.hostInstanceId}
                placeholder="host-production-primary"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostInstanceId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Environment
              <select
                value={draft.environment}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    environment:
                      event.target.value as Draft["environment"]
                  })
                }
              >
                <option value="development">development</option>
                <option value="test">test</option>
                <option value="staging">staging</option>
                <option value="production">production</option>
              </select>
            </label>
          </article>

          <article className="card">
            <h3>Tenant/workspace mapping</h3>
            <label>
              Host tenant ID
              <input
                value={draft.hostTenantId}
                placeholder="host-tenant"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hostTenantId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Platform tenant ID
              <input
                value={draft.platformTenantId}
                placeholder="platform-tenant"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    platformTenantId: event.target.value
                  })
                }
              />
            </label>
            <p>
              Mapping is explicit and workspace-bound. The installer never
              invents a default tenant or cross-workspace fallback.
            </p>
          </article>

          <article className="card">
            <h3>Adapter &amp; surface</h3>
            <label>
              Host framework
              <select
                value={draft.framework}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    framework:
                      event.target.value as Draft["framework"]
                  })
                }
              >
                {model.descriptor.adapters.map((adapter) => (
                  <option key={adapter} value={adapter}>
                    {adapter}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Default surface
              <select
                value={draft.defaultSurface}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    defaultSurface: event.target.value
                  })
                }
              >
                {model.descriptor.surfaces.map((surface) => (
                  <option key={surface} value={surface}>
                    {surface}
                  </option>
                ))}
              </select>
            </label>
          </article>

          <article className="card">
            <h3>Capability preview</h3>
            {model.descriptor.capabilities.map((capability) => (
              <label key={capability}>
                <input
                  type="checkbox"
                  checked={draft.requestedCapabilities.includes(
                    capability
                  )}
                  disabled={Boolean(busy)}
                  onChange={() => toggleCapability(capability)}
                />{" "}
                {capability}
              </label>
            ))}
            <p>
              Selecting a capability requests it for the package. It does not
              grant authorization.
            </p>
          </article>

          <article className="card">
            <h3>Credential-reference requirement</h3>
            <label>
              Optional existing credential reference
              <select
                value={draft.credentialRefId}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    credentialRefId: event.target.value
                  })
                }
              >
                <option value="">No credential reference required</option>
                {credentialOptions.map((reference) => (
                  <option
                    key={reference.credentialRefId}
                    value={reference.credentialRefId}
                  >
                    {reference.label} · {reference.referenceKind} ·{" "}
                    {reference.riskState}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Only reference metadata is validated. Secret values and
              credential locators are not placed in the generated package.
            </p>
          </article>

          <article className="card">
            <h3>Transport configuration</h3>
            <label>
              Transport kind
              <select
                value={draft.transportKind}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    transportKind:
                      event.target.value as Draft["transportKind"]
                  })
                }
              >
                {model.descriptor.transportKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Transport ID
              <input
                value={draft.transportId}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    transportId: event.target.value
                  })
                }
              />
            </label>
            <label>
              Display name
              <input
                value={draft.transportDisplayName}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    transportDisplayName: event.target.value
                  })
                }
              />
            </label>
            <label>
              Destination origin
              <input
                value={draft.destinationOrigin}
                placeholder="https://module.example"
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    destinationOrigin: event.target.value
                  })
                }
              />
            </label>
            <label>
              Security level
              <select
                value={draft.securityLevel}
                disabled={Boolean(busy)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    securityLevel:
                      event.target.value as Draft["securityLevel"]
                  })
                }
              >
                <option value="standard">standard</option>
                <option value="hardened">hardened</option>
              </select>
            </label>

            {draft.transportKind === "trusted-local-relay" ? (
              <>
                <label>
                  Relay ID
                  <input
                    value={draft.relayId}
                    disabled={Boolean(busy)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        relayId: event.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Trust reference
                  <input
                    value={draft.trustReference}
                    disabled={Boolean(busy)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        trustReference: event.target.value
                      })
                    }
                  />
                </label>
              </>
            ) : null}

            <p>
              This validates transport configuration only. No health probe or
              network request is performed by the installer.
            </p>
          </article>
        </div>

        <div className="heroActions">
          <button
            className="primaryButton"
            disabled={
              Boolean(busy) ||
              !draft.workspaceId ||
              draft.requestedCapabilities.length === 0
            }
            onClick={prepare}
          >
            {busy === "prepare"
              ? "Running dry run…"
              : "Discover, validate & run install dry run"}
          </button>
          <button
            className="secondaryButton"
            disabled={Boolean(busy)}
            onClick={() =>
              setDraft(emptyDraft(model))
            }
          >
            Clear form
          </button>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Enrollment inventory</p>
            <h2>Prepared hosts</h2>
          </div>
        </div>

        <label>
          Owner decision reason
          <input
            value={decisionReason}
            maxLength={500}
            disabled={Boolean(busy)}
            onChange={(event) =>
              setDecisionReason(event.target.value)
            }
          />
        </label>

        <div className="reviewBatchList">
          {model.enrollments.map((enrollment) => (
            <article
              className="reviewBatchRow"
              key={enrollment.enrollmentId}
            >
              <strong>
                {enrollment.hostApplicationId} ·{" "}
                {enrollment.environment}
              </strong>
              <span>
                {enrollment.state} · revision {enrollment.revision} ·{" "}
                {enrollment.adapterKind}
              </span>
              <p>
                Instance {enrollment.hostInstanceId} · host tenant{" "}
                {enrollment.hostTenantId} → platform tenant{" "}
                {enrollment.platformTenantId}
              </p>

              {enrollment.dryRun.checks?.map((check) => (
                <p key={check.id}>
                  <strong>
                    {check.state === "pass" ? "PASS" : "HELD"} ·{" "}
                    {check.id}
                  </strong>{" "}
                  — {check.detail}
                </p>
              ))}

              <div className="heroActions">
                <button
                  className="primaryButton"
                  disabled={
                    Boolean(busy) ||
                    enrollment.state !== "dry-run-passed"
                  }
                  onClick={() =>
                    decide(enrollment.enrollmentId, "approve")
                  }
                >
                  Approve preparation
                </button>
                <button
                  className="secondaryButton"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    decide(enrollment.enrollmentId, "reject")
                  }
                >
                  Reject
                </button>
                <button
                  className="secondaryButton"
                  disabled={
                    Boolean(busy) ||
                    enrollment.state !== "approved"
                  }
                  onClick={() =>
                    generatePackage(enrollment.enrollmentId)
                  }
                >
                  Generate integration package
                </button>
              </div>

              {enrollment.packageSha256 ? (
                <p>
                  Package SHA-256:{" "}
                  <code>{enrollment.packageSha256}</code>
                </p>
              ) : null}
            </article>
          ))}

          {!model.enrollments.length ? (
            <div className="emptyState">
              No host enrollments prepared yet.
            </div>
          ) : null}
        </div>
      </section>

      {packageJson ? (
        <section>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Generated package</p>
              <h2>Owner-approved package JSON</h2>
            </div>
          </div>
          <textarea
            readOnly
            rows={30}
            value={packageJson}
          />
        </section>
      ) : null}
    </>
  );
}
