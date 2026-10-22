import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostFollowingCorrectiveGenerationReclosureForUser } from "@/lib/post-following-corrective-generation-reclosure-regression";
import { PostFollowingCorrectiveGenerationReclosureWorkbench } from "./PostFollowingCorrectiveGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostFollowingCorrectiveGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-following-corrective-generation-reclosure"
    );
  }

  const model = await listPostFollowingCorrectiveGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 108</p>
        <h1>Post-Following-Corrective-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 106 package after verified Build 107 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-corrective-generation-closure">
            Following corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Build 109 corrective-generation lineage registry
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-recurrence-planning">
            Build 105 next-corrective-generation recurrence re-triage & following corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-corrective-generation-reclosure">
            Predecessor post-next-corrective-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-corrective-generation-delivery">
            Following corrective-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostFollowingCorrectiveGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
