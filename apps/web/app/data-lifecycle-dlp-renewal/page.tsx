import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild422Renewal} from "@/lib/build422-data-lifecycle-dlp-database";
export const dynamic="force-dynamic";
const pretty=(value:string)=>value.replaceAll("_"," ");
export default async function DataLifecycleDlpRenewalPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Fdata-lifecycle-dlp-renewal");
  const model=await readBuild422Renewal(session.user.id,new Date().toISOString());
  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 422 · Data Lifecycle, Retention, Deletion & DLP Renewal Assurance</p>
      <h1>Data Lifecycle, Retention, Deletion &amp; DLP Renewal Assurance</h1>
      <p className="lead">Renew data classification, encryption, redaction/minimization, retention/expiry, deletion evidence and export DLP across all seven applications and every governed directional relationship.</p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/tenant-consent-capability-renewal">Build 421 Renewal</Link>
        <Link className="secondaryButton" href="/master-security-certification">Security Certification</Link>
        <Link className="secondaryButton" href="/relationship-certification">Relationship Certification</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>
    <section className="dataQualityPolicyNote"><strong>{pretty(model.governanceState)}</strong><p>Missing, stale, synthetic or failed lifecycle evidence remains HOLD. Production GREEN never proves a source application deleted data, rotated a key, inspected an export or completed a live retention ceremony.</p></section>
    <section className="reviewSummary" aria-label="Build 422 renewal summary"><div className="commandMetrics">
      <article><strong>{model.counts.passedTotalSlots}/{model.counts.requiredTotalSlots}</strong><span>renewed checkpoints</span></article>
      <article><strong>{model.passedLocal.length}/{model.counts.requiredLocalSlots}</strong><span>local lifecycle controls</span></article>
      <article><strong>{model.passedDirectional.length}/{model.counts.requiredDirectionalSlots}</strong><span>directional DLP controls</span></article>
      <article><strong>{model.missingLocal.length+model.missingDirectional.length}</strong><span>missing</span></article>
      <article><strong>{model.staleLocal.length+model.staleDirectional.length}</strong><span>stale</span></article>
      <article><strong>{model.invalidLocal.length+model.invalidDirectional.length}</strong><span>invalid</span></article>
    </div></section>
    <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Feature completion scorecard</p><h2>Build 422 material completion movement</h2></div></div>
      <div className="commandMetrics">
        <article><strong>{model.completionScorecard.previousPercent}%</strong><span>reconstructed Build 421 baseline</span></article>
        <article><strong>{model.completionScorecard.currentPercent}%</strong><span>Build 422 estimate</span></article>
        <article><strong>+{model.completionScorecard.movementPercentagePoints}</strong><span>percentage points</span></article>
      </div>
      <p>This score uses 36 AI Data Platform-specific categories. It does not reuse the earlier sample business percentages, and it keeps live external/physical-host evidence separate from software maturity.</p>
    </section>
    <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Application-local controls</p><h2>Seven lifecycle dimensions per application</h2></div></div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">{model.appSummaries.map(item=><article className="reviewBatchSummary" key={item.appId}>
        <h3>{item.appId}</h3><p><strong>{item.passedLocal}/{item.requiredLocal}</strong> lifecycle controls renewed</p>
        <p>{item.missingLocal} missing · {item.staleLocal} stale · {item.invalidLocal} invalid</p>
        <p>{item.directionalOutboundPassed}/{item.directionalOutboundRequired} outbound DLP relationships renewed</p>
      </article>)}</div>
    </section>
    <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Renewal rules</p><h2>What Build 422 requires</h2></div></div>
      <div className="reviewBatchList">
        <article className="reviewBatchSummary"><h3>Classification + encryption</h3><p>All five data classes, fail-closed unknown classification, TLS, sensitive at-rest protection, secret-field protection and key material outside source control.</p></article>
        <article className="reviewBatchSummary"><h3>Retention + deletion</h3><p>Purpose-bound schedules, enforced expiry, explicit hold-or-delete handling, immutable deletion receipts and preserved legal holds.</p></article>
        <article className="reviewBatchSummary"><h3>DLP + cross-app transfer</h3><p>Export inspection, owner gates for restricted classes, consent preservation, secret-reference-only D4 transfer and cross-tenant exfiltration denial across all 28 directional relationships.</p></article>
      </div>
    </section>
    <section className="dataQualityPolicyNote"><strong>77 evidence checkpoints; 5–10 point release discipline preserved.</strong><p>Build 422 provides 49 application-local lifecycle slots plus 28 directional DLP renewal slots. The repository scorecard records a 5.5-point feature-completion movement. Live evidence must still be supplied independently.</p></section>
  </main>;
}
