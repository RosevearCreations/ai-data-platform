import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild430Dashboard} from "@/lib/build430-sweep-challenge-database";
import {Build430RefreshButton} from "./refresh-button";
export const dynamic="force-dynamic";
const fmt=(v:string)=>v.replaceAll("_"," ");
export default async function SweepChallengeReliabilityPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/sign-in?callbackUrl=%2Fsweep-challenge-reliability");
 const m=await readBuild430Dashboard(session.user.id),latest=m.sweeps[0];
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 430 · Source-Signed Sweep Challenge V1.2</p><h1>Challenge-bound receipts, overlap isolation and source reliability history</h1>
   <p className="lead">AIDP now proves that Yard Workers and iCamp signed the exact random challenge sent by this sweep. Separate concurrent probes must return separate signed challenges and receipts. Reliability history records verified continuity, deployment changes, offline/held intervals and returns without inventing uptime.</p>
   <div className="heroActions"><Build430RefreshButton/><Link className="secondaryButton" href="/seven-source-health">Seven-Source Health</Link><Link className="secondaryButton" href="/source-signer-activation">Source Signers</Link></div>
  </section>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{latest?.challenge_verified_sources??0}/2</strong><span>v1.2 challenge sources</span></article>
   <article><strong>{m.summary.overlapIsolationVerified?"YES":"NO"}</strong><span>overlap isolation certified</span></article>
   <article><strong>{m.summary.reliabilityEvents}</strong><span>reliability events</span></article>
   <article><strong>{latest?fmt(latest.state):"NO SWEEP"}</strong><span>latest state</span></article>
  </div></section>
  <section className="dataQualityPolicyNote"><strong>Hosted cadence baseline: {m.hostedCadence.schedule}</strong><p>{m.hostedCadence.statement}</p></section>
  <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Reliability ledger</p><h2>YW and iCamp verified history</h2></div></div><div className="masterGovernanceGrid">
   {m.reliability.slice(0,20).map((r:any)=><article className="reviewBatchSummary" key={r.app_id+r.observed_at+r.source_receipt_id}><h3>{r.app_id}</h3><p><strong>{fmt(r.event_kind)}</strong></p><p>Verified now: {r.current_verified?"yes":"no"} · gap {r.gap_seconds===null?"first sample":Math.round(r.gap_seconds)+"s"}</p><p>Commit {r.current_source_commit??"unknown"}</p><p>Previous {r.previous_source_commit??"none"}</p><p>Receipt {r.source_receipt_id??"none"}</p><p>{r.observed_at}</p></article>)}
  </div></section>
  <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Sweep evidence</p><h2>Challenge and overlap certification</h2></div></div><div className="masterGovernanceGrid">
   {m.sweeps.slice(0,12).map((s:any)=><article className="reviewBatchSummary" key={s.sweep_id}><h3>{s.mode}</h3><p><strong>{fmt(s.state)}</strong></p><p>Verified {s.verified_sources}/2 · challenge verified {s.challenge_verified_sources}/2</p><p>Overlap isolation: {s.overlap_isolation_verified?"verified":"not claimed"}</p><p>{s.observed_at}</p></article>)}
  </div></section>
  <section className="dataQualityPolicyNote"><strong>Offline truth boundary.</strong><p>An OFFLINE_OR_HELD event is recorded only when a real scheduled/operator/production challenge fails. Build 430 does not manufacture an outage merely to populate a chart. A later successful challenge after such an event becomes RETURN_VERIFIED.</p></section>
 </main>;
}