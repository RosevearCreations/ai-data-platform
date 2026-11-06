import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listSharedTaskExchangeForUser } from "@/lib/shared-task-exchange-database";

import { HelpInfo } from "../help/HelpInfo";
import { SharedTaskExchangeConsole } from "./SharedTaskExchangeConsole";

export const dynamic = "force-dynamic";

export default async function SharedTaskExchangePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 298</p>
          <h1>Shared Tasks, Follow-Ups &amp; Work Queue Exchange</h1>
          <p className="lead">
            Sign in to create governed shared tasks, link follow-ups and review held cross-application work packages.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/shared-task-exchange">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listSharedTaskExchangeForUser(session.user.id);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">Build 298 · governed cross-app work queue</p>
        <h1>Shared Tasks, Follow-Ups &amp; Work Queue Exchange</h1>
        <p className="lead">
          Convert governed exceptions and follow-ups into linked work items,
          prepare destination packages and retain review evidence without silently
          creating tasks inside peer applications.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/attention">Attention center</Link>
          <Link className="secondaryButton" href="/event-recovery">Recovery console</Link>
          <Link className="secondaryButton" href="/notification-consent">Notification &amp; consent</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 298 authorization boundary</strong>
        <p>
          Shared tasks and packages remain <code>held</code>. Owner/admin approval
          records readiness for a future governed peer handoff; it performs no peer
          application write, no outbound network request and does not resume QL-266.
        </p>
      </section>

      <SharedTaskExchangeConsole
        model={{
          workspaces:model.workspaces.map(workspace=>({
            id:workspace.id,
            name:workspace.name,
            role:workspace.role
          })),
          tasks:model.tasks.map(item=>({
            ...item,
            dueAt:item.dueAt?.toISOString() ?? null,
            createdAt:item.createdAt.toISOString()
          })),
          links:model.links.map(item=>({
            ...item,
            createdAt:item.createdAt.toISOString()
          })),
          packages:model.packages.map(item=>({
            ...item,
            reviewedAt:item.reviewedAt?.toISOString() ?? null,
            createdAt:item.createdAt.toISOString()
          })),
          summary:model.summary,
          policy:model.policy
        }}
      />
    </main>
  );
}
