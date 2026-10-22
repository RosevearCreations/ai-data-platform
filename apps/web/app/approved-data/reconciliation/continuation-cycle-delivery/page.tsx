import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationCycleCorrectiveDeliveryForUser } from "@/lib/continuation-cycle-corrective-delivery-execution";

import { ContinuationCycleCorrectiveDeliveryWorkbench } from "./ContinuationCycleCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationCycleCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-cycle-delivery"
    );
  }

  const model = await listContinuationCycleCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 098</p>
        <h1>Continuation-Cycle Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 097 continuation-cycle plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 094 successive-cycle package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-cycle-reclosure">
            Post-successive-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-recurrence-planning">
            Successive-cycle recurrence re-triage & continuation-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-closure">
            Continuation-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-closure">
            Predecessor successive-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <ContinuationCycleCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
