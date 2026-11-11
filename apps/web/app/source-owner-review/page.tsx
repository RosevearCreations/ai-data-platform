import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild367OwnerReviewForUser } from "@/lib/source-owner-review-database";

export const dynamic = "force-dynamic";

export default async function SourceOwnerReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fsource-owner-review");
  const data = await listBuild367OwnerReviewForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 367 · Owner acceptance gate</p>
        <h1>
          Verified Source Signer Evidence Reception, Signed Health Admission
          Reconciliation, Master-Gate Owner Review Packet &amp; Explicit Acceptance Decision
        </h1>
        <p className="lead">
          Reconcile Build 366 signer and signed-health evidence against current source
          production revisions and the latest AI Hub 307 / Comms QL-415 Master gate,
          then prepare an append-only owner review packet. ACCEPT remains fail-closed.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-signer-enrollment">
            Build 366 Signer Intake
          </Link>
          <Link className="secondaryButton" href="/source-trust-ledger">
            Build 365 Trust Ledger
          </Link>
          <a className="secondaryButton" href="/api/source-owner-review">
            Build 367 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.summary.masterGateOpen ? "OPEN" : "HOLD"}</strong><span>three-Master gate</span></article>
          <article><strong>{model.summary.readyForOwnerDecision}/2</strong><span>sources ready for decision</span></article>
          <article><strong>{model.summary.acceptedSources}/2</strong><span>explicitly accepted</span></article>
          <article><strong>{model.summary.closureState}</strong><span>supervised closure</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Latest Master acknowledgements remain HOLD.</strong>
        <p>
          AI Hub 307 is code GREEN but installed release, durable runtime monitoring,
          QL-414 source/Comms chain, AI Data receipt and Comms ACK remain unresolved.
          Comms QL-415 is code GREEN but original-host telemetry, installed release,
          independently witnessed signer custody, receiver-signed ACK, durable replay
          runtime proof, uptime and owner decision remain unresolved.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading"><div><p className="eyebrow">Current source truth</p><h2>Owner review packet preview</h2></div></div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.packetState}</span>
              <h3>{source.label}</h3>
              <p><strong>Production main:</strong> <code>{source.productionMain}</code></p>
              <p><strong>Manifest revision:</strong> <code>{source.manifestRevision ?? "DEPLOYMENT_BOUND"}</code></p>
              <p><strong>Revision state:</strong> {source.sourceRevisionState}</p>
              <p><strong>Signer:</strong> {source.signerState}</p>
              <p><strong>Signer key:</strong> {source.activeSignerKeyId ?? "NONE"}</p>
              <p><strong>Signed health:</strong> {source.receiptState}</p>
              <p><strong>Master gate:</strong> {source.masterGateState}</p>
              <p><strong>Latest owner decision:</strong> {source.latestOwnerDecision}</p>
              <p><strong>ACCEPT eligible:</strong> {source.explicitAcceptanceEligible ? "YES" : "NO"}</p>
              {source.blockers.length > 0 && (
                <ul>{source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>iCamp Build 242 changed the current production revision.</strong>
        <p>
          iCamp production is now <code>7408a66dfa2c70e1de6b358356b7f9e9dc6cb13b</code>,
          while its checked-in discovery manifest still records
          <code> e2d343595363ca9106e7f1dbc60006e3a6c616aa</code>. Build 367 therefore
          marks iCamp manifest convergence HOLD until the source reconciles that revision.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Explicit decision boundary</strong>
        <p>
          HOLD or REJECT may be recorded for review packets. ACCEPT is permitted only
          when the same packet still references the current production revision, one
          independently enrolled signer, a current admitted signed HEALTHY receipt, and
          an OPEN Master gate at decision time. The controller never auto-accepts.
        </p>
      </section>
    </main>
  );
}
