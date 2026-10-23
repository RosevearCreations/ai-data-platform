import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listUnifiedCorrectiveGenerationClosureForUser } from "@/lib/unified-corrective-generation-delivery-reconciliation";

import { UnifiedCorrectiveGenerationClosureWorkbench } from "./UnifiedCorrectiveGenerationClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function UnifiedCorrectiveGenerationClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Funified-corrective-generation-closure"
    );
  }

  const model = await listUnifiedCorrectiveGenerationClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 112</p>
        <h1>Unified Corrective-Generation Delivery Reconciliation & Verified Re-Closure</h1>
        <p className="lead">
          Independently read back the state governed by an accepted Build 111 package,
          preserve matched or drift evidence, and re-close only when the latest
          generation-agnostic successor source has a fresh exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-delivery">
            Build 111 unified delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-planning">
            Build 110 unified planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Build 109 lineage registry
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>

      <UnifiedCorrectiveGenerationClosureWorkbench initialModel={model} />
    </main>
  );
}
