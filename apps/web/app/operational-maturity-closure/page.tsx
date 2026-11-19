import {headers} from "next/headers";import Link from "next/link";import {redirect} from "next/navigation";import {auth} from "@/lib/auth";import {readBuild424ForUser} from "@/lib/build424-database";
export const dynamic="force-dynamic";
export default async function OperationalMaturityClosurePage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/sign-in?callbackUrl=%2Foperational-maturity-closure");
 const m=await readBuild424ForUser(session.user.id);
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 424 · Operational Maturity Closure, Security Renewal & Next Roadmap Ceremony</p>
   <h1>Operational maturity closure with an honest path to 100%</h1>
   <p className="lead">Close only evidence-proven maturity targets, renew seven-application security and relationship assurance, and publish the next owner-gated roadmap without turning Production GREEN into fake live evidence.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/operator-production-ceremony">Build 423 Ceremony</Link><Link className="secondaryButton" href="/master-security-certification">Security Certification</Link><Link className="secondaryButton" href="/master-sysop">Master Sysop</Link><Link className="secondaryButton" href="/runbooks">Runbooks</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>{m.governanceState.replaceAll("_"," ")}</strong><p>Software maturity is 95.8%. Live signer/token enrollment, transport verification and physical reboot witness remain separate closure evidence and may keep the operational state on HOLD.</p></section>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{m.counts.requiredLocalSlots-m.missingLocal.length-m.invalidLocal.length}/{m.counts.requiredLocalSlots}</strong><span>local maturity renewals</span></article>
   <article><strong>{m.counts.requiredDirectionalSlots-m.missingRelationships.length-m.invalidRelationships.length}/{m.counts.requiredDirectionalSlots}</strong><span>relationship renewals</span></article>
   <article><strong>{m.counts.requiredRoadmapSlots-m.missingRoadmap.length-m.invalidRoadmap.length}/{m.counts.requiredRoadmapSlots}</strong><span>roadmap ceremony slots</span></article>
   <article><strong>{m.counts.totalCheckpoints}</strong><span>total checkpoints</span></article>
  </div></section>
  <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Completion scorecard</p><h2>Formal Build 422 baseline → Build 424 closure</h2></div></div>
   <div className="commandMetrics"><article><strong>{m.completionScorecard.previousFormalPercent}%</strong><span>formal baseline</span></article><article><strong>{m.completionScorecard.currentPercent}%</strong><span>Build 424 software maturity</span></article><article><strong>+{m.completionScorecard.movementPercentagePoints}</strong><span>percentage points</span></article><article><strong>{m.completionScorecard.remainingTo100PercentagePoints}</strong><span>points remaining to 100</span></article></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>No automatic Build 425 under the current denominator.</strong><p>At 95.8%, only 4.2 percentage points remain. A future numbered build cannot satisfy the standing 5–10 point rule unless the denominator is deliberately re-baselined first. The remaining work belongs in the evidence-based Pathway to 100% closure program.</p></section>
 </main>;
}
