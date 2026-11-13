import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeSourceConvergence } from "@/lib/source-convergence";

export const dynamic = "force-dynamic";

export default async function SourceConvergencePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsource-convergence");
  }

  const model = composeSourceConvergence();

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 363 · Source convergence and acceptance closure</p>
        <h1>
          Yard Workers &amp; iCamp Revision Convergence, Signer Readiness,
          Verified Health Intake &amp; Supervised Acceptance
        </h1>
        <p className="lead">
          Separate source revision, independent signer, source-bound health and
          owner acceptance evidence so production GREEN can never substitute for
          a verified connection.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-shell-onboarding">
            Build 362 Source Shells
          </Link>
          <Link className="secondaryButton" href="/master-activation-reconciliation">
            Master Activation
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 363 convergence summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.allRevisionsConverged ? "YES" : "NO"}</strong>
            <span>source revisions converged</span>
          </article>
          <article>
            <strong>{model.summary.allSignersReady ? "YES" : "NO"}</strong>
            <span>independent signers ready</span>
          </article>
          <article>
            <strong>{model.summary.allHealthReceiptsVerified ? "YES" : "NO"}</strong>
            <span>verified health receipts</span>
          </article>
          <article>
            <strong>{model.summary.closureState}</strong>
            <span>supervised acceptance closure</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 363 closes evidence gaps, not truth boundaries.</strong>
        <p>
          AI Data may detect revision drift, verify signed metadata and project
          accepted source health. It may not rewrite source manifests, enroll
          private signing keys, infer connection from deployment GREEN, or make
          the owner acceptance decision.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source convergence</p>
            <h2>Current Yard Workers and iCamp evidence</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.supervisedAcceptance}</span>
              <h3>{source.label}</h3>
              <p><strong>Production main:</strong> <code>{source.productionMain}</code></p>
              <p><strong>Manifest revision:</strong> <code>{source.manifestRevision}</code></p>
              <p><strong>Revision converged:</strong> {source.revisionConverged ? "YES" : "NO"}</p>
              <p><strong>Signer state:</strong> {source.signerState}</p>
              <p><strong>Verified health:</strong> {source.healthReceiptState}</p>
              <p><strong>Connection:</strong> {source.connectionState}</p>
              <p><strong>Next action:</strong> {source.nextSourceAction}</p>
              <p><strong>Source handoff:</strong> <code>{source.sourceHandoff}</code></p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Required source handoffs</p>
            <h2>Exact evidence needed before acceptance review</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.handoffs.map((handoff) => (
            <article className="reviewBatchSummary" key={handoff.sourceId}>
              <span className="reviewStatus">HOLD</span>
              <h3>{handoff.sourceId}</h3>
              <p><strong>Token:</strong> <code>{handoff.token}</code></p>
              <ul>
                {handoff.requiredEvidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Blocking evidence</p>
            <h2>Acceptance cannot close while these remain unresolved</h2>
          </div>
        </div>
        <ul>
          {model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
        </ul>
      </section>
    </main>
  );
}
