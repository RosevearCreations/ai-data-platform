import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EvidenceFreshnessRenewalActions } from "@/components/evidence-freshness-renewal-actions";
import { auth } from "@/lib/auth";
import { listBuild415FreshnessDashboard } from "@/lib/build415-evidence-freshness-database";
import { build415FreshnessSummary } from "@/lib/master-evidence-freshness-renewal";

export const dynamic = "force-dynamic";

export default async function EvidenceFreshnessPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fevidence-freshness");

  const nowIso = new Date().toISOString();
  const [model,summary] = await Promise.all([
    listBuild415FreshnessDashboard(session.user.id,nowIso),
    Promise.resolve(build415FreshnessSummary())
  ]);

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 415 · Live Evidence Freshness</p>
        <h1>Expiry SLA, Evidence Aging & Cross-Application Renewal</h1>
        <p className="lead">
          Monitor bounded freshness windows across all seven applications and
          queue source-owned renewal work before evidence expires. Renewal
          requests never convert stale, missing or expired evidence into success.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/acceleration-closure">Build 414 Closure</Link>
          <Link className="secondaryButton" href="/module-health-intelligence">Module Health</Link>
          <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 415 freshness summary">
        <div className="commandMetrics">
          <article><strong>{model.counts.required}</strong><span>freshness slots</span></article>
          <article><strong>{model.counts.fresh}</strong><span>fresh</span></article>
          <article><strong>{model.counts.dueSoon + model.counts.dueNow}</strong><span>renewal due</span></article>
          <article><strong>{model.counts.expired + model.counts.missing + model.counts.invalid}</strong><span>expired / missing / invalid</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>{model.governanceState}</strong>
        <p>
          Evidence state is calculated from its signed observation window and
          domain SLA. Production GREEN, a renewal queue entry or an alert can
          never make evidence fresh.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SLA policy</p>
            <h2>Seven bounded evidence domains</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {summary.policies.map((policy)=>(
            <article className="reviewBatchSummary" key={policy.evidenceDomain}>
              <h3>{policy.evidenceDomain.replaceAll("_"," ")}</h3>
              <p>Fresh for at most {policy.maxFreshHours}h · renewal lead {policy.renewalLeadHours}h · urgent at {policy.urgentLeadHours}h.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Live aging matrix</p>
            <h2>Seven applications × seven evidence domains</h2>
          </div>
        </div>
        <div className="masterGovernanceGrid">
          {model.slots.map((slot)=>(
            <article className="reviewBatchSummary" key={slot.appId+"-"+slot.evidenceDomain}>
              <span className="reviewStatus">{slot.state}</span>
              <h3>{slot.appId}</h3>
              <p>{slot.evidenceDomain.replaceAll("_"," ")}</p>
              <p>
                {slot.hoursRemaining === null
                  ? "No valid expiry window."
                  : slot.hoursRemaining.toFixed(2)+" hours remaining."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <EvidenceFreshnessRenewalActions />
    </main>
  );
}
