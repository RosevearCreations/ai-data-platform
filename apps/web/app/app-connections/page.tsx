import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildAppConnectionRegistry } from "@/lib/app-connection-registry";
import { buildSharedApplicationIdentityMap } from "@/lib/application-identity-mapping";

export const dynamic = "force-dynamic";

export default async function AppConnectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fapp-connections");

  const registry = buildAppConnectionRegistry();
  const mapping = buildSharedApplicationIdentityMap();

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
      <p className="srOnly">
        Build 281 historical compatibility: Unified App Connection Registry &amp; Capability Discovery.
        All six peer apps remain DISCONNECTED.
      </p>
      <section className="hero reviewHero">
        <p className="eyebrow">Build 282 · Shared connectivity identity</p>
        <h1>Shared Application Identity, Environment &amp; Tenant Mapping</h1>
        <p className="lead">
          Stable peer-application identities, controlled aliases, normalized
          environments and evidence-backed tenant/workspace bindings now sit on top
          of the Build 281 connection registry. Mapping remains read-only and does
          not activate a connection.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">
            Cross-App Data Contracts
          </Link>
          <Link className="secondaryButton" href="/connector-setup">
            Connector Setup Wizard
          </Link>
          <Link className="secondaryButton" href="/connectors">
            Connector Manager
          </Link>
          <Link className="secondaryButton" href="/connector-diagnostics">
            Connector Diagnostics
          </Link>
          <a className="secondaryButton" href="/api/app-connections">
            Registry JSON
          </a>
          <a className="secondaryButton" href="/api/app-connections/mappings">
            Mapping JSON
          </a>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Shared application identity summary">
        <div className="commandMetrics">
          <article>
            <strong>{mapping.summary.applications}</strong>
            <span>stable peer identities</span>
          </article>
          <article>
            <strong>{mapping.summary.mappedWorkspaces}</strong>
            <span>evidence-backed workspace bindings</span>
          </article>
          <article>
            <strong>{mapping.summary.unmappedWorkspaces}</strong>
            <span>intentionally unmapped workspaces</span>
          </article>
          <article>
            <strong>{mapping.summary.productionIntegrationV1Eligible}</strong>
            <span>production Integration v1 mappings</span>
          </article>
          <article>
            <strong>{mapping.summary.automaticTenantProvisioning}</strong>
            <span>automatically provisioned tenants</span>
          </article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 282 identity boundary</strong>
        <p>
          Logical tenant keys and environment aliases are routing metadata only.
          Build 282 creates no tenant, no workspace, no credential and no live
          authorization. QL-266 remains UNDER_REVIEW / REVIEW_DEFERRED /
          DISCONNECTED.
        </p>
      </section>

      <section className="reviewQueue" aria-labelledby="shared-app-mapping">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Authoritative shared mapping</p>
            <h2 id="shared-app-mapping">Application identity &amp; workspace binding</h2>
          </div>
        </div>
        <div className="reviewBatchList">
          {mapping.applications.map((app) => {
            const registryApp = registry.peerApplications.find(
              (item) => item.id === app.applicationId
            );

            return (
              <article className="reviewBatchSummary" key={app.applicationId}>
                <div>
                  <span className="reviewStatus">{app.workspace.state}</span>
                  <h3>{app.displayName}</h3>
                  <p>
                    <strong>Identity:</strong> {app.identityKey}
                  </p>
                  <p>
                    <strong>Logical tenant:</strong> {app.canonicalTenantKey} ·{" "}
                    {app.tenantBindingState}
                  </p>
                  <p>
                    <strong>Workspace:</strong>{" "}
                    {app.workspace.state === "mapped"
                      ? app.workspace.workspaceSlug + " · " + app.workspace.workspaceId
                      : "No durable AI Data Platform workspace binding"}
                  </p>
                  <p>
                    <strong>Aliases:</strong> {app.aliases.join(", ")}
                  </p>
                  <p>
                    <strong>Environments:</strong>{" "}
                    {app.environments
                      .map(
                        (environment) =>
                          environment.canonical +
                          " → " +
                          (environment.integrationEnvironment ?? "no Integration v1 transport")
                      )
                      .join(" · ")}
                  </p>
                  <p>
                    <strong>Connection:</strong>{" "}
                    {registryApp?.connectionState ?? "DISCONNECTED"} · gateway business{" "}
                    {app.gatewayBusinessId ?? "not declared"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Existing workspaces are authoritative.</strong>
        <p>
          Rosie Dazzlers and Devil n Dove map to their durable platform workspaces.
          Yard Workers, iCamp, Rosevear Comms Hub and Rosevear AI Hub remain
          explicitly unmapped rather than receiving invented workspace rows.
          Production also remains ineligible for the current nonproduction-only
          Integration v1 gateway.
        </p>
      </section>
      <section className="dataQualityPolicyNote" aria-label="Comms Hub navigation">
        <strong>Rosevear Comms Hub · six-source connection centre</strong>
        <p><a href="https://rosevear-comms-hub.devilndovelive.workers.dev/" target="_blank" rel="noopener noreferrer">Open the Comms Hub I.T. connection centre</a> — public contracts observed; HOLD, 0/6 authenticated private connections. No new customer access.</p>
      </section>
    </main>
  );
}
