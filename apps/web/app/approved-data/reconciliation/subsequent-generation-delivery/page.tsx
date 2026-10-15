import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSubsequentGenerationCorrectiveDeliveryForUser } from "@/lib/subsequent-generation-corrective-delivery-execution";

import { SubsequentGenerationCorrectiveDeliveryWorkbench } from "./SubsequentGenerationCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SubsequentGenerationCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsubsequent-generation-delivery"
    );
  }

  const model = await listSubsequentGenerationCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 070</p>
        <h1>Subsequent-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 069 subsequent-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 066 package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-successor-generation-reclosure">
            Post-successor-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-generation-recurrence-planning">
            Successor-generation recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-generation-closure">
            Successor-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SubsequentGenerationCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
