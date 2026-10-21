import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveCycleCorrectiveDeliveryForUser } from "@/lib/successive-cycle-corrective-delivery-execution";

import { SuccessiveCycleCorrectiveDeliveryWorkbench } from "./SuccessiveCycleCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveCycleCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-cycle-delivery"
    );
  }

  const model = await listSuccessiveCycleCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 094</p>
        <h1>Subsequent-Cycle Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 093 successive-cycle plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 090 subsequent-cycle package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-cycle-reclosure">
            Post-subsequent-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-recurrence-planning">
            Following-cycle recurrence re-triage & successive-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-cycle-closure">
            Subsequent-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-cycle-closure">
            Following-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessiveCycleCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
