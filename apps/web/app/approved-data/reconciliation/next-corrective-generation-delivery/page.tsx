import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextCorrectiveGenerationDeliveryForUser } from "@/lib/next-corrective-generation-delivery-execution";

import { NextCorrectiveGenerationDeliveryWorkbench } from "./NextCorrectiveGenerationDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function NextCorrectiveGenerationDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-corrective-generation-delivery"
    );
  }

  const model = await listNextCorrectiveGenerationDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 102</p>
        <h1>Next Corrective-Generation Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 101 next corrective-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted predecessor continuation-cycle package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-continuation-cycle-reclosure">
            Post-continuation-cycle recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-recurrence-planning">
            Continuation-cycle recurrence re-triage & next corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-closure">
            Build 103 next corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-cycle-closure">
            Predecessor continuation-cycle reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextCorrectiveGenerationDeliveryWorkbench initialModel={model} />
    </main>
  );
}
