"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SourceFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date-time"
  | "string-array"
  | "object"
  | "unknown";

type SourceField = {
  path: string;
  type: SourceFieldType;
  required: boolean;
  enumValues: string[];
};

type Suggestion = {
  kind: string;
  targetKey: string | null;
  fromSourcePath: string | null;
  toSourcePath: string | null;
  confidence: "deterministic" | "review-required";
  actionable: boolean;
  rationale: string;
};

type DriftScan = {
  workspaceId: string;
  driftScanId: string;
  mappingProfileId: string;
  profileRevision: number;
  sourceSchemaVersion: string;
  sourceSchemaFingerprint: string;
  driftState: "baseline-required" | "clean" | "drift-detected";
  sourceChanges: Array<{
    kind: string;
    field: string;
    before: string | null;
    after: string | null;
    blocking: boolean;
  }>;
  canonicalChanges: Array<{
    kind: string;
    field: string;
    before: string | null;
    after: string | null;
    blocking: boolean;
  }>;
  affectedMappings: Array<{
    targetKey: string;
    sourcePath: string;
    reasons: string[];
  }>;
  repairSuggestions: Suggestion[];
  scannedAt: string;
};

type Repair = {
  workspaceId: string;
  repairSessionId: string;
  driftScanId: string;
  mappingProfileId: string;
  sourceProfileRevision: number;
  status: "prepared" | "applied-to-mapping-draft" | "cancelled";
  note: string;
  updatedAt: string;
};

type Profile = {
  workspaceId: string;
  workspaceName: string;
  mappingProfileId: string;
  applicationId: string;
  contractId: string;
  profileName: string;
  sourceSchemaLabel: string;
  sourceSchemaVersion: string | null;
  sourceSchemaFingerprint: string | null;
  sourceSchemaFields: SourceField[] | null;
  mappingEntries: Array<{
    targetKey: string;
    sourcePath: string;
    transform: string;
  }>;
  reviewStatus: "draft" | "reviewed";
  revision: number;
  canonicalCurrent: boolean;
  canManage: boolean;
  latestScan: DriftScan | null;
  activeRepair: Repair | null;
  deliveryReadiness: string;
};

type Model = {
  schema: "ai-data-platform.schema-drift-repair-assistant.v1";
  build: 288;
  profiles: Profile[];
  repairs: Repair[];
  events: Array<{
    eventId: string;
    mappingProfileId: string;
    eventType: string;
    createdAt: string;
  }>;
  summary: {
    profiles: number;
    driftClear: number;
    baselineRequired: number;
    driftDetected: number;
    freshScanRequired: number;
    preparedRepairs: number;
  };
};

const fieldTypes: SourceFieldType[] = [
  "string",
  "number",
  "boolean",
  "date-time",
  "string-array",
  "object",
  "unknown"
];

async function post(body: unknown) {
  const response = await fetch("/api/schema-drift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Schema drift request failed."
    );
  }
  return payload;
}

function emptyField(): SourceField {
  return { path: "", type: "unknown", required: false, enumValues: [] };
}

function mappedPathSeed(profile: Profile) {
  return [...new Set(profile.mappingEntries.map((entry) => entry.sourcePath))]
    .sort()
    .map((path) => ({
      path,
      type: "unknown" as SourceFieldType,
      required: false,
      enumValues: []
    }));
}

