import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveGenerationCorrectiveClosureForUser } from "@/lib/successive-generation-corrective-delivery-reconciliation";

import { SuccessiveGenerationCorrectiveClosureWorkbench } from "./SuccessiveGenerationCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveGenerationCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-generation-closure"
    );
  }

  const model = await listSuccessiveGenerationCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 075</p>
        <h1>Successive-Generation Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 074 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-generation-reclosure">
            Post-subsequent-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-delivery">
            Subsequent-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-generation-reclosure">
            Post-successive-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-generation-recurrence-planning">
            Successor-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-closure">
            Predecessor subsequent-generation re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessiveGenerationCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
