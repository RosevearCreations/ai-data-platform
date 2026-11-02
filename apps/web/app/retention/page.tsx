import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildRetentionGovernanceModel } from "@/lib/retention-governance";

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
      <p className="eyebrow">Build 267</p>
      <h1>Retention, Archive & Storage Governance Center</h1>
      <p className="lead">Sign in to review retention rules, data age, archive candidates, protected evidence and cleanup impact.</p>
      <Link className="primaryLink" href="/sign-in?callbackUrl=/retention">Sign in</Link>
    </section></main>;
  }

  const model=await buildRetentionGovernanceModel(session.user.id);

  return <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
    <section className="hero reviewHero">
      <HelpInfo topic="retention-overview"/>
      <p className="eyebrow">Build 267</p>
      <h1>Retention, Archive & Storage Governance Center</h1>
      <p className="lead">Review measured data age, retention rules, archive candidates, protected evidence, bounded delete eligibility and impact before any destructive cleanup occurs.</p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/production-learning">Production learning</Link>
        <Link className="secondaryButton" href="/audit-evidence">Audit & evidence</Link>
        <Link className="secondaryButton" href="/">Operations Command</Link>
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
            <p><strong>Rows:</strong> {retentionClass.rows} · <strong>Storage:</strong> {formatBytes(retentionClass.measuredBytes)}</p>
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
