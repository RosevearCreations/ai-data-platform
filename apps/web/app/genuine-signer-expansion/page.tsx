import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild431Dashboard} from "@/lib/build431-genuine-signer-expansion-database";
import {Build431RefreshButton} from "./refresh-button";
export const dynamic="force-dynamic";
const fmt=(v:string)=>v.replaceAll("_"," ");
export default async function GenuineSignerExpansionPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/sign-in?callbackUrl=%2Fgenuine-signer-expansion");
 const m=await readBuild431Dashboard(session.user.id),latest=m.sweeps[0];
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 431 · Genuine Signer Expansion</p><h1>Cross-provider signed telemetry with explicit authority boundaries</h1>
   <p className="lead">AIDP now joins Yard Workers and iCamp as a production protocol 1.2 signed source. All seven applications are challenged and classified; Cloudflare and original-host sources stay visibly held until their own provider authority exists.</p>
   <div className="heroActions"><Build431RefreshButton/><Link className="secondaryButton" href="/sweep-challenge-reliability">Signed Sweep Reliability</Link><Link className="secondaryButton" href="/seven-source-health">Seven-Source Health</Link></div>
  </section>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{m.summary.verifiedSources}/7</strong><span>genuine v1.2 signed sources</span></article>
   <article><strong>{m.summary.classifiedSources}/7</strong><span>classified sources</span></article>
   <article><strong>{m.summary.heldSources}</strong><span>provider/original-host HOLDs</span></article>
   <article><strong>{latest?fmt(latest.state):"NO SWEEP"}</strong><span>latest state</span></article>
  </div></section>
  <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Provider truth</p><h2>Seven-source signer expansion</h2></div></div><div className="masterGovernanceGrid">
   {m.sources.map(source=>{const o=source.observation;return <article className="reviewBatchSummary" key={source.appId}><h3>{source.appId}</h3><p><strong>{fmt(String(source.state))}</strong></p><p>Provider {source.matrix.provider} · expected {fmt(source.matrix.expectedRole)}</p><p>Challenge verified {o?.challenge_verified?"yes":"no"} · protocol {o?.protocol_version??"—"}</p><p>Commit {o?.source_commit?.slice(0,12)??"—"} · receipt {o?.source_receipt_id?.slice(0,12)??"—"}</p><p>Credential present {o?.credential_present?"yes":"no"} · origin reachable {o?.origin_reachable?"yes":"no"}</p><p>Restart after runtime/config change: {source.matrix.restartRequiredAfterCodeUpdate?"required for original-host process":"no manual server restart"}</p><p>{source.matrix.authorityBoundary}</p><p>{o?.detail??"No Build 431 observation yet."}</p></article>})}
  </div></section>
  <section className="dataQualityPolicyNote"><strong>Production GREEN is not seven-source CONNECTED.</strong><p>Build 431 requires AIDP, Yard Workers and iCamp to prove fresh signed v1.2 challenge receipts. Cloudflare and original-host sources remain explicit HOLDs until their own authority and runtime evidence exists. Vercel updates need no manual restart; an original-host Windows process does require restart/reload when its running code or signer environment changes.</p></section>
 </main>;
}
