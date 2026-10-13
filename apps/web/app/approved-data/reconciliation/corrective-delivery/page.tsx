import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCorrectiveDeliveryForUser } from "@/lib/corrective-delivery-execution";

import { HelpInfo } from "../../../help/HelpInfo";
import { CorrectiveDeliveryWorkbench } from "./CorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function CorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcorrective-delivery"
    );
  }

  const model = await listCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveShell">
      <section className="hero correctiveHero">
        <HelpInfo topic="corrective-delivery-overview" />
        <p className="eyebrow">Build 054</p>
        <h1>Approved Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Convert one approved Build 053 corrective plan into a short-lived,
          dry-run-proven activation and an idempotent corrective delivery. The
          corrective package is rebuilt server-side from frozen plan evidence and
          receives its own replay identity before any live mutation.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-closure">
            Corrective reconciliation & closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/triage"
          >
            Exception triage & planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>

      <CorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
