import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostSubsequentCycleReclosureForUser } from "@/lib/post-subsequent-cycle-reclosure-regression";
import { PostSubsequentCycleReclosureWorkbench } from "./PostSubsequentCycleReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostSubsequentCycleReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-subsequent-cycle-reclosure"
    );
  }

  const model = await listPostSubsequentCycleReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 092</p>
        <h1>Post-Following-Cycle Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 090 package after verified Build 091 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-closure">
            Following-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-cycle-reclosure">
            Predecessor following-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-delivery">
            Following-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostSubsequentCycleReclosureWorkbench initialModel={model} />
    </main>
  );
}
