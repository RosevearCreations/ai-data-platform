import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsAreaBand } from "../OperationsCommandPanels";
import { OperatorWorkspaceManager } from "../OperatorWorkspaceControls";

export const dynamic = "force-dynamic";

export default async function OperatorWorkspacesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Foperator-workspaces");

  return (
    <main className="shell opsCommandScreen opsCommandScreen--management operatorWorkspaceShell">
      <section className="hero">
        <HelpInfo topic="operator-workspaces" />
        <p className="eyebrow">Build 257</p>
        <h1>Operator Workspaces & Filter Profiles</h1>
        <p className="lead">
          Reopen browser-local combinations of filters, search, sort, visible
          columns, date range and workspace context without changing account or
          workspace authorization.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/search">Unified Search</Link>
          <Link className="secondaryButton" href="/data-library">Data Library</Link>
        </div>
      </section>

      <OperationsAreaBand
        area="Management"
        description="Saved operator views are local navigation state only; governed data and permissions remain in their source workflows."
        links={[
          { label: "Unified Search", href: "/search" },
          { label: "Data Library", href: "/data-library" },
          { label: "System Status", href: "/integration-delivery" }
        ]}
      />

      <OperatorWorkspaceManager />
    </main>
  );
}
