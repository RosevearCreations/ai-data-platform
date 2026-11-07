"use client";

import { useState } from "react";

type Policy = {
  enabled: boolean;
  killSwitchEngaged: boolean;
  monitoringEnabled: boolean;
  recoveryScanEnabled: boolean;
  safeRecoveryEnabled: boolean;
  maxSafeRecoveriesPerCycle: number;
  maxCyclesPerHour: number;
  mode: "observe-only" | "safe-recovery";
  policyRevision: number;
  updatedAt?: string | null;
};

type Candidate = {
  candidateId?: string;
  priority: "P0" | "P1" | "P2";
  area: string;
  title: string;
  rationale: string;
  evidence: string;
  sourceHref: string;
};

type Cycle = {
  cycleId: string;
  policyRevision: number;
  mode: string;
  state: string;
  certificationRunId: string | null;
  recoveryPlansCreated: number;
  safeRecoveriesEligible: number;
  safeRecoveriesExecuted: number;
  safeRecoveriesSucceeded: number;
  safeRecoveriesFailed: number;
  completedAt: string;
};

type Model = {
  canManage: boolean;
  policy: Policy;
  cycles: Cycle[];
  learning: {
    live: {
      overallState: string;
      summary: {
        certificationPassed: number;
        certificationFailed: number;
        certificationBlocked: number;
        recoveryReady: number;
        recoveryOwnerApprovalRequired: number;
        recoverySucceeded: number;
        learningActionFindings: number;
        learningWatchFindings: number;
        renewalCandidates: number;
      };
      candidates: Candidate[];
      roadmapRenewal: {
        numberedNextBatchAuthorized: false;
        nextBuildNumber: null;
        candidatesFromMeasuredEvidenceOnly: true;
        ownerAuthorizationRequired: true;
        automaticRoadmapExtension: false;
      };
    };
    latestCandidates: Candidate[];
  };
};

