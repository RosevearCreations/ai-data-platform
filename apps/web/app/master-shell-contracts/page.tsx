import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  buildMasterShellContractDescriptor,
  MASTER_SHELL_EVENT_SCHEMA_VERSION
} from "@/lib/master-shell-contract-v1";

export const dynamic = "force-dynamic";

export default async function MasterShellContractsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fmaster-shell-contracts");
  }

  const model = buildMasterShellContractDescriptor();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">
          Build 335 · Master Shell · Contract V{MASTER_SHELL_EVENT_SCHEMA_VERSION}
        </p>
        <h1>Correlation &amp; Standard Event Envelope</h1>
        <p className="lead">
          Define one fail-closed event contract for the six Rosevear source
          shells, preserving exact source identity, tenant boundaries,
          correlation, causation, idempotency, audience and evidence provenance.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/app-connections">
            Application Registry
          </Link>
          <Link className="secondaryButton" href="/data-contracts">
            Data Contracts
          </Link>
          <Link className="secondaryButton" href="/event-bus">
            Event Bus
          </Link>
          <a className="secondaryButton" href="/api/master-shell-contract-v1">
            Contract JSON
          </a>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Contract definition is not source acceptance.</strong>
        <p>
          Build 335 validates shape, identity and provenance but does not ingest
          source updates, upgrade legacy receipts into V1, activate a connection
          or claim any source is live. Source ingestion remains a later staged
          build, and missing evidence remains UNKNOWN or HOLD.
        </p>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exact source identities</p>
            <h2>Six source shells</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.sourceApplications.map((source) => (
            <article className="reviewBatchSummary" key={source.sourceId}>
              <div>
                <span className="reviewStatus">
                  <code>{source.sourceId}</code>
                  {" · "}<code>{source.shellId}</code>
                </span>
                <h3>{source.shellBoundary}</h3>
                <p>
                  Repository <code>{source.repository}</code>
                  {" · "}tenancy <code>{source.tenancyModel}</code>
                </p>
                {source.legacyInternalId ? (
                  <p>
                    Existing internal alias <code>{source.legacyInternalId}</code>
                    {" "}is retained as compatibility metadata and is not the
                    Master Shell source ID.
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Standard event envelope</p>
            <h2>Required provenance fields</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          <article className="reviewBatchSummary">
            <div>
              <span className="reviewStatus">
                {model.envelopeRequiredFields.length} required fields
              </span>
              <h3><code>{model.eventSchema}</code></h3>
              <p>
                {model.envelopeRequiredFields.join(" · ")}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Required event families</p>
            <h2>Master Shell V1 event vocabulary</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {model.eventFamilies.map((eventType) => (
            <article className="reviewBatchSummary" key={eventType}>
              <div>
                <span className="reviewStatus">V1 required family</span>
                <h3><code>{eventType}</code></h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Complementary Comms plane.</strong>
        <p>
          Rosevear Comms Hub is an authorized audience/control-plane identity,
          not a seventh child source in the six-source Master Shell registry.
          Commands and notifications remain separately authorized from events.
        </p>
      </section>
    </main>
  );
}
