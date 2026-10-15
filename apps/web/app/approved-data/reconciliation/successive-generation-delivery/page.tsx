import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessiveGenerationCorrectiveDeliveryForUser } from "@/lib/successive-generation-corrective-delivery-execution";

import { SuccessiveGenerationCorrectiveDeliveryWorkbench } from "./SuccessiveGenerationCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessiveGenerationCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessive-generation-delivery"
    );
  }

  const model = await listSuccessiveGenerationCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 074</p>
        <h1>Successive-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 073 successive-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 070 subsequent-generation package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-subsequent-generation-reclosure">
            Post-subsequent-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-generation-recurrence-planning">
            Subsequent-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/subsequent-generation-closure">
            Subsequent-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessiveGenerationCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
