import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCorrectiveGenerationStateMachineForUser } from "@/lib/corrective-generation-state-machine";
import { CorrectiveGenerationStateMachineWorkbench } from "./CorrectiveGenerationStateMachineWorkbench";

export const dynamic = "force-dynamic";

export default async function CorrectiveGenerationStateMachinePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcorrective-generation-state-machine"
    );
  }

  const model = await listCorrectiveGenerationStateMachineForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 115</p>
        <h1>Corrective-Generation State Machine & Cross-Generation Invariant Enforcement</h1>
        <p className="lead">
          Derive one canonical lifecycle for every generic corrective-generation successor,
          enforce legal state transitions at the database boundary, and continuously audit
          ancestry, recurrence identity, delivery and re-closure invariants across legacy G1/G2
          and generic G3+ generations.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Corrective-generation lineage
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-operations">
            Build 116 operations console & audit export
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/legacy-corrective-generation-compatibility">
            Legacy compatibility bridge
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-planning">
            Unified corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <CorrectiveGenerationStateMachineWorkbench initialModel={model} />
    </main>
  );
}
