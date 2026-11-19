import { headers } from "next/headers";import Link from "next/link";import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";import { readBuild423ForUser } from "@/lib/build423-database";
export const dynamic="force-dynamic";
export default async function OperatorProductionCeremonyPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/sign-in?callbackUrl=%2Foperator-production-ceremony");
 const data=await readBuild423ForUser(session.user.id);const m=data.model;
 return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
  <section className="hero reviewHero"><p className="eyebrow">Build 423 · Operator Acceptance, Role Separation & Production Workflow Ceremony</p>
   <h1>Operator acceptance, separated authority and seven-source Sysop telemetry</h1>
   <p className="lead">Prove the right person, role and source authority before consequential production work. Signed statistics are accepted only as source claims until transport and independent owner review are separately verified.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/role-device-acceptance">Role / Device Evidence</Link><Link className="secondaryButton" href="/master-sysop">Master Sysop</Link><Link className="secondaryButton" href="/data-lifecycle-dlp-renewal">Build 422 Assurance</Link></div>
  </section>
  <section className="dataQualityPolicyNote"><strong>{m.governanceState.replaceAll("_"," ")}</strong><p>Production GREEN is software release evidence only. Missing acceptance, self-approval, unsigned/stale telemetry or unwitnessed physical reboots remain HOLD.</p></section>
  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{m.counts.requiredRoleAcceptance-m.missingRoles.length-m.invalidRoles.length}/{m.counts.requiredRoleAcceptance}</strong><span>role acceptance</span></article>
   <article><strong>{m.counts.requiredWorkflowCeremonies-m.missingCeremonies.length-m.invalidCeremonies.length}/{m.counts.requiredWorkflowCeremonies}</strong><span>workflow ceremonies</span></article>
   <article><strong>{m.counts.requiredTelemetrySources-m.missingTelemetry.length-m.invalidTelemetry.length}/{m.counts.requiredTelemetrySources}</strong><span>live-verified telemetry sources</span></article>
   <article><strong>{m.counts.totalCheckpoints}</strong><span>total checkpoints</span></article>
  </div></section>
  <section className="reviewQueue"><div className="sectionHeading"><div><p className="eyebrow">Seven-source telemetry</p><h2>Latest signed source observations</h2></div></div>
   <div className="masterGovernanceGrid">{data.latestTelemetry.map(t=><article className="reviewBatchSummary" key={t.receiptId}><h3>{t.appId}</h3><p>{t.state} · {t.eventKind}</p><p>Commit {t.sourceCommit.slice(0,12)} · transport {t.transportVerified?"VERIFIED":"HOLD"}</p></article>)}</div>
  </section>
  <section className="dataQualityPolicyNote"><strong>Authority remains separated.</strong><p>AI Data Platform validates evidence; AI Hub owns local physical automation; Comms Hub owns communications; every application retains its own operational authority. Telemetry never authorizes a reboot, recovery, message, payment or export.</p></section>
 </main>;
}
