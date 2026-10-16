import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveGenerationRecurrencePlanningForUser } from "@/lib/successive-generation-recurrence-planning";

import { SuccessiveGenerationRecurrencePlanningWorkbench } from "./SuccessiveGenerationRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveGenerationRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-generation-recurrence-planning"
    );
  }

  const model = await listSuccessiveGenerationRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 077</p>
        <h1>
          Subsequent-Generation Recurrence Re-Triage & Successive-Generation Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 076 successive-generation recurrence evidence into a new planning
          generation without rewriting the Build 073–071 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-continuation-generation-reclosure"
          >
            Post-successive-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-generation-delivery"
          >
            Subsequent-generation delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-generation-closure"
          >
            Subsequent-generation reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/subsequent-generation-recurrence-planning"
          >
            Predecessor subsequent-generation recurrence planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <SuccessiveGenerationRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
