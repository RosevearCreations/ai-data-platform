import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSubsequentCycleRecurrencePlanningForUser } from "@/lib/subsequent-cycle-recurrence-planning";

import { SubsequentCycleRecurrencePlanningWorkbench } from "./SubsequentCycleRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SubsequentCycleRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsubsequent-cycle-recurrence-planning"
    );
  }

  const model = await listSubsequentCycleRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 093</p>
        <h1>
          Subsequent-Cycle Recurrence Re-Triage & Successive-Cycle Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 092 subsequent-cycle recurrence evidence into a new planning
          generation without rewriting the Build 089–092 subsequent-cycle corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-subsequent-cycle-reclosure"
          >
            Post-subsequent-cycle recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-cycle-delivery"
          >
            Subsequent-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-cycle-closure"
          >
            Subsequent-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/following-cycle-recurrence-planning"
          >
            Predecessor following-cycle recurrence re-triage & subsequent-cycle planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <SubsequentCycleRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
