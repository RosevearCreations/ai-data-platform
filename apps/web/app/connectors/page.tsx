import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listConnectorOverviewForUser } from "@/lib/connector-database";

import { ConnectorManager } from "./ConnectorManager";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Build 029</p>
          <h1>Plugin & connector SDK</h1>
          <p className="lead">
            Sign in to configure workspace-scoped connector grants and execution evidence.
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
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Build 029</p>
        <h1>Plugin & connector SDK</h1>
        <p className="lead">
          Versioned import, enrichment and approved-export connectors run behind
          explicit workspace grants, bounded server execution and append-only audit.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Back to platform</Link>
        </div>
      </section>
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
            connectorVersion: item.connectorVersion
          })),
          audit: entry.audit.map((item) => ({
            auditId: item.auditId,
            connectorKey: item.connectorKey,
            capability: item.capability,
            status: item.status,
            durationMs: item.durationMs,
            errorCode: item.errorCode,
            createdAt: item.createdAt.toISOString()
          }))
        }))}
      />
    </main>
  );
}
