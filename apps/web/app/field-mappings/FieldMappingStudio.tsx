"use client";

import { useMemo, useState } from "react";

type Transform =
  | "copy"
  | "trim"
  | "lowercase"
  | "uppercase"
  | "number"
  | "boolean"
  | "iso-date-time"
  | "split-comma"
  | "join-comma";

type Contract = {
  contractId: string;
  title: string;
  version: string;
  schemaId: string;
  schemaFingerprint: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    description: string;
    enumValues: string[] | null;
  }>;
};

type MappingEntry = {
  targetKey: string;
  sourcePath: string;
  transform: Transform;
};

type MappingProfile = {
  workspaceId: string;
  workspaceName: string;
  mappingProfileId: string;
  applicationId: string;
  contractId: string;
  contractVersion: string;
  schemaFingerprint: string;
  profileName: string;
  sourceSchemaLabel: string;
  mappingEntries: MappingEntry[];
  notes: string;
  reviewStatus: "draft" | "reviewed";
  revision: number;
  reviewedAt: string | null;
  updatedAt: string;
  schemaCurrent: boolean;
  canManage: boolean;
  validation: {
    valid: boolean;
    completeForReview: boolean;
    errors: string[];
    requiredTargets: number;
    mappedRequiredTargets: number;
    totalTargets: number;
    mappedTargets: number;
  };
};

type Model = {
  schema: "ai-data-platform.visual-field-mapping-studio.v1";
  build: 287;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    canManage: boolean;
  }>;
  applications: Array<{
    applicationId: string;
    displayName: string;
    repository: string;
    connectionState: string;
  }>;
  contracts: Contract[];
  profiles: MappingProfile[];
  events: Array<{
    eventId: string;
    mappingProfileId: string;
    eventType: string;
    revision: number;
    createdAt: string;
  }>;
  summary: {
    profiles: number;
    reviewed: number;
    drafts: number;
    schemaCurrent: number;
    staleSchema: number;
    applicationsWithProfiles: number;
    contractsWithProfiles: number;
  };
};

const transforms: Transform[] = [
  "copy",
  "trim",
  "lowercase",
  "uppercase",
  "number",
  "boolean",
  "iso-date-time",
  "split-comma",
  "join-comma"
];

async function postMapping(body: unknown) {
  const response = await fetch("/api/field-mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Field mapping request failed."
    );
  }
  return payload;
}

function blankRows(contract: Contract | undefined): MappingEntry[] {
  return (
    contract?.fields.map((field) => ({
      targetKey: field.key,
      sourcePath: "",
      transform: "copy" as Transform
    })) ?? []
  );
}

