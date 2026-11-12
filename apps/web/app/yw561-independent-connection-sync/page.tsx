import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild376Yw561ConnectionSyncForUser } from "@/lib/yw561-independent-connection-three-master-sync-database";

export const dynamic = "force-dynamic";

export default async function Yw561IndependentConnectionSyncPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw561-independent-connection-sync");
  }

  const data = await listBuild376Yw561ConnectionSyncForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 376 · YW561 independent connection and three-Master sync</p>
        <h1>
          YW561 Independent Connection Evidence Intake, Verified CONNECTED Transition,
          Exact-Receipt Owner Acceptance Continuity Recheck &amp; Three-Master
          Synchronization Closure
        </h1>
        <p className="lead">
          Correlate only a current independently verified YW CONNECTED registry record,
          keep exact-receipt owner acceptance and the runtime gate authoritative, and close
          three-Master synchronization only after every trust boundary agrees.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw561-owner-decision-runtime-connection">Build 375</Link>
          <Link className="secondaryButton" href="/master-shell-registry">Source Registry</Link>
          <a className="secondaryButton" href="/api/yw561-independent-connection-sync">Build 376 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.candidateConnectionEvidenceState}</strong><span>registry evidence candidate</span></article>
          <article><strong>{model.independentConnectionEvidenceIntakeState}</strong><span>trusted intake</span></article>
          <article><strong>{model.exactReceiptAcceptanceContinuityRecheckState}</strong><span>acceptance continuity</span></article>
          <article><strong>{model.currentRuntimeGateState}</strong><span>runtime gate</span></article>
          <article><strong>{model.verifiedConnectedTransitionState}</strong><span>connection transition</span></article>
          <article><strong>{model.threeMasterSynchronizationClosureState}</strong><span>three-Master sync</span></article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.connectionState}</span>
          <h2>Current Build 376 controller truth</h2>
          <p><strong>YW561 production:</strong> <code>{model.prior.activation.observation.productionMain}</code></p>
          <p><strong>Exact current receipt:</strong> <code>{model.exactCurrentReceiptId ?? "NONE"}</code></p>
          <p><strong>Exact receipt owner decision:</strong> {model.exactCurrentReceiptOwnerDecision}</p>
          <p><strong>Latest YW registry evidence:</strong> <code>{model.connectionRegistryEvidence?.evidenceId ?? "NONE"}</code></p>
          <p><strong>AI Hub:</strong> 309 · <code>{model.masterRuntime.aiHub.main}</code></p>
          <p><strong>Comms:</strong> QL-418 · <code>{model.masterRuntime.comms.main}</code></p>
          <p><strong>Masters synced:</strong> {model.mastersSynced ? "YES" : "NO"}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Independent connection evidence cannot be manufactured here.</strong>
        <p>
          Build 376 consumes only an existing latest YW source-registry record already
          classified as CONNECTED by the signed source-ingestion path with independent
          source verification. Operator-recorded evidence cannot satisfy the intake.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>CONNECTED remains a multi-gate transition.</strong>
        <p>
          Trusted connection intake alone is insufficient. The exact current YW561 receipt
          must still be owner-accepted, source-health continuity must remain active, and the
          three-Master runtime gate must be OPEN before CONNECTED_VERIFIED can be recorded.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master synchronization closes last.</strong>
        <p>
          Build 376 records CLOSED only when exact-receipt acceptance continuity is current,
          the runtime gate is OPEN, and the independently verified connection transition is
          CONNECTED_VERIFIED. Production deployment success alone never sets MASTERS_SYNCED.
        </p>
      </section>
    </main>
  );
}
