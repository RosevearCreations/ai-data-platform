import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFollowingCycleRecurrencePlanningForUser } from "@/lib/following-cycle-recurrence-planning";

import { FollowingCycleRecurrencePlanningWorkbench } from "./FollowingCycleRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function FollowingCycleRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ffollowing-cycle-recurrence-planning"
    );
  }

  const model = await listFollowingCycleRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 089</p>
        <h1>
          Following-Cycle Recurrence Re-Triage & Subsequent-Cycle Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 088 following-cycle recurrence evidence into a new planning
          generation without rewriting the Build 085–088 following-cycle corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-following-cycle-reclosure"
          >
            Post-following-cycle recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/following-cycle-delivery"
          >
            Following-cycle delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/following-cycle-closure"
          >
            Following-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-cycle-recurrence-planning"
          >
            Predecessor next-cycle recurrence re-triage & following-cycle planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <FollowingCycleRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
