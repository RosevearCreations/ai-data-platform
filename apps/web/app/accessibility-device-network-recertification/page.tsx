import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild420Recertification} from "@/lib/build420-accessibility-device-database";

export const dynamic="force-dynamic";
const pretty=(value:string)=>value.replaceAll("_"," ");

export default async function AccessibilityDeviceNetworkRecertificationPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Faccessibility-device-network-recertification");
  const model=await readBuild420Recertification(session.user.id,new Date().toISOString());
  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 420 · Accessibility, Device & Degraded-Network Re-Certification</p>
      <h1>Accessibility, Device &amp; Degraded-Network Re-Certification</h1>
      <p className="lead">
        Re-certify desktop, tablet, mobile, keyboard/focus, contrast, reduced motion,
        loading/error states, offline/degraded-network behavior and recovery across all seven applications.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/hardening">Hardening Audit</Link>
        <Link className="secondaryButton" href="/role-device-acceptance">Role / Device Acceptance</Link>
        <Link className="secondaryButton" href="/acceptance-advancement">Seven-App Acceptance</Link>
        <Link className="secondaryButton" href="/performance-capacity-guardrails">Performance & Usage Guardrails</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>{pretty(model.governanceState)}</strong>
      <p>
        Production GREEN does not certify accessibility or degraded-network behavior.
        Only fresh, source-owned, owner-reviewed and independently verified evidence can pass a slot.
      </p>
    </section>

    <section className="reviewSummary" aria-label="Build 420 recertification summary">
      <div className="commandMetrics">
        <article><strong>{model.counts.passedSlots}/{model.counts.requiredEvidenceSlots}</strong><span>recertified slots</span></article>
        <article><strong>{model.missing.length}</strong><span>missing</span></article>
        <article><strong>{model.stale.length}</strong><span>stale</span></article>
        <article><strong>{model.invalid.length}</strong><span>failed / invalid</span></article>
        <article><strong>{model.counts.applications}</strong><span>applications</span></article>
        <article><strong>{model.counts.dimensions}</strong><span>dimensions per app</span></article>
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading">
        <div><p className="eyebrow">Seven-application matrix</p><h2>Fresh re-certification by application</h2></div>
      </div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        {model.appSummaries.map(item=><article className="reviewBatchSummary" key={item.appId}>
          <h3>{item.appId}</h3>
          <p><strong>{item.passed}/{item.required}</strong> passed</p>
          <p>{item.missing} missing · {item.stale} stale · {item.invalid} invalid</p>
        </article>)}
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading">
        <div><p className="eyebrow">Acceptance rules</p><h2>What a Build 420 PASS means</h2></div>
      </div>
      <div className="reviewBatchList">
        <article className="reviewBatchSummary"><h3>Device coverage</h3><p>Desktop, tablet and mobile evidence must be current, without critical horizontal overflow. Mobile also requires a 320 px floor and 44 px touch targets.</p></article>
        <article className="reviewBatchSummary"><h3>Accessibility</h3><p>Keyboard-only workflow, visible focus, assistive semantics, forced colors / AA contrast and reduced-motion behavior are independently checked.</p></article>
        <article className="reviewBatchSummary"><h3>Degraded operation</h3><p>Loading, empty and error states, safe retry, offline behavior, degraded-network handling and recovery must preserve data and avoid duplicate effects.</p></article>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>No synthetic or deployment-only certification.</strong>
      <p>
        Missing, stale, PARTIAL or FAILED evidence remains unresolved. Build 420 does not
        automatically repair peer applications, force retries, or claim offline behavior is healthy.
      </p>
    </section>
  </main>;
}
