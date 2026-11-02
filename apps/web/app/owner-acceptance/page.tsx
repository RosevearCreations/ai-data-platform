import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildHardeningAudit } from "@/lib/hardening-audit";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

export const dynamic = "force-dynamic";

export default async function OwnerAcceptancePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell reviewShell">
        <section className="hero reviewHero">
          <p className="eyebrow">Build 272</p>
          <h1>Owner Acceptance</h1>
          <p className="lead">Sign in to review current production evidence and the roadmap renewal checkpoint.</p>
          <div className="heroActions"><Link className="primaryLink" href="/sign-in">Sign in</Link></div>
        </section>
      </main>
    );
  }

  const [review, hardening] = await Promise.all([
    buildProductionLearningReview(session.user.id),
    Promise.resolve(buildHardeningAudit())
  ]);

  const actionFindings = review.findings.filter((finding) => finding.status === "action").length;
  const watchFindings = review.findings.filter((finding) => finding.status === "watch" || finding.status === "gap").length;
  const evidenceGaps = review.renewal.evidenceGaps.length;
  const hardenedChecks = hardening.items.filter((item) => item.status === "hardened").length;

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 272 · Renewal checkpoint</p>
        <h1>Owner Acceptance, Legacy Cleanup &amp; Production Learning IV</h1>
        <p className="lead">
          Review the current measured platform state after the 254–272 roadmap cycle. This checkpoint does not
          invent Builds 273+; the next batch must come from owner findings and current operational evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/production-learning">Production Learning IV</Link>
          <Link className="secondaryButton" href="/hardening">Hardening Audit</Link>
          <Link className="secondaryButton" href="/system-reliability">System Reliability</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Owner acceptance summary">
        <div className="commandMetrics">
          <article><strong>{review.evidence.workspaces.length}</strong><span>authorized workspaces reviewed</span></article>
          <article><strong>{actionFindings}</strong><span>action findings</span></article>
          <article><strong>{watchFindings}</strong><span>watch / gap findings</span></article>
          <article><strong>{evidenceGaps}</strong><span>renewal evidence gaps</span></article>
          <article><strong>{hardenedChecks}/{hardening.items.length}</strong><span>hardening checks covered</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner acceptance rule</strong>
        <p>
          Production status is evidence-based. A successful deployment does not convert missing operational evidence
          into a pass, and this checkpoint does not automatically authorize external integrations or deferred gates.
        </p>
      </section>

      <section className="reviewQueue" aria-labelledby="acceptance-findings">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Production Learning IV</p>
            <h2 id="acceptance-findings">Current findings</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {review.findings.map((finding) => (
            <article className="reviewBatchSummary" key={finding.key}>
              <div>
                <span className="reviewStatus">{finding.status}</span>
                <h3>{finding.title}</h3>
                <p>{finding.evidence}</p>
                <p><strong>Next action:</strong> {finding.action}</p>
                <p><strong>Owner:</strong> {finding.owner}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue" aria-labelledby="acceptance-gaps">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Roadmap renewal</p>
            <h2 id="acceptance-gaps">Evidence gaps before Builds 273+</h2>
          </div>
        </div>
        {review.renewal.evidenceGaps.length ? (
          <div className="reviewBatchList">
            {review.renewal.evidenceGaps.map((gap) => (
              <article className="reviewBatchSummary" key={gap}>
                <div><span className="reviewStatus">watch</span><p>{gap}</p></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState"><p>No unresolved renewal evidence gaps are visible to this account.</p></div>
        )}
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Roadmap state: renewal checkpoint</strong>
        <p>
          No speculative Build 273+ queue is created by Build 272. The next batch should be defined only after owner
          acceptance findings, live usage, reliability evidence and measured operational gaps are reviewed.
        </p>
      </section>
    </main>
  );
}
