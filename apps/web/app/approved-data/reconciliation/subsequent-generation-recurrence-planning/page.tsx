import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSubsequentGenerationRecurrencePlanningForUser } from "@/lib/subsequent-generation-recurrence-planning";

import { SubsequentGenerationRecurrencePlanningWorkbench } from "./SubsequentGenerationRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SubsequentGenerationRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsubsequent-generation-recurrence-planning"
    );
  }

  const model = await listSubsequentGenerationRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 073</p>
        <h1>
          Successor-Generation Recurrence Re-Triage & Subsequent-Generation Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 072 subsequent-generation recurrence evidence into a new planning
          generation without rewriting the Build 069-067 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-subsequent-generation-reclosure"
          >
            Post-subsequent-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-generation-delivery"
          >
            Subsequent-generation delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-generation-closure"
          >
            Successor-generation reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/second-recurrence-planning"
          >
            Prior second-recurrence planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <SubsequentGenerationRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
