import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCorrectiveClosureForUser } from "@/lib/corrective-delivery-reconciliation";

import { HelpInfo } from "../../../help/HelpInfo";
import { CorrectiveClosureWorkbench } from "./CorrectiveClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function CorrectiveClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcorrective-closure"
    );
  }

  const model = await listCorrectiveClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <HelpInfo topic="corrective-closure-overview" />
        <p className="eyebrow">Build 055</p>
        <h1>Corrective Delivery Reconciliation & Exception Closure</h1>
        <p className="lead">
          Independently read back the exact fields corrected by Build 054. A
          transport acknowledgement is never treated as resolution; only the
          latest matched verification can support an explicit, durable exception
          closure.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/corrective-delivery"
          >
            Corrective delivery execution
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/triage"
          >
            Exception triage & planning
          </Link>
        </div>
      </section>

      <CorrectiveClosureWorkbench initialModel={model} />
    </main>
  );
}
