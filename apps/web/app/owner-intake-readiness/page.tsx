import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild453OwnerIntake} from "@/lib/build453-autonomous-intake-database";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-intake-readiness");
 const s=await readBuild453OwnerIntake(session.user.id);
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 453 · AI Data Platform Master</p>
  <h1 className="b449-heading">Autonomous event intake readiness</h1>
  <p className="b449-lead">This is an AI Data Platform-owned diagnostic. It does not wait for another application chat, create webhook secrets, or manufacture events. Each stage shows who actually owns the next dependency.</p>
  <div className="b449-grid">
   <section className="b449-card"><h2>Master intake endpoints</h2><strong className="b449-value">{s.counts.endpoints}</strong><p>Enabled production iCamp webhook sources</p></section>
   <section className="b449-card"><h2>Active event routes</h2><strong className="b449-value">{s.counts.activeEventSubscriptions}</strong><p>Authorized iCamp event-bus subscriptions</p></section>
   <section className="b449-card"><h2>Original Site 12 receipts</h2><strong className="b449-value">{s.counts.site12SourceReceipts}</strong><p>No source event is fabricated</p></section>
   <section className="b449-card"><h2>Master-owned gaps</h2><strong className="b449-value">{s.ownPipelineHolds}</strong><p>Separate from external source dependencies: {s.externalSourceHolds}</p></section>
  </div>
  <section className="b449-section">
   <h2>Current status</h2>
   <p><strong>{s.intakeState.replaceAll("_"," ")}</strong></p>
   <p className="b449-muted">Live readback: {s.asOf}. Latest autonomous inspection: {s.lastAutonomousCheck?.at??"not recorded yet"}. No cached status is mislabeled live.</p>
   <p>Last signed telemetry sweep age: {s.signedSweepAgeMinutes??"unavailable"} minutes. Original Windows relay age: {s.originalRelayAgeMinutes??"unavailable"} minutes.</p>
  </section>
  <section className="b449-section">
   <h2>What AI Data Platform owns, and what is external</h2>
   <div className="b449-apps">{s.steps.map(stage=><article className="b449-app" key={stage.stage}>
    <strong>{stage.stage.replaceAll("_"," ")}</strong>
    <span className="b449-status">{stage.state.replaceAll("_"," ")}</span>
    <p className="b449-muted">Owner: {stage.owner.replaceAll("_"," ")}</p>
    <p>{stage.explanation}</p>
    <p className="b449-muted">Next safe action: {stage.nextAutonomousAction.replaceAll("_"," ")}</p>
   </article>)}</div>
  </section>
  <section className="b449-section b449-card">
   <h2>Independent operations</h2>
   <p>AI Data Platform can deploy, diagnose and monitor its own pipeline while another product is unavailable. It will not bypass an absent HMAC source key, create a fake receipt, or transfer guest/payment records into the Master.</p>
   <p className="b449-muted">The existing daily authenticated Master health process records this intake check separately from seven-source signed telemetry. The browser always queries current database counts.</p>
  </section>
  <nav className="b449-links">
   <Link href="/owner-site12-trace">Build 452 Site 12 trace</Link>
   <Link href="/owner-signer-authority">Signed source authority</Link>
   <Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_453_INDEPENDENT_MASTER_OPERATIONS.md">Build 453 handoff and evidence</Link>
  </nav>
 </main>;
}
