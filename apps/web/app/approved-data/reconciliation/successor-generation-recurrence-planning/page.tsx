import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessorGenerationRecurrencePlanningForUser } from "@/lib/successor-generation-recurrence-planning";

import { SuccessorGenerationRecurrencePlanningWorkbench } from "./SuccessorGenerationRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessorGenerationRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsecond-recurrence-planning"
    );
  }

  const model = await listSuccessorGenerationRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 069</p>
        <h1>
          Successor-Generation Recurrence Re-Triage & Subsequent-Generation Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 068 successor-generation recurrence evidence into a new planning
          generation without rewriting the Build 065-067 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-successor-generation-reclosure"
          >
            Post-successor-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successor-generation-closure"
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

      <SuccessorGenerationRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
