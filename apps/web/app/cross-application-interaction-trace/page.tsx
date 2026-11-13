import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listCrossApplicationInteractionTraceForUser
} from "@/lib/cross-application-interaction-trace-database";

export const dynamic = "force-dynamic";

export default async function CrossApplicationInteractionTracePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fcross-application-interaction-trace");
  }

  const model = await listCrossApplicationInteractionTraceForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 343 · Rosevear Suite Master Shell</p>
        <h1>Cross-Application Interaction Trace</h1>
        <p className="lead">
          Trace governed source interactions using correlation and causation
          evidence, review cross-application dependencies, and inspect likely
          failure propagation without converting inference into source truth.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/master-shell-command-center">
            Master Command Center
          </Link>
          <Link className="secondaryButton" href="/master-shell-ingestion">
            Source Ingestion
          </Link>
          <a className="secondaryButton" href="/api/cross-application-interaction-trace">
            Trace JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Correlation is not causation.</strong>
        <p>
          A shared correlation ID proves only that accepted evidence belongs to
          the same governed flow. It does not prove shared customer identity,
          tenant identity, authority, or the true origin of a failure.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Trace summary</p>
            <h2>Current evidence coverage</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <p>
            Events considered <strong>{model.summary.ingestedEventsConsidered}</strong> ·
            correlation groups <strong>{model.summary.correlationGroups}</strong> ·
            cross-application groups <strong>{model.summary.crossApplicationGroups}</strong> ·
            dependency edges <strong>{model.summary.dependencyEdges}</strong>
          </p>
          <p>
            Adverse cross-application groups <strong>{model.summary.adverseCrossApplicationGroups}</strong> ·
            pending source receipts <strong>{model.sourceIngestion.pendingReceiptCount}</strong>
          </p>
        </article>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Dependency graph</p>
            <h2>Six-source correlation edges</h2>
          </div>
        </div>
        {model.dependencyEdges.length ? (
          <div className="reviewBatchList">
            {model.dependencyEdges.map((edge) => (
              <article
                className="reviewBatchSummary"
                key={edge.correlationId + ":" + edge.fromSourceId + ":" + edge.toSourceId}
              >
                <span className="reviewStatus">
                  {edge.relationship} · {edge.direction}
                </span>
                <h3>{edge.fromSourceId} ↔ {edge.toSourceId}</h3>
                <p>Correlation <code>{edge.correlationId}</code></p>
                <p>
                  Evidence events <strong>{edge.evidenceEventIds.length}</strong>.
                  Direction is intentionally not inferred.
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No accepted cross-application correlation edge is currently measured.
            Missing trace evidence does not mean no interaction occurred.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Failure propagation</p>
            <h2>Evidence-linked review candidates</h2>
          </div>
        </div>
        {model.failurePropagation.length ? (
          <div className="reviewBatchList">
            {model.failurePropagation.map((item) => (
              <article className="reviewBatchSummary" key={item.correlationId}>
                <span className="reviewStatus">
                  {item.state} · {item.confidence}
                </span>
                <h3>{item.correlationId}</h3>
                <p>
                  Candidate upstream source <strong>{item.candidateUpstreamSourceId ?? "UNDETERMINED"}</strong> ·
                  impacted sources <strong>{item.impactedSourceIds.join(", ") || "UNDETERMINED"}</strong>
                </p>
                <p>{item.reason}</p>
                <p>
                  Inference only <strong>yes</strong> · source truth changed <strong>no</strong>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No cross-application group is available for propagation analysis.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source provenance</p>
            <h2>Per-source trace coverage</h2>
          </div>
        </div>
        <div className="tableScroll">
          <table>
            <caption>Build 343 source dependency evidence</caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Events</th>
                <th scope="col">Adverse</th>
                <th scope="col">Correlated with</th>
                <th scope="col">Measured</th>
              </tr>
            </thead>
            <tbody>
              {model.sourceNodes.map((node) => (
                <tr key={node.sourceId}>
                  <th scope="row">{node.sourceId}</th>
                  <td>{node.eventCount}</td>
                  <td>{node.adverseEventCount}</td>
                  <td>{node.correlatedSourceIds.join(", ") || "none measured"}</td>
                  <td>{node.evidenceMeasured ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Read-only evidence intelligence.</strong>
        <p>
          Build 343 performs no source mutation, peer write, route release,
          connection activation, external probe, customer matching, tenant
          matching or automatic recovery.
        </p>
      </section>
    </main>
  );
}
