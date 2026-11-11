import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild375Yw561DecisionRuntimeConnectionForUser } from "@/lib/yw561-owner-decision-runtime-connection-reconciliation-database";

export const dynamic = "force-dynamic";

export default async function Yw561OwnerDecisionRuntimeConnectionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw561-owner-decision-runtime-connection");
  }

  const data = await listBuild375Yw561DecisionRuntimeConnectionForUser(session.user.id);
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 375 · YW561 owner decision and connection reconciliation</p>
        <h1>
          YW561 Explicit Owner Acceptance Decision Execution, Exact-Receipt Acceptance
          Continuity, Three-Master Runtime Gate Transition &amp; Connection-State Reconciliation
        </h1>
        <p className="lead">
          Execute owner ACCEPT or REJECT only against the exact current YW561 receipt,
          preserve acceptance only while that same receipt and its source-health evidence stay
          current, record three-Master gate transitions, and refuse to infer CONNECTED without
          independently verified current connection evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw561-trusted-source-health-activation">Build 374</Link>
          <Link className="secondaryButton" href="/source-trust-ledger">Trust Ledger</Link>
          <a className="secondaryButton" href="/api/yw561-owner-decision-runtime-connection">Build 375 JSON</a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article><strong>{model.decisionExecutionState}</strong><span>owner decision execution</span></article>
          <article><strong>{model.acceptanceContinuityState}</strong><span>exact-receipt continuity</span></article>
          <article><strong>{model.currentRuntimeGateState}</strong><span>three-Master runtime gate</span></article>
          <article><strong>{model.runtimeGateTransitionState}</strong><span>runtime transition</span></article>
          <article><strong>{model.connectionReconciliationState}</strong><span>connection reconciliation</span></article>
          <article><strong>{model.connected ? "YES" : "NO"}</strong><span>CONNECTED verified</span></article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.connectionReconciliationState}</span>
          <h2>Current Build 375 controller state</h2>
          <p><strong>YW561 production:</strong> <code>{model.activation.observation.productionMain}</code></p>
          <p><strong>Exact current receipt:</strong> <code>{model.exactCurrentReceiptId ?? "NONE"}</code></p>
          <p><strong>Owner decision:</strong> {model.latestExactReceiptOwnerDecision}</p>
          <p><strong>Source-health activation:</strong> {model.activation.sourceHealthActivationState}</p>
          <p><strong>AI Hub baseline:</strong> 309 · <code>{model.masterRuntime.aiHub.main}</code></p>
          <p><strong>Comms baseline:</strong> QL-418 · <code>{model.masterRuntime.comms.main}</code></p>
          <p><strong>Observed source connection:</strong> {model.observedSourceConnectionState}</p>
          {model.blockers.length > 0 && (
            <ul>{model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>ACCEPT is an execution, not a shortcut.</strong>
        <p>
          The owner-decision endpoint resolves the exact current receipt itself. An ACCEPT is
          rejected unless source-health activation is ACTIVE and the three-Master runtime gate
          is OPEN. A stale receipt ID supplied by a browser cannot be used to continue acceptance.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Acceptance continuity is continuously receipt-bound.</strong>
        <p>
          If the receipt changes, source-health falls back to HOLD, or the runtime gate closes,
          the accepted state no longer continues. Historical ACCEPT records remain audit history,
          not authority for a newer receipt.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Connection remains independently verified.</strong>
        <p>
          Build 375 can reach READY_FOR_VERIFIED_CONNECTION after owner acceptance and runtime
          closure, but CONNECTED_VERIFIED additionally requires current source connection state
          plus independent connection evidence. Code GREEN and owner ACCEPT alone cannot connect it.
        </p>
      </section>
    </main>
  );
}
