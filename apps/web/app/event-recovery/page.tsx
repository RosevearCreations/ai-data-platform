import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listEventRecoveryForUser } from "@/lib/event-recovery-database";

import { HelpInfo } from "../help/HelpInfo";
import { EventRecoveryConsole } from "./EventRecoveryConsole";

export const dynamic = "force-dynamic";

export default async function EventRecoveryPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 292</p>
          <h1>Event Replay, Dead-Letter Queue &amp; Recovery Console</h1>
          <p className="lead">
            Sign in to review internal event-bus failures and recovery evidence.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/event-recovery"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listEventRecoveryForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 292 · reviewed replay and recovery
        </p>
        <h1>Event Replay, Dead-Letter Queue &amp; Recovery Console</h1>
        <p className="lead">
          Persist internal route failures, review dead-letter cases,
          request bounded replays, and retain immutable recovery evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/event-bus">
            Event bus
          </Link>
          <Link className="secondaryButton" href="/webhook-gateway">
            Webhook intake
          </Link>
          <Link className="secondaryButton" href="/delivery-guarantees">
            Delivery guarantees
          </Link>
          <Link className="secondaryButton" href="/integration-delivery">
            Delivery evidence
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 292 boundary</strong>
        <p>
          Replay creates a new internal route only. Every replay route remains
          held with <code>recovery-replay-not-authorized</code>. Build 292 has
          no outbound delivery worker, no automatic retry loop and does not
          resume QL-266.
        </p>
      </section>

      <EventRecoveryConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          routeCandidates: model.routeCandidates.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString()
          })),
          deadLetters: model.deadLetters.map((item) => ({
            ...item,
            enteredAt: item.enteredAt.toISOString()
          })),
          replayRoutes: model.replayRoutes.map((item) => ({
            ...item,
            requestedAt: item.requestedAt.toISOString(),
            createdAt: item.createdAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