export function AutonomousOperationsConsole({ model }: { model: Model }) {
  const [current, setCurrent] = useState(model);
  const [policy, setPolicy] = useState<Policy>(model.policy);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetch("/api/autonomous-operations", {
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Unable to refresh autonomous operations.");
    const next = await response.json();
    setCurrent(next);
    setPolicy(next.policy);
  }

  async function post(payload: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    setMessage("");
    try {
      const response = await fetch("/api/autonomous-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const value = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof value.error === "string"
            ? value.error
            : "Autonomous operation failed."
        );
      }
      await refresh();
      return value;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Autonomous operation failed."
      );
      return null;
    } finally {
      setBusy("");
    }
  }

  async function savePolicy() {
    const result = await post(
      {
        action: "update-policy",
        enabled: policy.enabled,
        killSwitchEngaged: policy.killSwitchEngaged,
        monitoringEnabled: policy.monitoringEnabled,
        recoveryScanEnabled: policy.recoveryScanEnabled,
        safeRecoveryEnabled: policy.safeRecoveryEnabled,
        maxSafeRecoveriesPerCycle: policy.maxSafeRecoveriesPerCycle,
        maxCyclesPerHour: policy.maxCyclesPerHour
      },
      "policy"
    );
    if (result) {
      setMessage(
        "Owner policy saved. Autonomous execution still obeys the kill switch, rate limit and Build 301 safe-health boundary."
      );
    }
  }

  async function runCycle() {
    const result = await post({ action: "run-cycle" }, "cycle");
    if (result) {
      setMessage(
        result.state === "completed"
          ? "Autonomous cycle completed. Safe health recoveries executed: " +
              String(result.safeRecoveriesExecuted ?? 0) +
              "."
          : "Cycle did not run: " +
              String(result.reason ?? "blocked by owner controls") +
              "."
      );
    }
  }

  async function refreshLearning() {
    const result = await post({ action: "refresh-learning" }, "learning");
    if (result) {
      setMessage(
        "Production Learning VI snapshot recorded with " +
          String(result.model?.candidates?.length ?? 0) +
          " unnumbered roadmap candidate(s)."
      );
    }
  }

  const live = current.learning.live;

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
            <p className="eyebrow">Owner controls</p>
            <h2>Autonomous Operations V1 policy</h2>
          </div>
        </div>

        <div className="grid">
          <article className="card">
            <h3>Master control</h3>
            <label>
              <input
                type="checkbox"
                checked={policy.enabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({ ...policy, enabled: event.target.checked })
                }
              />{" "}
              Enable autonomous cycles
            </label>
            <label>
              <input
                type="checkbox"
                checked={policy.killSwitchEngaged}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    killSwitchEngaged: event.target.checked
                  })
                }
              />{" "}
              Kill switch engaged
            </label>
            <p>
              Default is disabled with the kill switch engaged. Deployment
              alone never starts an autonomous cycle.
            </p>
          </article>

          <article className="card">
            <h3>Monitoring</h3>
            <label>
              <input
                type="checkbox"
                checked={policy.monitoringEnabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    monitoringEnabled: event.target.checked
                  })
                }
              />{" "}
              Refresh six-app certification evidence
            </label>
            <label>
              <input
                type="checkbox"
                checked={policy.recoveryScanEnabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    recoveryScanEnabled: event.target.checked
                  })
                }
              />{" "}
              Scan for governed recovery plans
            </label>
          </article>

          <article className="card">
            <h3>Safe recovery only</h3>
            <label>
              <input
                type="checkbox"
                checked={policy.safeRecoveryEnabled}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    safeRecoveryEnabled: event.target.checked
                  })
                }
              />{" "}
              Permit Build 301 GET/HEAD health recovery
            </label>
            <label>
              Maximum safe recoveries per cycle
              <input
                type="number"
                min={0}
                max={10}
                value={policy.maxSafeRecoveriesPerCycle}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    maxSafeRecoveriesPerCycle: Number(event.target.value)
                  })
                }
              />
            </label>
            <label>
              Maximum cycles per hour
              <input
                type="number"
                min={1}
                max={12}
                value={policy.maxCyclesPerHour}
                disabled={!current.canManage || Boolean(busy)}
                onChange={event =>
                  setPolicy({
                    ...policy,
                    maxCyclesPerHour: Number(event.target.value)
                  })
                }
              />
            </label>
          </article>
        </div>

        <div className="heroActions">
          <button
            className="primaryButton"
            disabled={!current.canManage || Boolean(busy)}
            onClick={savePolicy}
          >
            {busy === "policy" ? "Saving…" : "Save owner policy"}
          </button>
          <button
            className="secondaryButton"
            disabled={!current.canManage || Boolean(busy)}
            onClick={runCycle}
          >
            {busy === "cycle" ? "Running…" : "Run autonomous cycle"}
          </button>
          <button
            className="secondaryButton"
            disabled={!current.canManage || Boolean(busy)}
            onClick={refreshLearning}
          >
            {busy === "learning"
              ? "Refreshing…"
              : "Record Production Learning VI snapshot"}
          </button>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Production Learning VI</p>
            <h2>Evidence-driven roadmap renewal</h2>
          </div>
        </div>

        <div className="commandMetrics">
          <article>
            <strong>{live.summary.certificationPassed}</strong>
            <span>certification PASS</span>
          </article>
          <article>
            <strong>{live.summary.certificationFailed}</strong>
            <span>certification FAIL</span>
          </article>
          <article>
            <strong>{live.summary.certificationBlocked}</strong>
            <span>certification BLOCKED</span>
          </article>
          <article>
            <strong>{live.summary.renewalCandidates}</strong>
            <span>unnumbered candidates</span>
          </article>
        </div>

        <p>
          Current learning state: <strong>{live.overallState}</strong>. Build
          305 does not create Build 306 automatically; roadmap candidates remain
          unnumbered until an owner explicitly authorizes the next finite batch.
        </p>

        <div className="grid">
          {live.candidates.length ? (
            live.candidates.map(candidate => (
              <article className="card" key={candidate.title}>
                <p className="eyebrow">
                  {candidate.priority} · {candidate.area}
                </p>
                <h3>{candidate.title}</h3>
                <p>{candidate.rationale}</p>
                <small>{candidate.evidence}</small>
                <p>
                  <a href={candidate.sourceHref}>Open source evidence</a>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <h3>No measured renewal gap is currently queued.</h3>
              <p>
                Continue normal monitoring. A numbered roadmap should be
                created only after new evidence justifies it.
              </p>
            </article>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Cycle evidence</p>
            <h2>Recent autonomous operation runs</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {current.cycles.slice(0, 12).map(cycle => (
            <div className="reviewBatchRow" key={cycle.cycleId}>
              <strong>
                {cycle.state.toUpperCase()} · {cycle.mode}
              </strong>
              <span>{new Date(cycle.completedAt).toLocaleString()}</span>
              <p>
                Recovery plans created {cycle.recoveryPlansCreated} · safe
                eligible {cycle.safeRecoveriesEligible} · executed{" "}
                {cycle.safeRecoveriesExecuted} · succeeded{" "}
                {cycle.safeRecoveriesSucceeded} · failed{" "}
                {cycle.safeRecoveriesFailed}.
              </p>
            </div>
          ))}
          {!current.cycles.length ? (
            <div className="emptyState">
              No autonomous cycle evidence exists yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Autonomy boundary</strong>
        <p>
          Autonomous Operations V1 may monitor, create recovery plans and run
          only the existing bounded connector-health GET/HEAD recovery lane.
          It cannot activate a connection, replay an event, mutate a credential,
          release a held action, change trust, write to a peer application or
          resume QL-266.
        </p>
      </section>
    </>
  );
}
