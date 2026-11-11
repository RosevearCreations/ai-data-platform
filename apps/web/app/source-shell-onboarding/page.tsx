import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeSourceShellOnboarding } from "@/lib/source-shell-onboarding";

export const dynamic = "force-dynamic";

export default async function SourceShellOnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsource-shell-onboarding");
  }

  const model = composeSourceShellOnboarding();

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 362 · Yard Workers &amp; iCamp product-shell onboarding
        </p>
        <h1>
          Source Identity Binding, Health Projection &amp; Supervised Master Acceptance
        </h1>
        <p className="lead">
          Bind Yard Workers and iCamp to their platform-shell identities, expose
          revision/signer/connection health, and keep Master acceptance fail-closed
          until the three-Master and source-owned evidence gates are genuinely met.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-activation-reconciliation">
            Master Activation Reconciliation
          </Link>
          <Link className="secondaryButton" href="/source-onboarding-pilot">
            Source Onboarding Pilot
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 362 onboarding summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.onboardingCodeReady ? "READY" : "HOLD"}</strong>
            <span>product-shell identity binding</span>
          </article>
          <article>
            <strong>{model.summary.masterState}</strong>
            <span>three-Master state</span>
          </article>
          <article>
            <strong>{model.summary.sourceEvidenceCurrent ? "CURRENT" : "DRIFT / HOLD"}</strong>
            <span>source-owned evidence</span>
          </article>
          <article>
            <strong>{model.summary.supervisedMasterAcceptance}</strong>
            <span>supervised Master acceptance</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 362 is code-ready, not connection acceptance.</strong>
        <p>
          The owner authorized the Build 362 implementation, but QL-413 still
          reports runtime, signer, replay-deployment, incident and owner-connection
          HOLD. Source onboarding therefore advances only to a read-only,
          evidence-visible shell state.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Product-shell sources</p>
            <h2>Yard Workers and iCamp identity/health projection</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">
                {source.supervisedMasterAcceptance}
              </span>
              <h3>{source.label}</h3>
              <p><strong>Source ID:</strong> <code>{source.sourceId}</code></p>
              <p><strong>Repository:</strong> <code>{source.repository}</code></p>
              <p><strong>Current main:</strong> <code>{source.currentProductionMain}</code></p>
              <p><strong>Manifest revision:</strong> <code>{source.manifestRevision}</code></p>
              <p><strong>Revision current:</strong> {source.revisionCurrent ? "YES" : "NO"}</p>
              <p><strong>Signer enrolled:</strong> {source.signerEnrolled ? "YES" : "NO"}</p>
              <p><strong>Connection accepted:</strong> {source.connectionAccepted ? "YES" : "NO"}</p>
              <p><strong>Health projection:</strong> {source.healthProjection}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Latest Comms receipt</p>
            <h2>{model.masterReceipt.receipt}</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <h3>Rosevear Comms Hub</h3>
            <p><strong>Main:</strong> <code>{model.masterReceipt.commsMain}</code></p>
            <p><strong>Receipt intake:</strong> {model.masterReceipt.receiptIntake}</p>
            <p><strong>Operational uptime:</strong> {model.masterReceipt.operationalUptime}</p>
            <p><strong>Protected signer:</strong> {model.masterReceipt.protectedSigner}</p>
            <p><strong>Replay ledger:</strong> {model.masterReceipt.durableReplayLedger}</p>
            <p><strong>Incident acceptance:</strong> {model.masterReceipt.incidentAcceptance}</p>
            <p><strong>Owner connection decision:</strong> {model.masterReceipt.ownerConnectionDecision}</p>
            <p><strong>Receiver:</strong> {model.masterReceipt.receiver}</p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Blocking evidence</p>
            <h2>What prevents supervised acceptance</h2>
          </div>
        </div>
        <ul>
          {model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
        </ul>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Child tenants remain child tenants.</strong>
        <p>
          Rosevear Landscaping and Camp Rosevear are not promoted to Master
          source identities. The Master binds only the Yard Workers and iCamp
          platform shells.
        </p>
      </section>
    </main>
  );
}
