import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild372Yw561ClosureForUser } from "@/lib/yw561-signer-receipt-replay-closure-database";

export const dynamic = "force-dynamic";

export default async function Yw561SignerReceiptReplayClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw561-signer-receipt-replay-closure");
  }

  const data = await listBuild372Yw561ClosureForUser(session.user.id);
  const model = data.model;
  const o = model.observation;
  const provider = model.providerEvidence;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 372 · YW561 source-health closure</p>
        <h1>
          Yard Workers Independent Signer Custody Evidence Intake, Exact YW561 Signed
          Health Receipt Admission, Durable Replay Correlation &amp; Three-Master Runtime
          Closure Recheck
        </h1>
        <p className="lead">
          Bind AI Data to the exact YW561 production artifact, intake sanitized source-health
          signer custody references, admit only an exact current controller-verified HEALTHY
          receipt, correlate its durable replay evidence, and recheck AI Hub 309 / Comms QL-417.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw-product-shell-resolution">Build 371</Link>
          <Link className="secondaryButton" href="/source-signer-enrollment">Signer Enrollment</Link>
          <a className="secondaryButton" href="/api/yw561-signer-receipt-replay-closure">Build 372 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.identityState}</strong><span>YW561 product-shell identity</span></article>
          <article><strong>{model.signerState}</strong><span>trusted source-health signer</span></article>
          <article><strong>{model.custodyIntakeState}</strong><span>Build 372 custody evidence intake</span></article>
          <article><strong>{model.receiptState}</strong><span>exact YW561 signed HEALTHY receipt</span></article>
          <article><strong>{model.replayState}</strong><span>source-health durable replay correlation</span></article>
          <article><strong>{model.master.gateState}</strong><span>three-Master runtime gate</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>YW561 production is independently bound to the exact current revision.</strong>
        <p>
          Deployment <code>{o.deploymentId}</code> serves revision
          <code> {o.deployedManifestRevision}</code>, matching production main
          <code> {o.productionMain}</code>, with <code>source_role=platform_shell</code> and
          <code>tenant_boundary=platform_shell</code>.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Provider-delivery Ed25519 proof is a separate trust domain.</strong>
        <p>
          YW561 added a protected provider receiver, but its own contract states that a valid
          provider <em>delivered</em> report is not a source-health signature and not Master
          acceptance. Current provider states are receiver <code>{provider.providerReceiver}</code>,
          signer pin <code>{provider.providerSignerPin}</code>, signed provider receipt
          <code> {provider.signedProviderReceipt}</code>, and provider replay
          <code> {provider.providerReplay}</code>. None of these can satisfy the Build 372
          source-health signer or source-health replay gate.
        </p>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.closureState}</span>
          <h2>YW561 controller closure</h2>
          <p><strong>Production main:</strong> <code>{o.productionMain}</code></p>
          <p><strong>Manifest signature state:</strong> {o.signatureState}</p>
          <p><strong>Connection state from source:</strong> {o.connectionState}</p>
          <p><strong>Trusted signer:</strong> {model.signerState}</p>
          <p><strong>Custody evidence intake:</strong> {model.custodyIntakeState}</p>
          <p><strong>Signed HEALTHY admission:</strong> {model.receiptState}</p>
          <p><strong>Durable replay correlation:</strong> {model.replayState}</p>
          <p><strong>Source evidence ready:</strong> {model.sourceEvidenceReady ? "YES" : "NO"}</p>
          <p><strong>Three-Master runtime gate:</strong> {model.master.gateState}</p>
          <p><strong>Latest owner decision:</strong> {model.latestOwnerDecision}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current source-health evidence is still HOLD.</strong>
        <p>
          The live YW561 discovery manifest still reports
          <code> AWAITING_INDEPENDENT_SOURCE_SIGNER</code>. Build 372 therefore does not
          infer signer custody, receipt admission or replay closure from YW561 code GREEN or
          from its provider-delivery receiver.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master runtime closure remains independent.</strong>
        <p>
          AI Hub 309 still requires original-host process witness, one-TEST, receiver-signed
          ACK, sampled uptime and controller owner decision. Comms QL-417 still requires
          original-host telemetry, durable replay admission, signed Comms ACK,
          owner-decision continuity and verified uptime. Build 372 cannot mark CONNECTED
          or owner-accepted while those Master gates remain HOLD.
        </p>
      </section>
    </main>
  );
}
