import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listIntegrationRecoveryForUser } from "@/lib/integration-recovery-database";

import { HelpInfo } from "../help/HelpInfo";
import { IntegrationRecoveryConsole } from "./IntegrationRecoveryConsole";

export const dynamic="force-dynamic";

export default async function IntegrationRecoveryPage(){
  const session=await auth.api.getSession({headers:await headers()});

  if(!session){
    return <main className="shell">
      <section className="hero">
        <HelpInfo topic="connectors-overview"/>
        <p className="eyebrow">Build 301</p>
        <h1>Self-Healing Connection Recovery &amp; Safe Retry Automation</h1>
        <p className="lead">
          Sign in to review bounded connector health retries and owner-controlled recovery decisions.
        </p>
        <Link className="primaryLink" href="/sign-in?callbackUrl=/integration-recovery">Sign in</Link>
      </section>
    </main>;
  }

  const model=await listIntegrationRecoveryForUser(session.user.id);

  return <main className="shell opsCommandScreen opsCommandScreen--it">
    <section className="hero">
      <HelpInfo topic="connectors-overview"/>
      <p className="eyebrow">Build 301 · bounded recovery automation</p>
      <h1>Self-Healing Connection Recovery &amp; Safe Retry Automation</h1>
      <p className="lead">
        Classify integration failures, run bounded GET/HEAD connector health retries for
        transient HTTP failures, and hold consequential recovery behind explicit owner/admin decisions.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/integration-health">Integration Health</Link>
        <Link className="secondaryButton" href="/connector-diagnostics">Connector Diagnostics</Link>
        <Link className="secondaryButton" href="/event-recovery">Event Recovery</Link>
        <Link className="secondaryButton" href="/credential-vault">Credential Vault</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 301 recovery boundary</strong>
      <p>
        Automatic recovery is limited to connector SDK health checks using the connector&apos;s
        declared GET/HEAD health path and bounded retry policy. Credential changes, event replay,
        connection activation, export/write operations and trust decisions are never auto-executed.
        QL-266 remains unchanged.
      </p>
    </section>

    <IntegrationRecoveryConsole model={{
      plans:model.plans,
      summary:model.summary,
      policy:model.policy
    }}/>
  </main>;
}
