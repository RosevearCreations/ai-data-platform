import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listRecurrentExceptionPlanningForUser } from "@/lib/recurrent-exception-planning";

import { RecurrentExceptionPlanningWorkbench } from "./RecurrentExceptionPlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function RecurrentExceptionPlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Frecurrent-planning"
    );
  }

  const model = await listRecurrentExceptionPlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 061</p>
        <h1>Recurrent Exception Re-Triage & Next-Generation Corrective Planning</h1>
        <p className="lead">
          Turn verified Build 060 recurrence evidence into a new decision
          generation without rewriting the original corrective, successor,
          re-closure or recurrence history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-reclosure-regression">
            Post-re-closure recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-closure">
            Successor reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <RecurrentExceptionPlanningWorkbench initialModel={model} />
    </main>
  );
}
