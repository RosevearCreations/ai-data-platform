import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild456OwnerIntelligence} from "@/lib/build456-incident-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-incident-intelligence");
 const s=await readBuild456OwnerIntelligence(session.user.id);
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 456 · Master Operations Intelligence</p>
  <h1 className="b449-heading">Incident deduplication and verified recovery outcomes</h1>
  <p className="b449-lead">One exception key counts as one open incident. Repeated observations remain in the audit trail but do not inflate active incident counts. A recovery is credited only from recorded recovery evidence, never merely from a retry.</p>
  <div className="b449-grid">
   <section className="b449-card"><h2>Unique open incidents</h2><strong className="b449-value">{s.uniqueOpenIncidents}</strong><p>Repeated observations: {s.repeatedObservations}</p></section>
   <section className="b449-card"><h2>Owner escalations</h2><strong className="b449-value">{s.ownerEscalations}</strong><p>Aged over 24h: {s.agedEscalations}; critical over 72h: {s.criticalEscalations}</p></section>
   <section className="b449-card"><h2>Recovery evidence</h2><strong className="b449-value">{s.recoveryEffectivenessPercent===null?"N/A":s.recoveryEffectivenessPercent+"%"}</strong><p>Verified recovered cases: {s.verifiedRecoveries}. Observed incident outcomes, not claimed retry effectiveness</p></section>
  </div>
  <section className="b449-section"><h2>Escalation aging</h2>{s.ownerAge.length===0?<p>No open owner escalations in the recorded evidence.</p>:<div className="b449-apps">
   {s.ownerAge.map(x=><article className="b449-app" key={x.key}>
    <strong>{x.key.replaceAll("_"," ")}</strong><span className="b449-status">{x.priority}</span>
    <p>Age: {x.ageHours===null?"unavailable":x.ageHours+" hours"}. Never automatically grants privileged repair authority.</p>
   </article>)}</div>}</section>
  <section className="b449-section"><h2>Durable daily snapshots</h2>
   {s.dailySnapshots.length===0?<p>No daily intelligence snapshot has been recorded yet.</p>:
    <div className="b449-apps">{s.dailySnapshots.slice(0,14).map(d=><article className="b449-app" key={d.capturedAt}>
     <strong>{d.day}</strong><p>Open {d.open}; owner escalations {d.escalations}; verified recovered {d.recovered}</p>
    </article>)}</div>}</section>
  <p className="b449-muted">Daily snapshots use a bounded recent evidence window. Empty history is reported as N/A, not a perfect recovery score. Diagnostic-only: no automatic external, device, credential or payment changes.</p>
  <nav className="b449-links"><Link href="/owner-exception-history">Build 455 durable case history</Link><Link href="/owner-exceptions">Build 454 current exceptions</Link></nav>
 </main>;
}
