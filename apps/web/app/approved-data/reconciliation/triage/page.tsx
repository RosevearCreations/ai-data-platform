import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listReconciliationExceptionTriageForUser } from "@/lib/reconciliation-exception-triage";

import { HelpInfo } from "../../../help/HelpInfo";
import { ReconciliationExceptionTriageWorkbench } from "./ReconciliationExceptionTriageWorkbench";

export const dynamic = "force-dynamic";

export default async function ReconciliationExceptionTriagePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ftriage");
  }

  const model = await listReconciliationExceptionTriageForUser(session.user.id);

  return (
    <main className="shell triageShell">
      <section className="hero triageHero">
        <HelpInfo topic="reconciliation-triage-overview" />
        <p className="eyebrow">Build 053</p>
        <h1>Reconciliation Exception Triage & Corrective Delivery Planning</h1>
        <p className="lead">
          Turn Build 052 drift evidence into an explicit investigation case and,
          when justified, a frozen corrective delivery plan. Planning captures exact
          affected keys, governed fields and desired values, but this build cannot
          execute a correction.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
          <Link className="secondaryButton" href="/approved-data/live-delivery">
            Controlled live delivery
          </Link>
        </div>
      </section>

      <ReconciliationExceptionTriageWorkbench initialModel={model} />
    </main>
  );
}
