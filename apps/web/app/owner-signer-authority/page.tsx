import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild451OwnerReadback} from "@/lib/build451-live-owner-readback";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-signer-authority");
 const s=await readBuild451OwnerReadback(session.user.id,session.session.createdAt);
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 451 · Source signer and relay continuity</p>
  <h1 className="b449-heading">Seven-application signer authority</h1>
  <p className="b449-lead">Original owner: {s.maskedOriginalOwner}. Signed source telemetry, original-Windows relay readiness and independent physical field witnesses have different proof requirements. This report does not claim repairs performed on inaccessible external hosts.</p>
  <div className="b449-grid">
   <article className="b449-card"><h2>Historical source signatures</h2><strong className="b449-value">{s.historicallySigned} / {s.denominator}</strong><p>Historical signed communication is preserved.</p></article>
   <article className="b449-card"><h2>Latest verified signed sources</h2><strong className="b449-value">{s.verifiedSignedNow} / {s.denominator}</strong><p>Observation window {s.observationWindowMinutes} minutes; signed sources only. {s.currentAcceptance.replaceAll("_"," ")}</p></article>
   <article className="b449-card"><h2>Original-device field witness</h2><strong className="b449-value">{s.fieldCertified} / {s.denominator}</strong><p>{s.independentFieldAcceptance.replaceAll("_"," ")} — a separate independent certificate.</p></article>
   <article className="b449-card"><h2>Latest collection</h2><strong className="b449-value">{s.observedAt??"Not available"}</strong><p>{s.latestSweepMode.replaceAll("_"," ")} · missing signed stages {s.excludedUnsigned} of {s.denominator}</p></article>
  </div>
  <section className="b449-section"><h2>Current source-by-source recovery</h2>
   <p className="b449-muted">The diagnostic first verifies an existing pinned source signature before identifying a possible commit mismatch, clock error or unsafe payload scope. A mismatch never authorizes an automatic pin change.</p>
   <div className="b449-apps">
    {s.rows.map(r=><article className="b449-app" key={r.appId}>
     <strong>{r.appId}</strong><span className="b449-status">{r.authenticatedTelemetry?"SIGNED SOURCE VERIFIED":"SIGNER AUTHORITY HOLD"}</span>
     <p>Source age: {r.sourceAgeMinutes===null?"unknown":r.sourceAgeMinutes+" min"}</p>
     <p className="b449-muted">{r.reason.replaceAll("_"," ")}</p>
     <p><strong>Next verified action:</strong> {r.nextAction.replaceAll("_"," ")}</p>
     <p className="b449-muted">Independent original-device witness: {r.independentOriginalDeviceWitness?"verified":"not demonstrated"}</p>
    </article>)}
   </div>
  </section>
  <section className="b449-section b449-card">
   <h2>Windows Hub relay and remaining dependencies</h2>
   <p>The original Windows relay is admitted only after the source signature and live challenge have been verified. Invalid submissions cannot consume an unused challenge. A fresh outbound packet from the real Windows host is still required before this source becomes currently signed.</p>
   <p className="b449-muted">No application secret, source pin, receiver role, account credential or original Windows service was changed automatically.</p>
  </section>
  <nav className="b449-links">
   <Link href="/owner-connection-validation">Run owner-authorized live source challenge</Link>
   <Link href="/owner-field-enrollment">Original-device field witness records</Link>
   <Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_451_SOURCE_OF_TRUTH_SIGNER_RECOVERY.md">Build 451 evidence and next Source of Truth acceptance</Link>
  </nav>
 </main>;
}
