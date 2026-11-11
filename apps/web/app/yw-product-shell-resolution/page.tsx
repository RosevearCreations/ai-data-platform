import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild371YwResolutionForUser } from "@/lib/yw-product-shell-resolution-database";

export const dynamic = "force-dynamic";

export default async function YwProductShellResolutionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fyw-product-shell-resolution");

  const data = await listBuild371YwResolutionForUser(session.user.id);
  const model = data.model;
  const o = model.observation;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 371 · Yard Workers source reconciliation</p>
        <h1>
          Yard Workers Product-Shell Identity Reconciliation, Independent Source Signer
          Enrollment Closure, Fresh Signed Health Receipt Admission &amp; Three-Master
          Runtime Discrepancy Resolution
        </h1>
        <p className="lead">
          Admit the corrected YW371 production product-shell identity, correlate signer
          enrollment only against controller trust ledgers, require an exact current
          source-bound HEALTHY receipt, and recheck the AI Hub 309 / Comms QL-417 runtime gate.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/manifest-custody-receipt-decision">Build 370</Link>
          <Link className="secondaryButton" href="/source-signer-enrollment">Signer Intake</Link>
          <a className="secondaryButton" href="/api/yw-product-shell-resolution">Build 371 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.identityState}</strong><span>YW product-shell identity</span></article>
          <article><strong>{model.signerState}</strong><span>independent signer custody</span></article>
          <article><strong>{model.receiptState}</strong><span>fresh signed HEALTHY receipt</span></article>
          <article><strong>{model.master.gateState}</strong><span>three-Master runtime gate</span></article>
          <article><strong>{model.resolutionState}</strong><span>Build 371 resolution</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>The Build 370 Yard Workers role mismatch is resolved in production.</strong>
        <p>
          YW371 production deployment <code>{o.deploymentId}</code> serves exact revision
          <code> {o.deployedManifestRevision}</code> with <code>source_role=platform_shell</code>
          and <code>tenant_boundary=platform_shell</code>. This closes the prior
          business-shell/product-shell identity discrepancy without introducing Rosevear
          Landscaping child-tenant identity into the Master source.
        </p>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.resolutionState}</span>
          <h2>Current Yard Workers controller closure</h2>
          <p><strong>Production main:</strong> <code>{o.productionMain}</code></p>
          <p><strong>Deployment Git revision:</strong> <code>{o.deploymentGitRevision}</code></p>
          <p><strong>Observed manifest revision:</strong> <code>{o.deployedManifestRevision}</code></p>
          <p><strong>Source role:</strong> {o.sourceRole}</p>
          <p><strong>Tenant boundary:</strong> {o.tenantBoundary}</p>
          <p><strong>Manifest signature state:</strong> {o.signatureState}</p>
          <p><strong>Independent signer:</strong> {model.signerState}</p>
          <p><strong>Fresh signed HEALTHY receipt:</strong> {model.receiptState}</p>
          <p><strong>Source closure:</strong> {model.sourceClosureState}</p>
          <p><strong>Three-Master runtime:</strong> {model.master.gateState}</p>
          <p><strong>Latest owner decision:</strong> {model.latestOwnerDecision}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Signer and health admission remain fail-closed.</strong>
        <p>
          The deployed manifest still reports <code>AWAITING_INDEPENDENT_SOURCE_SIGNER</code>.
          No controller-trusted YW Ed25519 signer/custody chain or current admitted signed
          HEALTHY receipt is present yet, so Build 371 records those gates as HOLD.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master runtime discrepancy remains unresolved by source code.</strong>
        <p>
          AI Hub 309 still lacks the original Ree-host process witness, one-TEST,
          receiver-signed ACK, sampled uptime and controller owner decision. Comms QL-417
          still lacks original-host telemetry, durable replay admission, signed Comms ACK,
          owner-decision continuity and verified uptime. Build 371 therefore does not mark
          Yard Workers CONNECTED or owner-accepted.
        </p>
      </section>
    </main>
  );
}
