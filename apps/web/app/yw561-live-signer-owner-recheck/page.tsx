import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild373Yw561OwnerRecheckForUser } from "@/lib/yw561-live-signer-receipt-replay-owner-recheck-database";

export const dynamic = "force-dynamic";

export default async function Yw561LiveSignerOwnerRecheckPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw561-live-signer-owner-recheck");
  }

  const data = await listBuild373Yw561OwnerRecheckForUser(session.user.id);
  const model = data.model;
  const o = model.observation;

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 373 · YW561 live trust and owner decision recheck</p>
        <h1>
          YW561 Live Source-Health Signer Enrollment Correlation, Exact Signed HEALTHY
          Receipt Closure, Durable Replay Acceptance &amp; Three-Master Owner Decision Recheck
        </h1>
        <p className="lead">
          Re-evaluate the live YW561 platform-shell identity against controller-owned signer
          enrollment, exact source-health receipt admission, durable replay acceptance and the
          current AI Hub 309 / Comms QL-417 owner-decision gate.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw561-signer-receipt-replay-closure">Build 372</Link>
          <Link className="secondaryButton" href="/source-trust-ledger">Trust Ledger</Link>
          <a className="secondaryButton" href="/api/yw561-live-signer-owner-recheck">Build 373 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.identityState}</strong><span>live YW561 identity</span></article>
          <article><strong>{model.signerCorrelationState}</strong><span>live signer enrollment correlation</span></article>
          <article><strong>{model.receiptClosureState}</strong><span>exact signed HEALTHY receipt</span></article>
          <article><strong>{model.replayAcceptanceState}</strong><span>durable replay acceptance</span></article>
          <article><strong>{model.master.gateState}</strong><span>three-Master runtime gate</span></article>
          <article><strong>{model.ownerDecisionState}</strong><span>owner decision recheck</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Live YW561 production identity remains exact.</strong>
        <p>
          Deployment <code>{o.deploymentId}</code> serves revision
          <code> {o.deployedManifestRevision}</code>, matching production main
          <code> {o.productionMain}</code>, with <code>source_role=platform_shell</code> and
          <code>tenant_boundary=platform_shell</code>.
        </p>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.ownerDecisionState}</span>
          <h2>Current Build 373 closure</h2>
          <p><strong>Live manifest signature state:</strong> {model.liveManifestSignatureState}</p>
          <p><strong>Signer correlation:</strong> {model.signerCorrelationState}</p>
          <p><strong>Receipt closure:</strong> {model.receiptClosureState}</p>
          <p><strong>Replay acceptance:</strong> {model.replayAcceptanceState}</p>
          <p><strong>Source evidence:</strong> {model.sourceEvidenceState}</p>
          <p><strong>Three-Master gate:</strong> {model.master.gateState}</p>
          <p><strong>Latest exact-receipt owner decision:</strong> {model.latestExactReceiptOwnerDecision}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Live source-health signer correlation is still HOLD.</strong>
        <p>
          The current YW561 discovery manifest still reports
          <code> AWAITING_INDEPENDENT_SOURCE_SIGNER</code>. AI Data therefore cannot claim
          a live source-health signer, exact signed HEALTHY closure or replay acceptance
          until those controller-owned ledgers contain genuine current evidence.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner acceptance remains explicit.</strong>
        <p>
          Even after source evidence becomes READY, Build 373 requires the AI Hub 309 /
          Comms QL-417 three-Master gate to be OPEN and a current owner decision tied to
          the exact admitted YW561 receipt. Code GREEN, Vercel READY or provider-delivery
          evidence cannot produce owner acceptance.
        </p>
      </section>
    </main>
  );
}
