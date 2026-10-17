import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listContinuationGenerationCorrectiveDeliveryForUser } from "@/lib/continuation-generation-corrective-delivery-execution";

import { ContinuationGenerationCorrectiveDeliveryWorkbench } from "./ContinuationGenerationCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function ContinuationGenerationCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fcontinuation-generation-delivery"
    );
  }

  const model = await listContinuationGenerationCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 078</p>
        <h1>Successive-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 077 continuation-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 074 successive-generation package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successive-generation-reclosure">
            Post-successive-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-recurrence-planning">
            Subsequent-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successive-generation-closure">
            Subsequent-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/continuation-generation-closure">
            Successive-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <ContinuationGenerationCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
