import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild418RecoveryRollback} from "@/lib/build418-recovery-rollback-database";

export const dynamic="force-dynamic";
const pretty=(value:string)=>value.replaceAll("_"," ");

export default async function RecoveryRollbackCertificationPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Frecovery-rollback-certification");
  const model=await readBuild418RecoveryRollback(session.user.id,new Date().toISOString());
  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 418 · Recovery & Rollback Certification</p>
      <h1>Cross-Application Recovery Exercise & Rollback Readiness</h1>
      <p className="lead">
        Evidence-backed supervised recovery certification across all seven applications.
        AI Data Platform validates receipts only; each source keeps operational authority and no automatic rollback is enabled.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/incident-runbook-recovery">Recovery Runbooks</Link>
        <Link className="secondaryButton" href="/communications-delivery-operations">Communications SLA</Link>
        <Link className="secondaryButton" href="/original-host-continuity">Host Continuity</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>{pretty(model.governanceState)}</strong>
      <p>
        Production software GREEN does not certify a recovery exercise. Certification requires
        independently witnessed source execution, rollback proof and fresh post-recovery evidence.
      </p>
    </section>

    <section className="reviewSummary">
      <div className="commandMetrics">
        <article><strong>{model.counts.verifiedExerciseSlots}/{model.counts.requiredExerciseSlots}</strong><span>verified recovery slots</span></article>
        <article><strong>{model.counts.rollbackReadinessReceipts}/7</strong><span>rollback readiness receipts</span></article>
        <article><strong>{model.counts.verifiedCrossApplicationExercises}</strong><span>verified cross-app exercises</span></article>
        <article><strong>{model.metrics.averageRecoveryTimeMinutes??"UNKNOWN"}</strong><span>average recovery minutes</span></article>
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading"><div>
        <p className="eyebrow">Coverage</p><h2>Seven applications × four recovery domains</h2>
      </div></div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        <article className="reviewBatchSummary"><h3>Missing exercise slots</h3><p>{model.missingExerciseSlots.length}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid exercise slots</h3><p>{model.invalidExerciseSlots.length}</p></article>
        <article className="reviewBatchSummary"><h3>Missing rollback apps</h3><p>{model.missingRollbackApps.length}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid rollback apps</h3><p>{model.invalidRollbackApps.length}</p></article>
        <article className="reviewBatchSummary"><h3>Cross-app exercises admitted</h3><p>{model.counts.crossApplicationExercises}</p></article>
        <article className="reviewBatchSummary"><h3>Invalid cross-app exercises</h3><p>{model.invalidCross.length}</p></article>
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading"><div>
        <p className="eyebrow">Certification rules</p><h2>Supervised, source-owned and reversible</h2>
      </div></div>
      <div className="masterGovernanceGrid">
        <article className="reviewBatchSummary"><h3>Source authority</h3><p>Recovery and rollback execution remains owned by the affected application.</p></article>
        <article className="reviewBatchSummary"><h3>Owner + witness</h3><p>Owner approval and an independent witness are mandatory and must remain distinct.</p></article>
        <article className="reviewBatchSummary"><h3>Rollback proof</h3><p>Known-good revision, artifact, restore point, procedure and migration compatibility must be evidenced.</p></article>
        <article className="reviewBatchSummary"><h3>No automatic rollback</h3><p>Build 418 records readiness and exercises; it does not authorize unattended rollback or peer control.</p></article>
      </div>
    </section>
  </main>;
}
