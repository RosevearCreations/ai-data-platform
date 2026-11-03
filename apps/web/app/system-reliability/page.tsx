import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildProductionLearningReview } from "@/lib/production-learning-database";
import { buildReliabilityTrendReview } from "@/lib/reliability-trend-review";
import { buildSystemReliabilityDashboard } from "@/lib/system-reliability";

import { SystemReliabilityDashboard } from "./SystemReliabilityDashboard";

export const dynamic = "force-dynamic";

export default async function SystemReliabilityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fsystem-reliability");

  const [model, learning] = await Promise.all([
    buildSystemReliabilityDashboard(session.user.id),
    buildProductionLearningReview(session.user.id)
  ]);
  const trend = buildReliabilityTrendReview({
    evidence: learning.evidence,
    reliability: model
  });

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--systemStatus">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 279 · Build 263 reliability evidence retained</p>
        <h1>Reliability Trend Validation, Failure Patterns &amp; Recovery Readiness</h1>
        <p className="lead">
          Compare renewed operating evidence with the durable Production Learning
          baseline, classify recurring failure patterns and keep recovery guidance
          explicit without creating synthetic incidents or running automatic retries.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/audit-evidence">
            Audit &amp; Evidence
          </Link>
          <Link className="secondaryButton" href="/attention">
            Attention Center
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production Learning
          </Link>
          <a className="secondaryButton" href="/api/system-reliability/trends">
            Trend evidence JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote" id="build279-reliability-trend">
        <strong>
          Build 279 exit criterion: {trend.exitCriterion.met ? "MET" : "OPEN"}
        </strong>
        <p>{trend.exitCriterion.label}</p>
        <p>
          <strong>Current evidence:</strong> {trend.exitCriterion.evidence}
        </p>
        <p>
          No automatic retry, remediation or synthetic production incident is used
          to close this criterion.
        </p>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{trend.baseline.snapshots}</strong>
            <span>durable baseline snapshots</span>
          </article>
          <article>
            <strong>{trend.totals.currentCriticalSignals}</strong>
            <span>current critical signals</span>
          </article>
          <article>
            <strong>{trend.totals.recurringPatterns}</strong>
            <span>recurring failure patterns</span>
          </article>
          <article>
            <strong>{trend.totals.unclassifiedCriticalConditions}</strong>
            <span>unclassified critical conditions</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Durable comparison</p>
            <h2>Reliability trend baseline</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {trend.metrics.map((item) => (
            <article className="reviewBatchSummary" key={item.id}>
              <div>
                <span className="reviewStatus">{item.direction}</span>
                <h3>{item.label}</h3>
                <p>
                  Baseline: <strong>{item.baseline ?? "not comparable"}</strong> ·
                  Current: <strong>{item.current}</strong>
                  {item.delta === null ? "" : " · Delta: " + item.delta}
                </p>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Failure patterns</p>
            <h2>Recovery readiness</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {trend.failurePatterns.length ? (
            trend.failurePatterns.map((item) => (
              <article className="reviewBatchSummary" key={item.id}>
                <div>
                  <span className="reviewStatus">
                    {item.recurring ? "recurring" : "observed once"}
                  </span>
                  <h3>{item.area}</h3>
                  <p>
                    {item.count} exception(s) · {item.criticalCount} critical ·{" "}
                    {item.classified ? "classified" : "classification required"}
                  </p>
                  <p>{item.detail}</p>
                  <p>
                    <strong>Recovery action:</strong>{" "}
                    {item.recoveryAction ??
                      "Classify the condition before any retry is attempted."}
                  </p>
                  <div className="heroActions">
                    <Link className="secondaryButton" href={item.href}>
                      Inspect source evidence
                    </Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="emptyState">
              No current reliability exception pattern is present in the authorized
              evidence.
            </div>
          )}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Evidence-based status only.</strong>
        <p>
          Healthy, attention and critical states are derived from current probes and
          durable operational evidence. Build 279 compares them with the existing
          Production Learning baseline and preserves all source-specific gates.
        </p>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.database.reachable ? "Reachable" : "Unavailable"}</strong>
            <span>database · {model.database.latencyMs} ms</span>
          </article>
          <article>
            <strong>{model.database.authorizedWorkspaces}</strong>
            <span>authorized workspaces</span>
          </article>
          <article>
            <strong>{model.runtime.collectionRuntimeReady ? "Ready" : "Fail-closed"}</strong>
            <span>collection runtime</span>
          </article>
          <article>
            <strong>{model.runtime.globalKillSwitchActive ? "Active" : "Inactive"}</strong>
            <span>global kill switch</span>
          </article>
        </div>
      </section>

      <SystemReliabilityDashboard model={model} />
    </main>
  );
}
