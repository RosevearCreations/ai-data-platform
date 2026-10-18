import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCycleCorrectiveDeliveryForUser } from "@/lib/next-cycle-corrective-delivery-execution";

import { NextCycleCorrectiveDeliveryWorkbench } from "./NextCycleCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCycleCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-cycle-delivery"
    );
  }

  const model = await listNextCycleCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 078</p>
        <h1>Continuation-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 077 next-cycle plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 074 continuation-generation package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-generation-reclosure">
            Post-continuation-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-recurrence-planning">
            Successive-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-cycle-closure">
            Continuation-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-closure">
            Successive-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextCycleCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
