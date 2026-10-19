import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFollowingCycleCorrectiveDeliveryForUser } from "@/lib/following-cycle-corrective-delivery-execution";

import { FollowingCycleCorrectiveDeliveryWorkbench } from "./FollowingCycleCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function FollowingCycleCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ffollowing-cycle-delivery"
    );
  }

  const model = await listFollowingCycleCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 086</p>
        <h1>Following-Cycle Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 085 following-cycle plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 082 next-cycle package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-cycle-reclosure">
            Post-next-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-recurrence-planning">
            Next-cycle recurrence re-triage & following-cycle planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-closure">
            Next-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <FollowingCycleCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
