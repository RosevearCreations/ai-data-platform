import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild454OwnerExceptions} from "@/lib/build454-autonomous-recovery-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-exceptions");
 const report=await readBuild454OwnerExceptions(session.user.id);
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 454 · AI Data Platform Master</p>
  <h1 className="b449-heading">Autonomous recovery and owner exceptions</h1>
  <p className="b449-lead">Read-only, owner-authorized evidence from this Master's own intake. Missing external evidence is reported without blocking unrelated Master work.</p>
  <div className="b449-grid">
   <section className="b449-card"><h2>Owner exceptions</h2><strong className="b449-value">{report.counts.ownerAction}</strong><p>Gaps requiring investigation or approval</p></section>
   <section className="b449-card"><h2>Source watches</h2><strong className="b449-value">{report.counts.watch}</strong><p>External evidence missing or stale</p></section>
   <section className="b449-card"><h2>Safe diagnostic actions</h2><strong className="b449-value">{report.counts.autonomousEligible}</strong><p>Eligibility does not mean a repair occurred</p></section>
  </div>
  <section className="b449-section"><h2>Master exception status</h2><p><strong>{report.state.replaceAll("_"," ")}</strong></p>
   <p className="b449-muted">Evaluated {report.asOf}; authenticated read attempts: {report.readAttempts}. No synthetic source receipts, privileged actions or automatic key rotations.</p></section>
  <section className="b449-section"><h2>Current exceptions and next safe action</h2>
   {report.exceptions.length===0?<p>No exceptions in the current verified snapshot.</p>:
    <div className="b449-apps">{report.exceptions.map(e=><article className="b449-app" key={e.id}>
     <strong>{e.id.replaceAll("_"," ")}</strong><span className="b449-status">{e.severity.replaceAll("_"," ")}</span>
     <p>{e.detail}</p><p className="b449-muted">Owned by: {e.owner.replaceAll("_"," ")}</p>
     <p>Next safe action: {e.action.replaceAll("_"," ")}. {e.autonomous?"Eligible for internal diagnosis only.":"No automatic privileged intervention."}</p>
    </article>)}</div>}
  </section>
  <nav className="b449-links">
   <Link href="/owner-intake-readiness">Build 453 intake source</Link>
   <Link href="/owner-site12-trace">Original Site 12 trace</Link>
   <Link href="/owner-signer-authority">Signed-source authority</Link>
  </nav>
 </main>;
}
