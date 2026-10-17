import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostContinuationGenerationReclosureForUser } from "@/lib/post-continuation-generation-reclosure-regression";
import { PostContinuationGenerationReclosureWorkbench } from "./PostContinuationGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostContinuationGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-continuation-generation-reclosure"
    );
  }

  const model = await listPostContinuationGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 080</p>
        <h1>Post-Successive-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 078 package after verified Build 079 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-closure">
            Successive-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-recurrence-planning">
            Successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-recurrence-planning">
            Predecessor successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-delivery">
            Successive-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-generation-reclosure">
            Predecessor post-successive-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostContinuationGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
