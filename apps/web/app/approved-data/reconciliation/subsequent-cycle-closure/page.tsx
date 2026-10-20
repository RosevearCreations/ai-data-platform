import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSubsequentCycleCorrectiveClosureForUser } from "@/lib/subsequent-cycle-corrective-delivery-reconciliation";

import { SubsequentCycleCorrectiveClosureWorkbench } from "./SubsequentCycleCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function SubsequentCycleCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsubsequent-cycle-closure"
    );
  }

  const model = await listSubsequentCycleCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 091</p>
        <h1>Subsequent-Cycle Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 090 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-cycle-reclosure">
            Predecessor post-following-cycle monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-delivery">
            Subsequent-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-recurrence-planning">
            Following-cycle recurrence re-triage & subsequent-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SubsequentCycleCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
