import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeConvergenceReceiptIntake } from "@/lib/convergence-receipt-intake";

export const dynamic = "force-dynamic";

export default async function ConvergenceReceiptIntakePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fconvergence-receipt-intake");
  }

  const model = composeConvergenceReceiptIntake();

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 364 · Convergence receipt intake</p>
        <h1>
          Yard Workers &amp; iCamp Source-Bound Signature Verification,
          Health Correlation &amp; Owner Acceptance Decision Queue
        </h1>
        <p className="lead">
          Receive source-owned convergence receipts, verify exact source and
          production-revision binding, validate Ed25519 signatures and replay
          safety, correlate fresh health evidence, and queue—not infer—the
          owner acceptance decision.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-convergence">
            Build 363 Source Convergence
          </Link>
          <Link className="secondaryButton" href="/master-activation-reconciliation">
            Master Activation
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 364 receipt intake summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.receiptsReceived}/2</strong>
            <span>receipts received</span>
          </article>
          <article>
            <strong>{model.summary.verifiedSourceCount}/2</strong>
            <span>source evidence verified</span>
          </article>
          <article>
            <strong>{model.masterState}</strong>
            <span>three-Master runtime state</span>
          </article>
          <article>
            <strong>{model.summary.closureState}</strong>
            <span>supervised closure state</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Receipts are evidence, not automatic acceptance.</strong>
        <p>
          A source receipt must pass exact identity, revision, Ed25519,
          freshness, replay-safety and health-correlation checks. Even then,
          source health does not become connection acceptance and the controller
          cannot make the owner decision automatically.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Convergence receipt queue</p>
            <h2>Yard Workers and iCamp evidence intake</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.decisionQueueState}</span>
              <h3>{source.label}</h3>
              <p><strong>Receipt:</strong> {source.receiptState}</p>
              <p><strong>Expected revision:</strong> <code>{source.expectedRevision}</code></p>
              <p><strong>Handoff:</strong> <code>{source.handoffToken}</code></p>
              <p><strong>Identity bound:</strong> {source.identityBound ? "YES" : "NO"}</p>
              <p><strong>Revision bound:</strong> {source.revisionBound ? "YES" : "NO"}</p>
              <p><strong>Signature verified:</strong> {source.signatureVerified ? "YES" : "NO"}</p>
              <p><strong>Replay safe:</strong> {source.replaySafe ? "YES" : "NO"}</p>
              <p><strong>Fresh health correlated:</strong> {source.healthCorrelated && source.fresh ? "YES" : "NO"}</p>
              <p><strong>Owner decision:</strong> {source.ownerDecision}</p>
              {source.blockers.length > 0 ? (
                <ul>
                  {source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Private signing keys never enter AI Data.</strong>
        <p>
          Build 364 accepts only the public verification material needed to
          validate source-owned receipts. Private keys remain inside the source
          application's independent signing boundary.
        </p>
      </section>
    </main>
  );
}
