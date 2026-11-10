"use client";

import { useState } from "react";

type SourceOutcome = {
  sourceId: string;
  effectiveState: string;
  ownerDecision: string;
  readinessVersion: number | null;
  observedAt: string | null;
  expiresAt: string | null;
  commitSha: string | null;
};

type Candidate = {
  priority: string;
  area: string;
  sourceId: string | null;
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

type LiveModel = {
  generatedAt: string;
  sourceOutcomes: SourceOutcome[];
  summary: {
    sources: number;
    accepted: number;
    readyForOwner: number;
    hold: number;
    failed: number;
    stale: number;
    unresolvedSources: number;
    candidateCount: number;
    suiteAcceptance: string;
  };
  candidates: Candidate[];
  roadmapRenewal: {
    checkpointReached: true;
    currentBatchClosed: true;
    closedBatch: "331-350";
    finiteCandidateLimit: 12;
    candidatesAreUnnumbered: true;
    candidatesAuthorizeExecution: false;
    numberedBuilds351PlusAuthorized: false;
    nextBuildNumber: null;
    automaticRoadmapExtension: false;
    explicitOwnerAuthorizationRequired: true;
    separateAuthorizationAfterBuild350Required: true;
  };
};

export function ProductionLearningVIIIConsole({
  initialModel
}: {
  initialModel: {
    live: LiveModel;
    latestSnapshot: {
      snapshotId: string;
      suiteAcceptance: string;
      generatedAt: string;
      candidateCount: number;
    } | null;
    latestCandidates: Array<{
      candidateId: string;
      priority: string;
      area: string;
      sourceId: string | null;
      title: string;
      rationale: string;
      evidence: string;
      sourceHref: string;
      numberedBuild: null;
    }>;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/production-learning-viii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-learning-viii" })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ?? "production_learning_viii_operation_failed"
        );
      }
      setMessage("Production Learning VIII snapshot recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "production_learning_viii_operation_failed"
      );
    } finally {
      setBusy(false);
    }
  }

  const model = initialModel.live;

  return (
    <>
      <section className="reviewSummary" aria-label="Build 350 summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.suiteAcceptance}</strong>
            <span>Master Shell acceptance</span>
          </article>
          <article>
            <strong>{model.summary.accepted}/6</strong>
            <span>sources accepted</span>
          </article>
          <article>
            <strong>{model.summary.unresolvedSources}</strong>
            <span>sources unresolved</span>
          </article>
          <article>
            <strong>{model.summary.candidateCount}</strong>
            <span>unnumbered renewal candidates</span>
          </article>
          <article>
            <strong>No</strong>
            <span>Build 351+ authorized</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Roadmap renewal checkpoint</strong>
        <p>
          Builds 331–350 are closed by this evidence review. Candidate work is
          unnumbered and does not authorize execution. The next build number is
          <strong> none</strong>; a separate explicit owner authorization is
          required before any Build 351+ roadmap exists.
        </p>
        <button className="primaryButton" type="button" onClick={refresh} disabled={busy}>
          {busy ? "Recording…" : "Record Production Learning VIII snapshot"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exact six-source acceptance</p>
            <h2>Current Build 349 outcomes</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sourceOutcomes.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <h3>{source.sourceId}</h3>
              <p>
                <strong>{source.effectiveState}</strong>
                {" · "}owner decision {source.ownerDecision}
              </p>
              <p>
                Readiness version {source.readinessVersion ?? "missing"}
                {" · "}expires {source.expiresAt ?? "unknown"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Evidence-backed only</p>
            <h2>Unnumbered renewal candidates</h2>
          </div>
        </div>
        {model.candidates.length ? (
          <div className="reviewBatchList">
            {model.candidates.map((candidate) => (
              <article
                className="reviewBatchSummary"
                key={(candidate.sourceId ?? "suite") + ":" + candidate.title}
              >
                <span className="reviewStatus">
                  {candidate.priority} · {candidate.area} · unnumbered
                </span>
                <h3>{candidate.title}</h3>
                <p>{candidate.rationale}</p>
                <p><strong>Evidence:</strong> {candidate.evidence}</p>
                <a className="textLink" href={candidate.sourceHref}>
                  Open source evidence →
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>
              No unresolved Build 349 evidence currently creates a renewal
              candidate. This still does not authorize Build 351+.
            </p>
          </div>
        )}
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Latest persisted closeout</strong>
        <p>
          {initialModel.latestSnapshot
            ? "Snapshot " +
              initialModel.latestSnapshot.snapshotId +
              " · " +
              initialModel.latestSnapshot.suiteAcceptance +
              " · " +
              initialModel.latestSnapshot.candidateCount +
              " candidate(s) · " +
              initialModel.latestSnapshot.generatedAt
            : "No Build 350 snapshot has been recorded yet."}
        </p>
        {initialModel.latestCandidates.some(
          (candidate) => candidate.numberedBuild !== null
        ) ? (
          <p role="alert">Invalid numbered renewal candidate detected.</p>
        ) : null}
      </section>
    </>
  );
}
