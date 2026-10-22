import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCorrectiveGenerationRecurrencePlanningForUser } from "@/lib/next-corrective-generation-recurrence-planning";

import { NextCorrectiveGenerationRecurrencePlanningWorkbench } from "./NextCorrectiveGenerationRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCorrectiveGenerationRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-corrective-generation-recurrence-planning"
    );
  }

  const model = await listNextCorrectiveGenerationRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 105</p>
        <h1>
          Next Corrective-Generation Recurrence Re-Triage & Next Corrective-Planning Generation
        </h1>
        <p className="lead">
          Turn governed Build 104 next-corrective-generation recurrence evidence into a new frozen corrective-planning generation without rewriting the Build 101–100 next-corrective-generation history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-next-corrective-generation-reclosure"
          >
            Post-next-corrective-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/following-corrective-generation-delivery"
          >
            Build 102 following corrective-generation delivery execution
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-corrective-generation-delivery"
          >
            Continuation-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-corrective-generation-delivery"
          >
            Predecessor next-corrective-generation corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/next-corrective-generation-closure"
          >
            Continuation-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning"
          >
            Predecessor subsequent-cycle recurrence re-triage & following corrective-generation planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <NextCorrectiveGenerationRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
