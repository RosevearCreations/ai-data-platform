import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPostClosureRegressionForUser } from "@/lib/post-closure-regression";

import { PostClosureRegressionWorkbench } from "./PostClosureRegressionWorkbench";

export const dynamic = "force-dynamic";

export default async function PostClosureRegressionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Fpost-closure-regression"
    );
  }

  const model = await listPostClosureRegressionForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 056</p>
        <h1>Post-Closure Regression Monitoring & Exception Reopen Governance</h1>
        <p className="lead">
          Recheck the exact governed state that supported a verified Build 055
          closure. Regression monitoring is read-only, and a closed exception
          can reopen only from the newest regressed evidence with an explicit
          owner/admin confirmation.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Command Center
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/corrective-closure"
          >
            Corrective reconciliation & closure
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/triage"
          >
            Exception triage & planning
          </Link>
          <Link
            className="secondaryButton"
            href="/approved-data/reconciliation/reopened-planning"
          >
            Reopened re-triage & successor planning
          </Link>
        </div>
      </section>

      <PostClosureRegressionWorkbench initialModel={model} />
    </main>
  );
}
