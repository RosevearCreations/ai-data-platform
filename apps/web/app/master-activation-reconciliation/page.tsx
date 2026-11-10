import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeMasterActivationEvidenceReconciliation } from "@/lib/master-activation-evidence-reconciliation";

export const dynamic = "force-dynamic";

export default async function MasterActivationReconciliationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-activation-reconciliation");
  }

  const model = composeMasterActivationEvidenceReconciliation();

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 361 · Master activation evidence reconciliation</p>
        <h1>Ree-Host Runtime Closure &amp; Source-Onboarding Gate</h1>
        <p className="lead">
          Reconcile the Build 360 Comms and AI Hub receipts without converting
          code readiness into runtime acceptance. Yard Workers and iCamp remain
          gated until every Master prerequisite is independently verified.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-control-readiness-certification">
            Build 360 Certification
          </Link>
          <Link className="secondaryButton" href="/adaptive-master-control">
            Adaptive Master Control
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 361 reconciliation summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.codeGreen ? "GREEN" : "NOT GREEN"}</strong>
            <span>peer code/release state</span>
          </article>
          <article>
            <strong>{model.blockers.length}</strong>
            <span>Master prerequisites still blocked</span>
          </article>
          <article>
            <strong>{model.summary.masterState}</strong>
            <span>three-Master synchronization</span>
          </article>
          <article>
            <strong>{model.summary.sourceOnboardingGate}</strong>
            <span>Yard Workers / iCamp gate</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Code GREEN is not MASTERS SYNCED.</strong>
        <p>
          Comms QL-412 and AI Hub Build 305 are code/release GREEN, but the
          supplied receipts still report runtime, owner-proof, deployment and
          acceptance HOLD states. Build 361 therefore keeps the next Master
          integration stage closed.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Receipt reconciliation</p>
            <h2>Build 360 prerequisites</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.prerequisites.map((item) => (
            <article className="reviewBatchSummary" key={item.id}>
              <span className="reviewStatus">
                {item.verified ? "VERIFIED" : "HOLD"}
              </span>
              <h3>{item.label}</h3>
              <p><strong>Owner:</strong> {item.owner}</p>
              <p><strong>Observed:</strong> <code>{item.observed}</code></p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Peer revisions</p>
            <h2>Evidence snapshot used by this reconciliation</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <span className="reviewStatus">{model.snapshot.comms.receipt}</span>
            <h3>Rosevear Comms Hub</h3>
            <p><strong>Main:</strong> <code>{model.snapshot.comms.main}</code></p>
            <p><strong>Signer:</strong> {model.snapshot.comms.signerEnrollment}</p>
            <p><strong>Replay:</strong> {model.snapshot.comms.replayStore}</p>
            <p><strong>Receiver:</strong> {model.snapshot.comms.receiver}</p>
          </article>
          <article className="reviewBatchSummary">
            <span className="reviewStatus">{model.snapshot.aiHub.receipt}</span>
            <h3>Rosevear AI Hub</h3>
            <p><strong>Main:</strong> <code>{model.snapshot.aiHub.main}</code></p>
            <p><strong>Dev:</strong> <code>{model.snapshot.aiHub.dev}</code></p>
            <p><strong>Automation host:</strong> {model.snapshot.aiHub.automationHost}</p>
            <p><strong>New Windows tasks:</strong> {model.snapshot.aiHub.newWindowsTasks}</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Closure sequence</p>
            <h2>What must become verified before source onboarding</h2>
          </div>
        </div>
        <ol>
          {model.closureRequirements.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Next integration stage: HOLD.</strong>
        <p>
          Yard Workers and iCamp may begin only after this model reaches
          <code> MASTERS_SYNCED </code>. Rosie Dazzlers and Devil n Dove remain
          behind that first source-onboarding wave.
        </p>
      </section>
    </main>
  );
}
