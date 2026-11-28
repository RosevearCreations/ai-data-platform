import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild457OwnerForecast} from "@/lib/build457-recurrence-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-recurrence-forecast");
 const s=await readBuild457OwnerForecast(session.user.id);
 const urgent=s.forecast.filter(x=>x.priority==="URGENT").length;
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 457 · Master Operations</p>
  <h1 className="b449-heading">Incident recurrence and recommended next checks</h1>
  <p className="b449-lead">Evidence-based risk bands from the most recent 30 days of protected incident history. These are transparent prioritization rules, not machine-learning probabilities. No recommendation executes a change.</p>
  <div className="b449-grid">
   <section className="b449-card"><h2>Open assessments</h2><strong className="b449-value">{s.forecast.length}</strong></section>
   <section className="b449-card"><h2>Urgent review</h2><strong className="b449-value">{urgent}</strong></section>
   <section className="b449-card"><h2>Recorded observations</h2><strong className="b449-value">{s.observationRowsExamined}</strong></section>
  </div>
  <section className="b449-section"><h2>Prioritized owner review queue</h2>
   {s.forecast.length===0?<p>No open recorded incidents. No recurrence forecast is available.</p>:<div className="b449-apps">
    {s.forecast.map(f=><article className="b449-app" key={f.key}>
     <strong>{f.key.replaceAll("_"," ")}</strong><span className="b449-status">{f.priority}</span>
     <p>Risk signal: {f.riskBand.replaceAll("_"," ")} · Recorded reopenings: {f.reopeningCount} · Open observations: {f.openObservations}</p>
     <p>Recommended next review: {f.recommendationCode.replaceAll("_"," ")}.</p>
     <p className="b449-muted">{f.explanation}</p>
    </article>)}</div>}
  </section>
  <section className="b449-section"><h2>Durable daily assessment receipts</h2>
   <p>{s.recentSnapshots.length} recent forecast receipts. These record classifications, not authorized repairs.</p>
  </section>
  <p className="b449-muted">Original signed source evidence, physical Windows recovery, external app credentials and cross-application operations remain independent authorization gates.</p>
  <nav className="b449-links"><Link href="/owner-incident-intelligence">Build 456 incident intelligence</Link><Link href="/owner-exception-history">Build 455 exception ledger</Link></nav>
 </main>;
}
