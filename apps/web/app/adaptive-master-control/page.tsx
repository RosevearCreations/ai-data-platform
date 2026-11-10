import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  composeAdaptiveMasterControl,
  type MasterRuntimeSample
} from "@/lib/adaptive-master-control";
import { composeAnomalyBehaviourPredictiveRisk } from "@/lib/anomaly-behaviour-predictive-risk";
import { auth } from "@/lib/auth";
import { composeBasicAlerts } from "@/lib/basic-alerts";
import { buildCapacityPlanningModel } from "@/lib/capacity-planning";
import { composeCapacityWorkloadForecast } from "@/lib/capacity-workload-forecasting";
import { composeCrossApplicationControlCenter } from "@/lib/cross-application-control-center";
import { composeIncidentRunbookRecoveryOrchestration } from "@/lib/incident-runbook-recovery-orchestration";
import { listPerformanceBaselineForUser } from "@/lib/performance-baseline-database";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

function formatThreshold(value: number | null, unit: string) {
  if (value === null) return "not established";
  if (unit === "ms") return value.toFixed(2) + " ms";
  if (unit === "percent") return value.toFixed(2) + "%";
  return value.toLocaleString("en-CA");
}

export default async function AdaptiveMasterControlPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fadaptive-master-control");
  }

  const params = await searchParams;
  const [baseline, observatory, review] = await Promise.all([
    listPerformanceBaselineForUser(session.user.id),
    listPerformanceObservatoryForUser(session.user.id),
    buildProductionLearningReview(session.user.id)
  ]);

  const capacityPlan = buildCapacityPlanningModel(
    review.evidence,
    params.scenario
  );
  const capacity = composeCapacityWorkloadForecast({
    capacity: capacityPlan,
    observatory
  });
  const incidents = composeIncidentRunbookRecoveryOrchestration({
    alerts: composeBasicAlerts(),
    controlCenter: composeCrossApplicationControlCenter()
  });
  const risk = composeAnomalyBehaviourPredictiveRisk({
    baseline,
    observatory,
    capacity,
    incidents
  });

  const now = new Date();
  const runtimeSamples: MasterRuntimeSample[] = [
    {
      planeId: "ai-data-platform",
      observedAt: now.toISOString(),
      healthy: true,
      verified: true,
      evidenceKind: "SELF_REQUEST",
      revision: null,
      latencyMs: null,
      detail:
        "This authenticated Build 359 page executed successfully. One request proves current reachability only; it is not 24-hour uptime."
    }
  ];

  const model = composeAdaptiveMasterControl({
    risk,
    runtimeSamples,
    generatedAt: now
  });

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 359 · Advanced Master Control</p>
        <h1>
          Adaptive Controls, Dynamic Thresholds &amp; Intelligent Resource
          Management
        </h1>
        <p className="lead">
          Begin converging the Master applications while preserving their
          separate authority boundaries: AI Data for intelligence, Comms Hub
          for communications and incidents, and Rosevear AI Hub on Ree&apos;s
          Windows server for approved automation and local execution.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/anomaly-predictive-risk">
            Predictive Risk
          </Link>
          <Link className="secondaryButton" href="/incident-runbook-recovery">
            Incident Runbooks
          </Link>
          <Link className="secondaryButton" href="/cross-application-control-center">
            Cross-App Control
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Master coordination summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.adaptiveResourcePlan.riskScore}/100</strong>
            <span>current risk index</span>
          </article>
          <article>
            <strong>{model.adaptiveResourcePlan.monitoringCadenceSeconds}s</strong>
            <span>proposed monitor cadence</span>
          </article>
          <article>
            <strong>{model.monitoring.online}</strong>
            <span>planes currently observed online</span>
          </article>
          <article>
            <strong>{model.monitoring.unknown}</strong>
            <span>planes awaiting runtime evidence</span>
          </article>
          <article>
            <strong>{model.monitoring.measured24h}</strong>
            <span>planes with measured 24h uptime</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>
          Master convergence coordinates three planes; it does not erase their
          security boundaries.
        </strong>
        <p>
          AI Data proposes and verifies. Comms Hub owns incident and message
          workflow. Rosevear AI Hub is the designated cross-application
          automation host on the Windows server. Build 359 does not create a
          Windows task, activate the held heartbeat relay, or move local
          automation into the cloud.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Master runtime monitor</p>
            <h2>Uptime, freshness and validation coverage</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.masterPlanes.map((plane) => (
            <article className="reviewBatchSummary" key={plane.planeId}>
              <span
                className={
                  "reviewStatus reviewStatus--" + stateClass(plane.state)
                }
              >
                {plane.state} · {plane.runtimeClass}
              </span>
              <h3>{plane.label}</h3>
              <p><strong>Role:</strong> {plane.role}</p>
              <p><strong>Authority:</strong> {plane.authority}</p>
              <p>
                <strong>Latest verified observation:</strong>{" "}
                {plane.latestObservedAt ?? "none"}
              </p>
              <p>
                <strong>24h uptime:</strong>{" "}
                {plane.uptimePct24h === null
                  ? "unmeasured"
                  : plane.uptimePct24h.toFixed(2) + "%"}
                {" · "}
                <strong>verified samples:</strong> {plane.verifiedSamples24h}
              </p>
              <p>{plane.latestDetail}</p>
              <p><strong>Evidence path:</strong> {plane.uptimeEvidence}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Dynamic thresholds</p>
            <h2>Adaptive bands from established behaviour baselines</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.dynamicThresholds.map((threshold) => (
            <article className="reviewBatchSummary" key={threshold.metricKey}>
              <span className="reviewStatus">
                {threshold.adaptiveEligible
                  ? "ADAPTIVE ELIGIBLE"
                  : "BASELINE NOT ESTABLISHED"}
              </span>
              <h3>{threshold.label}</h3>
              <p>
                <strong>Attention band:</strong>{" "}
                {formatThreshold(threshold.attentionUpper, threshold.unit)}
                {" · "}
                <strong>critical band:</strong>{" "}
                {formatThreshold(threshold.criticalUpper, threshold.unit)}
              </p>
              <p>
                <strong>Baseline:</strong> {threshold.baselineQuality} ·{" "}
                {threshold.historicalSamples} historical samples
              </p>
              <p>{threshold.method}</p>
              <p>
                Enforcement: <strong>{threshold.enforcementMode}</strong>.
                Automatically applied: <strong>no</strong>.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Intelligent resource management</p>
            <h2>Server-first automation placement</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <span className="reviewStatus">
            {model.adaptiveResourcePlan.riskBand} ·{" "}
            {model.adaptiveResourcePlan.confidence} confidence
          </span>
          <h3>{model.adaptiveResourcePlan.executionHostLabel}</h3>
          <p>
            <strong>Execution plane:</strong>{" "}
            {model.adaptiveResourcePlan.executionHost}
          </p>
          <p>
            <strong>Workload policy:</strong>{" "}
            {model.adaptiveResourcePlan.workloadPolicy}
          </p>
          <p>
            <strong>Nonessential automation:</strong>{" "}
            {model.adaptiveResourcePlan.nonessentialAutomation}
          </p>
          <p>
            This is a supervised resource plan. It does not create or alter
            Windows scheduled tasks and does not automatically apply resource
            changes.
          </p>
        </article>
      </section>

      {model.monitoring.gaps.length > 0 && (
        <section className="dataQualityPolicyNote">
          <strong>Monitoring gaps remain visible.</strong>
          {model.monitoring.gaps.map((gap) => (
            <p key={gap.planeId}>
              <code>{gap.planeId}</code>: {gap.state} — {gap.action}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
