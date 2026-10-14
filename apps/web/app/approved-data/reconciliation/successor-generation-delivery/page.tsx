import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessorGenerationCorrectiveDeliveryForUser } from "@/lib/successor-generation-corrective-delivery-execution";

import { SuccessorGenerationCorrectiveDeliveryWorkbench } from "./SuccessorGenerationCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessorGenerationCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessor-generation-delivery"
    );
  }

  const model = await listSuccessorGenerationCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 066</p>
        <h1>Successor-Generation Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 065 successor-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted Build 062 package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-generation-closure">
            Successor-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/second-recurrence-planning">
            Second-recurrence planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-generation-reclosure">
            Second-recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessorGenerationCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
