import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostSuccessiveCycleReclosureForUser } from "@/lib/post-successive-cycle-reclosure-regression";
import { PostSuccessiveCycleReclosureWorkbench } from "./PostSuccessiveCycleReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostSuccessiveCycleReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-successive-cycle-reclosure"
    );
  }

  const model = await listPostSuccessiveCycleReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 096</p>
        <h1>Post-Successive-Cycle Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 094 package after verified Build 095 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-closure">
            Successive-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning">
            Subsequent-cycle recurrence re-triage & successive-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-cycle-reclosure">
            Predecessor post-subsequent-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-delivery">
            Successive-cycle corrective delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostSuccessiveCycleReclosureWorkbench initialModel={model} />
    </main>
  );
}
