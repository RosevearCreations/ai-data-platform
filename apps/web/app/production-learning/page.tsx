import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildProductionLearningReview } from "@/lib/production-learning-database";

import { HelpInfo } from "../help/HelpInfo";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(2) + " MB";
}

function statusLabel(value: string) {
  return value.toUpperCase();
}

export default async function ProductionLearningPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="learning-overview" />
          <p className="eyebrow">Build 032</p>
          <h1>Production learning</h1>
          <p className="lead">
            Sign in to review live workspace evidence, cost proxies, gaps and the renewed roadmap.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/production-learning">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const review = await buildProductionLearningReview(session.user.id);
  const { totals } = review;

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="learning-overview" />
        <p className="eyebrow">Build 032</p>
        <h1>Production learning & cost review</h1>
        <p className="lead">
          Live RLS-scoped evidence from Builds 019–029, explicit evidence gaps,
          provider/storage cost proxies and an evidence-driven renewed roadmap.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Back to platform</Link>
          <a className="secondaryButton" href="/api/production-learning">
            Evidence JSON
          </a>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Current evidence</p>
          <h2>Operational baseline</h2>
          <HelpInfo topic="learning-evidence" />
        </div>
        <div className="grid">
          <article className="card">
            <h3>{totals.workspaces} workspaces</h3>
            <p>{review.evidence.profiles.customActive} active custom profiles.</p>
            <span className="badge">RLS-scoped</span>
          </article>
          <article className="card">
            <h3>{totals.barcodeCaptures} barcode captures</h3>
            <p>{totals.barcodePending} pending explicit review.</p>
            <span className="badge">reviewed handoff</span>
          </article>
          <article className="card">
            <h3>{totals.sourcePolicies} source policies</h3>
            <p>
              {totals.sourcePolicyExpired} expired · {totals.sourcePolicyReview} review required.
            </p>
            <span className="badge">crawl governance</span>
          </article>
          <article className="card">
            <h3>{totals.providerRuns} Browserless runs</h3>
            <p>
              {totals.providerUnits} estimated provider units ·{" "}
              {totals.providerSuccessRate === null
                ? "no success baseline"
                : Math.round(totals.providerSuccessRate * 100) + "% success"} ·{" "}
              {totals.providerAverageUnitsPerRun === null
                ? "units/run pending"
                : totals.providerAverageUnitsPerRun.toFixed(2) + " units/run"}.
            </p>
            <span className="badge">
              baseline {totals.browserlessBaselineDecision}
            </span>
          </article>
          <article className="card">
            <h3>{totals.syncEvents} sync outcomes</h3>
            <p>
              {totals.syncConflicts} conflicts · {totals.syncErrors} errors ·{" "}
              {totals.syncConflictRate === null
                ? "rate awaiting evidence"
                : Math.round(totals.syncConflictRate * 100) + "% conflict rate"}.
            </p>
            <span className="badge">append-only telemetry</span>
          </article>
          <article className="card">
            <h3>{totals.repairCompatibilityChecks} repair checks</h3>
            <p>
              {totals.repairApprovals} approvals · {totals.repairRollbacks} rollbacks ·{" "}
              {totals.repairSuccessRate === null
                ? "health awaiting evidence"
                : Math.round(totals.repairSuccessRate * 100) + "% healthy"}.
            </p>
            <span className="badge">revision-linked outcomes</span>
          </article>
          <article className="card">
            <h3>{totals.connectorExecutions} connector executions</h3>
            <p>{totals.connectorInstallations} workspace installations.</p>
            <span className="badge">append-only audit</span>
          </article>
          <article className="card">
            <h3>{formatBytes(totals.storageBytes)}</h3>
            <p>Measured durable JSON/evidence payloads across authorized workspaces.</p>
            <span className="badge">storage proxy</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Browserless readiness</p>
          <h2>Controlled live-pilot gate</h2>
          <HelpInfo topic="learning-browserless" />
        </div>
        <div className="grid">
          <article className="card">
            <h3>API token</h3>
            <p>{review.evidence.browserless.tokenConfigured ? "Configured in server environment." : "Not configured in this runtime."}</p>
          </article>
          <article className="card">
            <h3>Provider execution</h3>
            <p>{review.evidence.browserless.executionEnabled ? "Master flag enabled." : "Master flag disabled."}</p>
          </article>
          <article className="card">
            <h3>Global kill switch</h3>
            <p>{review.evidence.browserless.globalKillSwitchActive ? "ACTIVE — fail closed." : "Off for an approved pilot window."}</p>
          </article>
          <article className="card">
            <h3>Approved public sources</h3>
            <p>{totals.approvedPublicSources} eligible · {totals.allowlistedSources} allowlisted · {totals.armedWorkspaces} armed workspaces.</p>
            <span className="badge">pilot prerequisites</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Findings</p>
          <h2>Measured results and evidence gaps</h2>
          <HelpInfo topic="learning-gaps" />
        </div>
        <div className="grid">
          {review.findings.map((finding) => (
            <article className="card" key={finding.key}>
              <span className="badge">{statusLabel(finding.status)} · {finding.category}</span>
              <h3>{finding.title}</h3>
              <p>{finding.evidence}</p>
              <p><strong>Next action:</strong> {finding.action}</p>
              <small>Owner: {finding.owner}</small>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Workspace evidence</p>
          <h2>Current operational footprint</h2>
          <HelpInfo topic="learning-workspaces" />
        </div>
        {review.evidence.workspaces.length ? (
          <div className="grid">
            {review.evidence.workspaces.map((workspace) => (
              <article className="card" key={workspace.workspaceId}>
                <h3>{workspace.workspaceName}</h3>
                <p>{workspace.profileName} · {workspace.role}</p>
                <p>
                  Sync: {workspace.sync.activeScrapers} scrapers · {workspace.sync.reviewedDatasets} datasets · {workspace.outcomes.sync.events} outcomes · {workspace.outcomes.sync.conflicts} conflicts
                </p>
                <p>
                  Repair: {workspace.outcomes.repair.proposed} proposed · {workspace.outcomes.repair.approved} approved · {workspace.outcomes.repair.rolledBack} rolled back · {workspace.outcomes.repair.healthy}/{workspace.outcomes.repair.compatibilityChecks} healthy checks
                </p>
                <p>
                  Snapshot continuity: {workspace.continuity.previousSnapshotAt ? "previous changed snapshot available" : "baseline snapshot"}
                </p>
                <p>
                  Barcode: {workspace.barcode.captures} captures · {workspace.barcode.pending} pending
                </p>
                <p>
                  Remote: {workspace.remote.providerRuns} runs · {workspace.remote.providerUnits} units · {workspace.remote.approvedPublicSources} approved public sources · {workspace.remote.allowlistedSources} allowlisted
                </p>
                {workspace.remote.lastRun ? (
                  <p>
                    Latest provider result: {workspace.remote.lastRun.status} · {workspace.remote.lastRun.units} units · {workspace.remote.lastRun.durationMs ?? "n/a"} ms · HTTP {workspace.remote.lastRun.responseCode ?? "n/a"}
                    {workspace.remote.lastRun.contentSha256 ? " · hash " + workspace.remote.lastRun.contentSha256.slice(0, 12) + "…" : ""}
                  </p>
                ) : null}
                <p>
                  Connectors: {workspace.connectors.installations} installed · {workspace.connectors.enabled} enabled
                </p>
                <p>
                  Permissions: {workspace.security.owners} owner · {workspace.security.admins} admin · {workspace.security.members} member
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No authorized workspaces are visible to this account.</p>
          </div>
        )}
      </section>

      <section>
        <div className="sectionHeading">
          <p className="eyebrow">Renewed roadmap</p>
          <h2>Builds 032–036 — evidence driven</h2>
          <HelpInfo topic="learning-roadmap" />
        </div>
        <div className="grid">
          {review.roadmap.map((item) => (
            <article className="card" key={item.build}>
              <span className="badge">{item.priority}</span>
              <h3>Build {String(item.build).padStart(3, "0")} — {item.title}</h3>
              <p>{item.rationale}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
