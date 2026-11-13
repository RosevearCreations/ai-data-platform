import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSignerEnrollmentAndOwnerReviewForUser } from "@/lib/source-signer-enrollment-database";

export const dynamic = "force-dynamic";

export default async function SourceSignerEnrollmentPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fsource-signer-enrollment");
  }

  const model = await listSignerEnrollmentAndOwnerReviewForUser(session.user.id);

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 366 · Independent signer admission</p>
        <h1>
          Independent Source Signer Enrollment Intake, Public-Key Pin Custody
          Verification, Genuine Signed Health Receipt Admission &amp; Owner
          Review Preparation
        </h1>
        <p className="lead">
          Admit only independently pinned Ed25519 source identities, prove live
          private-key possession with a five-minute challenge, and accept
          source-bound HEALTHY receipts only after the signer is trusted.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-trust-ledger">
            Build 365 Trust Ledger
          </Link>
          <Link className="secondaryButton" href="/convergence-receipt-intake">
            Build 364 Receipt Intake
          </Link>
          <a className="secondaryButton" href="/api/source-signer-enrollment">
            Build 366 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 366 signer admission summary">
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.pinVerifiedSources}/2</strong>
            <span>independent public pins matched</span>
          </article>
          <article>
            <strong>{model.summary.custodyVerifiedSources}/2</strong>
            <span>fresh custody challenges verified</span>
          </article>
          <article>
            <strong>{model.summary.admittedHealthSources}/2</strong>
            <span>current signed HEALTHY receipts admitted</span>
          </article>
          <article>
            <strong>{model.summary.ownerReviewReadySources}/2</strong>
            <span>prepared for owner review</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>No signer is enrolled merely because code or deployment is GREEN.</strong>
        <p>
          Yard Workers and iCamp still report no independently enrolled source
          signer and no genuine signed HEALTHY receipt. Build 366 provides the
          controller-side admission ceremony only; it does not generate source
          private keys, invent custody evidence, or auto-accept either source.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Owner preparation queue</p>
            <h2>Signer pin, custody proof, health admission and Master gate</h2>
          </div>
        </div>

        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.ownerReviewState}</span>
              <h3>{source.label}</h3>
              <p>
                <strong>Production main:</strong>{" "}
                <code>{source.productionMain}</code>
              </p>
              <p><strong>Latest intake:</strong> {source.latestIntakeEvent}</p>
              <p><strong>Independent SPKI pin:</strong> {source.pinMatched ? "MATCHED" : "HOLD"}</p>
              <p><strong>Custody challenge:</strong> {source.challengeState}</p>
              <p><strong>Private-key possession:</strong> {source.custodyVerified ? "VERIFIED" : "HOLD"}</p>
              <p><strong>Trusted signer:</strong> {source.trustedSignerKeyId ?? "HOLD_UNENROLLED"}</p>
              <p><strong>Signed health admission:</strong> {source.healthAdmissionState}</p>
              <p><strong>Current admitted receipt:</strong> {source.receiptCurrent ? "CURRENT" : "HOLD"}</p>
              <p><strong>Master runtime gate:</strong> {source.masterGateOpen ? "OPEN" : "HOLD"}</p>
              <p><strong>Next action:</strong> {source.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 366 verification sequence</strong>
        <p>
          The owner submits a public Ed25519 key plus a separately obtained
          SPKI SHA-256 pin and distinct opaque evidence references. AI Data
          recomputes the public-key fingerprint, issues a five-minute
          possession challenge, verifies the source signature, and only then
          commits the public signer to the trusted registry. Genuine signed
          HEALTHY receipts still pass the Build 364/365 source, revision,
          freshness, signature and replay checks before entering the durable
          receipt ledger.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner review preparation is not owner acceptance.</strong>
        <p>
          Even with a verified signer and admitted current health receipt, the
          source remains HOLD until the three-Master runtime gate is open and
          an explicit owner decision is recorded through the existing owner
          decision audit trail.
        </p>
      </section>
    </main>
  );
}
