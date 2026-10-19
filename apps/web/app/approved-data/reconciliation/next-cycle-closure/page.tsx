import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCycleCorrectiveClosureForUser } from "@/lib/next-cycle-corrective-delivery-reconciliation";

import { NextCycleCorrectiveClosureWorkbench } from "./NextCycleCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCycleCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-cycle-closure"
    );
  }

  const model = await listNextCycleCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 083</p>
        <h1>Continuation-Generation Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 082 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-cycle-reclosure">
            Post-next-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-generation-reclosure">
            Predecessor post-continuation-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-delivery">
            Continuation-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-recurrence-planning">
            Successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextCycleCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
