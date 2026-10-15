import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessorGenerationCorrectiveClosureForUser } from "@/lib/successor-generation-corrective-delivery-reconciliation";

import { SuccessorGenerationCorrectiveClosureWorkbench } from "./SuccessorGenerationCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessorGenerationCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessor-generation-closure"
    );
  }

  const model = await listSuccessorGenerationCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 067</p>
        <h1>Successor-Generation Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 066 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successor-generation-reclosure">
            Post-successor-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-generation-reclosure">
            Post-next-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-generation-delivery">
            Successor-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/second-recurrence-planning">
            Second-recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessorGenerationCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
