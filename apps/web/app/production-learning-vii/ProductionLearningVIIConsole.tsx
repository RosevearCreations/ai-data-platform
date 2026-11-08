"use client";

import { useState } from "react";

type Candidate = {
  priority: "P0" | "P1" | "P2";
  area: string;
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

type Snapshot = {
  snapshotId: string;
  overallState: "healthy" | "attention" | "blocked";
  installedHosts: number;
  liveCertifiedHosts: number;
  upgradeRuns: number;
  autonomousCycles: number;
  recoveryPlans: number;
  blockerCount: number;
  attentionCount: number;
  candidateCount: number;
  generatedAt: string;
};

type LiveModel = {
  overallState: "healthy" | "attention" | "blocked";
  evidence: {
    installedHosts: number;
    capabilities: {
      enabled: number;
      used: number;
      unusedEnabled: number;
      highRiskUnused: number;
      disabledUsed: number;
    };
    certification: {
      latestHosts: number;
      liveCertified: number;
      fixtureCertified: number;
      failed: number;
      blocked: number;
      unhealthy: number;
      degraded: number;
      unknown: number;
    };
    lifecycle: {
      upgradeRuns: number;
      applied: number;
      failed: number;
      rollbackPrepared: number;
      rolledBack: number;
    };
    autonomy: {
      cycles: number;
      completed: number;
      blocked: number;
      failed: number;
      safeRecoveriesExecuted: number;
      safeRecoveriesSucceeded: number;
      safeRecoveriesFailed: number;
    };
    recovery: {
      total: number;
      recovered: number;
      approvalRequired: number;
      exhausted: number;
      notRetryable: number;
    };
    tenantIsolation: {
      livePass: number;
      liveFail: number;
      liveBlocked: number;
    };
    activity: {
      eventPublications: number;
      workflowIntents: number;
      liveSearchEvidencePass: number;
    };
    health: {
      connectorSucceeded: number;
      connectorFailed: number;
      offlineLivePass: number;
      offlineLiveFail: number;
      offlineLiveBlocked: number;
      relayRuntimeEvidenceCount: number;
    };
    ownerPolicy: {
      globalPolicyConfigured: boolean;
      globalEmergencyStopEngaged: boolean;
      hostPolicies: number;
      enabledHostPolicies: number;
      hostKillSwitchesEngaged: number;
      reservations24h: number;
      policyEvents: number;
    };
  };
  summary: {
    installedHosts: number;
    liveCertifiedHosts: number;
    upgradeRuns: number;
    autonomousCycles: number;
    recoveryPlans: number;
    blockers: number;
    attention: number;
    candidateCount: number;
  };
  candidates: Candidate[];
  autonomousOperationsV2: {
    currentAutomaticActionEnvelope: string;
    automaticActionEnvelopeExpanded: false;
    consequentialPeerWritesAutomatic: false;
    policyAndKillSwitchRemainAuthoritative: true;
  };
  roadmapRenewal: {
    finiteCandidateLimit: 12;
    candidatesAreUnnumbered: true;
    numberedNextBatchAuthorized: false;
    nextBuildNumber: null;
    ownerAuthorizationRequired: true;
  };
};

type Model = {
  canManage: boolean;
  live: LiveModel;
  snapshots: Snapshot[];
  latestSnapshot: Snapshot | null;
  latestCandidates: Candidate[];
};

function label(value: string) {
  return value
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProductionLearningVIIConsole({
  initialModel
}: {
  initialModel: Model;
}) {
  const [model, setModel] = useState(initialModel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/production-learning-vii",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refresh-learning-vii"
          })
        }
      );
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Unable to refresh Production Learning VII."
        );
      }

      const next = await fetch(
        "/api/production-learning-vii",
        { cache: "no-store" }
      );
      if (!next.ok) {
        throw new Error(
          "Evidence was recorded but the refreshed review could not be loaded."
        );
      }
      setModel(await next.json());
      setMessage(
        "Production Learning VII evidence snapshot recorded. Candidates remain unnumbered and do not execute work."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to refresh Production Learning VII."
      );
    } finally {
      setBusy(false);
    }
  }

  const evidence = model.live.evidence;

  return (
    <div className="reviewGrid">
      {message ? (
        <section className="dataQualityPolicyNote">
          <strong>Renewal status</strong>
          <p>{message}</p>
        </section>
      ) : null}

      <section className="reviewCard">
        <p className="eyebrow">Batch closeout</p>
        <h2>Current evidence state</h2>
        <p>
          Overall: <strong>{label(model.live.overallState)}</strong> ·
          installed hosts: <strong>{model.live.summary.installedHosts}</strong> ·
          live-certified: <strong>{model.live.summary.liveCertifiedHosts}</strong> ·
          P0 blockers: <strong>{model.live.summary.blockers}</strong> ·
          P1 attention: <strong>{model.live.summary.attention}</strong>
        </p>
        <p>
          Renewal candidates: <strong>{model.live.summary.candidateCount}</strong> /
          12 maximum. Numbered next batch authorized: <strong>No</strong>.
        </p>
        <button
          type="button"
          disabled={busy || !model.canManage}
          onClick={refresh}
        >
          {busy
            ? "Recording evidence…"
            : "Record Production Learning VII snapshot"}
        </button>
        {!model.canManage ? (
          <p>
            Owner/admin access is required to record a renewal snapshot.
          </p>
        ) : null}
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Installed hosts & capabilities</p>
        <h2>Adoption and authority use</h2>
        <p>
          Installed hosts: {evidence.installedHosts}. Capabilities:{" "}
          {evidence.capabilities.used} used / {evidence.capabilities.enabled} enabled.
        </p>
        <p>
          Enabled but unused: {evidence.capabilities.unusedEnabled} ·
          high-risk unused: {evidence.capabilities.highRiskUnused} ·
          disabled but observed: {evidence.capabilities.disabledUsed}.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Cross-host certification</p>
        <h2>Compatibility and live evidence</h2>
        <p>
          Latest host runs: {evidence.certification.latestHosts} ·
          live-certified: {evidence.certification.liveCertified} ·
          fixture-certified: {evidence.certification.fixtureCertified}.
        </p>
        <p>
          FAIL {evidence.certification.failed} · BLOCKED{" "}
          {evidence.certification.blocked} · unhealthy{" "}
          {evidence.certification.unhealthy} · degraded{" "}
          {evidence.certification.degraded} · unknown{" "}
          {evidence.certification.unknown}.
        </p>
        <p>
          Tenant isolation live evidence: PASS{" "}
          {evidence.tenantIsolation.livePass} · FAIL{" "}
          {evidence.tenantIsolation.liveFail} · BLOCKED{" "}
          {evidence.tenantIsolation.liveBlocked}.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Lifecycle & autonomy</p>
        <h2>Upgrade, rollback and autonomous-cycle outcomes</h2>
        <p>
          Upgrades: {evidence.lifecycle.upgradeRuns} runs ·{" "}
          {evidence.lifecycle.applied} applied · {evidence.lifecycle.failed} failed ·{" "}
          {evidence.lifecycle.rollbackPrepared} rollback-prepared ·{" "}
          {evidence.lifecycle.rolledBack} rolled back.
        </p>
        <p>
          Autonomous cycles: {evidence.autonomy.cycles} ·{" "}
          {evidence.autonomy.completed} completed · {evidence.autonomy.blocked} blocked ·{" "}
          {evidence.autonomy.failed} failed.
        </p>
        <p>
          Safe recoveries: {evidence.autonomy.safeRecoveriesExecuted} executed ·{" "}
          {evidence.autonomy.safeRecoveriesSucceeded} succeeded ·{" "}
          {evidence.autonomy.safeRecoveriesFailed} failed.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Recovery & activity</p>
        <h2>Real operating footprint</h2>
        <p>
          Recovery: {evidence.recovery.total} plans · {evidence.recovery.recovered} recovered ·{" "}
          {evidence.recovery.approvalRequired} owner approval required ·{" "}
          {evidence.recovery.exhausted} exhausted · {evidence.recovery.notRetryable} not retryable.
        </p>
        <p>
          Event publications: {evidence.activity.eventPublications} · workflow intents:{" "}
          {evidence.activity.workflowIntents} · live search PASS evidence:{" "}
          {evidence.activity.liveSearchEvidencePass}.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Connector, relay & offline health</p>
        <h2>Health evidence</h2>
        <p>
          Connector operations: {evidence.health.connectorSucceeded} succeeded ·{" "}
          {evidence.health.connectorFailed} failed.
        </p>
        <p>
          Offline live evidence: PASS {evidence.health.offlineLivePass} · FAIL{" "}
          {evidence.health.offlineLiveFail} · BLOCKED {evidence.health.offlineLiveBlocked}.
        </p>
        <p>
          Dedicated durable relay runtime samples:{" "}
          {evidence.health.relayRuntimeEvidenceCount}. Zero is treated as unproven,
          never as healthy.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Owner policy usage</p>
        <h2>Autonomy governance</h2>
        <p>
          Global control configured:{" "}
          {evidence.ownerPolicy.globalPolicyConfigured ? "Yes" : "No"} · emergency stop:{" "}
          {evidence.ownerPolicy.globalEmergencyStopEngaged ? "Engaged" : "Released"}.
        </p>
        <p>
          Host policies: {evidence.ownerPolicy.hostPolicies} · enabled:{" "}
          {evidence.ownerPolicy.enabledHostPolicies} · host kill switches engaged:{" "}
          {evidence.ownerPolicy.hostKillSwitchesEngaged}.
        </p>
        <p>
          Budget reservations last 24h: {evidence.ownerPolicy.reservations24h} ·
          policy events in retained review window: {evidence.ownerPolicy.policyEvents}.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Autonomous Operations V2 boundary</p>
        <h2>No automatic authority expansion</h2>
        <p>
          Current automatic action envelope:{" "}
          <strong>{model.live.autonomousOperationsV2.currentAutomaticActionEnvelope}</strong>.
        </p>
        <p>
          Action envelope expanded: <strong>No</strong> · consequential peer writes automatic:{" "}
          <strong>No</strong> · policy and kill switches remain authoritative:{" "}
          <strong>Yes</strong>.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Next finite roadmap</p>
        <h2>Unnumbered evidence-backed candidates</h2>
        {model.live.candidates.length === 0 ? (
          <p>
            No measured evidence currently justifies additional roadmap work.
            Build 330 will not manufacture candidates to fill a queue.
          </p>
        ) : (
          model.live.candidates.map((item, index) => (
            <article className="reviewCard" key={item.title + index}>
              <span className="badge">
                {item.priority} · {label(item.area)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.rationale}</p>
              <p><strong>Evidence:</strong> {item.evidence}</p>
              <a href={item.sourceHref}>Review source evidence</a>
            </article>
          ))
        )}
        <p>
          These candidates have no build numbers and require explicit owner
          authorization before a future finite batch is numbered.
        </p>
      </section>

      <section className="reviewCard">
        <p className="eyebrow">Append-only renewal history</p>
        <h2>Recorded Production Learning VII snapshots</h2>
        {model.snapshots.length === 0 ? (
          <p>No Build 330 snapshot has been recorded yet.</p>
        ) : (
          model.snapshots.map(item => (
            <article className="reviewCard" key={item.snapshotId}>
              <h3>{label(item.overallState)}</h3>
              <p>
                {new Date(item.generatedAt).toLocaleString()} ·{" "}
                {item.installedHosts} hosts · {item.liveCertifiedHosts} live-certified ·{" "}
                {item.candidateCount} unnumbered candidates.
              </p>
              <p>
                Upgrade runs {item.upgradeRuns} · autonomous cycles{" "}
                {item.autonomousCycles} · recovery plans {item.recoveryPlans}.
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
