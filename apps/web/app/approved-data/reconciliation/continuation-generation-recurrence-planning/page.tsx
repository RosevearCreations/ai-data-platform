import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationGenerationRecurrencePlanningForUser } from "@/lib/continuation-generation-recurrence-planning";

import { ContinuationGenerationRecurrencePlanningWorkbench } from "./ContinuationGenerationRecurrencePlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationGenerationRecurrencePlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-generation-recurrence-planning"
    );
  }

  const model = await listContinuationGenerationRecurrencePlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 081</p>
        <h1>
          Continuation-Generation Recurrence Re-Triage & Next-Cycle Corrective Planning
        </h1>
        <p className="lead">
          Turn governed Build 080 continuation-generation recurrence evidence into a new planning
          generation without rewriting the Build 077–080 corrective history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/post-continuation-generation-reclosure"
          >
            Post-continuation-generation recurrence monitoring
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-generation-delivery"
          >
            Successive-generation delivery
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/continuation-generation-closure"
          >
            Successive-generation reconciliation & re-closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/successive-generation-recurrence-planning"
          >
            Predecessor successive-generation recurrence planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation"
          >
            Reconciliation
          </Link>
        </div>
      </section>

      <ContinuationGenerationRecurrencePlanningWorkbench initialModel={model} />
    </main>
  );
}
