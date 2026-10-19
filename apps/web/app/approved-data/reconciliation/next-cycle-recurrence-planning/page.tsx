import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCycleRecurrencePlanningForUser } from "@/lib/next-cycle-recurrence-planning";

import { NextCycleRecurrencePlanningWorkbench } from "./NextCycleRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCycleRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-cycle-recurrence-planning"
    );
  }

  const model = await listNextCycleRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 085</p>
        <h1>
          Next-Cycle Recurrence Re-Triage & Following-Cycle Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 084 next-cycle recurrence evidence into a new planning
          generation without rewriting the Build 081–084 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-next-cycle-reclosure"
          >
            Post-next-cycle recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-cycle-delivery"
          >
            Next-cycle delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-cycle-closure"
          >
            Next-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/following-cycle-delivery"
          >
            Following-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-generation-recurrence-planning"
          >
            Predecessor continuation-generation recurrence planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <NextCycleRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
