import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostNextCycleReclosureForUser } from "@/lib/post-next-cycle-reclosure-regression";
import { PostNextCycleReclosureWorkbench } from "./PostNextCycleReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostNextCycleReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-next-cycle-reclosure"
    );
  }

  const model = await listPostNextCycleReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 084</p>
        <h1>Post-Continuation-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 082 package after verified Build 083 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-closure">
            Continuation-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-recurrence-planning">
            Continuation-generation recurrence re-triage & next-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-recurrence-planning">
            Predecessor continuation-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-delivery">
            Successive-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-generation-reclosure">
            Predecessor post-continuation-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostNextCycleReclosureWorkbench initialModel={model} />
    </main>
  );
}
