import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listConnectorOverviewForUser } from "@/lib/connector-database";

import { ConnectorManager } from "./ConnectorManager";
import { HelpInfo } from "../help/HelpInfo";
import { OperationsAreaBand } from "../OperationsCommandPanels";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="connectors-overview" />
          <p className="eyebrow">Build 289 · Shared transport standard</p>
          <h1>Rosevear Shared Connector SDK 2.0</h1>
          <p className="lead">
            Sign in to review SDK v2 connector grants, transport policy and execution evidence.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/connectors">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const overview = await listConnectorOverviewForUser(session.user.id);
  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="connectors-overview" />
        <p className="eyebrow">Build 289 · Shared transport standard</p>
        <h1>Rosevear Shared Connector SDK 2.0</h1>
        <p className="lead">
          Standardized authentication, HTTPS requests, bounded retry, pagination,
          health checks and normalized errors run behind explicit workspace grants,
          bounded server execution and append-only audit evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/connector-setup">Setup Wizard</Link>
          <Link className="secondaryButton" href="/">Back to platform</Link>
        </div>
      </section>
      <OperationsAreaBand
        area="I.T."
        description="Connector grants, execution controls, remote-provider workflows and append-only technical evidence."
        links={[
          { label: "Schema Drift", href: "/schema-drift" },
          { label: "Remote Execution", href: "/remote-execution" },
          { label: "Delivery", href: "/integration-delivery" },
          { label: "Retention", href: "/retention" }
        ]}
      />

      <ConnectorManager
        manifests={overview.manifests}
        workspaces={overview.workspaces.map((entry) => ({
          id: entry.workspace.id,
          name: entry.workspace.name,
          role: entry.workspace.role,
          installations: entry.installations.map((item) => ({
            connectorKey: item.connectorKey,
            enabled: item.enabled,
            config: item.config,
            grantedCapabilities: item.grantedCapabilities,
            secretRefs: item.secretRefs,
            connectorVersion: item.connectorVersion,
            manifestVersion: item.manifestVersion,
            sdkVersion: item.sdkVersion
          })),
          audit: entry.audit.map((item) => ({
            auditId: item.auditId,
            connectorKey: item.connectorKey,
            capability: item.capability,
            status: item.status,
            durationMs: item.durationMs,
            errorCode: item.errorCode,
            sdkVersion: item.sdkVersion,
            manifestVersion: item.manifestVersion,
            transportKind: item.transportKind,
            requestCount: item.requestCount,
            retryCount: item.retryCount,
            pageCount: item.pageCount,
            healthCheckCount: item.healthCheckCount,
            createdAt: item.createdAt.toISOString()
          }))
        }))}
      />
    </main>
  );
}
