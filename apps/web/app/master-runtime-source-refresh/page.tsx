import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild368RuntimeRecheckForUser } from "@/lib/master-runtime-source-refresh-database";

export const dynamic = "force-dynamic";

export default async function MasterRuntimeSourceRefreshPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fmaster-runtime-source-refresh");
  const data = await listBuild368RuntimeRecheckForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 368 · Runtime closure recheck</p>
        <h1>
          Master Runtime Evidence Closure, iCamp Revision Re-Convergence,
          Source Receipt Refresh &amp; Supervised Acceptance Recheck
        </h1>
        <p className="lead">
          Reconcile AI Hub 308 and Comms QL-416 runtime evidence, refresh current
          Yard Workers and iCamp source revisions, issue fail-closed receipt refresh
          handoffs, and recheck supervised acceptance without treating code GREEN as runtime proof.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/source-owner-review">Build 367 Owner Review</Link>
          <Link className="secondaryButton" href="/source-signer-enrollment">Build 366 Signer Intake</Link>
          <a className="secondaryButton" href="/api/master-runtime-source-refresh">Build 368 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.master.gateState}</strong><span>three-Master runtime gate</span></article>
          <article><strong>{model.summary.sourceEvidenceReady}/2</strong><span>source evidence ready</span></article>
          <article><strong>{model.summary.readyForOwnerReview}/2</strong><span>ready for owner review</span></article>
          <article><strong>{model.summary.closureState}</strong><span>supervised acceptance recheck</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>AI Hub 308 and Comms QL-416 remain runtime HOLD.</strong>
        <p>
          AI Hub 308 is code GREEN with 6/6 production CI checks and the Ree host remains
          <code> DESKTOP-AE894KC_ONLY</code>, but installed release, signed one-TEST,
          Comms receiver acknowledgement and three-Master receipts remain HOLD.
          Comms QL-416 is code GREEN with 7/7 production checks, but original-host
          telemetry, signed one-TEST runtime evidence, signer custody, durable replay,
          uptime and owner acceptance are still unresolved.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading"><div><p className="eyebrow">Source refresh handoffs</p><h2>Current production revision recheck</h2></div></div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.acceptanceState}</span>
              <h3>{source.label}</h3>
              <p><strong>Production main:</strong> <code>{source.productionMain}</code></p>
              <p><strong>Observed manifest:</strong> <code>{source.observedManifestRevision ?? "DEPLOYMENT_BOUND"}</code></p>
              <p><strong>Revision:</strong> {source.revisionState}</p>
              <p><strong>Signer:</strong> {source.signerState}</p>
              <p><strong>Receipt:</strong> {source.receiptState}</p>
              <p><strong>Refresh action:</strong> {source.requestedAction}</p>
              <p><strong>Handoff:</strong> <code>{source.handoffToken}</code></p>
              <p><strong>Latest owner decision:</strong> {source.latestOwnerDecision}</p>
              {source.blockers.length > 0 && (
                <ul>{source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current source changes invalidate old receipt assumptions.</strong>
        <p>
          Yard Workers is now YW559 at <code>443a4380fe3875cf632702474e94ce74309d3f14</code>.
          iCamp is now Build 243 at <code>1f29c23f5fba7c2326e09873ebff42223622044b</code>,
          while its checked-in manifest still records
          <code> e2d343595363ca9106e7f1dbc60006e3a6c616aa</code>.
          Any older signed receipt would therefore be rejected for exact-revision mismatch.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Controller boundary</strong>
        <p>
          AI Data may record the recheck and issue source refresh handoffs, but it does
          not rewrite iCamp/Yard Workers manifests, generate source private keys, infer
          health from deployment success, or mark either source CONNECTED.
        </p>
      </section>
    </main>
  );
}
