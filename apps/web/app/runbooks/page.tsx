import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildWorkflowOrchestrationModel } from "@/lib/workflow-orchestration";

export const dynamic="force-dynamic";

export default async function RunbooksPage(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)redirect("/sign-in?callbackUrl=%2Frunbooks");
 const model=await buildWorkflowOrchestrationModel(session.user.id);
 return <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
  <section className="hero reviewHero">
   <p className="eyebrow">Build 268</p>
   <h1>Workflow Orchestration, Runbook Templates & Guided Operations</h1>
   <p className="lead">Follow reusable governed runbooks across collection, review, approval, publication and delivery without bypassing any existing authorization, evidence or safety gate.</p>
   <div className="heroActions"><Link className="secondaryButton" href="/workflows">Workflow Directory</Link><Link className="secondaryButton" href="/attention">Attention Center</Link><Link className="secondaryButton" href="/audit-evidence">Audit & Evidence</Link></div>
  </section>

  <section className="reviewSummary"><div className="commandMetrics">
   <article><strong>{model.totals.runbooks}</strong><span>workspace runbooks</span></article>
   <article><strong>{model.totals.completeSteps}</strong><span>completed steps</span></article>
   <article><strong>{model.totals.readySteps}</strong><span>ready / attention steps</span></article>
   <article><strong>{model.totals.blockedSteps}</strong><span>blocked steps</span></article>
  </div></section>

  <section className="dataQualityPolicyNote"><strong>Guidance, not automation.</strong><p>Build 268 never auto-approves, auto-publishes or auto-delivers. Every step opens the existing governed surface where its own role checks, confirmations, source-policy rules, evidence requirements and delivery protections still apply.</p></section>

  <section className="reviewQueue">
   <div className="sectionHeading"><div><p className="eyebrow">Reusable templates</p><h2>Runbook library</h2></div></div>
   <div className="reviewBatchList">{model.templates.map(template=><article className="reviewBatchSummary" key={template.id}><div>
    <h3>{template.name}</h3><p>{template.sequence.join(" → ")}</p>
    {template.safety.map(item=><p key={item}><strong>Gate:</strong> {item}</p>)}
   </div></article>)}</div>
  </section>

  {model.runbooks.map(runbook=><section className="reviewQueue" key={runbook.id}>
   <div className="sectionHeading"><div><p className="eyebrow">{runbook.role} workspace · {runbook.completeSteps}/{runbook.steps.length} complete</p><h2>{runbook.workspaceName}</h2><p>{runbook.purpose}</p></div></div>
   <div className="reviewBatchList">{runbook.steps.map((item,index)=><article className="reviewBatchSummary" key={item.id}><div>
    <span className={"reviewStatus reviewStatus-"+(item.status==="complete"?"approved":item.status==="blocked"?"rejected":"in-review")}>{index+1}. {item.status}</span>
    <h3>{item.label}</h3><p>{item.description}</p>
    {item.evidence.map(evidence=><p key={evidence}><strong>Evidence:</strong> {evidence}</p>)}
    <p><strong>Gate:</strong> {item.gate}</p>
    <Link className="secondaryButton" href={item.href}>{item.actionLabel}</Link>
   </div></article>)}</div>
  </section>)}
 </main>;
}
