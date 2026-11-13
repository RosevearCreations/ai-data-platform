import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild374Yw561ActivationForUser } from "@/lib/yw561-trusted-source-health-activation-owner-gate-database";

export const dynamic = "force-dynamic";

export default async function Yw561TrustedSourceHealthActivationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fyw561-trusted-source-health-activation");

  const data = await listBuild374Yw561ActivationForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 374 · YW561 trusted source-health activation</p>
        <h1>
          YW561 Trusted Source-Health Signer Admission, Current Receipt/Replay Evidence
          Activation, Three-Master Runtime Evidence Correlation &amp; Explicit Owner Acceptance Gate
        </h1>
        <p className="lead">
          Admit only independently controller-correlated YW561 source-health signer evidence,
          activate only the exact current admitted HEALTHY receipt and its durable replay,
          correlate AI Hub 309 / Comms QL-417 runtime evidence, and keep owner acceptance explicit.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw561-live-signer-owner-recheck">Build 373</Link>
          <Link className="secondaryButton" href="/source-trust-ledger">Trust Ledger</Link>
          <a className="secondaryButton" href="/api/yw561-trusted-source-health-activation">Build 374 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.trustedSignerAdmissionState}</strong><span>trusted signer admission</span></article>
          <article><strong>{model.currentReceiptActivationState}</strong><span>current HEALTHY receipt</span></article>
          <article><strong>{model.currentReplayActivationState}</strong><span>current replay evidence</span></article>
          <article><strong>{model.sourceHealthActivationState}</strong><span>source-health activation</span></article>
          <article><strong>{model.threeMasterRuntimeCorrelationState}</strong><span>three-Master correlation</span></article>
          <article><strong>{model.ownerAcceptanceGateState}</strong><span>explicit owner gate</span></article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.ownerAcceptanceGateState}</span>
          <h2>Current Build 374 activation state</h2>
          <p><strong>YW561 production:</strong> <code>{model.observation.productionMain}</code></p>
          <p><strong>Signer key:</strong> <code>{model.trustedSigner?.keyId ?? "NOT_ADMITTED"}</code></p>
          <p><strong>Current receipt:</strong> <code>{model.currentReceipt?.receiptId ?? "NOT_ACTIVE"}</code></p>
          <p><strong>Three-Master gate:</strong> {model.threeMasterRuntimeGate}</p>
          <p><strong>Owner decision for exact receipt:</strong> {model.latestExactReceiptOwnerDecision}</p>
          <p><strong>Connection:</strong> {model.connectionState}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Activation is evidence-bound, not deployment-bound.</strong>
        <p>
          Build 374 does not turn code GREEN, Vercel READY, provider-delivery receipts or a
          checked-in manifest into source-health trust. The signer must first be independently
          correlated by AI Data, and receipt/replay activation must reference that exact signer
          and exact current YW561 production revision.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master runtime evidence remains independent.</strong>
        <p>
          AI Hub 309 and Comms QL-417 still report runtime HOLD until genuine original-host,
          signed receiver ACK, durable replay and owner/reviewer evidence is authenticated.
          Build 374 records the correlation result but cannot manufacture an OPEN gate.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner acceptance is never automatic.</strong>
        <p>
          Even after signer, receipt, replay and three-Master evidence are active, the owner
          gate becomes only READY_FOR_EXPLICIT_OWNER_ACCEPTANCE until an ACCEPT or REJECT
          already exists for the exact current receipt. CONNECTED is not inferred by this build.
        </p>
      </section>
    </main>
  );
}
