import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSubsequentCycleCorrectiveDeliveryForUser } from "@/lib/subsequent-cycle-corrective-delivery-execution";

import { SubsequentCycleCorrectiveDeliveryWorkbench } from "./SubsequentCycleCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SubsequentCycleCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsubsequent-cycle-delivery"
    );
  }

  const model = await listSubsequentCycleCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 090</p>
        <h1>Subsequent-Cycle Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 089 subsequent-cycle plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 086 following-cycle package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-cycle-reclosure">
            Post-following-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-recurrence-planning">
            Following-cycle recurrence re-triage & subsequent-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-cycle-closure">
            Following-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SubsequentCycleCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
