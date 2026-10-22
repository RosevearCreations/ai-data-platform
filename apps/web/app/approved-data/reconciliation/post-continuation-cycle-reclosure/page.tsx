import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostContinuationCycleReclosureForUser } from "@/lib/post-continuation-cycle-reclosure-regression";
import { PostContinuationCycleReclosureWorkbench } from "./PostContinuationCycleReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostContinuationCycleReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-continuation-cycle-reclosure"
    );
  }

  const model = await listPostContinuationCycleReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 100</p>
        <h1>Post-Continuation-Cycle Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 098 package after verified Build 099 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-closure">
            Continuation-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-recurrence-planning">
            Build 101 recurrence re-triage & next corrective-planning generation
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-recurrence-planning">
            Successive-cycle recurrence re-triage & continuation-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-cycle-reclosure">
            Predecessor post-successive-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-delivery">
            Continuation-cycle corrective delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostContinuationCycleReclosureWorkbench initialModel={model} />
    </main>
  );
}
