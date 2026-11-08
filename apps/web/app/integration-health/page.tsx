import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildIntegrationHealthCommandCenter } from "@/lib/integration-health-command-center";

import { HelpInfo } from "../help/HelpInfo";
import { IntegrationHealthCommandCenter } from "./IntegrationHealthCommandCenter";

export const dynamic="force-dynamic";

export default async function IntegrationHealthPage(){
  const session=await auth.api.getSession({headers:await headers()});

  if(!session){
    return <main className="shell">
      <section className="hero">
        <HelpInfo topic="connectors-overview"/>
        <p className="eyebrow">Build 300</p>
        <h1>Unified Integration Health Command Center</h1>
        <p className="lead">Sign in to review RLS-scoped connection, credential, webhook, queue, latency and degraded-service evidence.</p>
        <Link className="primaryLink" href="/sign-in?callbackUrl=/integration-health">Sign in</Link>
      </section>
    </main>;
  }

  const model=await buildIntegrationHealthCommandCenter(session.user.id);

  return <main className="shell opsCommandScreen opsCommandScreen--status">
    <section className="hero">
      <HelpInfo topic="connectors-overview"/>
      <p className="eyebrow">Build 300 · unified integration health</p>
      <h1>Unified Integration Health Command Center</h1>
      <p className="lead">
        Review connection registry state, measured connector latency, credential-reference risk,
        webhook outcomes, event queues, failures and degraded services in one evidence-based dashboard.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/system-reliability">System Reliability</Link>
        <Link className="secondaryButton" href="/connector-diagnostics">Connector Diagnostics</Link>
        <Link className="secondaryButton" href="/credential-vault">Credential Vault</Link>
        <Link className="secondaryButton" href="/event-recovery">Event Recovery</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 300 observation boundary</strong>
      <p>
        This dashboard combines authorized stored evidence and the registered local application state.
        It performs no external health probe, reads no credential value, activates no connection,
        triggers no automatic recovery and does not bypass current connection authorization.
      </p>
    </section>

    <IntegrationHealthCommandCenter model={model}/>
  </main>;
}
