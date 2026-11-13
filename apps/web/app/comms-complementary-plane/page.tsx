import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  listCommsComplementaryPlaneForUser
} from "@/lib/comms-complementary-plane-database";

export const dynamic = "force-dynamic";

function stateClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

export default async function CommsComplementaryPlanePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fcomms-complementary-plane"
    );
  }

  const model = await listCommsComplementaryPlaneForUser(
    session.user.id
  );

  return (
    <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 342 · Rosevear Suite Master Shell
        </p>
        <h1>Comms Hub Complementary Plane</h1>
        <p className="lead">
          Read-only incident, source-impact and follow-up evidence from the
          communications plane. Message delivery, acknowledgements, routing,
          operator assignment and follow-up task authority remain inside
          Rosevear Comms Hub.
        </p>
        <div className="heroActions">
          <Link
            className="secondaryButton"
            href="/master-shell-command-center"
          >
            Master Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/master-sysop"
          >
            Master Sysop Shell
          </Link>
          <a
            className="secondaryButton"
            href="/api/comms-complementary-plane"
          >
            Comms Plane JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Complementary plane, not a seventh application.</strong>
        <p>
          The six Master Shell application/source identities remain unchanged.
          QL-392 is production software, but its current incident examples are
          explicitly synthetic INERT_PREVIEW data. Until independently verified
          Comms projection evidence exists, current incident and follow-up
          counts remain unknown rather than being reported as zero.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Comms software baseline</p>
            <h2>QL-392 capability evidence</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <span className="reviewStatus">
            {model.capabilityBaseline.release} ·{" "}
            {model.capabilityBaseline.sourceMode}
          </span>
          <h3>{model.capabilityBaseline.releaseName}</h3>
          <p>
            Repository{" "}
            <code>{model.capabilityBaseline.repository}</code>
          </p>
          <p>
            Source revision{" "}
            <code>{model.capabilityBaseline.sourceRevision}</code>
          </p>
          <p>
            Production preview software{" "}
            <strong>
              {model.capabilityBaseline.productionSoftwareAvailable
                ? "yes"
                : "no"}
            </strong>{" "}
            · live incident receiver proven{" "}
            <strong>no</strong> · durable incident ledger proven{" "}
            <strong>no</strong> · live follow-up queue proven{" "}
            <strong>no</strong>
          </p>
        </article>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authorized projection</p>
            <h2>Current Comms read-model state</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <span
            className={
              "reviewStatus reviewStatus--" +
              stateClass(model.projectionState)
            }
          >
            {model.projectionState}
          </span>
          <h3>
            {model.authorizedProjectionAvailable
              ? "Recorded Comms projection evidence"
              : "No accepted Comms projection"}
          </h3>
          <p>
            Projection fresh{" "}
            <strong>{model.projectionFresh ? "yes" : "no"}</strong> ·
            independently verified evidence{" "}
            <strong>
              {model.evidence?.independentlyVerified ? "yes" : "no"}
            </strong>
          </p>
          <p>
            Current real incident count known{" "}
            <strong>
              {model.realIncidentCountKnown ? "yes" : "no"}
            </strong>{" "}
            · current real follow-up count known{" "}
            <strong>
              {model.realFollowUpCountKnown ? "yes" : "no"}
            </strong>
          </p>
          {model.storageEvidence ? (
            <p>
              Recorded projection{" "}
              <code>{model.storageEvidence.projectionId}</code> · observed{" "}
              <strong>{model.storageEvidence.observedAt}</strong> · expires{" "}
              <strong>{model.storageEvidence.expiresAt}</strong>
            </p>
          ) : (
            <p>
              Runtime has no authority to create verified Comms evidence.
              Missing evidence remains PREVIEW_ONLY.
            </p>
          )}
        </article>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Incident read model</p>
            <h2>Correlation groups</h2>
          </div>
        </div>
        {model.incidents.length ? (
          <div className="reviewBatchList">
            {model.incidents.map((incident) => (
              <article
                className="reviewBatchSummary"
                key={incident.correlationId}
              >
                <span className="reviewStatus">
                  {incident.priority} · {incident.freshness}
                </span>
                <h3>{incident.correlationId}</h3>
                <p>
                  Sources{" "}
                  <strong>{incident.sourceIds.join(", ")}</strong> ·
                  timeline entries{" "}
                  <strong>{incident.timelineCount}</strong> · latest{" "}
                  <strong>{incident.latestOccurredAt}</strong>
                </p>
                <p>{incident.guidance}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No independently verified Comms incident projection is available.
            This does not mean there are zero incidents.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Follow-up read model</p>
            <h2>Evidence-aware suggestions</h2>
          </div>
        </div>
        {model.followUpSuggestions.length ? (
          <div className="reviewBatchList">
            {model.followUpSuggestions.map((item) => (
              <article
                className="reviewBatchSummary"
                key={item.correlationId}
              >
                <span className="reviewStatus">
                  {item.priority} · {item.state}
                </span>
                <h3>{item.correlationId}</h3>
                <p>{item.guidance}</p>
                <p>
                  Task created <strong>no</strong> · notification sent{" "}
                  <strong>no</strong> · acknowledgement recorded{" "}
                  <strong>no</strong> · route changed{" "}
                  <strong>no</strong>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No authorized follow-up projection is available. AI Data Platform
            does not create Comms tasks from missing or preview evidence.
          </div>
        )}
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source impact</p>
            <h2>Six-source projection summary</h2>
          </div>
        </div>
        {model.sourceImpact.length ? (
          <div className="tableScroll">
            <table>
              <caption>
                Authorized Comms source-impact projection
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Groups</th>
                  <th scope="col">Timeline</th>
                  <th scope="col">Attention</th>
                  <th scope="col">Highest priority</th>
                </tr>
              </thead>
              <tbody>
                {model.sourceImpact.map((item) => (
                  <tr key={item.sourceId}>
                    <th scope="row">{item.sourceId}</th>
                    <td>{item.correlatedGroups}</td>
                    <td>{item.timelineEntries}</td>
                    <td>{item.attentionGroups}</td>
                    <td>{item.highestPriority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="emptyState">
            Source impact is unknown until an independently verified
            projection is recorded.
          </div>
        )}
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Authority remains in Comms Hub.</strong>
        <p>
          This surface cannot send or acknowledge a message, assign an
          operator, change a route, close an incident, create a follow-up task,
          change tenant membership or alter any six-source connection state.
        </p>
      </section>
    </main>
  );
}
