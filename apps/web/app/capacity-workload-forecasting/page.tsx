import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildCapacityPlanningModel } from "@/lib/capacity-planning";
import { composeCapacityWorkloadForecast } from "@/lib/capacity-workload-forecasting";
import { listPerformanceObservatoryForUser } from "@/lib/performance-observatory-database";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + " MB";
  return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatValue(value: number, unit: string) {
  return unit === "bytes" ? formatBytes(value) : value.toLocaleString("en-CA");
}

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function CapacityWorkloadForecastingPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fcapacity-workload-forecasting");
  }

  const params = await searchParams;
  const [review, observatory] = await Promise.all([
    buildProductionLearningReview(session.user.id),
    listPerformanceObservatoryForUser(session.user.id)
  ]);

  const capacity = buildCapacityPlanningModel(
    review.evidence,
    params.scenario
  );
  const model = composeCapacityWorkloadForecast({
    capacity,
    observatory
  });

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 356 · Moderate Controls</p>
        <h1>Capacity, Workload, Resource &amp; Demand Forecasting</h1>
        <p className="lead">
          Project measured workload into bounded demand scenarios, combine it
          with current performance pressure, and identify where we should
          measure, optimize or plan before changing capacity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/capacity-planning">
            Capacity Planning
          </Link>
          <Link className="secondaryButton" href="/performance-observatory">
            Performance Observatory
          </Link>
          <Link className="secondaryButton" href="/performance-optimization-control-plane">
            Performance Optimization
          </Link>
          <Link className="secondaryButton" href="/cross-application-control-center">
            Cross-Application Control
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Demand forecast, not a hard-capacity claim.</strong>
        <p>
          The forecast uses measured operational proxies. Provider quotas,
          server ceilings, staffing limits and source-application capacity are
          not invented. Until an authoritative limit is imported, true
          headroom remains unknown.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Scenario</p>
            <h2>{model.scenario.label}</h2>
          </div>
        </div>
        <div className="heroActions">
          {capacity.scenarios.map((scenario) => (
            <Link
              key={scenario.id}
              className={
                scenario.id === model.scenario.id
                  ? "primaryLink"
                  : "secondaryButton"
              }
              href={
                "/capacity-workload-forecasting?scenario=" +
                encodeURIComponent(scenario.id)
              }
            >
              {scenario.label}
            </Link>
          ))}
        </div>
        <p>{model.scenario.description}</p>
      </section>

      <section className="reviewSummary" aria-label="Forecast summary">
        <div className="commandMetrics">
          <article><strong>{model.summary.forecastDimensions}</strong><span>demand dimensions</span></article>
          <article><strong>{model.summary.critical}</strong><span>critical</span></article>
          <article><strong>{model.summary.attention}</strong><span>attention</span></article>
          <article><strong>{model.summary.nominal}</strong><span>nominal</span></article>
          <article><strong>{model.performanceContext.maxPoolWaiting}</strong><span>max pool waiting</span></article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Forecast ranking</p>
            <h2>Where demand pressure needs attention</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.ranked.map((forecast) => (
            <article className="reviewBatchSummary" key={forecast.key}>
              <span
                className={
                  "reviewStatus reviewStatus--" +
                  stateClass(forecast.pressure)
                }
              >
                {forecast.pressure}
              </span>
              <h3>{forecast.label}</h3>
              <p>
                <strong>Current:</strong>{" "}
                {formatValue(forecast.current, forecast.unit)}
              </p>
              <p>
                <strong>{model.scenario.label} demand:</strong>{" "}
                {formatValue(forecast.forecast, forecast.unit)}
              </p>
              <p>
                <strong>Growth delta:</strong>{" "}
                {formatValue(forecast.delta, forecast.unit)}
              </p>
              <p>
                <strong>Known hard capacity:</strong> unknown ·{" "}
                <strong>headroom known:</strong> no
              </p>
              <p><strong>Guidance:</strong> {forecast.recommendation}</p>
              <p><strong>Recheck:</strong> {forecast.recheckTrigger}</p>
              <Link className="secondaryButton" href={forecast.sourceHref}>
                Open source evidence
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>No automatic capacity action.</strong>
        <p>
          This build does not scale infrastructure, buy services, upgrade
          providers, change staffing, alter schedules, delete retention rows or
          mutate source applications. Any change remains owner/operator
          approved, validated against fresh evidence and reversible.
        </p>
      </section>
    </main>
  );
}
