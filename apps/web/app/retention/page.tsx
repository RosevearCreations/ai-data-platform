import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildRetentionGovernanceModel } from "@/lib/retention-governance";
import { buildRetentionCleanupReconciliationForUser } from "@/lib/retention-cleanup-reconciliation-database";

import { HelpInfo } from "../help/HelpInfo";
import { RetentionControls } from "./RetentionControls";

export const dynamic = "force-dynamic";

function formatBytes(value:number){
  if(value<1024)return value+" B";
  if(value<1024*1024)return (value/1024).toFixed(1)+" KB";
  return (value/(1024*1024)).toFixed(2)+" MB";
}

function formatDate(value:string|null){
  return value?new Date(value).toLocaleString():"No records";
}

export default async function RetentionPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session){
    return <main className="shell"><section className="hero">
      <HelpInfo topic="retention-overview"/>
      <p className="eyebrow">Build 277</p>
      <h1>Retention Cleanup Readiness &amp; Storage Budget Reconciliation</h1>
      <p className="lead">Sign in to review storage budgets, cleanup readiness, protected evidence and approval-gated impact.</p>
      <Link className="primaryLink" href="/sign-in?callbackUrl=/retention">Sign in</Link>
    </section></main>;
  }

  const [model,reconciliation]=await Promise.all([
    buildRetentionGovernanceModel(session.user.id),
    buildRetentionCleanupReconciliationForUser(session.user.id)
  ]);

  return <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
    <section className="hero reviewHero">
      <HelpInfo topic="retention-overview"/>
      <p className="eyebrow">Build 277 · Build 267 controls retained</p>
      <h1>Retention Cleanup Readiness &amp; Storage Budget Reconciliation</h1>
      <p className="lead">Reconcile measured class budgets, archive/delete eligibility, protected evidence, cleanup failures and approval state before any destructive cleanup occurs.</p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/production-learning">Production learning</Link>
        <Link className="secondaryButton" href="/audit-evidence">Audit & evidence</Link>
        <Link className="secondaryButton" href="/">Operations Command</Link>
        <a className="secondaryButton" href="/api/retention/reconciliation">Readiness JSON</a>
      </div>
    </section>

    <section className="dataQualityPolicyNote" id="build277-readiness">
      <strong>Build 277 exit criterion: {reconciliation.exitCriterion.met?"MET":"OPEN"}</strong>
      <p>{reconciliation.exitCriterion.label}</p>
      <p><strong>Current evidence:</strong> {reconciliation.exitCriterion.evidence}</p>
      <p>Deployment approval is not cleanup approval. Build 277 never runs cleanup; existing approval and the separate RUN CLEANUP confirmation remain authoritative.</p>
    </section>

    <section>
      <div className="sectionHeading"><div>
        <p className="eyebrow">Safe cleanup-readiness queue</p>
        <h2>Budget, failure, archive, delete and protection decisions</h2>
      </div></div>
      <div className="commandMetrics">
        <article><strong>{reconciliation.totals.budgetBreaches}</strong><span>storage budget breaches</span></article>
        <article><strong>{reconciliation.totals.unresolvedFailedCleanups}</strong><span>unresolved failed cleanups</span></article>
        <article><strong>{reconciliation.totals.archiveEligibleRows}</strong><span>manual archive candidates</span></article>
        <article><strong>{reconciliation.totals.deleteEligibleRows}</strong><span>{formatBytes(reconciliation.totals.deleteEligibleBytes)} delete-eligible</span></article>
        <article><strong>{reconciliation.totals.protectedRows}</strong><span>protected evidence rows</span></article>
      </div>
      <div className="reviewBatchList">
        {reconciliation.queue.map((item,index)=><article className="reviewBatchSummary" key={item.workspaceId+":"+(item.classKey??"workspace")+":"+index}><div>
          <span className="reviewStatus">{item.state}</span>
          <h3>{item.workspaceName} · {item.title}</h3>
          <p>{item.detail}</p>
          {item.rows||item.bytes?<p><strong>Scope:</strong> {item.rows} row(s) · {formatBytes(item.bytes)}</p>:null}
        </div></article>)}
      </div>
    </section>

    <section className="reviewSummary"><div className="commandMetrics">
      <article><strong>{model.totals.managedRows}</strong><span>managed rows</span></article>
      <article><strong>{model.totals.archiveEligibleRows}</strong><span>archive candidates</span></article>
      <article><strong>{model.totals.deleteEligibleRows}</strong><span>delete-eligible rows</span></article>
      <article><strong>{model.totals.protectedRows}</strong><span>protected evidence rows</span></article>
    </div></section>

    <section className="dataQualityPolicyNote">
      <strong>Governance boundary</strong>
      <p>Archive candidates are preview-only. Protected evidence is excluded from destructive cleanup. Delete-eligible records still require explicit owner/admin approval and the existing bounded cleanup confirmation.</p>
    </section>

    {model.workspaces.map(item=>{
      const canAdminister=item.role==="owner"||item.role==="admin";
      return <section className="reviewQueue" key={item.workspaceId}>
        <div className="sectionHeading"><div>
          <p className="eyebrow">{item.role} workspace</p>
          <h2>{item.workspaceName}</h2>
        </div><HelpInfo topic="retention-overview"/></div>

        <div className="commandMetrics">
          <article><strong>{formatBytes(item.measuredBytes)}</strong><span>{item.managedRows} managed rows</span></article>
          <article><strong>{item.archiveEligibleRows}</strong><span>manual archive candidates</span></article>
          <article><strong>{item.deleteEligibleRows}</strong><span>{formatBytes(item.deleteEligibleBytes)} delete-eligible</span></article>
          <article><strong>{item.protectedRows}</strong><span>{formatBytes(item.protectedBytes)} protected</span></article>
        </div>

        <section className="dataQualityPolicyNote">
          <strong>Impact preview</strong>
          <p>If every currently delete-eligible record were eventually removed, the measured proxy would move from {item.managedRows} to {item.projectedRowsAfterFullEligibleDelete} rows and from {formatBytes(item.measuredBytes)} to approximately {formatBytes(item.projectedBytesAfterFullEligibleDelete)}. One approved cleanup run is still capped at {item.boundedDeleteRowsThisRun} row(s) by the current run limit of {item.maxRowsPerRun}.</p>
        </section>

        <RetentionControls
          workspaceId={item.workspaceId}
          canAdminister={canAdminister}
          cleanupApproved={item.cleanupApproved}
          deleteEligibleRows={item.deleteEligibleRows}
          maxRowsPerRun={item.maxRowsPerRun}
        />

        <div className="reviewBatchList">
          {item.classes.map(retentionClass=><article className="reviewBatchSummary" key={retentionClass.key}><div>
            <span className={"reviewStatus reviewStatus-"+(retentionClass.protectedEvidence?"approved":retentionClass.overBudget?"in-review":"approved")}>
              {retentionClass.protectedEvidence?"protected":retentionClass.overBudget?"over budget":retentionClass.disposition}
            </span>
            <h3>{retentionClass.label}</h3>
            <p><strong>Rows:</strong> {retentionClass.rows} · <strong>Storage:</strong> {formatBytes(retentionClass.measuredBytes)} / {formatBytes(retentionClass.budgetBytes)} budget{retentionClass.budgetOverageBytes?" · "+formatBytes(retentionClass.budgetOverageBytes)+" over":""}</p>
            <p><strong>Oldest:</strong> {formatDate(retentionClass.oldestAt)}{retentionClass.oldestAgeDays!==null?" · "+retentionClass.oldestAgeDays+" day(s) old":""}</p>
            <p><strong>Newest:</strong> {formatDate(retentionClass.newestAt)}</p>
            <p><strong>Retention threshold:</strong> {retentionClass.retentionDays===null?"No Build 267 destructive threshold":retentionClass.retentionDays+" days"}</p>
            <p>{retentionClass.ruleSummary}</p>
            {retentionClass.archiveEligibleRows?<p><strong>Archive candidates:</strong> {retentionClass.archiveEligibleRows} · manual decision only.</p>:null}
            {retentionClass.deleteEligibleRows?<p><strong>Delete eligible:</strong> {retentionClass.deleteEligibleRows} · {formatBytes(retentionClass.deleteEligibleBytes)}.</p>:null}
          </div></article>)}
        </div>

        <div className="sectionHeading"><div><p className="eyebrow">Cleanup evidence</p><h3>Recent bounded runs</h3></div></div>
        {item.recentRuns.length?<div className="grid">
          {item.recentRuns.map(run=><article className="card" key={run.runId}>
            <h3>{run.status}</h3>
            <p>{run.beforeRows} → {run.afterRows} rows · {formatBytes(run.beforeStorageBytes)} → {formatBytes(run.afterStorageBytes)}</p>
            <p>Deleted {run.deletedBarcodeRows} barcode row(s) and {run.deletedRemoteJobs} terminal remote job(s).</p>
            <span className="badge">{run.errorCode??new Date(run.createdAt).toLocaleString()}</span>
          </article>)}
        </div>:<div className="emptyState"><p>No destructive cleanup evidence exists for this workspace.</p></div>}
      </section>;
    })}
  </main>;
}
