import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostReclosureRegressionForUser } from "@/lib/post-reclosure-regression";

import { PostReclosureRegressionWorkbench } from "./PostReclosureRegressionWorkbench";

export const dynamic = "force-dynamic";

export default async function PostReclosureRegressionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-reclosure-regression"
    );
  }

  const model = await listPostReclosureRegressionForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 060</p>
        <h1>Post-Re-Closure Regression Monitoring & Recurrence Governance</h1>
        <p className="lead">
          Monitor the exact successor package after a verified Build 059
          re-closure. Preserve stable and recurrent evidence, reject stale
          recurrence signals, and reopen only through an explicit governed
          recurrence action tied to the newest read-back.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-closure">
            Successor reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/successor-delivery">
            Successor corrective delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <PostReclosureRegressionWorkbench initialModel={model} />
    </main>
  );
}
