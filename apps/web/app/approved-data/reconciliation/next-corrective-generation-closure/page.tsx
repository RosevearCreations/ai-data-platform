import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCorrectiveGenerationClosureForUser } from "@/lib/next-corrective-generation-delivery-reconciliation";

import { NextCorrectiveGenerationClosureWorkbench } from "./NextCorrectiveGenerationClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCorrectiveGenerationClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-corrective-generation-closure"
    );
  }

  const model = await listNextCorrectiveGenerationClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 103</p>
        <h1>Next Corrective-Generation Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 102 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-closure">
            Predecessor continuation-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-cycle-reclosure">
            Predecessor post-continuation-cycle monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-delivery">
            Continuation-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-recurrence-planning">
            Successive-cycle recurrence re-triage & next-corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextCorrectiveGenerationClosureWorkbench initialModel={model} />
    </main>
  );
}
