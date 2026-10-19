import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFollowingCycleCorrectiveClosureForUser } from "@/lib/following-cycle-corrective-delivery-reconciliation";

import { FollowingCycleCorrectiveClosureWorkbench } from "./FollowingCycleCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function FollowingCycleCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ffollowing-cycle-closure"
    );
  }

  const model = await listFollowingCycleCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 087</p>
        <h1>Following-Cycle Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 086 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-cycle-reclosure">
            Predecessor post-next-cycle monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-delivery">
            Following-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-recurrence-planning">
            Next-cycle recurrence re-triage & following-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <FollowingCycleCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
