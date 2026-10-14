import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostDeliveryReconciliationForUser } from "@/lib/post-delivery-reconciliation";

import { HelpInfo } from "../../help/HelpInfo";
import { PostDeliveryReconciliationWorkbench } from "./PostDeliveryReconciliationWorkbench";

export const dynamic = "force-dynamic";

export default async function PostDeliveryReconciliationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation");
  }

  const model = await listPostDeliveryReconciliationForUser(session.user.id);

  return (
    <main className="shell reconciliationShell">
      <section className="hero reconciliationHero">
        <HelpInfo topic="post-delivery-reconciliation-overview" />
        <p className="eyebrow">Build 052</p>
        <h1>Post-Delivery Reconciliation & Consumer State Verification</h1>
        <p className="lead">
          Read the consumer&apos;s current state after an accepted Build 051 live
          delivery, compare only the fields that exact package was responsible for,
          and preserve matched, missing or mismatched evidence without silently
          correcting either system.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/triage">
            Exception triage & planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-delivery">
            Corrective delivery execution
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/corrective-closure">
            Corrective reconciliation & closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-closure-regression">
            Post-closure regression & reopen governance
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/reopened-planning">
            Reopened re-triage & successor planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-delivery">
            Successor corrective delivery execution
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-closure">
            Successor reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-reclosure-regression">
            Post-re-closure recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/recurrent-planning">
            Recurrent exception planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-delivery">
            Next-generation corrective delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-closure">
            Next-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-generation-reclosure">
            Post-next-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/live-delivery">
            Controlled live delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/delivery">
            Publication delivery bridge
          </Link>
        </div>
      </section>

      <PostDeliveryReconciliationWorkbench initialModel={model} />
    </main>
  );
}
