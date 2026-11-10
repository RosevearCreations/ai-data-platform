import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { composeCrossApplicationControlCenter } from "@/lib/cross-application-control-center";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function CrossApplicationControlCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fcross-application-control-center");
  }

  const model = composeCrossApplicationControlCenter();

  return (
    <main className="shell reviewShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 354 · Moderate Controls</p>
        <h1>Cross-Application Control Center</h1>
        <p className="lead">
          See which Rosevear Suite dependencies are ready, blocked, stale or
          under review, and prepare bounded escalation or recovery handoffs
          without overriding source-owned operational truth.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Shell Command Center
          </Link>
          <Link className="secondaryButton" href="/basic-alerts">
            Basic Alerts
          </Link>
          <Link className="secondaryButton" href="/basic-operator-actions">
            Operator Actions
          </Link>
          <Link className="secondaryButton" href="/comms-complementary-plane">
            Comms Plane
          </Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Dependency summary">
        <div className="commandMetrics">
          <article><strong>{model.summary.sourceApplications}</strong><span>source applications</span></article>
          <article><strong>{model.summary.dependencies}</strong><span>dependencies</span></article>
          <article><strong>{model.summary.readyDependencies}</strong><span>ready</span></article>
          <article><strong>{model.summary.blockedDependencies}</strong><span>blocked/review</span></article>
          <article><strong>{model.summary.staleDependencies}</strong><span>stale</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Dependency-aware, not authority-replacing.</strong>
        <p>
          A dependency can block a Master Shell operation without changing the
          source application's own state. ACK, deployment GREEN and source-code
          compatibility do not create CONNECTED state.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Application dependencies</p>
            <h2>Source-to-Master operational dependencies</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sources.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <span className={"reviewStatus reviewStatus--" + stateClass(source.dependencyState)}>
                {source.dependencyState} · {source.connectionState}
              </span>
              <h3>{source.shellBoundary}</h3>
              <p><code>{source.repository}</code></p>
              <p><strong>Manifest:</strong> {source.manifestState}</p>
              <p><strong>Revision:</strong> {source.revisionState}</p>
              <p><strong>Owner proof:</strong> {source.ownerProof} · <strong>signed receipt:</strong> {source.signedReceipt}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Dependency graph</p>
            <h2>What blocks what?</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.dependencies.map((dependency) => (
            <article className="reviewBatchSummary" key={dependency.id}>
              <span className={"reviewStatus reviewStatus--" + stateClass(dependency.state)}>
                {dependency.kind} · {dependency.state}
              </span>
              <h3>{dependency.from} → {dependency.to}</h3>
              <p>{dependency.reason}</p>
              <p><strong>Authority:</strong> {dependency.authority}</p>
              <p><strong>Automatic action:</strong> no</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Bounded operations</p>
            <h2>Safe control actions</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.operations.map((operation) => (
            <article className="reviewBatchSummary" key={operation.id}>
              <span className="reviewStatus">{operation.mode}</span>
              <h3>{operation.label}</h3>
              <p>{operation.description}</p>
              <p><strong>Peer mutation:</strong> {operation.peerMutation ? "yes" : "no"}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
