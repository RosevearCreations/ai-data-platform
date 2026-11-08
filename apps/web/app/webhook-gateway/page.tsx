import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listWebhookGatewayForUser } from "@/lib/webhook-gateway-database";

import { HelpInfo } from "../help/HelpInfo";
import { WebhookGatewayCenter } from "./WebhookGatewayCenter";

export const dynamic = "force-dynamic";

export default async function WebhookGatewayPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 290</p>
          <h1>Webhook Gateway &amp; Event Intake Center</h1>
          <p className="lead">
            Sign in to configure signed inbound event endpoints and inspect durable receipts.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/webhook-gateway"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listWebhookGatewayForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 290 · signed inbound events
        </p>
        <h1>Webhook Gateway &amp; Event Intake Center</h1>
        <p className="lead">
          Create workspace-scoped endpoints, require HMAC-signed event envelopes,
          reject stale or replayed event IDs, and preserve immutable intake receipts
          without dispatching events downstream yet.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/connectors">
            Connector SDK 2.0
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            App Connection Registry
          </Link>
          <Link className="secondaryButton" href="/event-bus">
            Event Bus
          </Link>
          <Link className="secondaryButton" href="/integration-delivery">
            Delivery evidence
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 290 boundary</strong>
        <p>
          Endpoint creation and enablement are explicit owner/admin actions.
          Webhook secrets remain environment-variable references only. Accepted
          events are durably recorded, but Build 290 does not publish them to an
          event bus or activate any cross-application connection.
        </p>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 322 inbound endpoint module</strong>
        <p>
          Build 290 intake is now packaged for host use with callback-route
          metadata, receipt search, host-event translation and durable endpoint
          revocation. Secrets remain environment-variable references, and neither
          callback routing nor event translation performs outbound dispatch.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/api/module-inbound-endpoints">
            View inbound endpoint module
          </Link>
        </div>
      </section>

      <WebhookGatewayCenter
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          endpoints: model.endpoints.map((endpoint) => ({
            ...endpoint,
            createdAt: endpoint.createdAt.toISOString(),
            updatedAt: endpoint.updatedAt.toISOString()
          })),
          receipts: model.receipts.map((receipt) => ({
            ...receipt,
            eventOccurredAt:
              receipt.eventOccurredAt.toISOString(),
            receivedAt: receipt.receivedAt.toISOString()
          })),
          audit: model.audit.map((event) => ({
            ...event,
            occurredAt: event.occurredAt.toISOString()
          })),
          sourceApplications: model.sourceApplications,
          contract: model.contract,
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
