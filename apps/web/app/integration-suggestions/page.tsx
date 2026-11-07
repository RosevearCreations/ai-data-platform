import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildIntegrationSuggestionsForUser } from "@/lib/integration-suggestions-database";

import { HelpInfo } from "../help/HelpInfo";
import { IntegrationSuggestionsWorkbench } from "./IntegrationSuggestionsWorkbench";

export const dynamic="force-dynamic";

export default async function IntegrationSuggestionsPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session){
    return <main className="shell">
      <section className="hero">
        <HelpInfo topic="integration-delivery"/>
        <p className="eyebrow">Build 303</p>
        <h1>AI-Assisted Integration Mapping &amp; Workflow Suggestions</h1>
        <p className="lead">
          Sign in to review bounded mapping and workflow suggestions built from authorized schema and event evidence.
        </p>
        <Link className="primaryLink" href="/sign-in?callbackUrl=/integration-suggestions">Sign in</Link>
      </section>
    </main>;
  }

  const model=await buildIntegrationSuggestionsForUser(session.user.id);

  return <main className="shell opsCommandScreen opsCommandScreen--it">
    <section className="hero">
      <HelpInfo topic="integration-delivery"/>
      <p className="eyebrow">Build 303 · advisory integration intelligence</p>
      <h1>AI-Assisted Integration Mapping &amp; Workflow Suggestions</h1>
      <p className="lead">
        Build deterministic candidate mappings and reviewed-workflow ideas from existing
        schema descriptors and durable event evidence, then optionally ask AI to rank and
        explain only those pre-approved candidate IDs.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/field-mappings">Visual Field Mapping Studio</Link>
        <Link className="secondaryButton" href="/workflow-automation">Workflow Automation</Link>
        <Link className="secondaryButton" href="/schema-drift">Schema Drift</Link>
        <Link className="secondaryButton" href="/data-contracts">Data Contracts</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Suggestion, never activation.</strong>
      <p>
        AI cannot invent new candidate IDs and cannot save a mapping, create or approve a
        workflow rule, activate a connection, release a held action or execute a downstream
        operation. Any real change must be performed deliberately in the existing governed
        Build 287 or Build 302 workbench.
      </p>
    </section>

    <IntegrationSuggestionsWorkbench model={{
      workspaces:model.workspaces,
      candidates:model.candidates,
      deterministicRanking:model.deterministicRanking,
      summary:model.summary,
      policy:model.policy
    }}/>
  </main>;
}
