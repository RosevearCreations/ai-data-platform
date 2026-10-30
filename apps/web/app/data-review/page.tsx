import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listDataReviewWorkbenchForUser } from "@/lib/data-review-workbench";

import { HelpInfo } from "../help/HelpInfo";
import { DataReviewWorkbench } from "./DataReviewWorkbench";

export const dynamic = "force-dynamic";

export default async function DataReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fdata-review");

  const model = await listDataReviewWorkbenchForUser(session.user.id);

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--frontEnd">
      <section className="hero reviewHero">
        <HelpInfo topic="data-review-overview" />
        <p className="eyebrow">Build 048</p>
        <h1>Data Review, Cleanup & Approval Workbench</h1>
        <p className="lead">
          Snapshot a durable dataset version, compare original evidence with a
          deterministic cleaned copy, exclude or correct individual rows, and record
          an owner/admin approval or rejection without overwriting the source evidence.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/data-library">Unified data library</Link>
          <Link className="secondaryButton" href="/collection-runs">Collection run console</Link>
        </div>
      </section>

      <section className="opsDrilldownPanel"><span>Operations Command · Front End drill-down</span><strong>Review & Approval</strong><p>Work from durable source evidence through cleanup, row-level decisions and governed approval without overwriting original records.</p><div><Link href="/data-library">Library</Link><Link href="/approved-data">Approved Data</Link></div></section>

      <DataReviewWorkbench initialModel={model} />
    </main>
  );
}
