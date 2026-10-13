import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listSuccessorCorrectiveDeliveryForUser } from "@/lib/successor-corrective-delivery-execution";

import { SuccessorCorrectiveDeliveryWorkbench } from "./SuccessorCorrectiveDeliveryWorkbench";

export const dynamic = "force-dynamic";

export default async function SuccessorCorrectiveDeliveryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fsuccessor-delivery"
    );
  }

  const model = await listSuccessorCorrectiveDeliveryForUser(session.user.id);

  return (
    <main className="shell correctiveShell">
      <section className="hero correctiveHero">
        <p className="eyebrow">Build 058</p>
        <h1>Successor Corrective Delivery Activation & Idempotent Execution</h1>
        <p className="lead">
          Execute an approved Build 057 successor plan without rewriting the
          predecessor correction. Build a new package identity from frozen
          regression scope, prove it with a dry-run, open a short-lived activation,
          and perform at most one logical live mutation with bounded same-key retries.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-closure">
            Successor reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/reopened-planning">
            Reopened re-triage & successor planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-closure-regression">
            Post-closure regression & reopen governance
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <SuccessorCorrectiveDeliveryWorkbench initialModel={model} />
    </main>
  );
}
