import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationCycleCorrectiveClosureForUser } from "@/lib/continuation-cycle-corrective-delivery-reconciliation";

import { ContinuationCycleCorrectiveClosureWorkbench } from "./ContinuationCycleCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationCycleCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-cycle-closure"
    );
  }

  const model = await listContinuationCycleCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 099</p>
        <h1>Successive-Cycle Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 098 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-cycle-reclosure">
            Post-continuation-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-cycle-reclosure">
            Predecessor post-successive-cycle monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-delivery">
            Successive-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-recurrence-planning">
            Subsequent-cycle recurrence re-triage & continuation-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <ContinuationCycleCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
