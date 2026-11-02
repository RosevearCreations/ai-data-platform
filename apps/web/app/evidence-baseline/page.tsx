import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildHardeningAudit } from "@/lib/hardening-audit";
import { buildOperatorAttentionCenter } from "@/lib/operator-attention";
import { buildProductionEvidenceBaseline } from "@/lib/production-evidence-baseline";
import { buildProductionLearningReview } from "@/lib/production-learning-database";
import { buildSystemReliabilityDashboard } from "@/lib/system-reliability";

export const dynamic = "force-dynamic";

export default async function EvidenceBaselinePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fevidence-baseline");

  const [review, hardening, reliability, attention] = await Promise.all([
    buildProductionLearningReview(session.user.id),
    Promise.resolve(buildHardeningAudit()),
    buildSystemReliabilityDashboard(session.user.id),
    buildOperatorAttentionCenter(session.user.id)
  ]);

  const baseline = buildProductionEvidenceBaseline({
    findings: review.findings,
    renewalGaps: review.renewal.evidenceGaps,
    adoption: review.evidence.adoption,
    trend: review.evidence.trend,
    workspaces: review.evidence.workspaces,
    hardeningItems: hardening.items,
    reliabilitySignals: reliability.signals,
    reliabilityTotals: reliability.totals,
    attentionItems: attention.items,
    attentionCounts: attention.counts
  });

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 273 · Evidence-driven batch baseline</p>
        <h1>Production Evidence Baseline &amp; Owner Finding Triage</h1>
        <p className="lead">
          One working baseline for Builds 274–279. Current measured gaps stay active, completed controls stay
          validated, and old build-era findings are kept as historical context instead of silently remaining in the
          operating queue.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/owner-acceptance">Owner Acceptance</Link>
          <Link className="secondaryButton" href="/production-learning">Production Learning IV</Link>
          <Link className="secondaryButton" href="/attention">Attention Center</Link>
          <Link className="secondaryButton" href="/system-reliability">System Reliability</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Production evidence baseline summary">
        <div className="commandMetrics">
          <article><strong>{baseline.counts.active}</strong><span>active findings</span></article>
          <article><strong>{baseline.counts.validated}</strong><span>validated controls/findings</span></article>
          <article><strong>{baseline.counts.historical}</strong><span>historical findings separated</span></article>
          <article><strong>{baseline.counts.criticalReliability}</strong><span>critical reliability signals</span></article>
          <article><strong>{baseline.counts.attentionItems}</strong><span>Attention Center items</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 273 baseline rule</strong>
        <p>
          Deployment success is not operational acceptance. Active findings close only when their measurable exit
          criterion is met or an explicit authorization/dependency blocker is recorded. Historical findings cannot
          re-enter the active queue without fresh measured evidence.
        </p>
      </section>

      <section className="reviewQueue" aria-labelledby="build-exit-criteria">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Builds 274–279</p>
            <h2 id="build-exit-criteria">Measurable exit criteria</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {baseline.exitCriteria.map((criterion) => (
            <article className="reviewBatchSummary" key={criterion.build}>
              <div>
                <span className="reviewStatus">{criterion.met ? "MET" : "OPEN"}</span>
                <h3>Build {criterion.build} — {criterion.title}</h3>
                <p><strong>Exit criterion:</strong> {criterion.criterion}</p>
                <p><strong>Current evidence:</strong> {criterion.currentEvidence}</p>
                <Link className="textLink" href={criterion.href}>Open source evidence →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="active-triage">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Owner finding triage</p>
            <h2 id="active-triage">Active operating findings</h2>
          </div>
        </div>
        {baseline.items.some((item) => item.disposition === "active") ? (
          <div className="reviewBatchList">
            {baseline.items.filter((item) => item.disposition === "active").map((item) => (
              <article className="reviewBatchSummary" key={item.id}>
                <div>
                  <span className="reviewStatus">{item.status}</span>
                  <h3>{item.title}</h3>
                  <p>{item.evidence}</p>
                  <p><strong>Owner:</strong> {item.owner}</p>
                  <p><strong>Next action:</strong> {item.action}</p>
                  <p><strong>Queue:</strong> {item.targetBuild ? "Build " + String(item.targetBuild) : "No active target"}</p>
                  <Link className="textLink" href={item.href}>Open evidence source →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState"><p>No active measured findings are visible to this account.</p></div>
        )}
      </section>

      <section className="reviewQueue" aria-labelledby="validated-triage">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Regression baseline</p>
            <h2 id="validated-triage">Validated findings and controls</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {baseline.items.filter((item) => item.disposition === "validated").map((item) => (
            <article className="reviewBatchSummary" key={item.id}>
              <div>
                <span className="reviewStatus">{item.status}</span>
                <h3>{item.title}</h3>
                <p>{item.evidence}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="historical-triage">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Legacy separation</p>
            <h2 id="historical-triage">Historical findings</h2>
          </div>
        </div>
        {baseline.items.some((item) => item.disposition === "historical") ? (
          <div className="reviewBatchList">
            {baseline.items.filter((item) => item.disposition === "historical").map((item) => (
              <article className="reviewBatchSummary" key={item.id}>
                <div>
                  <span className="reviewStatus">historical</span>
                  <h3>{item.title}</h3>
                  <p>{item.evidence}</p>
                  <p>{item.action}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState"><p>No historical-only findings remain in the baseline.</p></div>
        )}
      </section>
    </main>
  );
}
