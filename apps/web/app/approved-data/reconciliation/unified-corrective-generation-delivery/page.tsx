import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listUnifiedCorrectiveGenerationDeliveryForUser } from "@/lib/unified-corrective-generation-delivery-execution";

import { UnifiedCorrectiveGenerationDeliveryWorkbench } from "./UnifiedCorrectiveGenerationDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function UnifiedCorrectiveGenerationDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Funified-corrective-generation-delivery"
    );
  }

  const model = await listUnifiedCorrectiveGenerationDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 111</p>
        <h1>Unified Corrective-Generation Activation & Idempotent Delivery Execution</h1>
        <p className="lead">
          Turn an approved Build 110 generation-agnostic corrective plan into a fresh
          delivery package while preserving the exact Build 109 predecessor lineage.
          Every execution requires a current consumer capability proof, an accepted
          dry-run, a short activation window and a durable idempotent reservation
          before any live mutation is sent.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/unified-corrective-generation-planning"
          >
            Build 110 unified corrective-generation planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/corrective-generation-lineage"
          >
            Build 109 corrective-generation lineage
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>

      <UnifiedCorrectiveGenerationDeliveryWorkbench initialModel={model} />
    </main>
  );
}
