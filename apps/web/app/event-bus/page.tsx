import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listEventBusForUser } from "@/lib/event-bus-database";

import { HelpInfo } from "../help/HelpInfo";
import { EventBusManager } from "./EventBusManager";

export const dynamic = "force-dynamic";

export default async function EventBusPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 291</p>
          <h1>Cross-App Event Bus &amp; Subscription Manager</h1>
          <p className="lead">
            Sign in to create governed subscriptions and publish reviewed
            Build 290 receipts into the internal event bus.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/event-bus"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listEventBusForUser(session.user.id);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 291 · governed publish/subscribe routing
        </p>
        <h1>Cross-App Event Bus &amp; Subscription Manager</h1>
        <p className="lead">
          Publish reviewed webhook receipts into a workspace event bus,
          match them against explicit subscriptions, and create durable
          held routes without direct point-to-point application wiring.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/webhook-gateway">
            Webhook intake
          </Link>
          <Link className="secondaryButton" href="/event-recovery">
            Recovery console
          </Link>
          <Link className="secondaryButton" href="/delivery-guarantees">
            Delivery guarantees
          </Link>
          <Link className="secondaryButton" href="/app-connections">
            App registry
          </Link>
          <Link className="secondaryButton" href="/integration-delivery">
            Delivery evidence
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 291 boundary</strong>
        <p>
          Subscriptions are created as drafts and must be explicitly activated.
          Publishing a reviewed receipt only creates internal durable routes.
          Every matched route remains held with
          <code>delivery-not-authorized</code>; Build 291 sends no network
          request and does not activate QL-266.
        </p>
      </section>

      <EventBusManager
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          sourceApplications: model.sourceApplications,
          subscriptions: model.subscriptions.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString()
          })),
          publications: model.publications.map((item) => ({
            ...item,
            publishedAt: item.publishedAt.toISOString()
          })),
          routes: model.routes.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString()
          })),
          availableReceipts: model.availableReceipts.map((item) => ({
            ...item,
            receivedAt: item.receivedAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
