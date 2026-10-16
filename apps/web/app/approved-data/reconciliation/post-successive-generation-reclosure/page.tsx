import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostSuccessiveGenerationReclosureForUser } from "@/lib/post-successive-generation-reclosure-regression";
import { PostSuccessiveGenerationReclosureWorkbench } from "./PostSuccessiveGenerationReclosureWorkbench";

export const dynamic = "force-dynamic";

export default async function PostSuccessiveGenerationReclosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-successive-generation-reclosure"
    );
  }

  const model = await listPostSuccessiveGenerationReclosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 076</p>
        <h1>Post-Successive-Generation Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact Build 074 package after verified Build 075 re-closure,
          preserve stable and recurrent evidence, and reopen only through an
          explicit governed recurrence tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-closure">
            Successive-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-recurrence-planning">
            Successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-generation-recurrence-planning">
            Predecessor subsequent-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-delivery">
            Successive-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-generation-reclosure">
            Predecessor post-subsequent-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostSuccessiveGenerationReclosureWorkbench initialModel={model} />
    </main>
  );
}
