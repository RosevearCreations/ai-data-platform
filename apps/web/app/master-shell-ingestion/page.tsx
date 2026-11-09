import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listMasterShellSourceIngestionForUser
} from "@/lib/master-shell-source-ingestion-database";

import { IngestionConsole } from "./IngestionConsole";

export const dynamic = "force-dynamic";

export default async function MasterShellIngestionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-shell-ingestion");
  }

  const model =
    await listMasterShellSourceIngestionForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 337 · Master Shell · read-only source ingestion
        </p>
        <h1>Source Update Ingestion &amp; Provenance</h1>
        <p className="lead">
          Normalize source-owned health, release, module-readiness and audit
          evidence only after the existing webhook gateway has authenticated the
          source transport. Preserve source, tenant, sequence, correlation,
          idempotency, freshness and receipt provenance without source mutation.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-contracts">
            Contract V1
          </Link>
          <Link className="secondaryButton" href="/master-shell-registry">
            Source Registry
          </Link>
          <Link className="secondaryButton" href="/webhook-gateway">
            Webhook Gateway
          </Link>
          <a className="secondaryButton" href="/api/master-shell-ingestion">
            Ingestion JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Read-only by design.</strong>
        <p>
          Build 337 re-verifies accepted signed webhook receipts and writes only
          normalized append-only evidence. It performs no outbound delivery,
          source mutation, automatic route release or consequential peer write.
          A stale or out-of-order update is retained as evidence but cannot
          advance the source registry.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current ingestion evidence</p>
            <h2>{model.summary.ingested} normalized update(s)</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <p>
              Pending <strong>{model.summary.pending}</strong> · Fresh{" "}
              <strong>{model.summary.fresh}</strong> · Stale{" "}
              <strong>{model.summary.stale}</strong> · Out of order{" "}
              <strong>{model.summary.outOfOrder}</strong> · Independently
              verified{" "}
              <strong>{model.summary.independentlyVerified}</strong>
            </p>
          </article>
        </div>
      </section>

      <IngestionConsole pendingReceipts={model.pendingReceipts} />

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Normalized provenance ledger</p>
            <h2>Recent source updates</h2>
          </div>
        </div>
        {model.ingestions.length ? (
          <div className="reviewBatchList">
            {model.ingestions.map((item) => (
              <article
                className="reviewBatchSummary"
                key={item.ingestionId}
              >
                <div>
                  <span className="reviewStatus">
                    {item.freshness} · {item.sequenceState} ·{" "}
                    {item.verificationState}
                  </span>
                  <h3>
                    <code>{item.sourceId}</code> ·{" "}
                    <code>{item.eventType}</code>
                  </h3>
                  <p>
                    Sequence <strong>{item.sourceSequence}</strong>
                    {" · "}revision <code>{item.sourceRevision}</code>
                    {" · "}tenant <code>{item.tenantId ?? "none"}</code>
                  </p>
                  <p>
                    Correlation <code>{item.correlationId}</code>
                    {" · "}receipt <code>{item.webhookReceiptId}</code>
                  </p>
                  <p>
                    Evidence <code>{item.evidenceURI}</code>
                    {" · "}expires <strong>{item.expiresAt}</strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No normalized Master Shell source updates have been ingested.
          </div>
        )}
      </section>
    </main>
  );
}
