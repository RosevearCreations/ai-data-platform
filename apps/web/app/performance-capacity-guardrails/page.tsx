import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild419PerformanceCapacityUsage} from "@/lib/build419-performance-capacity-database";

export const dynamic="force-dynamic";
const pretty=(value:string)=>value.replaceAll("_"," ");

export default async function PerformanceCapacityGuardrailsPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Fperformance-capacity-guardrails");
  const model=await readBuild419PerformanceCapacityUsage(session.user.id,new Date().toISOString());
  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 419 · Performance, Capacity & Vercel Guardrails</p>
      <h1>Shared Performance Budgets, Capacity Forecasting & Deployment Usage</h1>
      <p className="lead">
        Coordinate measured performance and demand evidence across all seven applications while
        preserving independent releases and reducing duplicate Vercel deployment work.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/performance-baseline">Performance Baseline</Link>
        <Link className="secondaryButton" href="/capacity-workload-forecasting">Capacity Forecasting</Link>
        <Link className="secondaryButton" href="/recovery-rollback-certification">Recovery & Rollback</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>
    <section className="dataQualityPolicyNote">
      <strong>{pretty(model.governanceState)}</strong>
      <p>
        Vercel plan quotas and billing are not invented. Hosted applications require explicit
        owner-defined 24-hour budgets; non-Vercel applications are recorded as not applicable.
      </p>
    </section>
    <section className="reviewSummary">
      <div className="commandMetrics">
        <article><strong>{model.counts.admittedPerformanceSlots}/{model.counts.requiredPerformanceSlots}</strong><span>performance slots</span></article>
        <article><strong>{model.counts.capacityForecastReceipts}/7</strong><span>capacity forecasts</span></article>
        <article><strong>{model.counts.vercelHostingDispositions}/7</strong><span>hosting dispositions</span></article>
        <article><strong>{model.counts.hostedOnVercel}</strong><span>Vercel-hosted apps evidenced</span></article>
        <article><strong>{model.counts.warningPerformance+model.counts.criticalPerformance}</strong><span>performance attention</span></article>
        <article><strong>{model.counts.warningVercel+model.counts.criticalVercel}</strong><span>deployment-budget attention</span></article>
      </div>
    </section>
    <section className="reviewQueue">
      <div className="sectionHeading"><div><p className="eyebrow">Shared performance</p><h2>Seven applications × five performance domains</h2></div></div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        <article className="reviewBatchSummary"><h3>Missing performance evidence</h3><p>{model.missingPerformance.length}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid performance evidence</h3><p>{model.invalidPerformance.length}</p></article>
        <article className="reviewBatchSummary"><h3>Critical budgets</h3><p>{model.counts.criticalPerformance}</p></article>
        <article className="reviewBatchSummary"><h3>Warning budgets</h3><p>{model.counts.warningPerformance}</p></article>
      </div>
    </section>
    <section className="reviewQueue">
      <div className="sectionHeading"><div><p className="eyebrow">Capacity & deployment usage</p><h2>Evidence-driven headroom and deployment efficiency</h2></div></div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        <article className="reviewBatchSummary"><h3>Missing capacity forecasts</h3><p>{model.missingCapacity.length}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid capacity forecasts</h3><p>{model.invalidCapacity.length}</p></article>
        <article className="reviewBatchSummary"><h3>Missing hosting dispositions</h3><p>{model.missingVercelDisposition.length}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid usage evidence</h3><p>{model.invalidVercelDisposition.length}</p></article>
        <article className="reviewBatchSummary"><h3>Vercel critical</h3><p>{model.counts.criticalVercel}</p></article>
        <article className="reviewBatchSummary"><h3>Vercel warning</h3><p>{model.counts.warningVercel}</p></article>
      </div>
    </section>
    <section className="dataQualityPolicyNote">
      <strong>Deployment efficiency without false limits.</strong>
      <p>
        Reuse an already validated exact-SHA preview instead of creating repeated previews for the
        same commit. Production migrations remain forbidden on previews. Build 419 observes and
        advises; it does not automatically block merges, buy capacity, scale infrastructure or change providers.
      </p>
    </section>
  </main>;
}
