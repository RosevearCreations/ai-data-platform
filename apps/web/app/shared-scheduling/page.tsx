import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listSharedSchedulingForUser } from "@/lib/shared-scheduling-database";

import { HelpInfo } from "../help/HelpInfo";
import { SharedSchedulingConsole } from "./SharedSchedulingConsole";

export const dynamic = "force-dynamic";

export default async function SharedSchedulingPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 299</p>
          <h1>Shared Scheduling, Appointments &amp; Calendar Exchange</h1>
          <p className="lead">
            Sign in to prepare governed cross-application schedule items and held calendar exchange packages.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/shared-scheduling">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const model = await listSharedSchedulingForUser(session.user.id);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">Build 299 · governed cross-app scheduling</p>
        <h1>Shared Scheduling, Appointments &amp; Calendar Exchange</h1>
        <p className="lead">
          Prepare appointments, bookings, jobs, maintenance windows and calendar events
          using the shared booking contract, with local overlap evidence and no silent
          write into a peer application calendar.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/shared-task-exchange">Shared tasks</Link>
          <Link className="secondaryButton" href="/data-contracts">Data contracts</Link>
          <Link className="secondaryButton" href="/notification-consent">Notification &amp; consent</Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 299 authorization boundary</strong>
        <p>
          Schedule items and exchange packages remain <code>held</code>. Local overlap
          checks compare only held AI Data Platform records; they do not claim peer
          calendar availability. Approval records readiness for a future governed handoff,
          performs no peer calendar write and does not resume QL-266.
        </p>
      </section>

      <SharedSchedulingConsole
        model={{
          workspaces:model.workspaces.map(workspace=>({
            id:workspace.id,
            name:workspace.name,
            role:workspace.role
          })),
          items:model.items.map(item=>({
            ...item,
            startAt:item.startAt.toISOString(),
            endAt:item.endAt?.toISOString() ?? null,
            createdAt:item.createdAt.toISOString()
          })),
          conflicts:model.conflicts.map(item=>({
            ...item,
            recordedAt:item.recordedAt.toISOString()
          })),
          packages:model.packages.map(item=>({
            ...item,
            startAt:item.startAt.toISOString(),
            endAt:item.endAt?.toISOString() ?? null,
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
