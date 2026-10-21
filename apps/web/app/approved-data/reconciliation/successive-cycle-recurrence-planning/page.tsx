import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveCycleRecurrencePlanningForUser } from "@/lib/successive-cycle-recurrence-planning";

import { SuccessiveCycleRecurrencePlanningWorkbench } from "./SuccessiveCycleRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveCycleRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-cycle-recurrence-planning"
    );
  }

  const model = await listSuccessiveCycleRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 097</p>
        <h1>
          Successive-Cycle Recurrence Re-Triage & Continuation-Cycle Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 096 successive-cycle recurrence evidence into a new planning
          generation without rewriting the Build 093–096 successive-cycle corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-successive-cycle-reclosure"
          >
            Post-successive-cycle recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-cycle-delivery"
          >
            Predecessor successive-cycle corrective delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-cycle-closure"
          >
            Successive-cycle reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning"
          >
            Predecessor subsequent-cycle recurrence re-triage & successive-cycle planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <SuccessiveCycleRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
