import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostUnifiedCorrectiveGenerationReclosureForUser } from "@/lib/post-unified-corrective-generation-reclosure-regression";

import { PostUnifiedCorrectiveGenerationReclosureWorkbench } from "./PostUnifiedCorrectiveGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostUnifiedCorrectiveGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-unified-corrective-generation-reclosure"
    );
  }

  const model = await listPostUnifiedCorrectiveGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 113</p>
        <h1>Post-Unified Corrective-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Re-read the exact accepted package after verified re-closure, preserve stable or
          recurrent evidence, and when recurrence is explicitly governed, atomically create
          the next generation-agnostic successor source.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-closure">
            Build 112 verified re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Build 109 lineage registry
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-planning">
            Unified planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>

      <PostUnifiedCorrectiveGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
