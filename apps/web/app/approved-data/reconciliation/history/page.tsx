import Link from "next/link";

import { HelpInfo } from "@/app/help/HelpInfo";
import { HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS } from "@/lib/historical-corrective-workflows";

export default function CorrectiveHistoryPage() {
  return (
    <main className="shell shellWide">
      <section className="hero compactHero">
        <HelpInfo topic="corrective-history" />
        <p className="eyebrow">Build 117 · Historical access</p>
        <h1>Corrective Operations History & Legacy Workflows</h1>
        <p className="lead">
          Historical generation-specific screens remain available for evidence review,
          diagnostics and continuity. Normal corrective work should begin in the unified
          Operations Console or current Planning / Delivery / Verification workflows.
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href="/approved-data/reconciliation/corrective-generation-operations">
            Open current operations console
          </Link>
          <Link className="secondaryButton" href="/workflows">
            Workflow directory
          </Link>
        </div>
      </section>

      <section className="legacyWorkflowGrid">
        {HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS.map((group) => (
          <article className="legacyWorkflowCard cardHelpSurface" key={group.title}>
            <HelpInfo topic="corrective-history" inline />
            <h2>{group.title}</h2>
            <p>{group.description}</p>
            <div className="legacyWorkflowLinks">
              {group.links.map((item) => (
                <Link href={item.href} key={item.href}>{item.label}</Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
