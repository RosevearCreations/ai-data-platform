import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSecondRecurrencePlanningForUser } from "@/lib/second-recurrence-planning";

import { SecondRecurrencePlanningWorkbench } from "./SecondRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SecondRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsecond-recurrence-planning"
    );
  }

  const model = await listSecondRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 065</p>
        <h1>
          Second-Recurrence Re-Triage & Successor-Generation Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 064 second-recurrence evidence into a new planning
          generation without rewriting the Build 061-063 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-next-generation-reclosure"
          >
            Post-next-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successor-generation-delivery"
          >
            Successor-generation delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/recurrent-planning"
          >
            Prior recurrence planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <SecondRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
