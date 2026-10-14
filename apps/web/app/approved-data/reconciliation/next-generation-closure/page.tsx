import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextGenerationCorrectiveClosureForUser } from "@/lib/next-generation-corrective-delivery-reconciliation";

import { NextGenerationCorrectiveClosureWorkbench } from "./NextGenerationCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function NextGenerationCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-generation-closure"
    );
  }

  const model = await listNextGenerationCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 063</p>
        <h1>Next-Generation Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 062 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-delivery">
            Next-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/recurrent-planning">
            Recurrent exception planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextGenerationCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
