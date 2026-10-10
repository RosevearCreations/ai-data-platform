import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listRetentionOverviewForUser } from "@/lib/retention-database";

import { HelpInfo } from "../help/HelpInfo";
import { RetentionControls } from "./RetentionControls";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(2) + " MB";
}

export default async function RetentionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="retention-overview" />
          <p className="eyebrow">Build 034</p>
          <h1>Retention & cleanup</h1>
          <p className="lead">
            Sign in to review workspace storage budgets and cleanup eligibility.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/retention">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const overview = await listRetentionOverviewForUser(session.user.id);

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="retention-overview" />
        <p className="eyebrow">Build 034</p>
        <h1>Retention, Storage Budgets & Cleanup Automation</h1>
        <p className="lead">
          Preview archive/delete eligibility, enforce per-class storage budgets
          and run only explicitly approved bounded cleanup batches. Protected
          append-only and security evidence is never touched by Build 034 cleanup.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/production-learning">
            Production learning
          </Link>
          <Link className="secondaryButton" href="/">
            Back to platform
          </Link>
        </div>
      </section>

      {overview.map((item) => {
        const canAdminister =
          item.workspace.role === "owner" || item.workspace.role === "admin";
        return (
          <section key={item.workspace.id}>
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">{item.workspace.role} workspace</p>
                <h2>{item.workspace.name}</h2>
              </div>
              <HelpInfo topic="retention-overview" />
            </div>

            <div className="grid">
              <article className="card">
                <h3>{formatBytes(item.measuredBytes)}</h3>
                <p>{item.managedRows} managed rows in the Build 034 storage proxy.</p>
                <span className="badge">
                  {item.budgetBreaches.length
                    ? item.budgetBreaches.length + " budget breach(es)"
                    : "within budgets"}
                </span>
              </article>
              <article className="card">
                <h3>{item.deleteEligibleRows} delete-eligible</h3>
                <p>
                  {formatBytes(item.deleteEligibleBytes)} can be removed only by an
                  approved bounded batch.
                </p>
                <span className="badge">
                  {item.cleanupApproved ? "cleanup approved" : "fail closed"}
                </span>
              </article>
              <article className="card">
                <h3>{item.archiveEligibleRows} archive candidates</h3>
                <p>
                  Old synchronized tombstones are preview-only and require a
                  separate manual archive decision.
                </p>
                <span className="badge">never auto-deleted</span>
              </article>
            </div>

            <RetentionControls
              workspaceId={item.workspace.id}
              canAdminister={canAdminister}
              cleanupApproved={item.cleanupApproved}
              deleteEligibleRows={item.deleteEligibleRows}
              maxRowsPerRun={item.maxRowsPerRun}
            />

            <div className="grid">
              {item.classes.map((retentionClass) => (
                <article className="card" key={retentionClass.key}>
                  <h3>{retentionClass.label}</h3>
                  <p>
                    {formatBytes(retentionClass.measuredBytes)} /{" "}
                    {formatBytes(retentionClass.budgetBytes)} ·{" "}
                    {retentionClass.rows} rows
                  </p>
                  <p>{retentionClass.description}</p>
                  {retentionClass.archiveEligibleRows ? (
                    <p>{retentionClass.archiveEligibleRows} archive candidate(s).</p>
                  ) : null}
                  {retentionClass.deleteEligibleRows ? (
                    <p>
                      {retentionClass.deleteEligibleRows} bounded-delete candidate(s) ·{" "}
                      {formatBytes(retentionClass.deleteEligibleBytes)}.
                    </p>
                  ) : null}
                  <span className="badge">
                    {retentionClass.overBudget
                      ? "OVER BUDGET"
                      : retentionClass.protectedEvidence
                        ? "protected evidence"
                        : retentionClass.disposition}
                  </span>
                </article>
              ))}
            </div>

            <div className="sectionHeading">
              <div>
                <p className="eyebrow">Cleanup evidence</p>
                <h3>Recent bounded runs</h3>
              </div>
            </div>
            {item.recentRuns.length ? (
              <div className="grid">
                {item.recentRuns.map((run) => (
                  <article className="card" key={run.runId}>
                    <h3>{run.status}</h3>
                    <p>
                      {run.beforeRows} → {run.afterRows} rows ·{" "}
                      {formatBytes(run.beforeStorageBytes)} →{" "}
                      {formatBytes(run.afterStorageBytes)}
                    </p>
                    <p>
                      Deleted {run.deletedBarcodeRows} barcode row(s) and{" "}
                      {run.deletedRemoteJobs} terminal remote job(s).
                    </p>
                    <span className="badge">
                      {run.errorCode ?? run.createdAt.toLocaleString()}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="emptyState">
                <p>
                  No destructive cleanup has run. This is expected while there are
                  no eligible rows or no explicit approval.
                </p>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
