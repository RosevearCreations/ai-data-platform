import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveCycleCorrectiveClosureForUser } from "@/lib/successive-cycle-corrective-delivery-reconciliation";

import { SuccessiveCycleCorrectiveClosureWorkbench } from "./SuccessiveCycleCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveCycleCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-cycle-closure"
    );
  }

  const model = await listSuccessiveCycleCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 095</p>
        <h1>Successive-Cycle Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 094 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-cycle-reclosure">
            Predecessor post-subsequent-cycle monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-delivery">
            Successive-cycle delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning">
            Subsequent-cycle recurrence re-triage & successive-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessiveCycleCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
