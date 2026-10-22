import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCorrectiveGenerationLineageForUser } from "@/lib/corrective-generation-lineage";
import { CorrectiveGenerationLineageWorkbench } from "./CorrectiveGenerationLineageWorkbench";

export const dynamic = "force-dynamic";

export default async function CorrectiveGenerationLineagePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcorrective-generation-lineage"
    );
  }

  const model = await listCorrectiveGenerationLineageForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 109</p>
        <h1>Corrective-Generation Lineage Registry & Successor Generation Abstraction</h1>
        <p className="lead">
          Preserve the proven next and following corrective generations as immutable historical
          lineage, then expose the governed Build 108 recurrence as a generic successor planning
          source without creating another hard-coded generation family.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-corrective-generation-reclosure">
            Build 108 regression monitoring & recurrence governance
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/unified-corrective-generation-planning">
            Build 110 unified recurrence re-triage & planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-corrective-generation-closure">
            Build 107 reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <CorrectiveGenerationLineageWorkbench initialModel={model} />
    </main>
  );
}
