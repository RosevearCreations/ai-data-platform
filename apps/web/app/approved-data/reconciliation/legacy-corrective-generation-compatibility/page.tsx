import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listLegacyCorrectiveGenerationCompatibilityForUser } from "@/lib/legacy-corrective-generation-compatibility";
import { LegacyCorrectiveGenerationCompatibilityWorkbench } from "./LegacyCorrectiveGenerationCompatibilityWorkbench";

export const dynamic = "force-dynamic";

export default async function LegacyCorrectiveGenerationCompatibilityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Flegacy-corrective-generation-compatibility"
    );
  }

  const model = await listLegacyCorrectiveGenerationCompatibilityForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 114</p>
        <h1>Legacy Corrective-Generation Compatibility & Historical Lineage Bridge</h1>
        <p className="lead">
          Audit completed legacy G1/G2 corrective generations against the immutable generic
          lineage model, adopt missing historical lineage, preserve late recurrence as append-only
          evidence, and restore the exact G3 successor handoff without rewriting Build 109 history.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Build 109 lineage registry
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-state-machine">
            Build 115 state machine & invariant audit
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-planning">
            Unified recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <LegacyCorrectiveGenerationCompatibilityWorkbench initialModel={model} />
    </main>
  );
}
