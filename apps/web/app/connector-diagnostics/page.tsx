import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildConnectorDiagnostics } from "@/lib/connector-diagnostics";
import { ConnectorDiagnosticsAssistant } from "./ConnectorDiagnosticsAssistant";

export const dynamic="force-dynamic";
export default async function ConnectorDiagnosticsPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fconnector-diagnostics");
 const model=await buildConnectorDiagnostics(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--it">
  <section className="hero reviewHero"><p className="eyebrow">Build 264</p><h1>Connector Diagnostics, Configuration Validation & Recovery Assistant</h1>
   <p className="lead">Validate connector configuration, grants, endpoint-shaped fields and secret references without exposing secret values, then run bounded connection tests where safe.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/connectors">Connector Manager</Link><Link className="secondaryButton" href="/system-reliability">System Reliability</Link><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Provider-safe diagnostics.</strong><p>Credential indicators use reference age only. Secret values are never read into this dashboard. Automatic tests avoid export-only connectors.</p></section>
  <ConnectorDiagnosticsAssistant initialModel={model}/>
 </main>;
}