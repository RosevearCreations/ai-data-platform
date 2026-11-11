import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild369SourceRefreshForUser } from "@/lib/source-refresh-evidence-database";

export const dynamic = "force-dynamic";

export default async function SourceRefreshEvidencePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fsource-refresh-evidence");

  const data = await listBuild369SourceRefreshForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 369 · Source refresh evidence intake</p>
        <h1>
          Source Refresh Evidence Intake, iCamp Manifest Re-Convergence Confirmation,
          YW/iCamp Fresh Signed Health Admission &amp; Three-Master Acceptance Recheck
        </h1>
        <p className="lead">
          Receive sanitized Build 368 source refresh evidence, independently confirm exact
          deployed manifest revisions, correlate only controller-trusted signer and signed
          HEALTHY ledgers, and recheck supervised acceptance against AI Hub 308 and Comms QL-416.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-runtime-source-refresh">Build 368 Runtime Recheck</Link>
          <Link className="secondaryButton" href="/source-owner-review">Build 367 Owner Review</Link>
          <a className="secondaryButton" href="/api/source-refresh-evidence">Build 369 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.summary.manifestConfirmations}/2</strong><span>exact deployed manifests confirmed</span></article>
          <article><strong>{model.summary.freshSignedHealth}/2</strong><span>fresh signed HEALTHY admissions</span></article>
          <article><strong>{model.summary.durableReplayVerified}/2</strong><span>durable replay verified</span></article>
          <article><strong>{model.summary.threeMasterGate}</strong><span>three-Master acceptance gate</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Repository convergence is not the same as runtime acceptance.</strong>
        <p>
          Yard Workers YW560 and iCamp 244 both contain deployment-time manifest binding logic,
          but Build 369 requires independently received evidence that the deployed manifest
          actually names the exact current production SHA. Source ACK text cannot enroll its
          own signer or self-admit a HEALTHY receipt.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current source baselines</p>
            <h2>Refresh evidence and signed-health correlation</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className="reviewStatus">{source.acceptanceState}</span>
              <h3>{source.label}</h3>
              <p><strong>Production main:</strong> <code>{source.productionMain}</code></p>
              <p><strong>Checked-in manifest baseline:</strong> <code>{source.checkedInManifestRevision ?? "DEPLOYMENT_BOUND_NULL"}</code></p>
              <p><strong>Build 368 evidence received:</strong> {source.sourceRefreshCurrent ? "CURRENT" : "HOLD"}</p>
              <p><strong>Deployed manifest:</strong> {source.manifestConfirmationState}</p>
              <p><strong>Trusted signer:</strong> {source.signerState}</p>
              <p><strong>Fresh signed HEALTHY receipt:</strong> {source.receiptState}</p>
              <p><strong>Durable replay:</strong> {source.durableReplayState}</p>
              <p><strong>Three-Master gate:</strong> {source.threeMasterGateState}</p>
              <p><strong>Latest owner decision:</strong> {source.latestOwnerDecision}</p>
              <p><strong>Next handoff:</strong> <code>{source.nextHandoffToken}</code></p>
              {source.blockers.length > 0 && (
                <ul>{source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current production revisions</strong>
        <p>
          Yard Workers is now YW560 at <code>2c7234c975528a3a3ab76ca22829c8b4a541de97</code>.
          iCamp is now Build 244 at <code>69d46513b45e340a4e295165abbd3d99b3a62274</code>.
          iCamp's tracked manifest baseline is Build 243
          <code> 1f29c23f5fba7c2326e09873ebff42223622044b</code>; its Build 244 script is
          designed to inject the deployment SHA at build time, so Build 369 waits for
          independent deployed-manifest confirmation rather than misclassifying the tracked
          baseline as the runtime manifest.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master gate is still HOLD.</strong>
        <p>
          AI Hub 308 and Comms QL-416 remain code GREEN, but their installed/runtime,
          signed one-TEST, receiver/connection, durable replay, uptime and owner-acceptance
          evidence has not reached the verified states required by the Master gate. Build 369
          therefore cannot mark either source CONNECTED or ready for owner acceptance.
        </p>
      </section>
    </main>
  );
}
