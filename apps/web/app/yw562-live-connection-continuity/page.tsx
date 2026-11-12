import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild377YwLiveConnectionContinuityForUser } from "@/lib/yw562-live-trusted-connection-continuity-database";

export const dynamic = "force-dynamic";

export default async function Yw562LiveConnectionContinuityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw562-live-connection-continuity");
  }

  const data = await listBuild377YwLiveConnectionContinuityForUser(
    session.user.id
  );
  const model = data.model;

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 377 · YW561→YW562 live connection continuity
        </p>
        <h1>
          Live Trusted Connection Intake Execution, Exact-Receipt Acceptance
          Revalidation, Three-Master Sync Activation &amp; Post-Connection
          Continuity Monitoring
        </h1>
        <p className="lead">
          Yard Workers has advanced to YW562. Build 377 treats the prior YW561
          receipt, acceptance, connection and synchronization evidence as
          historical and requires exact-current YW562 evidence before any live
          activation can continue.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/yw561-independent-connection-sync"
          >
            Build 376
          </Link>
          <Link className="secondaryButton" href="/source-owner-review">
            Owner Acceptance
          </Link>
          <Link className="secondaryButton" href="/master-shell-registry">
            Source Registry
          </Link>
          <a
            className="secondaryButton"
            href="/api/yw562-live-connection-continuity"
          >
            Build 377 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.sourceRevisionTransitionState}</strong>
            <span>YW revision transition</span>
          </article>
          <article>
            <strong>{model.exactReceiptState}</strong>
            <span>exact YW562 receipt</span>
          </article>
          <article>
            <strong>{model.acceptanceRevalidationState}</strong>
            <span>owner acceptance</span>
          </article>
          <article>
            <strong>{model.liveConnectionIntakeState}</strong>
            <span>trusted connection intake</span>
          </article>
          <article>
            <strong>{model.currentMasterRuntimeState}</strong>
            <span>AI Hub 311 / Comms QL-421</span>
          </article>
          <article>
            <strong>{model.threeMasterSyncActivationState}</strong>
            <span>sync activation</span>
          </article>
          <article>
            <strong>{model.postConnectionContinuityState}</strong>
            <span>post-connection continuity</span>
          </article>
          <article>
            <strong>{model.connectionState}</strong>
            <span>current connection</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.connectionState}</span>
          <h2>Current Build 377 controller truth</h2>
          <p>
            <strong>Previous YW561:</strong>{" "}
            <code>{model.sourceRuntime.previousMain}</code>
          </p>
          <p>
            <strong>Current YW562:</strong>{" "}
            <code>{model.sourceRuntime.currentMain}</code>
          </p>
          <p>
            <strong>Exact YW562 receipt:</strong>{" "}
            <code>{model.exactCurrentReceiptId ?? "NONE"}</code>
          </p>
          <p>
            <strong>Exact owner decision:</strong>{" "}
            {model.exactOwnerDecision?.decision ?? "PENDING"}
          </p>
          <p>
            <strong>Latest YW connection evidence:</strong>{" "}
            <code>{model.connectionRegistryEvidence?.evidenceId ?? "NONE"}</code>
          </p>
          <p>
            <strong>AI Hub:</strong> Build 311 ·{" "}
            <code>{model.masterRuntime.aiHub.main}</code>
          </p>
          <p>
            <strong>Comms:</strong> QL-421 ·{" "}
            <code>{model.masterRuntime.comms.main}</code>
          </p>
          <p>
            <strong>Masters synced:</strong>{" "}
            {model.mastersSynced ? "YES" : "NO"}
          </p>
          {model.blockers.length > 0 && (
            <ul>
              {model.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>YW561 evidence does not survive the YW562 revision.</strong>
        <p>
          Build 377 requires a fresh source-bound YW562 HEALTHY receipt,
          controller admission, durable replay correlation and an explicit
          owner ACCEPT for that exact receipt. A historical YW561 ACCEPT cannot
          authorize YW562.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Independent connection authority remains source-owned.</strong>
        <p>
          The live-intake action can only consume the latest YW registry record
          already classified CONNECTED by the signed independent source-ingestion
          path. This page and its API cannot manufacture independent verification.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Three-Master synchronization is an explicit final activation.</strong>
        <p>
          AI Hub 311 and Comms QL-421 must independently resolve to the exact
          current protected OPEN state before the owner can activate synchronization.
          Code GREEN never substitutes for protected runtime evidence.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Continuity monitoring fails closed after activation.</strong>
        <p>
          If the YW562 receipt changes or ages out, owner acceptance changes,
          the CONNECTED registry evidence expires, or either Master loses its
          verified runtime state, Build 377 returns the monitored connection and
          synchronization state to HOLD while preserving the historical audit.
        </p>
      </section>
    </main>
  );
}
