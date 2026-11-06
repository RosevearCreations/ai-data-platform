import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listNotificationConsentForUser } from "@/lib/notification-consent-database";

import { HelpInfo } from "../help/HelpInfo";
import { NotificationConsentConsole } from "./NotificationConsentConsole";

export const dynamic = "force-dynamic";

export default async function NotificationConsentPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 297</p>
          <h1>Cross-App Notification &amp; Consent Service</h1>
          <p className="lead">
            Sign in to record consent evidence and prepare consent-aware notification requests.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/notification-consent">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listNotificationConsentForUser(session.user.id);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">Build 297 · consent-aware notification coordination</p>
        <h1>Cross-App Notification &amp; Consent Service</h1>
        <p className="lead">
          Centralize channel consent, prepare shared notification requests and preserve
          delivery evidence while keeping Rosevear Comms Hub as the preferred operator.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-contracts">Shared contracts</Link>
          <Link className="secondaryButton" href="/delivery-guarantees">Delivery guarantees</Link>
          <Link className="secondaryButton" href="/event-recovery">Recovery console</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 297 authorization boundary</strong>
        <p>
          Requests are consent-checked and remain <code>held</code>. Approval records
          readiness for a future governed Comms Hub handoff; it does not dispatch email,
          SMS, push, voice or in-app messages and does not resume QL-266.
        </p>
      </section>

      <NotificationConsentConsole
        model={{
          workspaces: model.workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role
          })),
          consents: model.consents.map((item) => ({
            ...item,
            observedAt: item.observedAt.toISOString(),
            expiresAt: item.expiresAt?.toISOString() ?? null,
            recordedAt: item.recordedAt.toISOString()
          })),
          requests: model.requests.map((item) => ({
            ...item,
            requestedAt: item.requestedAt.toISOString(),
            scheduledAt: item.scheduledAt?.toISOString() ?? null,
            reviewedAt: item.reviewedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString()
          })),
          summary: model.summary,
          policy: model.policy
        }}
      />
    </main>
  );
}
