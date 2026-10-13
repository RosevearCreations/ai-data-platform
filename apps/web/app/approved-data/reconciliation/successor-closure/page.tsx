import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessorCorrectiveClosureForUser } from "@/lib/successor-corrective-delivery-reconciliation";

import { SuccessorCorrectiveClosureWorkbench } from "./SuccessorCorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessorCorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessor-closure"
    );
  }

  const model = await listSuccessorCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 059</p>
        <h1>Successor Corrective Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact Build 058 successor package after an
          accepted live correction. Preserve drift or transport evidence without
          auto-closing, and permit re-closure only from the newest matched result.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-delivery">
            Successor corrective delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/reopened-planning">
            Reopened re-triage & successor planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessorCorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
