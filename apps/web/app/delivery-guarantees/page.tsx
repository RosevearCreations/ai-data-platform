import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listDeliveryGuaranteesForUser } from "@/lib/event-delivery-guarantees-database";

import { HelpInfo } from "../help/HelpInfo";
import { DeliveryGuaranteesConsole } from "./DeliveryGuaranteesConsole";

export const dynamic = "force-dynamic";

export default async function DeliveryGuaranteesPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 293</p>
          <h1>Idempotency, Duplicate Prevention &amp; Delivery Guarantees</h1>
          <p className="lead">
            Sign in to review internal delivery identities, attempt reservations
            and duplicate-suppression evidence.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/delivery-guarantees"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listDeliveryGuaranteesForUser(
    session.user.id
  );

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">
          Build 293 · exactly-once internal intent
        </p>
        <h1>Idempotency, Duplicate Prevention &amp; Delivery Guarantees</h1>
        <p className="lead">
          Assign deterministic logical-delivery identities, reserve each
          original or replay attempt at most once, and retain immutable
          duplicate decisions before any future outbound delivery is allowed.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/event-bus">
            Event bus
          </Link>
          <Link className="secondaryButton" href="/event-recovery">
            Recovery console
          </Link>
          <Link className="secondaryButton" href="/integration-delivery">
            Delivery evidence
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 293 boundary</strong>
        <p>
          Exactly-once applies to the durable internal delivery intent, not to an
          external side effect. Every attempt reservation remains held. Build 293
          performs no outbound network delivery, does not auto-release routes and
          does not resume QL-266.
        </p>
      </section>

      <DeliveryGuaranteesConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          intents: model.intents.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString()
          })),
          reservations: model.reservations.map((item) => ({
            ...item,
            reservedAt: item.reservedAt.toISOString()
          })),
          duplicateDecisions: model.duplicateDecisions.map((item) => ({
            ...item,
            observedAt: item.observedAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
