import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild455OwnerLedger} from "@/lib/build455-exception-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-exception-history");
 const s=await readBuild455OwnerLedger(session.user.id);
 const open=s.cases.filter(c=>c.status==="OPEN");
 const escalated=open.filter(c=>c.escalation==="OWNER_REVIEW");
 const recovered=s.cases.filter(c=>c.status==="RECOVERY_VERIFIED");
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 455 · Master Exception Operations</p>
  <h1 className="b449-heading">Durable recovery history and owner escalations</h1>
  <p className="b449-lead">Evidence is recorded by the existing protected Master cron. A queued retry is only a due time, not proof an action executed. Resolution requires a later fresh source readback.</p>
  <div className="b449-grid">
   <section className="b449-card"><h2>Open cases</h2><strong className="b449-value">{open.length}</strong></section>
   <section className="b449-card"><h2>Owner review</h2><strong className="b449-value">{escalated.length}</strong></section>
   <section className="b449-card"><h2>Verified recoveries</h2><strong className="b449-value">{recovered.length}</strong></section>
  </div>
  <section className="b449-section"><h2>Open exception register</h2>
   {open.length===0?<p>No open cases in the recorded Master ledger.</p>:<div className="b449-apps">
    {open.map(c=><article className="b449-app" key={c.exception_key}>
      <strong>{c.exception_key.replaceAll("_"," ")}</strong><span className="b449-status">{c.escalation.replaceAll("_"," ")}</span>
      <p>State: {c.observed_state.replaceAll("_"," ")} · Owner: {c.owner_scope.replaceAll("_"," ")}</p>
      <p>Next diagnostic due: {c.next_check_at??"not automatically scheduled"}</p>
      <p className="b449-muted">First seen {c.first_seen_at}; last seen {c.last_seen_at}; consecutive observations {c.consecutive_open}. Next safe action: {c.action_code.replaceAll("_"," ")}</p>
    </article>)}</div>}
  </section>
  <section className="b449-section"><h2>Recent recorded observations and recoveries</h2>
   {s.history.length===0?<p>No recorded inspections yet.</p>:<div className="b449-apps">{s.history.slice(0,30).map((h,i)=><article className="b449-app" key={h.exception_key+h.captured_at+i}>
    <strong>{h.exception_key.replaceAll("_"," ")}</strong> · {h.outcome.replaceAll("_"," ")}
    <p className="b449-muted">{h.captured_at} — {h.observed_state.replaceAll("_"," ")}</p>
   </article>)}</div>}
  </section>
  <p className="b449-muted">The daily scheduler may execute later than a diagnostic due time. This dashboard cannot trigger physical devices, credential rotation, payments, outbound messages or cross-app repairs.</p>
  <nav className="b449-links"><Link href="/owner-exceptions">Build 454 live exceptions</Link><Link href="/owner-intake-readiness">Master intake readiness</Link></nav>
 </main>;
}
