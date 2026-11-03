import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildAppConnectionRegistry } from "@/lib/app-connection-registry";

export const dynamic = "force-dynamic";

export default async function AppConnectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fapp-connections");

  const registry = buildAppConnectionRegistry();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 281 · Unified connectivity foundation</p>
        <h1>Unified App Connection Registry &amp; Capability Discovery</h1>
        <p className="lead">
          One authoritative catalog for the six peer applications, their repositories,
          safe discovery surfaces and currently declared Integration v1 capabilities.
          Discovery is read-only and does not activate a live connection.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/connectors">
            Connector Manager
          </Link>
          <Link className="secondaryButton" href="/connector-diagnostics">
            Connector Diagnostics
          </Link>
          <Link className="secondaryButton" href="/integration-delivery">
            Integration Delivery
          </Link>
          <a className="secondaryButton" href="/api/app-connections">
            Registry JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Application connection registry summary">
        <div className="commandMetrics">
          <article>
            <strong>{registry.summary.applications}</strong>
            <span>peer applications catalogued</span>
          </article>
          <article>
            <strong>{registry.summary.gatewayReadOnlyReady}</strong>
            <span>gateway read-only discovery ready</span>
          </article>
          <article>
            <strong>{registry.summary.catalogOnly}</strong>
            <span>catalog-only applications</span>
          </article>
          <article>
            <strong>{registry.summary.disconnected}</strong>
            <span>connections still disconnected</span>
          </article>
          <article>
            <strong>{registry.summary.mutatingCapabilitiesDiscovered}</strong>
            <span>mutating capabilities enabled</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 281 safety boundary</strong>
        <p>
          Repository and capability discovery does not equal connection authorization.
          All six peer apps remain DISCONNECTED, automatic activation is disabled,
          and QL-266 remains UNDER_REVIEW / REVIEW_DEFERRED.
        </p>
      </section>

      <section className="reviewQueue" aria-labelledby="peer-app-registry">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authoritative peer-app registry</p>
            <h2 id="peer-app-registry">Applications &amp; discovery surfaces</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {registry.peerApplications.map((app) => (
            <article className="reviewBatchSummary" key={app.id}>
              <div>
                <span className="reviewStatus">{app.discoveryState}</span>
                <h3>{app.displayName}</h3>
                <p>{app.description}</p>
                <p>
                  <strong>Repository:</strong> {app.repository}
                </p>
                <p>
                  <strong>Connection:</strong> {app.connectionState} · owner authorization {app.ownerAuthorization}
                </p>
                <p>
                  <strong>Discovery capabilities:</strong>{" "}
                  {app.discoveryCapabilities.join(", ")}
                </p>
                <p>
                  <strong>Surfaces:</strong>{" "}
                  {app.discoverySurfaces
                    .filter((surface) => surface.enabled)
                    .map((surface) => surface.label)
                    .join(" · ")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Historical integration evidence remains separate.</strong>
        <p>
          Build 281 does not rewrite the older QL-246 six-application proof set.
          This registry is the new reusable peer-application catalog for future
          connection setup, field mapping, event routing and health dashboards.
        </p>
      </section>
    </main>
  );
}
