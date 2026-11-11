import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSourceTrustLedgerForUser } from "@/lib/source-trust-ledger-database";

export const dynamic = "force-dynamic";

export default async function SourceTrustLedgerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsource-trust-ledger");
  }

  const model = await listSourceTrustLedgerForUser(session.user.id);

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 365 · Trusted source evidence custody</p>
        <h1>
          Trusted Source Signer Registry, Durable Convergence Receipt Ledger,
          Replay/Aging Evidence &amp; Owner Decision Audit Trail
        </h1>
        <p className="lead">
          Keep iCamp and Yard Workers source evidence durable and append-only
          without storing private signing keys or turning deployment GREEN into
          connection acceptance.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/convergence-receipt-intake">
            Build 364 Receipt Intake
          </Link>
          <Link className="secondaryButton" href="/source-convergence">
            Build 363 Source Convergence
          </Link>
          <a className="secondaryButton" href="/api/source-trust-ledger">
            Durable Ledger JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 365 durable evidence summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.enrolledSignerSources}/2</strong>
            <span>sources with one trusted signer</span>
          </article>
          <article>
            <strong>{model.summary.currentVerifiedReceiptSources}/2</strong>
            <span>current verified receipts</span>
          </article>
          <article>
            <strong>{model.summary.ownerAcceptedSources}/2</strong>
            <span>owner accepted sources</span>
          </article>
          <article>
            <strong>{model.summary.closureState}</strong>
            <span>supervised closure</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Revision convergence is now recorded; signer and health proof are not.</strong>
        <p>
          Yard Workers and iCamp both returned current production-revision
          convergence evidence. Neither source has an independently enrolled
          source signer or a genuine signed HEALTHY receipt yet, so both remain
          on HOLD.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Durable source evidence</p>
            <h2>Signer, receipt age, replay and owner-decision state</h2>
          </div>
        </div>

        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.ownerDecisionState}</span>
              <h3>{source.label}</h3>
              <p>
                <strong>Production main:</strong>{" "}
                <code>{source.productionMain}</code>
              </p>
              <p><strong>Revision:</strong> {source.revisionState}</p>
              <p><strong>Manifest:</strong> {source.manifestState}</p>
              <p><strong>Trusted signer registry:</strong> {source.signerRegistryState}</p>
              <p><strong>Active signer keys:</strong> {source.activeSignerCount}</p>
              <p><strong>Receipt ledger:</strong> {source.receiptState}</p>
              <p><strong>Receipt age:</strong> {source.receiptAge}</p>
              <p><strong>Durable replay ledger:</strong> CODE_READY</p>
              <p><strong>Source-side replay proof:</strong> {source.sourceDurableReplayState}</p>
              <p><strong>Signed health:</strong> {source.signedHealthState}</p>
              <p><strong>Connection:</strong> {source.connectionState}</p>
              <p><strong>Owner acceptance:</strong> {source.ownerAcceptanceState}</p>
              <p><strong>Credentials exposed:</strong> {source.credentialsExposed}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 365 authority boundary</strong>
        <p>
          Only independently verified public Ed25519 keys may enter the trusted
          signer registry. Verified receipts are append-only and nonce-unique.
          Aged receipts cannot authorize acceptance. Owner decisions are also
          append-only, and an ACCEPT decision remains blocked while the
          three-Master runtime gate is not synchronized.
        </p>
      </section>
    </main>
  );
}
