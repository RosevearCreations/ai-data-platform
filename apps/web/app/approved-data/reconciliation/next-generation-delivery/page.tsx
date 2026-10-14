import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listNextGenerationCorrectiveDeliveryForUser } from "@/lib/next-generation-corrective-delivery-execution";

import { NextGenerationCorrectiveDeliveryWorkbench } from "./NextGenerationCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function NextGenerationCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fnext-generation-delivery"
    );
  }

  const model = await listNextGenerationCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 062</p>
        <h1>Next-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 061 plan through a fresh package identity,
          authenticated capability proof, accepted dry-run, short activation
          window, durable pre-send reservation and bounded same-key retries.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-generation-closure">
            Next-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/recurrent-planning">
            Recurrent exception planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-reclosure-regression">
            Recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <NextGenerationCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
