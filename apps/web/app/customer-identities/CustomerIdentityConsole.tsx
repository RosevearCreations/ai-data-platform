"use client";

import { useMemo, useState } from "react";

const sourceApplications = [
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const;

type Model = {
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  observations: Array<{
    observationId: string;
    workspaceId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion: string | null;
    evidenceSha256: string;
    evidenceFields: string[];
    observedAt: string;
  }>;
  candidates: Array<{
    candidateId: string;
    workspaceId: string;
    canonicalTenantKey: string;
    observationAId: string;
    observationBId: string;
    sourceApplicationA: string;
    sourceRecordA: string;
    sourceApplicationB: string;
    sourceRecordB: string;
    matchRule: string;
    confidenceScore: number;
    evidenceFields: string[];
    decision: "accept" | "reject" | null;
    decisionReason: string | null;
    decidedAt: string | null;
    createdAt: string;
  }>;
  groups: Array<{
    groupId: string;
    workspaceId: string;
    memberCount: number;
    applications: string[];
    createdAt: string;
  }>;
  summary: {
    observations: number;
    pendingCandidates: number;
    acceptedCandidates: number;
    rejectedCandidates: number;
    identityGroups: number;
  };
  policy: {
    rawContactValuesPersisted: boolean;
    exactEvidenceRulesOnly: boolean;
    fuzzyMatching: boolean;
    crossTenantMatching: boolean;
    crossApplicationOnly: boolean;
    automaticMerge: boolean;
    ownerAdminReviewRequired: boolean;
    outboundNetworkRequests: boolean;
    ql266Resumed: boolean;
  };
};

export function CustomerIdentityConsole({
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
    useState<(typeof sourceApplications)[number]>(
      "rosiedazzlers"
    );
  const [canonicalTenantKey, setCanonicalTenantKey] =
    useState("");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [sourceRecordVersion, setSourceRecordVersion] =
    useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>(
    {}
  );

  async function recordObservation() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-observation",
          workspaceId,
          sourceApplicationId,
          canonicalTenantKey,
          sourceRecordId,
          sourceRecordVersion,
          email,
          phone,
          displayName,
          postalCode
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Customer identity observation failed."
        );
      }
      setMessage(
        "Identity evidence fingerprinted. Raw contact values were not stored. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Customer identity observation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewCandidate(
    candidateId: string,
    decision: "accept" | "reject"
  ) {
    setReviewBusy(candidateId + ":" + decision);
    setMessage("");
    try {
      const response = await fetch("/api/customer-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review-candidate",
          candidateId,
          decision,
          reason: reasons[candidateId] ?? ""
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Customer identity review failed."
        );
      }
      setMessage(
        decision === "accept"
          ? "Match accepted and linked into a reviewed shared identity. Reloading."
          : "Match rejected with immutable review evidence. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Customer identity review failed."
      );
    } finally {
      setReviewBusy("");
    }
  }

  const pending = model.candidates.filter(
    (candidate) => candidate.decision === null
  );

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
            <p className="eyebrow">Identity standing</p>
            <h2>Evidence-backed matching</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.observations}</strong>
            <span>fingerprinted observations</span>
          </article>
          <article>
            <strong>{model.summary.pendingCandidates}</strong>
            <span>pending reviews</span>
          </article>
          <article>
            <strong>{model.summary.acceptedCandidates}</strong>
            <span>accepted matches</span>
          </article>
          <article>
            <strong>{model.summary.identityGroups}</strong>
            <span>shared identities</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authorized evidence intake</p>
            <h2>Fingerprint a source customer/contact record</h2>
          </div>
        </div>
        <div className="card">
          <p>
            Enter contact evidence from an authorized Rosevear
            application. The server normalizes the values and stores
            only SHA-256 fingerprints plus the source record reference.
          </p>
          {adminWorkspaces.length ? (
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
                      event.target.value as
                        (typeof sourceApplications)[number]
                    )
                  }
                >
                  {sourceApplications.map((application) => (
                    <option key={application} value={application}>
                      {application}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Canonical tenant key
                <input
                  value={canonicalTenantKey}
                  onChange={(event) =>
                    setCanonicalTenantKey(event.target.value)
                  }
                  placeholder="rosevear-main"
                />
              </label>
              <label>
                Source customer/contact record ID
                <input
                  value={sourceRecordId}
                  onChange={(event) =>
                    setSourceRecordId(event.target.value)
                  }
                />
              </label>
              <label>
                Source record version
                <input
                  value={sourceRecordVersion}
                  onChange={(event) =>
                    setSourceRecordVersion(event.target.value)
                  }
                  placeholder="optional"
                />
              </label>
              <label>
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <label>
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  autoComplete="off"
                />
              </label>
              <label>
                Postal code
                <input
                  value={postalCode}
                  onChange={(event) =>
                    setPostalCode(event.target.value)
                  }
                  autoComplete="off"
                />
              </label>
              <button
                className="primaryButton"
                type="button"
                disabled={
                  busy ||
                  !workspaceId ||
                  !canonicalTenantKey ||
                  !sourceRecordId
                }
                onClick={recordObservation}
              >
                {busy
                  ? "Fingerprinting…"
                  : "Fingerprint & find exact matches"}
              </button>
            </div>
          ) : (
            <p>Owner or admin access is required.</p>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Owner review queue</p>
            <h2>Pending cross-application candidates</h2>
          </div>
        </div>
        <div className="cardGrid">
          {pending.length ? (
            pending.map((candidate) => (
              <article className="card" key={candidate.candidateId}>
                <strong>
                  {candidate.sourceApplicationA} ↔{" "}
                  {candidate.sourceApplicationB}
                </strong>
                <p>
                  Records: <code>{candidate.sourceRecordA}</code> ↔{" "}
                  <code>{candidate.sourceRecordB}</code>
                </p>
                <p>
                  Rule: <code>{candidate.matchRule}</code> · confidence{" "}
                  {candidate.confidenceScore}
                </p>
                <p>
                  Exact evidence:{" "}
                  <code>{candidate.evidenceFields.join(" + ")}</code>
                </p>
                <label>
                  Review reason
                  <textarea
                    value={reasons[candidate.candidateId] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [candidate.candidateId]:
                          event.target.value
                      }))
                    }
                    placeholder="Explain why these records do or do not represent the same customer."
                  />
                </label>
                <div className="heroActions">
                  <button
                    className="primaryButton"
                    type="button"
                    disabled={Boolean(reviewBusy)}
                    onClick={() =>
                      reviewCandidate(
                        candidate.candidateId,
                        "accept"
                      )
                    }
                  >
                    {reviewBusy ===
                    candidate.candidateId + ":accept"
                      ? "Accepting…"
                      : "Accept match"}
                  </button>
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={Boolean(reviewBusy)}
                    onClick={() =>
                      reviewCandidate(
                        candidate.candidateId,
                        "reject"
                      )
                    }
                  >
                    {reviewBusy ===
                    candidate.candidateId + ":reject"
                      ? "Rejecting…"
                      : "Reject match"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No identity candidates are awaiting review.</p>
            </article>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Shared identity groups</p>
            <h2>Reviewed links only</h2>
          </div>
        </div>
        <div className="cardGrid">
          {model.groups.length ? (
            model.groups.map((group) => (
              <article className="card" key={group.groupId}>
                <strong>
                  {group.memberCount} linked source record
                  {group.memberCount === 1 ? "" : "s"}
                </strong>
                <p>{group.applications.join(" · ")}</p>
                <p>
                  Group: <code>{group.groupId}</code>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No reviewed shared identities exist yet.</p>
            </article>
          )}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Resolution policy</strong>
        <p>
          Raw contact persisted:{" "}
          {model.policy.rawContactValuesPersisted ? "yes" : "no"} ·
          fuzzy matching:{" "}
          {model.policy.fuzzyMatching ? "enabled" : "disabled"} ·
          automatic merge:{" "}
          {model.policy.automaticMerge ? "enabled" : "disabled"} ·
          external network requests:{" "}
          {model.policy.outboundNetworkRequests ? "enabled" : "disabled"}.
        </p>
      </section>
    </>
  );
}
