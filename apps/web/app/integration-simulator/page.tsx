import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildIntegrationCompatibilityCenter } from "@/lib/integration-simulator";
import { IntegrationCompatibilityCenter } from "./IntegrationCompatibilityCenter";
export const dynamic="force-dynamic";
export default async function IntegrationSimulatorPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fintegration-simulator");
 const model=await buildIntegrationCompatibilityCenter(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 265</p><h1>Integration Delivery Simulator & Contract Compatibility Center</h1>
   <p className="lead">Preview package shape, schema version, operations, target capabilities, validation outcomes, dry-run result and expected acknowledgement before any delivery is attempted.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/integration-delivery">Integration Delivery</Link><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link><Link className="secondaryButton" href="/system-reliability">System Reliability</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Simulation only.</strong><p>This surface builds and validates packages locally. It performs no network request, writes no consumer receipt, and does not authorize downstream mutation.</p></section>
  <IntegrationCompatibilityCenter model={model}/>
 </main>;
}