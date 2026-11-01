import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildSystemReliabilityDashboard } from "@/lib/system-reliability";
import { SystemReliabilityDashboard } from "./SystemReliabilityDashboard";
export const dynamic="force-dynamic";
export default async function SystemReliabilityPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fsystem-reliability");
 const model=await buildSystemReliabilityDashboard(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--systemStatus">
  <section className="hero reviewHero"><p className="eyebrow">Build 263</p><h1>System Health, Observability & Reliability Dashboard</h1>
   <p className="lead">Measured application, database, collection, connector, integration, remote-execution, queue and exception health in one operator-safe view.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link><Link className="secondaryButton" href="/attention">Attention Center</Link><Link className="secondaryButton" href="/production-learning">Production Learning</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Evidence-based status only.</strong><p>Healthy, attention and critical states are derived from current probes and durable operational evidence. No synthetic uptime or unsupported SLA is displayed.</p></section>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.database.reachable?"Reachable":"Unavailable"}</strong><span>database · {model.database.latencyMs} ms</span></article>
   <article><strong>{model.database.authorizedWorkspaces}</strong><span>authorized workspaces</span></article>
   <article><strong>{model.runtime.collectionRuntimeReady?"Ready":"Fail-closed"}</strong><span>collection runtime</span></article>
   <article><strong>{model.runtime.globalKillSwitchActive?"Active":"Inactive"}</strong><span>global kill switch</span></article>
  </div></section>
  <SystemReliabilityDashboard model={model}/>
 </main>;
}