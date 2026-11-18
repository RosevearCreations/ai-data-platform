import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild421Renewal} from "@/lib/build421-tenant-consent-capability-database";

export const dynamic="force-dynamic";
const pretty=(value:string)=>value.replaceAll("_"," ");

export default async function TenantConsentCapabilityRenewalPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Ftenant-consent-capability-renewal");
  const model=await readBuild421Renewal(session.user.id,new Date().toISOString());

  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 421 · Tenant Isolation, Consent Expiry & Delegated-Capability Renewal</p>
      <h1>Tenant Isolation, Consent Expiry &amp; Delegated-Capability Renewal</h1>
      <p className="lead">
        Renew least-privilege, tenant/workspace isolation, consent expiry and revocation,
        plus every governed directional delegated capability across all seven applications.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/master-security-certification">Security Certification</Link>
        <Link className="secondaryButton" href="/relationship-certification">Relationship Certification</Link>
        <Link className="secondaryButton" href="/accessibility-device-network-recertification">Build 420 Re-Certification</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>{pretty(model.governanceState)}</strong>
      <p>
        Expired consent, revoked grants, stale isolation evidence, wildcard capability grants
        and self-renewing delegated authority all fail closed.
      </p>
    </section>

    <section className="reviewSummary" aria-label="Build 421 renewal summary">
      <div className="commandMetrics">
        <article><strong>{model.counts.passedTotalSlots}/{model.counts.requiredTotalSlots}</strong><span>renewed checkpoints</span></article>
        <article><strong>{model.passedLocal.length}/{model.counts.requiredLocalSlots}</strong><span>local controls</span></article>
        <article><strong>{model.passedDelegated.length}/{model.counts.requiredDelegatedSlots}</strong><span>delegated relationships</span></article>
        <article><strong>{model.missingLocal.length+model.missingDelegated.length}</strong><span>missing</span></article>
        <article><strong>{model.staleLocal.length+model.staleDelegated.length}</strong><span>stale / expired</span></article>
        <article><strong>{model.invalidLocal.length+model.invalidDelegated.length}</strong><span>invalid / revoked</span></article>
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading">
        <div><p className="eyebrow">Application-local controls</p><h2>Least privilege, isolation and consent lifecycle</h2></div>
      </div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        {model.appSummaries.map(item=><article className="reviewBatchSummary" key={item.appId}>
          <h3>{item.appId}</h3>
          <p><strong>{item.passedLocal}/{item.requiredLocal}</strong> local controls renewed</p>
          <p>{item.missingLocal} missing · {item.staleLocal} stale · {item.invalidLocal} invalid</p>
          <p>{item.delegatedOutboundPassed}/{item.delegatedOutboundRequired} outbound delegated relationships renewed</p>
        </article>)}
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading">
        <div><p className="eyebrow">Renewal rules</p><h2>What Build 421 requires</h2></div>
      </div>
      <div className="reviewBatchList">
        <article className="reviewBatchSummary"><h3>Least privilege</h3><p>Deny-by-default, exact capability namespaces, no wildcard grants, current stale-grant review and non-delegable T5 authority.</p></article>
        <article className="reviewBatchSummary"><h3>Tenant and consent boundaries</h3><p>API, database and storage isolation plus explicit purpose-bound consent, enforced expiry, withdrawal propagation and rejection of revoked grants.</p></article>
        <article className="reviewBatchSummary"><h3>Delegated capability renewal</h3><p>All 28 directional relationships require fresh bounded grants, exact audience/capability scope, preserved tenant/workspace/consent scope, no self-renewal and a 24-hour maximum lifetime.</p></article>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Feature-completion discipline: 5–10 points per build.</strong>
      <p>
        This build carries 49 concrete renewal checkpoints. Future queued builds must consolidate
        enough feature-list scope to justify an evidence-backed 5–10 percentage-point completion movement;
        production GREEN alone never manufactures that progress.
      </p>
    </section>
  </main>;
}
