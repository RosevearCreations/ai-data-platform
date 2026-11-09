"use client";

import { useMemo, useState } from "react";

const safeStates = [
  "DISCOVERED",
  "CONFIGURED",
  "AUTHORIZATION_HELD",
  "STALE",
  "DEGRADED",
  "DISCONNECTED",
  "REVOKED",
  "ERROR"
] as const;

type SourceOption = {
  sourceId: string;
  shellBoundary: string;
  effectiveStatus: string;
};

export function RegistryEvidenceRecorder({
  sources
}: {
  sources: SourceOption[];
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.sourceId ?? "");
  const [declaredStatus, setDeclaredStatus] =
    useState<(typeof safeStates)[number]>("DISCOVERED");
  const [environment, setEnvironment] =
    useState<"nonproduction" | "production">("production");
  const [evidenceURI, setEvidenceURI] = useState("");
  const [manifestURI, setManifestURI] = useState("");
  const [immutableRevision, setImmutableRevision] = useState("");
  const [capabilityVersion, setCapabilityVersion] = useState("");
  const [approvedOrigin, setApprovedOrigin] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => sources.find((item) => item.sourceId === sourceId),
    [sourceId, sources]
  );

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const observed = new Date();
      const expires = new Date(observed.getTime() + 24 * 60 * 60 * 1000);
      const response = await fetch("/api/master-shell-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-operator-evidence",
          sourceId,
          declaredStatus,
          environment,
          statusObservedAt: observed.toISOString(),
          statusExpiresAt: expires.toISOString(),
          evidenceURI,
          manifestURI,
          immutableRevision,
          capabilityVersion,
          approvedOrigin,
          signerKeyId: null,
          signerFingerprint: null,
          rolesAllowed: [],
          holdReason:
            declaredStatus === "AUTHORIZATION_HELD"
              ? holdReason
              : null
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "registry_record_failed");
      }
      setMessage(
        "Evidence recorded. TEST_VERIFIED and CONNECTED still require independent source ingestion."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "registry_record_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Owner/admin evidence intake</p>
          <h2>Record bounded registry evidence</h2>
        </div>
      </div>
      <div className="dataQualityPolicyNote">
        <strong>Positive connection acceptance is intentionally unavailable here.</strong>
        <p>
          This form can record discovery, configuration, authorization HOLD and
          negative operational evidence. Build 337 must provide independently
          verified source evidence before TEST_VERIFIED or CONNECTED can exist.
        </p>
      </div>
      <div className="formGrid">
        <label>
          Source
          <select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            {sources.map((source) => (
              <option key={source.sourceId} value={source.sourceId}>
                {source.sourceId} · {source.shellBoundary}
              </option>
            ))}
          </select>
        </label>
        <label>
          Current effective state
          <input value={current?.effectiveStatus ?? "UNKNOWN"} readOnly />
        </label>
        <label>
          Evidence state
          <select
            value={declaredStatus}
            onChange={(event) =>
              setDeclaredStatus(event.target.value as (typeof safeStates)[number])
            }
          >
            {safeStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </label>
        <label>
          Environment
          <select
            value={environment}
            onChange={(event) =>
              setEnvironment(
                event.target.value === "production"
                  ? "production"
                  : "nonproduction"
              )
            }
          >
            <option value="production">production</option>
            <option value="nonproduction">nonproduction</option>
          </select>
        </label>
        <label>
          Evidence URI
          <input
            value={evidenceURI}
            onChange={(event) => setEvidenceURI(event.target.value)}
            placeholder="https://... or urn:rosevear:evidence:..."
          />
        </label>
        <label>
          Manifest URI
          <input
            value={manifestURI}
            onChange={(event) => setManifestURI(event.target.value)}
            placeholder="Required from CONFIGURED onward"
          />
        </label>
        <label>
          Immutable revision
          <input
            value={immutableRevision}
            onChange={(event) => setImmutableRevision(event.target.value)}
          />
        </label>
        <label>
          Capability version
          <input
            value={capabilityVersion}
            onChange={(event) => setCapabilityVersion(event.target.value)}
          />
        </label>
        <label>
          Approved origin
          <input
            value={approvedOrigin}
            onChange={(event) => setApprovedOrigin(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label>
          HOLD reason
          <input
            value={holdReason}
            onChange={(event) => setHoldReason(event.target.value)}
            disabled={declaredStatus !== "AUTHORIZATION_HELD"}
          />
        </label>
      </div>
      <div className="heroActions">
        <button
          className="primaryButton"
          type="button"
          disabled={busy || !sourceId || !evidenceURI}
          onClick={submit}
        >
          {busy ? "Recording…" : "Record evidence"}
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
