import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationGenerationCorrectiveClosureForUser } from "@/lib/continuation-generation-corrective-delivery-reconciliation";

import { ContinuationGenerationCorrectiveClosureWorkbench } from "./ContinuationGenerationCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationGenerationCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-generation-closure"
    );
  }

  const model = await listContinuationGenerationCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 079</p>
        <h1>Continuation-Generation Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 078 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-generation-reclosure">
            Predecessor post-successive-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-delivery">
            Continuation-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-recurrence-planning">
            Successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <ContinuationGenerationCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
