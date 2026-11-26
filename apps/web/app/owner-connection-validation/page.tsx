import Link from "next/link";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild450ConnectionValidation} from "@/lib/build450-live-discovery";
import {Build450AutoValidate} from "./auto-run";
import "../owner-field-enrollment/build449.css";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Fowner-connection-validation");
 const s=await readBuild450ConnectionValidation(session.user.id,session.session.createdAt);
 return <main className="shell b449-wrapper">
  <p className="eyebrow">Build 450 · Owner-authorized production connection discovery</p>
  <h1 className="b449-heading">Seven application connections · genuine evidence</h1>
  <p className="b449-lead">We have confirmed historical signed communication across seven applications. This page independently reruns fresh, source-signed challenge checks when opened, subject to a ten-minute cooldown. Independent original Windows/device field certification remains a distinct proof requirement.</p>
  <Build450AutoValidate/>
  <div className="b449-grid">
   <article className="b449-card"><h2>Historically verified signed sources</h2><span className="b449-value">{s.history.verified} / 7</span><p className="b449-muted">{s.history.at??"No historic sweep"} — {s.history.state.replaceAll("_"," ")}</p></article>
   <article className="b449-card"><h2>Latest signed source challenges</h2><span className="b449-value">{s.latestSweep?.verified??0} / 7</span><p className="b449-muted">{s.latestSweep?.at??"No sweep"}; {s.latestSweep?.fresh?"recently checked":"stale until fresh validation completes"}</p></article>
   <article className="b449-card"><h2>Reachable app origins</h2><span className="b449-value">{s.currentlyReachableOrigins} / 7</span><p className="b449-muted">Reachable in the recent owner-authorized signed-source sweep. An accessible website alone is not a signed handshake.</p></article>
   <article className="b449-card"><h2>Independent original-device witnesses</h2><span className="b449-value">{s.independentOriginalDeviceWitnesses} / 7</span><p className="b449-muted">This separate field gate cannot be replaced by our approval or an ordinary source health receipt.</p></article>
  </div>
  <section className="b449-section">
   <h2>First genuine source telemetry pilot</h2>
   <p>{s.firstAuthenticSourceTelemetryPilot.state.replaceAll("_"," ")}{s.firstAuthenticSourceTelemetryPilot.appId?" — "+s.firstAuthenticSourceTelemetryPilot.appId:""}</p>
   <p className="b449-muted">The app pilot proves a live signed protocol-v1.2 source challenge. It is not a physical original-device acceptance certificate.</p>
  </section>
  <section className="b449-section">
   <h2>What is connected, stale or held</h2>
   <div className="b449-apps">{s.rows.map(r=><article className="b449-app" key={r.appId}>
    <strong>{r.appId}</strong>
    <span className="b449-status">{r.recentlySigned?"SIGNED NOW":r.historicallySigned?"SIGNED BEFORE · RECHECK":"CONNECTION HOLD"}</span>
    <p>{r.originReachable?"Origin reachable":"Origin not confirmed reachable"}</p>
    <p className="b449-muted">{r.sourceHoldReason.replaceAll("_"," ")}</p>
    <p className="b449-muted">Independent original-device witness: {r.independentFieldWitness==="FRESH_INDEPENDENT_SOURCE_BOUND_PROOF"?"verified":"not verified"}</p>
   </article>)}</div>
  </section>
  <nav className="b449-links" aria-label="Build 450 evidence links">
   <Link href="/seven-source-telemetry-closure">Earlier signed telemetry closure</Link>
   <Link href="/owner-field-enrollment">Independent field evidence</Link>
   <Link href="https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/BUILD_450_SIGNED_CONNECTION_DISCOVERY.md">Production evidence audit</Link>
  </nav>
 </main>;
}
