import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listFollowingCorrectiveGenerationClosureForUser } from "@/lib/following-corrective-generation-delivery-reconciliation";

import { FollowingCorrectiveGenerationClosureWorkbench } from "./FollowingCorrectiveGenerationClosureWorkbench";

export const dynamic = "force-dynamic";

export default async function FollowingCorrectiveGenerationClosurePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      "/sign-in?callbackUrl=%2Fapproved-data%2Freconciliation%2Ffollowing-corrective-generation-closure"
    );
  }

  const model = await listFollowingCorrectiveGenerationClosureForUser(session.user.id);

  return (
    <main className="shell correctiveClosureShell">
      <section className="hero correctiveClosureHero">
        <p className="eyebrow">Build 107</p>
        <h1>Following Corrective-Generation Delivery Reconciliation & Re-Closure</h1>
        <p className="lead">
          Independently read back the exact accepted Build 106 package, preserve
          matched/drift/error evidence, and close the recurrence generation only
          when the newest verification is an exact match.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-closure">
            Predecessor next-corrective-generation reconciliation & re-closure
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-next-corrective-generation-reclosure">
            Predecessor post-next-corrective-generation monitoring
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/following-corrective-generation-delivery">
            Build 106 following corrective-generation delivery
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/post-following-corrective-generation-reclosure">
            Build 108 post-re-closure regression monitoring & recurrence governance
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation/next-corrective-generation-recurrence-planning">
            Build 105 next corrective-generation recurrence re-triage & following corrective-generation planning
          </Link>
          <Link className="secondaryButton" href="/approved-data/reconciliation">
            Reconciliation
          </Link>
        </div>
      </section>
      <FollowingCorrectiveGenerationClosureWorkbench initialModel={model} />
    </main>
  );
}
