import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listReopenedExceptionPlanningForUser } from "@/lib/reopened-exception-planning";

import { ReopenedExceptionPlanningWorkbench } from "./ReopenedExceptionPlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function ReopenedExceptionPlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Freopened-planning");
  }

  const model = await listReopenedExceptionPlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 057</p>
        <h1>Reopened Exception Re-Triage & Successor Corrective Planning</h1>
        <p className="lead">
          Start a fresh decision cycle from immutable Build 056 reopen evidence.
          Re-triage the proven regression, freeze only the affected fields from the
          accepted predecessor corrective package, and approve a successor plan
          without performing any downstream write.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-closure-regression">
            Post-closure regression & reopen governance
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/triage">
            Original exception triage
          </Link>
        </div>
      </section>
      <ReopenedExceptionPlanningWorkbench initialModel={model} />
    </main>
  );
}