export function SchemaDriftRepairAssistant({ model }: { model: Model }) {
  const manageable = model.profiles.filter((profile) => profile.canManage);
  const [selectedId, setSelectedId] = useState(
    manageable[0]?.mappingProfileId ?? model.profiles[0]?.mappingProfileId ?? ""
  );
  const selected = useMemo(
    () => model.profiles.find((profile) => profile.mappingProfileId === selectedId),
    [model.profiles, selectedId]
  );
  const [sourceVersion, setSourceVersion] = useState(
    selected?.sourceSchemaVersion ?? "v1"
  );
  const [fields, setFields] = useState<SourceField[]>(
    selected?.sourceSchemaFields?.length
      ? selected.sourceSchemaFields
      : selected
        ? mappedPathSeed(selected)
        : [emptyField()]
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function loadProfile(profile: Profile) {
    setSelectedId(profile.mappingProfileId);
    setSourceVersion(profile.sourceSchemaVersion ?? "v1");
    setFields(
      profile.sourceSchemaFields?.length
        ? profile.sourceSchemaFields
        : mappedPathSeed(profile).length
          ? mappedPathSeed(profile)
          : [emptyField()]
    );
    setNote("");
    setMessage(
      profile.sourceSchemaFields?.length
        ? "Pinned source schema loaded."
        : "Mapped source paths were seeded with type UNKNOWN. Review every field before scanning."
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(index: number, patch: Partial<SourceField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  async function act(key: string, operation: () => Promise<unknown>, success: string) {
    setBusy(key);
    setMessage("");
    try {
      await operation();
      setMessage(success);
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Schema drift request failed."
      );
    } finally {
      setBusy("");
    }
  }

  const latestScan = selected?.latestScan ?? null;
  const activeRepair = selected?.activeRepair ?? null;

  return (
    <>
      <section className="reviewSummary" aria-label="Schema drift summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.profiles}</strong>
            <span>mapping profiles</span>
          </article>
          <article>
            <strong>{model.summary.driftClear}</strong>
            <span>drift clear</span>
          </article>
          <article>
            <strong>{model.summary.baselineRequired}</strong>
            <span>source baseline required</span>
          </article>
          <article>
            <strong>{model.summary.driftDetected}</strong>
            <span>drift detected</span>
          </article>
          <article>
            <strong>{model.summary.preparedRepairs}</strong>
            <span>repairs prepared</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="drift-profiles-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Delivery guardrail</p>
            <h2 id="drift-profiles-title">Mapping drift standing</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.profiles.map((profile) => (
            <article className="reviewBatchSummary" key={profile.mappingProfileId}>
              <div>
                <span className="reviewStatus">{profile.deliveryReadiness}</span>
                <h3>{profile.profileName}</h3>
                <p>
                  {profile.applicationId} → {profile.contractId} · revision{" "}
                  {profile.revision} · mapping {profile.reviewStatus}
                </p>
                <p>
                  Source pin:{" "}
                  {profile.sourceSchemaFingerprint
                    ? profile.sourceSchemaFingerprint.slice(0, 12) + "…"
                    : "not established"}{" "}
                  · canonical {profile.canonicalCurrent ? "current" : "changed"}
                </p>
                {profile.latestScan ? (
                  <p>
                    Latest scan: {profile.latestScan.driftState} ·{" "}
                    {profile.latestScan.affectedMappings.length} affected mapping(s) ·{" "}
                    {new Date(profile.latestScan.scannedAt).toLocaleString()}
                  </p>
                ) : null}
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={!profile.canManage}
                  onClick={() => loadProfile(profile)}
                >
                  {profile.canManage ? "Inspect / scan" : "Read only"}
                </button>
              </div>
            </article>
          ))}
          {!model.profiles.length ? (
            <div className="emptyState">
              No mapping profiles exist yet. Create one in the Visual Field Mapping Studio first.
            </div>
          ) : null}
        </div>
      </section>

      {selected ? (
        <section className="reviewEditor" aria-labelledby="drift-scan-title">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Source schema snapshot</p>
              <h2 id="drift-scan-title">{selected.profileName}</h2>
            </div>
          </div>

          <div className="dataQualityPolicyNote">
            <strong>
              {selected.applicationId} → {selected.contractId}
            </strong>
            <p>
              Enter schema descriptors only: field paths, types, required flags and enum values.
              Do not paste customer records, tokens, passwords or other source values.
            </p>
          </div>

          <div className="formGrid">
            <label>
              API / schema version
              <input
                value={sourceVersion}
                maxLength={120}
                onChange={(event) => setSourceVersion(event.target.value)}
                placeholder="v1, 2026-11-04, api-3"
              />
            </label>
            <label>
              Source schema label
              <input value={selected.sourceSchemaLabel || "not labelled"} readOnly />
            </label>
          </div>

          <div className="schemaDriftFieldList">
            {fields.map((field, index) => (
              <div className="schemaDriftFieldRow" key={index}>
                <label>
                  Field path
                  <input
                    value={field.path}
                    onChange={(event) =>
                      updateField(index, { path: event.target.value })
                    }
                    placeholder="customer.email"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={field.type}
                    onChange={(event) =>
                      updateField(index, {
                        type: event.target.value as SourceFieldType
                      })
                    }
                  >
                    {fieldTypes.map((type) => (
                      <option value={type} key={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="schemaDriftRequired">
                  <span>Required</span>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      updateField(index, { required: event.target.checked })
                    }
                  />
                </label>
                <label>
                  Enum values
                  <input
                    value={field.enumValues.join(", ")}
                    onChange={(event) =>
                      updateField(index, {
                        enumValues: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="optional, comma separated"
                  />
                </label>
                <button
                  className="secondaryButton"
                  type="button"
                  onClick={() =>
                    setFields((current) =>
                      current.filter((_, fieldIndex) => fieldIndex !== index)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="heroActions">
            <button
              className="secondaryButton"
              type="button"
              onClick={() => setFields((current) => [...current, emptyField()])}
            >
              Add source field
            </button>
            <button
              className="primary"
              type="button"
              disabled={
                Boolean(busy) ||
                !selected.canManage ||
                !sourceVersion.trim() ||
                !fields.length ||
                fields.some((field) => !field.path.trim())
              }
              onClick={() =>
                void act(
                  "scan",
                  () =>
                    post({
                      action: "scan",
                      workspaceId: selected.workspaceId,
                      mappingProfileId: selected.mappingProfileId,
                      sourceSchemaVersion: sourceVersion,
                      sourceSchemaFields: fields
                    }),
                  "Drift scan recorded. Reloading current evidence."
                )
              }
            >
              {busy === "scan" ? "Scanning…" : "Run drift scan"}
            </button>
          </div>

          {latestScan ? (
            <div className="schemaDriftResult">
              <div className="sectionHeading">
                <div>
                  <p className="eyebrow">Latest result</p>
                  <h3>{latestScan.driftState}</h3>
                </div>
              </div>
              <div className="commandMetrics">
                <article>
                  <strong>{latestScan.sourceChanges.length}</strong>
                  <span>source changes</span>
                </article>
                <article>
                  <strong>{latestScan.canonicalChanges.length}</strong>
                  <span>canonical changes</span>
                </article>
                <article>
                  <strong>{latestScan.affectedMappings.length}</strong>
                  <span>affected mappings</span>
                </article>
                <article>
                  <strong>{latestScan.repairSuggestions.length}</strong>
                  <span>repair suggestions</span>
                </article>
              </div>

              {[...latestScan.sourceChanges, ...latestScan.canonicalChanges].length ? (
                <div className="reviewBatchList">
                  {[...latestScan.sourceChanges, ...latestScan.canonicalChanges].map(
                    (change, index) => (
                      <article className="reviewBatchSummary" key={index}>
                        <div>
                          <span className="reviewStatus">
                            {change.kind}
                            {change.blocking ? " · blocking" : ""}
                          </span>
                          <h3>{change.field}</h3>
                          <p>
                            {change.before ?? "∅"} → {change.after ?? "∅"}
                          </p>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <p>No schema changes were detected against the pinned baseline.</p>
              )}

              {latestScan.repairSuggestions.length ? (
                <div className="reviewBatchList">
                  {latestScan.repairSuggestions.map((suggestion, index) => (
                    <article className="reviewBatchSummary" key={index}>
                      <div>
                        <span className="reviewStatus">
                          {suggestion.confidence}
                        </span>
                        <h3>{suggestion.kind}</h3>
                        <p>
                          {suggestion.targetKey ?? "full mapping"} ·{" "}
                          {suggestion.fromSourcePath ?? "none"} →{" "}
                          {suggestion.toSourcePath ?? "operator review"}
                        </p>
                        <p>{suggestion.rationale}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {!activeRepair ? (
                <div className="heroActions">
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={Boolean(busy) || !selected.canManage}
                    onClick={() =>
                      void act(
                        "prepare",
                        () =>
                          post({
                            action: "prepare-repair",
                            workspaceId: selected.workspaceId,
                            driftScanId: latestScan.driftScanId,
                            note
                          }),
                        "Repair session prepared. No mapping approval was changed."
                      )
                    }
                  >
                    Prepare repair draft
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeRepair ? (
            <div className="dataQualityPolicyNote">
              <strong>Prepared repair session</strong>
              <p>
                Applying this session writes deterministic suggestions and the current
                source/canonical fingerprints into the mapping, then reopens the mapping
                as a draft. It still requires explicit review in the Field Mapping Studio.
              </p>
              <label className="reviewNote">
                Repair note
                <textarea
                  value={note}
                  maxLength={4000}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What changed and what still needs manual review?"
                />
              </label>
              <div className="heroActions">
                <button
                  className="primary"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act(
                      "apply",
                      () =>
                        post({
                          action: "apply-repair-to-draft",
                          workspaceId: selected.workspaceId,
                          repairSessionId: activeRepair.repairSessionId,
                          note
                        }),
                      "Repair applied to mapping draft. Review the mapping again before any later delivery."
                    )
                  }
                >
                  Apply repair to mapping draft
                </button>
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    void act(
                      "cancel",
                      () =>
                        post({
                          action: "cancel-repair",
                          workspaceId: selected.workspaceId,
                          repairSessionId: activeRepair.repairSessionId,
                          note
                        }),
                      "Prepared repair cancelled."
                    )
                  }
                >
                  Cancel repair
                </button>
                <Link className="secondaryButton" href="/field-mappings">
                  Open Field Mapping Studio
                </Link>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="reviewMessage" role="status">
              {message}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="reviewQueue" aria-labelledby="drift-evidence-title">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2 id="drift-evidence-title">Recent drift &amp; repair events</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.events.slice(0, 40).map((event) => (
            <article className="reviewBatchSummary" key={event.eventId}>
              <div>
                <span className="reviewStatus">{event.eventType}</span>
                <p>
                  {event.mappingProfileId} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
          {!model.events.length ? (
            <div className="emptyState">
              No Build 288 drift or repair evidence has been recorded yet.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
