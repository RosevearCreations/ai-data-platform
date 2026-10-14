import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostNextGenerationReclosureForUser } from "@/lib/post-next-generation-reclosure-regression";
import { PostNextGenerationReclosureWorkbench } from "./PostNextGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostNextGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-next-generation-reclosure"
    );
  }

  const model = await listPostNextGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 064</p>
        <h1>Post-Next-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 062 package after verified Build 063 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-closure">
            Next-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/second-recurrence-planning">
            Second-recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-delivery">
            Next-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostNextGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
