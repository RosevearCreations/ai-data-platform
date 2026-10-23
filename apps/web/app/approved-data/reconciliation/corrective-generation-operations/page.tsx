import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCorrectiveGenerationOperationsForUser } from "@/lib/corrective-generation-operations";
import { CorrectiveGenerationOperationsWorkbench } from "./CorrectiveGenerationOperationsWorkbench";

export const dynamic = "force-dynamic";

export default async function CorrectiveGenerationOperationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcorrective-generation-operations"
    );
  }

  const model = await listCorrectiveGenerationOperationsForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 116</p>
        <h1>Corrective-Generation Operations Console, Timeline & Audit Export</h1>
        <p className="lead">
          Operate the Build 115 state machine from one read-only evidence console, trace the
          complete G1/G2/G3+ history in chronological order, isolate invariant findings, and
          export deterministic JSON or CSV audit packages with a SHA-256 evidence digest.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-state-machine">
            Build 115 state machine
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-generation-lineage">
            Corrective-generation lineage
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/legacy-corrective-generation-compatibility">
            Legacy compatibility bridge
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <CorrectiveGenerationOperationsWorkbench initialModel={model} />
    </main>
  );
}
