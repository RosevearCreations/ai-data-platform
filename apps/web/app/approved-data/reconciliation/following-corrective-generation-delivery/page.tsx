import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFollowingCorrectiveGenerationDeliveryForUser } from "@/lib/following-corrective-generation-delivery-execution";

import { FollowingCorrectiveGenerationDeliveryWorkbench } from "./FollowingCorrectiveGenerationDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function FollowingCorrectiveGenerationDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ffollowing-corrective-generation-delivery"
    );
  }

  const model = await listFollowingCorrectiveGenerationDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 106</p>
        <h1>Following Corrective-Generation Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 105 following corrective-generation plan through a fresh
          package identity, authenticated capability proof, accepted dry-run,
          short activation window, durable pre-send reservation and bounded
          same-key retries without reusing the accepted predecessor next-corrective-generation package identity.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-corrective-generation-reclosure">
            Post-next-corrective-generation recurrence monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-recurrence-planning">
            Build 105 next corrective-generation recurrence re-triage & following corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-closure">
            Predecessor next-corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-corrective-generation-closure">
            Build 107 following corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <FollowingCorrectiveGenerationDeliveryWorkbench initialModel={model} />
    </main>
  );
}
