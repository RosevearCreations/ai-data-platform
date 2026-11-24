import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {readBuild441Dashboard} from "@/lib/build441-independent-field-witness-database";
export const dynamic="force-dynamic";
export default async function Page(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Ffield-witness-certification");
 const result=await readBuild441Dashboard(session.user.id);
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
 <section className="hero reviewHero"><p className="eyebrow">Build 441 · Independent Field Witness</p><h1>Seven-application certification without synthetic proof</h1><p className="lead">Live signed-intake evidence, independent original-device witness attestation, receiver acknowledgement and owner acceptance must agree on the exact source revision. The system fails closed when any required evidence is missing or stale.</p><div className="heroActions"><Link className="secondaryButton" href="/release-certification">Source certification</Link><Link className="secondaryButton" href="/release-dependency-graph">Dependency waves</Link></div></section>
 <section className="reviewSummary"><div className="commandMetrics"><article><strong>{result.rolloutState.replaceAll("_"," ")}</strong><span>safe rollout gate</span></article><article><strong>{result.certified}/7</strong><span>independently certified</span></article><article><strong>{result.rows.filter(x=>x.state==="HOLD").length}</strong><span>source or witness holds</span></article><article><strong>{result.automaticActionsPerformed}</strong><span>unapproved deployments</span></article></div></section>
 <section className="reviewQueue"><div className="masterGovernanceGrid">{result.rows.map(row=><article className="reviewBatchSummary" key={row.appId}><h3>{row.appId} · {row.release}</h3><p><strong>{row.state.replaceAll("_"," ")}</strong> · {row.reason.replaceAll("_"," ")}</p><p>Source {row.sourceCommit?.slice(0,12)??"not observed"} · Receipt {row.receiptId??"missing"}</p><p>Independent witness {row.witnessId??"not enrolled"} · Observed {row.observedAt??"unknown"}</p></article>)}</div></section>
 <section className="dataQualityPolicyNote"><strong>Gate reconciliation is automatic; promotion is not.</strong><p>{result.limitations}</p></section>
 </main>;
}
