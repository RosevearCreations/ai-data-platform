import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildHardeningAudit } from "@/lib/hardening-audit";
import { buildOperatorAttentionCenter } from "@/lib/operator-attention";
import { buildProductionEvidenceBaseline } from "@/lib/production-evidence-baseline";
import { buildProductionLearningReview } from "@/lib/production-learning-database";
import { buildProductionLearningVReview } from "@/lib/production-learning-v";
import { buildReliabilityTrendReview } from "@/lib/reliability-trend-review";
import { buildSystemReliabilityDashboard } from "@/lib/system-reliability";

export const dynamic = "force-dynamic";

export default async function OwnerAcceptancePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell reviewShell">
        <section className="hero reviewHero">
          <p className="eyebrow">Build 280</p>
          <h1>Production Learning V, Owner Acceptance &amp; Next-Batch Renewal</h1>
          <p className="lead">
            Sign in to reconcile the completed 273–280 evidence cycle and review
            any evidence-backed renewal candidates.
          </p>
          <div className="heroActions">
            <Link className="primaryLink" href="/sign-in">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [review, reliability, attention] = await Promise.all([
    buildProductionLearningReview(session.user.id),
    buildSystemReliabilityDashboard(session.user.id),
    buildOperatorAttentionCenter(session.user.id)
  ]);
  const hardening = buildHardeningAudit();

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

  const reliabilityTrend = buildReliabilityTrendReview({
    evidence: review.evidence,
    reliability
  });

  const cycle = buildProductionLearningVReview({
    baseline,
    reliabilityTrend,
    findings: review.findings
  });

  const unresolved = cycle.criteria.filter((item) => item.state !== "closed");
  const historical = cycle.findings.filter(
    (item) => item.state === "historical-removed"
  );

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 280 · 273–280 cycle renewal checkpoint</p>
        <h1>Production Learning V, Owner Acceptance &amp; Next-Batch Renewal</h1>
        <p className="lead">
          Reconcile every Build 273–279 criterion against current authorized
          evidence, separate true gaps from explicit blockers, remove stale
          historical follow-up from the active queue, and leave any next batch
          unnumbered until the owner explicitly authorizes it.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/evidence-baseline">
            Build 273 Evidence Baseline
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production Learning V
          </Link>
          <Link className="secondaryButton" href="/system-reliability">
            Build 279 Reliability
          </Link>
          <a
            className="secondaryButton"
            href="/api/owner-acceptance/production-learning-v"
          >
            Build 280 evidence JSON
          </a>
        </div>
        <p className="srOnly">
          Historical checkpoint: Owner Acceptance, Legacy Cleanup &amp; Production Learning IV
        </p>
      </section>

      <section className="reviewSummary" aria-label="Build 280 owner acceptance summary">
        <div className="commandMetrics">
          <article>
            <strong>{cycle.summary.criteriaClosed}/7</strong>
            <span>Build 273–279 criteria closed</span>
          </article>
          <article>
            <strong>{cycle.summary.criteriaBlocked}</strong>
            <span>dependency-blocked criteria</span>
          </article>
          <article>
            <strong>{cycle.summary.criteriaOpen}</strong>
            <span>measured criteria still open</span>
          </article>
          <article>
            <strong>{cycle.summary.historicalRemoved}</strong>
            <span>historical findings removed from active queue</span>
          </article>
          <article>
            <strong>{cycle.summary.renewalCandidates}</strong>
            <span>unnumbered renewal candidates</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>
          Build 280 reconciliation criterion: {cycle.exitCriterion.met ? "MET" : "OPEN"}
        </strong>
        <p>{cycle.exitCriterion.label}</p>
        <p>
          <strong>Current evidence:</strong> {cycle.exitCriterion.evidence}
        </p>
      </section>

      <section className="reviewQueue" aria-labelledby="cycle-criteria">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Production Learning V</p>
            <h2 id="cycle-criteria">Build 273–279 criterion reconciliation</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {cycle.criteria.map((criterion) => (
            <article className="reviewBatchSummary" key={criterion.build}>
              <div>
                <span className="reviewStatus">{criterion.state}</span>
                <h3>
                  Build {criterion.build} — {criterion.title}
                </h3>
                <p>
                  <strong>Criterion:</strong> {criterion.criterion}
                </p>
                <p>
                  <strong>Current evidence:</strong> {criterion.evidence}
                </p>
                {criterion.blocker ? (
                  <p>
                    <strong>Explicit blocker:</strong> {criterion.blocker}
                  </p>
                ) : null}
                <Link className="textLink" href={criterion.href}>
                  Open source evidence →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="renewal-candidates">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Next-batch renewal</p>
            <h2 id="renewal-candidates">Evidence-backed candidates only</h2>
          </div>
        </div>
        {cycle.renewalCandidates.length ? (
          <div className="reviewBatchList">
            {cycle.renewalCandidates.map((candidate) => (
              <article className="reviewBatchSummary" key={candidate.key}>
                <div>
                  <span className="reviewStatus">candidate · unnumbered</span>
                  <h3>{candidate.title}</h3>
                  <p>{candidate.rationale}</p>
                  <p>
                    <strong>Evidence:</strong> {candidate.evidence}
                  </p>
                  <Link className="textLink" href={candidate.href}>
                    Inspect evidence →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>
              No unresolved measured evidence currently requires a next-batch
              candidate. Continue regression monitoring until new evidence appears.
            </p>
          </div>
        )}
      </section>

      {unresolved.length ? (
        <section className="dataQualityPolicyNote">
          <strong>Unresolved does not mean failed deployment.</strong>
          <p>
            {unresolved.length} criterion/criteria remain open or blocked. They stay
            visible until real evidence or the missing authorization/dependency changes.
          </p>
        </section>
      ) : null}

      {historical.length ? (
        <section className="dataQualityPolicyNote">
          <strong>Historical queue cleanup</strong>
          <p>
            {historical.length} historical-only finding(s) are excluded from active
            follow-up. Fresh measured evidence is required before any can re-enter
            the operating queue.
          </p>
        </section>
      ) : null}

      <section className="dataQualityPolicyNote">
        <strong>Owner acceptance remains explicit.</strong>
        <p>
          Deployment, CI success and Vercel readiness do not automatically accept
          production evidence or authorize an external connection. QL-266 remains
          UNDER_REVIEW, REVIEW_DEFERRED and DISCONNECTED.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Roadmap state: renewal checkpoint</strong>
        <p>
          The owner-authorized Builds 273–280 batch is the completed cycle under
          review. No numbered Builds 281+ batch is authorized automatically.
          Renewal candidates remain unnumbered until a separate explicit owner decision.
        </p>
      </section>
    </main>
  );
}