export function FieldMappingStudio({ model }: { model: Model }) {
  const manageable = useMemo(
    () => model.workspaces.filter((workspace) => workspace.canManage),
    [model.workspaces]
  );
  const [workspaceId, setWorkspaceId] = useState(manageable[0]?.id ?? "");
  const [applicationId, setApplicationId] = useState(
    model.applications[0]?.applicationId ?? ""
  );
  const [contractId, setContractId] = useState(
    model.contracts[0]?.contractId ?? ""
  );
  const [mappingProfileId, setMappingProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [sourceSchemaLabel, setSourceSchemaLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<MappingEntry[]>(
    blankRows(model.contracts[0])
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const contract = useMemo(
    () => model.contracts.find((item) => item.contractId === contractId),
    [contractId, model.contracts]
  );
  const application = useMemo(
    () =>
      model.applications.find((item) => item.applicationId === applicationId),
    [applicationId, model.applications]
  );

  const coverage = useMemo(() => {
    if (!contract) {
      return {
        mapped: 0,
        total: 0,
        requiredMapped: 0,
        requiredTotal: 0,
        complete: false
      };
    }
    const mapped = rows.filter((row) => row.sourcePath.trim()).length;
    const required = contract.fields.filter((field) => field.required);
    const requiredMapped = required.filter((field) =>
      rows.some(
        (row) => row.targetKey === field.key && Boolean(row.sourcePath.trim())
      )
    ).length;
    return {
      mapped,
      total: contract.fields.length,
      requiredMapped,
      requiredTotal: required.length,
      complete: requiredMapped === required.length
    };
  }, [contract, rows]);

  function changeContract(nextId: string) {
    const next = model.contracts.find((item) => item.contractId === nextId);
    setContractId(nextId);
    setRows(blankRows(next));
    setMappingProfileId("");
    setProfileName("");
    setSourceSchemaLabel("");
    setNotes("");
    setMessage("");
  }

  function updateRow(
    targetKey: string,
    patch: Partial<Pick<MappingEntry, "sourcePath" | "transform">>
  ) {
    setRows((current) =>
      current.map((row) =>
        row.targetKey === targetKey ? { ...row, ...patch } : row
      )
    );
    setMessage("");
  }

  function openProfile(profile: MappingProfile) {
    const selectedContract = model.contracts.find(
      (item) => item.contractId === profile.contractId
    );
    if (!selectedContract) return;
    const byTarget = new Map(
      profile.mappingEntries.map((entry) => [entry.targetKey, entry])
    );
    setWorkspaceId(profile.workspaceId);
    setApplicationId(profile.applicationId);
    setContractId(profile.contractId);
    setMappingProfileId(profile.mappingProfileId);
    setProfileName(profile.profileName);
    setSourceSchemaLabel(profile.sourceSchemaLabel);
    setNotes(profile.notes);
    setRows(
      selectedContract.fields.map((field) => {
        const existing = byTarget.get(field.key);
        return {
          targetKey: field.key,
          sourcePath: existing?.sourcePath ?? "",
          transform: existing?.transform ?? "copy"
        };
      })
    );
    setMessage(
      profile.reviewStatus === "reviewed"
        ? "Reviewed profile loaded. Any draft save reopens it for review."
        : "Draft profile loaded."
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(review: boolean) {
    if (!contract || !workspaceId || !applicationId || !profileName.trim()) {
      setMessage("Choose a workspace, application, contract and profile name.");
      return;
    }
    setBusy(review ? "review" : "save");
    setMessage("");
    try {
      await postMapping({
        action: review ? "review" : "save",
        workspaceId,
        mappingProfileId: mappingProfileId || undefined,
        applicationId,
        contractId,
        profileName,
        sourceSchemaLabel,
        mappingEntries: rows
          .filter((row) => row.sourcePath.trim())
          .map((row) => ({
            targetKey: row.targetKey,
            sourcePath: row.sourcePath.trim(),
            transform: row.transform
          })),
        notes
      });
      setMessage(
        review
          ? "Mapping profile reviewed and persisted. Reloading evidence."
          : "Mapping draft persisted. Reloading evidence."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Field mapping request failed."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="reviewSummary" aria-label="Field mapping summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.profiles}</strong>
            <span>mapping profiles</span>
          </article>
          <article>
            <strong>{model.summary.reviewed}</strong>
            <span>reviewed profiles</span>
          </article>
          <article>
            <strong>{model.summary.drafts}</strong>
            <span>draft profiles</span>
          </article>
          <article>
            <strong>{model.summary.applicationsWithProfiles}/6</strong>
            <span>applications mapped</span>
          </article>
          <article>
            <strong>{model.summary.staleSchema}</strong>
            <span>schema fingerprints stale</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="mapping-profiles-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Persisted workspace profiles</p>
            <h2 id="mapping-profiles-title">Reviewed &amp; draft mapping profiles</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.profiles.map((profile) => (
            <article className="reviewBatchSummary" key={profile.mappingProfileId}>
              <div>
                <span className="reviewStatus">
                  {profile.reviewStatus}
                  {profile.schemaCurrent ? "" : " · schema changed"}
                </span>
                <h3>{profile.profileName}</h3>
                <p>
                  {profile.applicationId} → {profile.contractId} · revision{" "}
                  {profile.revision}
                </p>
                <p>
                  Required coverage: {profile.validation.mappedRequiredTargets}/
                  {profile.validation.requiredTargets} · total mapped:{" "}
                  {profile.validation.mappedTargets}/{profile.validation.totalTargets}
                </p>
                <p>
                  Workspace: {profile.workspaceName} · updated{" "}
                  {new Date(profile.updatedAt).toLocaleString()}
                </p>
                {profile.reviewedAt ? (
                  <p>
                    Reviewed {new Date(profile.reviewedAt).toLocaleString()} ·
                    fingerprint{" "}
                    <code>{profile.schemaFingerprint.slice(0, 12)}…</code>
                  </p>
                ) : null}
                {profile.canManage ? (
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => openProfile(profile)}
                  >
                    Open mapping
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!model.profiles.length ? (
            <div className="emptyState">
              No mapping profiles exist yet. Choose an application and contract below
              to create the first reviewed mapping.
            </div>
          ) : null}
        </div>
      </section>

      <section className="reviewEditor" aria-labelledby="mapping-studio-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Visual mapping canvas</p>
            <h2 id="mapping-studio-title">
              {mappingProfileId ? "Edit mapping profile" : "Create mapping profile"}
            </h2>
          </div>
        </div>

        {manageable.length && contract ? (
          <>
            <div className="formGrid">
              <label>
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) => {
                    setWorkspaceId(event.target.value);
                    setMappingProfileId("");
                  }}
                >
                  {manageable.map((workspace) => (
                    <option value={workspace.id} key={workspace.id}>
                      {workspace.name} · {workspace.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source application
                <select
                  value={applicationId}
                  onChange={(event) => {
                    setApplicationId(event.target.value);
                    setMappingProfileId("");
                  }}
                >
                  {model.applications.map((item) => (
                    <option value={item.applicationId} key={item.applicationId}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Canonical contract
                <select
                  value={contractId}
                  onChange={(event) => changeContract(event.target.value)}
                >
                  {model.contracts.map((item) => (
                    <option value={item.contractId} key={item.contractId}>
                      {item.title} · v{item.version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Profile name
                <input
                  value={profileName}
                  maxLength={120}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Rosie customer → shared customer"
                />
              </label>
              <label>
                Source schema / table label
                <input
                  value={sourceSchemaLabel}
                  maxLength={240}
                  onChange={(event) => setSourceSchemaLabel(event.target.value)}
                  placeholder="Optional: customers, booking.customer, API v1"
                />
              </label>
            </div>

            <div className="mappingStudioHeader">
              <div>
                <span className="eyebrow">Source</span>
                <strong>{application?.displayName ?? applicationId}</strong>
                <small>Enter a field path; no source values are stored.</small>
              </div>
              <div className="mappingStudioArrow" aria-hidden="true">
                →
              </div>
              <div>
                <span className="eyebrow">Canonical target</span>
                <strong>{contract.title}</strong>
                <small>
                  v{contract.version} · fingerprint{" "}
                  {contract.schemaFingerprint.slice(0, 12)}…
                </small>
              </div>
            </div>

            <div className="mappingStudioRows">
              {contract.fields.map((field) => {
                const row = rows.find((item) => item.targetKey === field.key) ?? {
                  targetKey: field.key,
                  sourcePath: "",
                  transform: "copy" as Transform
                };
                return (
                  <div
                    className={
                      "mappingStudioRow" +
                      (field.required ? " mappingStudioRow--required" : "")
                    }
                    key={field.key}
                  >
                    <div className="mappingStudioSource">
                      <label>
                        Source field path
                        <input
                          value={row.sourcePath}
                          onChange={(event) =>
                            updateRow(field.key, {
                              sourcePath: event.target.value
                            })
                          }
                          placeholder="customer.email"
                          spellCheck={false}
                        />
                      </label>
                      <label>
                        Transform
                        <select
                          value={row.transform}
                          onChange={(event) =>
                            updateRow(field.key, {
                              transform: event.target.value as Transform
                            })
                          }
                        >
                          {transforms.map((transform) => (
                            <option value={transform} key={transform}>
                              {transform}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mappingStudioConnector" aria-hidden="true">
                      <span />
                      →
                    </div>
                    <div className="mappingStudioTarget">
                      <strong>
                        {field.label}{" "}
                        {field.required ? <em>required</em> : <small>optional</small>}
                      </strong>
                      <code>{field.key}</code>
                      <p>
                        {field.type} · {field.description}
                      </p>
                      {field.enumValues?.length ? (
                        <small>Allowed: {field.enumValues.join(", ")}</small>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="reviewNote">
              Review notes
              <textarea
                value={notes}
                maxLength={4000}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Document source assumptions, special transforms or fields intentionally left unmapped."
              />
            </label>

            <div className="dataQualityPolicyNote">
              <strong>
                Required coverage: {coverage.requiredMapped}/
                {coverage.requiredTotal} · total mapped: {coverage.mapped}/
                {coverage.total}
              </strong>
              <p>
                A draft can be saved at any time. Mark reviewed is enabled only when
                every required canonical field has a source field path. Editing a
                reviewed profile and saving a draft reopens it for review.
              </p>
            </div>

            <div className="heroActions">
              <button
                className="secondaryButton"
                type="button"
                disabled={Boolean(busy) || !profileName.trim()}
                onClick={() => void save(false)}
              >
                {busy === "save" ? "Saving…" : "Save draft"}
              </button>
              <button
                className="primary"
                type="button"
                disabled={
                  Boolean(busy) || !profileName.trim() || !coverage.complete
                }
                onClick={() => void save(true)}
              >
                {busy === "review" ? "Reviewing…" : "Save & mark reviewed"}
              </button>
            </div>
          </>
        ) : (
          <div className="emptyState">
            Owner or admin workspace access is required to persist mapping profiles.
          </div>
        )}

        {message ? (
          <p className="reviewMessage" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="reviewQueue" aria-labelledby="mapping-evidence-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2 id="mapping-evidence-title">Recent mapping profile events</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.events.slice(0, 40).map((event) => (
            <article className="reviewBatchSummary" key={event.eventId}>
              <div>
                <span className="reviewStatus">{event.eventType}</span>
                <p>
                  {event.mappingProfileId} · revision {event.revision} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
          {!model.events.length ? (
            <div className="emptyState">No mapping evidence recorded yet.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
