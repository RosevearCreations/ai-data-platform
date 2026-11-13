import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listBuild381ReceiverHealthContinuityForUser } from "@/lib/yw562-receiver-health-continuity-database";

export const dynamic = "force-dynamic";

export default async function Yw562ReceiverHealthContinuityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fyw562-receiver-health-continuity");
  }

  const data = await listBuild381ReceiverHealthContinuityForUser(
    session.user.id
  );
  const model = data.model;
  const authoritiesConfigured =
    Boolean(process.env.BUILD381_CONTINUITY_AUTHORITY_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD381_AI_HUB_RUNTIME_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD381_COMMS_RUNTIME_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD381_CONTROLLER_RUNTIME_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD381_ROLLBACK_AUTHORITY_PUBLIC_KEY_PEM?.trim()) &&
    Boolean(process.env.BUILD381_RECEIVER_OFF_PUBLIC_KEY_PEM?.trim());

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 381 · protected receiver health continuity
        </p>
        <h1>
          Protected Receiver Health Continuity, Signed Runtime Renewal,
          Automatic Fail-Closed Rollback &amp; Three-Master CONNECTED
          Revalidation
        </h1>
        <p className="lead">
          A prior CONNECTED state is accepted only while fresh receiver health
          and three independently signed Master renewal receipts remain current.
          Missing or expired renewal evidence fails closed automatically.
          Durable rollback closure additionally requires an independently
          signed receiver-OFF proof.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/yw562-runtime-activation-closure">
            Build 380 activation
          </Link>
          <Link className="secondaryButton" href="/master-shell-registry">
            Source registry
          </Link>
          <a className="secondaryButton" href="/api/yw562-receiver-health-continuity">
            Build 381 JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary">
        <div className="commandMetrics">
          <article>
            <strong>{model.build380ConnectedPrerequisite}</strong>
            <span>Build 380 baseline</span>
          </article>
          <article>
            <strong>{model.receiverHealthContinuityState}</strong>
            <span>receiver continuity</span>
          </article>
          <article>
            <strong>{model.threeMasterConnectedRevalidationState}</strong>
            <span>three-Master revalidation</span>
          </article>
          <article>
            <strong>{model.rollbackState}</strong>
            <span>fail-closed rollback</span>
          </article>
          <article>
            <strong>{model.connectionState}</strong>
            <span>connection</span>
          </article>
          <article>
            <strong>{model.mastersSynced ? "YES" : "NO"}</strong>
            <span>Masters synchronized</span>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <article className="reviewBatchSummary">
          <span className="reviewStatus">{model.connectionState}</span>
          <h2>Exact current runtime binding</h2>
          <p><strong>AI Data Build 380 main:</strong> <code>{model.controllerBaseRevision}</code></p>
          <p><strong>YW{model.runtime.yw.build} main:</strong> <code>{model.runtime.yw.main}</code></p>
          <p><strong>AI Hub Build {model.runtime.aiHub.build} main:</strong> <code>{model.runtime.aiHub.main}</code></p>
          <p><strong>Comms {model.runtime.comms.build} main:</strong> <code>{model.runtime.comms.main}</code></p>
          <p><strong>Original host:</strong> <code>{model.runtime.aiHub.originalHost}</code></p>
          <p>
            <strong>All protected signer pins configured:</strong>{" "}
            {authoritiesConfigured ? "YES" : "NO — protected renewal/rollback intake remains unavailable"}
          </p>
          <p><strong>Latest renewal:</strong> <code>{model.latestRenewal?.renewalEventId ?? "NONE"}</code></p>
          <p><strong>Renewal valid until:</strong> <code>{model.latestRenewal?.validUntil ?? "NONE"}</code></p>
          <p><strong>Latest rollback:</strong> <code>{model.latestRollback?.rollbackEventId ?? "NONE"}</code></p>
          {model.blockers.length > 0 && (
            <ul>
              {model.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          )}
        </article>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Five-minute renewal is fail-closed.</strong>
        <p>
          If a previously connected receiver does not present fresh signed
          health evidence before renewal expiry, Build 381 immediately projects
          DISCONNECTED_HOLD. No owner click is required for that fail-closed
          controller decision.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Rollback closure requires separate OFF custody.</strong>
        <p>
          A durable DISCONNECTED registry record can be appended only through
          the protected rollback endpoint after both the rollback authority and
          a separately pinned receiver-OFF signer verify the exact current
          runtime scope.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Current upstream code is not live connectivity.</strong>
        <p>
          AI Hub Build 321 exposes only a supervised isolated-pilot contract and
          Comms QL-432 ends in signed OFF recovery review. Neither code release
          can satisfy general CONNECTED continuity without genuine external
          runtime evidence.
        </p>
      </section>
    </main>
  );
}
