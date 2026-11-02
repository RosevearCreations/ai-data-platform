import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildCapacityPlanningModel } from "@/lib/capacity-planning";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

import { HelpInfo } from "../help/HelpInfo";

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

export default async function CapacityPlanningPage({
  searchParams
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fcapacity-planning");

  const params = await searchParams;
  const review = await buildProductionLearningReview(session.user.id);
  const model = buildCapacityPlanningModel(review.evidence, params.scenario);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <HelpInfo topic="learning-overview" />
        <p className="eyebrow">Build 270</p>
        <h1>Capacity, Cost &amp; Usage Planning</h1>
        <p className="lead">
          Turn measured Production Learning cost proxies into practical capacity forecasts for storage,
          records, provider units, collection frequency, integration volume and retention workload.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/production-learning">Production Learning</Link>
          <Link className="secondaryButton" href="/reporting">Reporting Studio</Link>
          <Link className="secondaryButton" href="/retention">Retention Governance</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Planning estimate — not a bill</strong>
        <p>
          These forecasts multiply existing governed usage evidence. No provider price list, invoice,
          subscription charge or currency conversion is imported or applied. Actual billing remains
          outside this planning model.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div><p className="eyebrow">Scenario</p><h2>{model.scenario.label}</h2></div>
        </div>
        <div className="heroActions">
          {model.scenarios.map((scenario) => (
            <Link
              key={scenario.id}
              className={scenario.id === model.scenario.id ? "primaryLink" : "secondaryButton"}
              href={"/capacity-planning?scenario=" + encodeURIComponent(scenario.id)}
            >
              {scenario.label}
            </Link>
          ))}
        </div>
        <p>{model.scenario.description}</p>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{formatBytes(model.forecastTotals.storageBytes)}</strong><span>forecast storage</span></article>
          <article><strong>{model.forecastTotals.recordVolume.toLocaleString("en-CA")}</strong><span>forecast records</span></article>
          <article><strong>{model.forecastTotals.providerUnits.toLocaleString("en-CA")}</strong><span>forecast provider units</span></article>
          <article><strong>{model.forecastTotals.integrationEvents.toLocaleString("en-CA")}</strong><span>forecast integration events</span></article>
        </div>
      </section>

      {model.workspaces.map((workspace) => (
        <section className="reviewQueue" key={workspace.workspaceId}>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">{workspace.role} workspace</p>
              <h2>{workspace.workspaceName}</h2>
            </div>
          </div>
          <div className="reviewBatchList">
            {workspace.metrics.map((metric) => (
              <article className="reviewBatchSummary" key={metric.key}>
                <div>
                  <span className="reviewStatus reviewStatus-approved">{metric.unit}</span>
                  <h3>{metric.label}</h3>
                  <p><strong>Current:</strong> {formatValue(metric.current, metric.unit)}</p>
                  <p><strong>{model.scenario.label} forecast:</strong> {formatValue(metric.forecast, metric.unit)}</p>
                  <p>{metric.detail}</p>
                  <Link className="secondaryButton" href={metric.sourceHref}>Open source evidence</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
