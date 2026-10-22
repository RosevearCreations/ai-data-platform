import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostNextCorrectiveGenerationReclosureForUser } from "@/lib/post-next-corrective-generation-reclosure-regression";
import { PostNextCorrectiveGenerationReclosureWorkbench } from "./PostNextCorrectiveGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostNextCorrectiveGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-next-corrective-generation-reclosure"
    );
  }

  const model = await listPostNextCorrectiveGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 104</p>
        <h1>Post-Next-Corrective-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 102 package after verified Build 103 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-closure">
            Next corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-recurrence-planning">
            Build 105 recurrence re-triage & following corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-recurrence-planning">
            Build 101 continuation-cycle recurrence re-triage & next corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-cycle-reclosure">
            Predecessor post-continuation-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-delivery">
            Next corrective-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostNextCorrectiveGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
