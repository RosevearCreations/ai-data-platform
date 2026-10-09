import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { integrationConsumerConfiguration } from "@/lib/integration-delivery";
import { listIntegrationDeliveryOverviewForUser } from "@/lib/integration-delivery-database";

import { HelpInfo } from "../help/HelpInfo";
import { IntegrationDeliveryPanel } from "./IntegrationDeliveryPanel";

export const dynamic = "force-dynamic";

export default async function IntegrationDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 033</p>
          <h1>Integration consumer delivery</h1>
          <p className="lead">
            Sign in to review consumer conformance, handshake readiness and durable delivery acknowledgements.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/integration-delivery">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const overview = await listIntegrationDeliveryOverviewForUser(session.user.id);
  const consumers = (["rosie-dazzlers", "devil-n-dove"] as const).map((target) => {
    const config = integrationConsumerConfiguration(target);
    return {
      target,
      configured: config.configured,
      endpointOrigin: config.endpointOrigin,
      urlName: config.urlName,
      tokenName: config.tokenName
    };
  });

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">Build 033</p>
        <h1>Integration Consumer Acceptance & Delivery Observability</h1>
        <p className="lead">
          Prove the receiver contract first, then test an authenticated external
          handshake and one dry-run package. No Build 033 action authorizes
          downstream business-system mutation.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/intelligence">Integration evidence</Link>
          <Link className="secondaryButton" href="/production-learning">Production learning</Link>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Consumer configuration</p>
            <h2>Fail-closed receiver readiness</h2>
          </div>
          <HelpInfo topic="integration-delivery" />
        </div>
        <div className="grid">
          {consumers.map((consumer) => (
            <article className="card" key={consumer.target}>
              <h3>{consumer.target}</h3>
              <p>
                {consumer.configured
                  ? "Configured for authenticated dry-run delivery."
                  : "No endpoint/credential pair is configured."}
              </p>
              <span className="badge">
                {consumer.endpointOrigin ?? "external consumer gated"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <IntegrationDeliveryPanel
        consumers={consumers}
        workspaces={overview.map((entry) => ({
          id: entry.workspace.id,
          name: entry.workspace.name,
          role: entry.workspace.role,
          batches: entry.eligibleBatches
        }))}
      />

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2>Recent delivery acknowledgements</h2>
          </div>
          <HelpInfo topic="integration-delivery" />
        </div>
        <div className="grid">
          {overview.flatMap((entry) =>
            entry.recent.slice(0, 8).map((event) => (
              <article className="card" key={entry.workspace.id + ":" + event.eventId}>
                <h3>{event.eventType}</h3>
                <p>
                  {entry.workspace.name} · {event.target} · {event.transportMode}
                </p>
                <p>
                  {event.validationCode}
                  {event.httpStatus ? " · HTTP " + event.httpStatus : ""}
                </p>
                <span className="badge">{event.occurredAt.toLocaleString()}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
