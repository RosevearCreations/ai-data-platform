import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { listCollectionRunConsoleForUser } from "@/lib/collection-runs";

import { HelpInfo } from "../help/HelpInfo";
import { CollectionRunConsole } from "./CollectionRunConsole";

export const dynamic = "force-dynamic";

export default async function CollectionRunsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fcollection-runs");

  const model = await listCollectionRunConsoleForUser(session.user.id);

  return (
    <main className="shell runConsoleShell">
      <section className="hero runConsoleHero">
        <HelpInfo topic="collection-runs-overview" />
        <p className="eyebrow">Build 047</p>
        <h1>Collection Run Console & Live Evidence</h1>
        <p className="lead">
          Start only already-authorized Browserless runs, observe synchronized local
          Chrome runs, follow queue and terminal evidence, stop active remote work,
          and export a factual run report.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/collection-projects">Collection projects</Link>
          <Link className="secondaryButton" href="/recipe-builder">Recipe builder</Link>
          <Link className="secondaryButton" href="/remote-execution">Browserless controls</Link>
        </div>
      </section>

      <CollectionRunConsole initialModel={model} />
    </main>
  );
}
