import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listUnifiedCorrectiveGenerationPlanningForUser } from "@/lib/unified-corrective-generation-planning";
import { UnifiedCorrectiveGenerationPlanningWorkbench } from "./UnifiedCorrectiveGenerationPlanningWorkbench";

export const dynamic = "force-dynamic";

export default async function UnifiedCorrectiveGenerationPlanningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Funified-corrective-generation-planning"
    );
  }

  const model = await listUnifiedCorrectiveGenerationPlanningForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 113</p>
        <h1>Unified Corrective-Generation Recurrence Re-Triage & Planning Engine</h1>
        <p className="lead">
          Consume the newest governed successor from either the historical corrective-generation
          path or the generic recurrence loop, re-triage its exact recurrence evidence, and create
          the next generation-numbered corrective plan without another hard-coded schema family.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Build 109 lineage registry
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-unified-corrective-generation-reclosure">
            Build 113 generic recurrence governance source
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-corrective-generation-reclosure">
            Historical Build 108 recurrence source
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-delivery">
            Build 111 unified corrective-generation activation & idempotent delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">Reconciliation</Link>
        </div>
      </section>
      <UnifiedCorrectiveGenerationPlanningWorkbench initialModel={model} />
    </main>
  );
}
