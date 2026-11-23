import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {readBuild439Dashboard} from "@/lib/build439-release-dashboard";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Frelease-dependency-graph");
 const result=await readBuild439Dashboard(session.user.id);
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 439 · Release Dependency Graph</p><h1>Coordinate rollout without crossing source authority</h1><p className="lead">Required dependencies propagate hold and review status. Advisory relationships inform sequencing but never block independent applications. This is a read-only plan, not proof of a production deployment.</p><div className="heroActions"><Link className="secondaryButton" href="/interface-drift-observatory">Interface drift evidence</Link><Link className="secondaryButton" href="/peer-release-ledger">Source release ledger</Link></div></section>
  <section className="reviewSummary"><div className="commandMetrics"><article><strong>{result.safeToPromote?"READY":"HOLD / REVIEW"}</strong><span>release gate</span></article><article><strong>{result.waves.length}</strong><span>ordered waves</span></article><article><strong>{result.releases.filter(x=>x.state==="BLOCKED_BY_DEPENDENCY").length}</strong><span>propagated blocks</span></article><article><strong>{result.releases.filter(x=>x.state==="REVIEW_REQUIRED").length}</strong><span>evidence reviews</span></article></div></section>
  <section className="reviewQueue"><div className="masterGovernanceGrid">{result.releases.map(row=><article className="reviewBatchSummary" key={row.appId}><h3>{row.appId} · {row.release}</h3><p><strong>{row.state.replaceAll("_"," ")}</strong> · wave {row.wave===null?"unresolved":row.wave+1}</p><p>{row.causes.length?row.causes.join(" · "):"No active blockers in the available evidence"}</p></article>)}</div></section>
  <section className="dataQualityPolicyNote"><strong>Release authority remains with each application.</strong><p>Unknown interface surfaces require review, not assumed compatibility. No release automatically proceeds from this screen. Cycles and malformed dependencies prevent approval.</p></section>
 </main>;
}
