import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listMasterShellSourceRegistryForUser } from "@/lib/master-shell-source-registry-database";

import { RegistryEvidenceRecorder } from "./RegistryEvidenceRecorder";

export const dynamic = "force-dynamic";

export default async function MasterShellRegistryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-shell-registry");
  }

  const model = await listMasterShellSourceRegistryForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 336 · Master Shell · six-source registry
        </p>
        <h1>Freshness &amp; Source State Machine</h1>
        <p className="lead">
          Review the exact six source shells using append-only evidence,
          explicit expiry and fail-closed state progression. Missing evidence is
          UNKNOWN; expired positive evidence becomes STALE without inventing a
          disconnect or connection.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-contracts">
            Contract V1
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            Legacy app registry
          </Link>
          <a className="secondaryButton" href="/api/master-shell-registry">
            Registry JSON
          </a>
          <Link className="secondaryButton" href="/master-shell-ingestion">
            Source Ingestion
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Master Shell state is separate from legacy connection state.</strong>
        <p>
          Build 336 does not rewrite older UNMEASURED, DISCONNECTED or HOLD
          evidence. It derives a new Master Shell state only from accepted
          registry evidence and freshness rules.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current registry summary</p>
            <h2>{model.summary.sources} exact source shells</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <p>
              UNKNOWN <strong>{model.summary.unknown}</strong> · HOLD{" "}
              <strong>{model.summary.held}</strong> · TEST_VERIFIED{" "}
              <strong>{model.summary.testVerified}</strong> · CONNECTED{" "}
              <strong>{model.summary.connected}</strong> · STALE{" "}
              <strong>{model.summary.stale}</strong> · DEGRADED{" "}
              <strong>{model.summary.degraded}</strong> · DISCONNECTED{" "}
              <strong>{model.summary.disconnected}</strong>
            </p>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Evidence-backed source state</p>
            <h2>Six-source registry</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <div>
                <span className="reviewStatus">
                  {source.effectiveStatus} · {source.freshness}
                </span>
                <h3>
                  <code>{source.sourceId}</code> · {source.shellBoundary}
                </h3>
                <p>
                  Shell <code>{source.shellId}</code> · Repository{" "}
                  <code>{source.repository}</code>
                </p>
                <p>
                  Declared state <strong>{source.declaredStatus}</strong> ·
                  record version{" "}
                  <strong>{source.recordVersion ?? "none"}</strong>
                </p>
                <p>
                  Observed{" "}
                  <strong>{source.statusObservedAt ?? "UNMEASURED"}</strong> ·
                  expires{" "}
                  <strong>{source.statusExpiresAt ?? "UNMEASURED"}</strong>
                </p>
                <p>{source.transitionNote}</p>
                <p>
                  V1 registry record ready:{" "}
                  <strong>
                    {source.contractRecordReady ? "yes" : "no"}
                  </strong>
                </p>
                {!source.contractRecordReady ? (
                  <p>
                    Missing:{" "}
                    {source.missingContractFields.join(", ")}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Positive state sequence.</strong>
        <p>
          UNKNOWN → DISCOVERED → CONFIGURED → AUTHORIZATION_HELD →
          TEST_VERIFIED → CONNECTED. STALE, DEGRADED, DISCONNECTED, REVOKED and
          ERROR interrupt the positive sequence. Recovery starts again from
          DISCOVERED with new evidence.
        </p>
      </section>

      <RegistryEvidenceRecorder
        sources={model.sources.map((source) => ({
          sourceId: source.sourceId,
          shellBoundary: source.shellBoundary,
          effectiveStatus: source.effectiveStatus
        }))}
      />
    </main>
  );
}
