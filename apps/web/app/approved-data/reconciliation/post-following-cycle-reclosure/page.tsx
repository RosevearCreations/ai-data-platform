import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostFollowingCycleReclosureForUser } from "@/lib/post-following-cycle-reclosure-regression";
import { PostFollowingCycleReclosureWorkbench } from "./PostFollowingCycleReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostFollowingCycleReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-following-cycle-reclosure"
    );
  }

  const model = await listPostFollowingCycleReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 088</p>
        <h1>Post-Following-Cycle Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 086 package after verified Build 087 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-closure">
            Following-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-cycle-reclosure">
            Predecessor next-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-recurrence-planning">
            Following-cycle recurrence re-triage & subsequent-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-delivery">
            Following-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostFollowingCycleReclosureWorkbench initialModel={model} />
    </main>
  );
}
