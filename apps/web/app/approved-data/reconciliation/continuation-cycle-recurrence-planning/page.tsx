import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationCycleRecurrencePlanningForUser } from "@/lib/continuation-cycle-recurrence-planning";

import { ContinuationCycleRecurrencePlanningWorkbench } from "./ContinuationCycleRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationCycleRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-cycle-recurrence-planning"
    );
  }

  const model = await listContinuationCycleRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 101</p>
        <h1>
          Continuation-Cycle Recurrence Re-Triage & Next Corrective-Planning Generation
        </h1>
        <p className="lead">
          Turn governed Build 100 continuation-cycle recurrence evidence into a new frozen corrective-planning generation without rewriting the Build 097–100 continuation-cycle history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-continuation-cycle-reclosure"
          >
            Post-continuation-cycle recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-corrective-generation-delivery"
          >
            Build 102 next corrective-generation delivery execution
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-cycle-delivery"
          >
            Continuation-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-cycle-delivery"
          >
            Predecessor continuation-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-cycle-closure"
          >
            Continuation-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning"
          >
            Predecessor subsequent-cycle recurrence re-triage & next corrective-generation planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <ContinuationCycleRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
