import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {readBuild440Dashboard} from "@/lib/build440-release-certification-database";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Frelease-certification");
 const result=await readBuild440Dashboard(session.user.id);
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
 <section className="hero reviewHero"><p className="eyebrow">Build 440 · Cross-Application Release Certification</p><h1>Signed receipts are necessary, not sufficient</h1><p className="lead">Verify source-specific closure provenance, receipt continuity and freshness before an independent interface and owner field-certification decision. No release is auto-authorized from this dashboard.</p><div className="heroActions"><Link className="secondaryButton" href="/release-dependency-graph">Release dependency graph</Link><Link className="secondaryButton" href="/interface-drift-observatory">Interface evidence</Link></div></section>
 <section className="reviewSummary"><div className="commandMetrics"><article><strong>{result.rolloutAcceptance.replaceAll("_"," ")}</strong><span>coordinated rollout acceptance</span></article><article><strong>{result.signedEvidenceCount}/7</strong><span>qualified receipts</span></article><article><strong>{result.certifications.filter(x=>x.state==="HOLD").length}</strong><span>hard holds</span></article><article><strong>{result.graph.releases.filter(x=>x.state==="BLOCKED_BY_DEPENDENCY").length}</strong><span>propagated blocks</span></article></div></section>
 <section className="reviewQueue"><div className="masterGovernanceGrid">{result.certifications.map(row=><article className="reviewBatchSummary" key={row.appId}><h3>{row.appId} · {row.release}</h3><p><strong>{row.state.replaceAll("_"," ")}</strong> · {row.reason.replaceAll("_"," ")}</p><p>Commit {row.sourceCommit?.slice(0,12)??"not observed"} · Receipt {row.receiptId??"not verified"}</p><p>Verified {row.verifiedAt??"not available"}</p></article>)}</div></section>
 <section className="dataQualityPolicyNote"><strong>Independent acceptance stays HOLD.</strong><p>{result.explanation} A live field witness and compatibility certification are still required before claiming cross-application release approval.</p></section>
 </main>;
}
