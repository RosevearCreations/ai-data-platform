import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeAnomalyBehaviourPredictiveRisk } from "@/lib/anomaly-behaviour-predictive-risk";
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

function formatMetric(value: number | null, unit: string) {
  if (value === null) return "unmeasured";
  if (unit === "percent") return value.toFixed(2) + "%";
  if (unit === "ms") return value.toFixed(2) + " ms";
  return value.toLocaleString("en-CA");
}

export default async function AnomalyPredictiveRiskPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fanomaly-predictive-risk");
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

  const model = composeAnomalyBehaviourPredictiveRisk({
    baseline,
    observatory,
    capacity,
    incidents
  });

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 358 · Advanced Intelligence</p>
        <h1>Anomaly Detection, Behaviour Baselines &amp; Predictive Risk</h1>
        <p className="lead">
          Compare current measured behaviour with durable historical baselines,
          detect unusual deviations and rank near-term review risk without
          converting a heuristic score into a failure probability or source
          truth.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/performance-baseline">
            Performance Baseline
          </Link>
          <Link className="secondaryButton" href="/performance-observatory">
            Performance Observatory
          </Link>
          <Link className="secondaryButton" href="/capacity-workload-forecasting">
            Capacity Forecasting
          </Link>
          <Link className="secondaryButton" href="/incident-runbook-recovery">
            Incident Runbooks
          </Link>
          <Link className="secondaryButton" href="/adaptive-master-control">
            Adaptive Master Control
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Predictive risk summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.predictiveRisk.score}/100</strong>
            <span>risk index</span>
          </article>
          <article>
            <strong>{model.predictiveRisk.band}</strong>
            <span>risk band</span>
          </article>
          <article>
            <strong>{model.predictiveRisk.confidence}</strong>
            <span>evidence confidence</span>
          </article>
          <article>
            <strong>{model.anomalySummary.anomalous}</strong>
            <span>anomalous metrics</span>
          </article>
          <article>
            <strong>{model.anomalySummary.establishedBaselines}</strong>
            <span>established baselines</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Predictive risk is advisory intelligence, not future truth.</strong>
        <p>
          The 0–100 index is a deterministic review-priority score. It is not a
          failure probability, forecast guarantee or authorization signal. It
          cannot release HOLD, create acceptance, start recovery, scale
          infrastructure, create a Comms incident or write to a source app.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Behaviour baselines</p>
            <h2>Robust deviation from historical evidence</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.behaviourBaselines.map((metric) => (
            <article className="reviewBatchSummary" key={metric.metricKey}>
              <span
                className={
                  "reviewStatus reviewStatus--" +
                  stateClass(metric.anomalyState)
                }
              >
                {metric.anomalyState} · {metric.baselineQuality}
              </span>
              <h3>{metric.label}</h3>
              <p>
                <strong>Current:</strong>{" "}
                {formatMetric(metric.currentValue, metric.unit)}
              </p>
              <p>
                <strong>Historical median:</strong>{" "}
                {formatMetric(metric.baselineMedian, metric.unit)} ·{" "}
                <strong>MAD:</strong>{" "}
                {formatMetric(metric.baselineMad, metric.unit)}
              </p>
              <p>
                <strong>Robust deviation:</strong>{" "}
                {metric.robustZ === null
                  ? "not comparable"
                  : metric.robustZ.toFixed(3)}
                {" · "}
                <strong>historical samples:</strong>{" "}
                {metric.historicalSamples}
              </p>
              <p>
                <strong>Budget:</strong> {metric.budgetStatus} ·{" "}
                <strong>regressed:</strong>{" "}
                {metric.regressed ? "yes" : "no"}
              </p>
              <p>{metric.method}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Predictive drivers</p>
            <h2>Why the review-priority index moved</h2>
          </div>
        </div>
        {model.predictiveRisk.drivers.length ? (
          <div className="reviewBatchList">
            {model.predictiveRisk.drivers.map((driver) => (
              <article className="reviewBatchSummary" key={driver.id}>
                <span className="reviewStatus">
                  {driver.category} · weight {driver.weight}
                </span>
                <h3>{driver.id}</h3>
                <p>{driver.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No elevated predictive-risk driver is present in the current
            measured evidence.
          </div>
        )}
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Advanced does not mean autonomous authority.</strong>
        <p>
          Anomaly detection and risk scoring run automatically, but every
          consequential response remains within the Build 357 supervised
          incident/recovery path and the existing source/Comms authority
          boundaries.
        </p>
      </section>
    </main>
  );
}
