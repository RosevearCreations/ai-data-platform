import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listApprovedDatasetPublishingForUser } from "@/lib/approved-dataset-publishing";

import { ApprovedDatasetPublishing } from "./ApprovedDatasetPublishing";
import { HelpInfo } from "../help/HelpInfo";

export const dynamic = "force-dynamic";

export default async function ApprovedDataPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fapproved-data");

  const model = await listApprovedDatasetPublishingForUser(session.user.id);

  return (
    <main className="shell publishShell">
      <section className="hero publishHero">
        <HelpInfo topic="approved-data-overview" />
        <p className="eyebrow">Build 049</p>
        <h1>Approved Dataset Publishing & Export Handoff</h1>
        <p className="lead">
          Turn an approved Build 048 review into one immutable publication snapshot,
          export that exact snapshot as JSON or CSV, and preserve the provenance,
          fingerprint and audit evidence needed for a controlled downstream handoff.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/data-review">Data review workbench</Link>
          <Link className="secondaryButton" href="/data-library">Unified data library</Link>
          <Link className="secondaryButton" href="/approved-data/delivery">Publication delivery bridge</Link>\n          <Link className="secondaryButton" href="/integration-delivery">Integration delivery</Link>
        </div>
      </section>

      <ApprovedDatasetPublishing initialModel={model} />
    </main>
  );
}
