import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildAdoptionReview } from "@/lib/adoption-database";
import { buildLeastPrivilegeAdoptionReview } from "@/lib/least-privilege-adoption-review";
import { buildSecurityAccessReview } from "@/lib/security-access-review";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsActionDrawer, OperationsExceptionQueue, OperationsInspector, OperationsStatusBadge, OpsDrawerLink } from "../OperationsCommandPanels";

export const dynamic = "force-dynamic";

function delta(value: number | null) {
  if (value === null) return "baseline";
  if (value === 0) return "no change";
  return value > 0 ? "+" + value : String(value);
}

function list(values: string[]) {
  return values.length ? values.join(", ") : "none";
}

export default async function AdoptionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="adoption-overview" />
          <p className="eyebrow">Build 278</p>
          <h1>Least-Privilege Adoption, Stale Grants &amp; Capability Cleanup Review</h1>
          <p className="lead">
            Sign in to review durable workspace/profile adoption, connector grants
            and least-privilege recommendations.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/adoption">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const [review, security] = await Promise.all([
    buildAdoptionReview(session.user.id),
    buildSecurityAccessReview(session.user.id)
  ]);
  const leastPrivilege = buildLeastPrivilegeAdoptionReview({ adoption: review, security });
  const { totals } = review;

  return (
    <main className="shell opsDeepScreen opsDeepScreen--management">
      <section className="hero">
        <HelpInfo topic="adoption-overview" />
        <p className="eyebrow">Build 278 · Build 035/266 evidence retained</p>
        <h1>Least-Privilege Adoption, Stale Grants &amp; Capability Cleanup Review</h1>
        <p className="lead">
          Reconcile real adoption with workspace access evidence to surface ownerless
          workspaces, capability drift, stale or unused connector grants and privileged
          access that needs explicit owner review. Recommendations remain advisory.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/first-evidence">
            First-evidence runbook
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production learning
          </Link>
          <a className="secondaryButton" href="/api/adoption">
            Adoption JSON
          </a>
          <a className="secondaryButton" href="/api/adoption/least-privilege">
            Least-privilege JSON
          </a>
          <Link className="secondaryButton" href="/">
            Back to platform
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote" id="build278-least-privilege">
        <strong>Build 278 exit criterion: {leastPrivilege.exitCriterion.met ? "MET" : "OPEN"}</strong>
        <p>{leastPrivilege.exitCriterion.label}</p>
        <p><strong>Current evidence:</strong> {leastPrivilege.exitCriterion.evidence}</p>
        <p>Build 278 never removes members, changes roles, changes profile capabilities or revokes connector grants automatically.</p>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Least-privilege cleanup queue</p>
            <h2>Owner disposition required before access changes</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article><strong>{leastPrivilege.totals.ownerlessWorkspaces}</strong><span>ownerless workspaces</span></article>
          <article><strong>{leastPrivilege.totals.disabledUsedCapabilities}</strong><span>disabled-used capability slots</span></article>
          <article><strong>{leastPrivilege.totals.highRiskUnusedCapabilities}</strong><span>high-risk unused capabilities</span></article>
          <article><strong>{leastPrivilege.totals.connectorStaleGrants}</strong><span>stale connector grants</span></article>
          <article><strong>{leastPrivilege.totals.permissionReviewWorkspaces}</strong><span>permission-review workspaces</span></article>
          <article><strong>{leastPrivilege.totals.privilegedMembersUnderReview}</strong><span>privileged members under review</span></article>
        </div>
        <div className="reviewBatchList">
          {leastPrivilege.issues.length ? leastPrivilege.issues.map((issue,index) => (
            <article className="reviewBatchSummary" key={issue.workspaceId+":"+issue.type+":"+index}>
              <div>
                <span className="reviewStatus">{issue.severity}</span>
                <h3>{issue.workspaceName} · {issue.subject}</h3>
                <p>{issue.detail}</p>
                <p><strong>Recommendation:</strong> {issue.recommendation}</p>
                <span className="badge">owner disposition required</span>
              </div>
            </article>
          )) : <div className="emptyState"><p>No current Build 278 least-privilege exception requires owner disposition.</p></div>}
        </div>
      </section>

      <section className="opsDrilldownPanel"><span>Operations Command · Management drill-down</span><strong>Adoption & Permission Outcomes</strong><p>Compare measured capability use, connector grants and least-privilege recommendations without automatic role changes.</p><div><Link href="/">Command Center</Link><Link href="/workspace-profiles">Workspaces</Link></div></section>

      <OperationsActionDrawer title="Management review actions" description="Open the existing evidence and workspace controls. Recommendations remain advisory and never change permissions automatically.">
        <OpsDrawerLink href="/workspace-profiles">Workspace Profiles</OpsDrawerLink>
        <OpsDrawerLink href="/first-evidence">First-Evidence Runbook</OpsDrawerLink>
        <OpsDrawerLink href="/production-learning">Production Learning</OpsDrawerLink>
      </OperationsActionDrawer>

      <OperationsExceptionQueue
        title="Evidence-driven review queue"
        items={review.recommendations.map((recommendation, index) => ({
          id: "recommendation-" + index,
          label: "Management review",
          detail: recommendation,
          tone: "attention" as const
        }))}
        emptyLabel="No current adoption or least-privilege recommendations."
      />

      <div className="opsWorkflowLayout">
        <section className="card">
          <div className="opsPanelHeading"><span>Management status</span><strong>Current adoption signals</strong></div>
          <div className="opsActionDrawerActions">
            <OperationsStatusBadge tone={totals.noActivityWorkspaces ? "attention" : "healthy"}>{totals.noActivityWorkspaces} inactive workspace(s)</OperationsStatusBadge>
            <OperationsStatusBadge tone={totals.highRiskUnusedCapabilities ? "critical" : "healthy"}>{totals.highRiskUnusedCapabilities} high-risk unused capability slot(s)</OperationsStatusBadge>
            <OperationsStatusBadge tone={totals.connectorStaleGrants ? "attention" : "healthy"}>{totals.connectorStaleGrants} stale connector grant(s)</OperationsStatusBadge>
          </div>
        </section>
        <OperationsInspector title="Least-privilege review" eyebrow="Management">
          <p>Recommendations are generated from durable workspace, capability and connector-use evidence.</p>
          <p>No role or permission is changed automatically from this screen.</p>
          <OpsDrawerLink href="/workspace-profiles">Inspect workspace profiles</OpsDrawerLink>
        </OperationsInspector>
      </div>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Adoption baseline</p>
            <h2>Measured outcomes</h2>
          </div>
          <HelpInfo topic="adoption-overview" />
        </div>
        <div className="grid">
          <article className="card">
            <h3>{totals.activeWorkspaces}/{totals.workspaces} active workspaces</h3>
            <p>{totals.noActivityWorkspaces} have no durable operational activity yet.</p>
            <span className="badge">{totals.reviewSnapshots} durable snapshots</span>
          </article>
          <article className="card">
            <h3>{totals.usedCapabilities}/{totals.enabledCapabilities} capability slots used</h3>
            <p>
              {totals.highRiskUnusedCapabilities} high-risk enabled slots have no
              durable use.
            </p>
            <span className="badge">
              {totals.disabledUsedCapabilities} disabled/use mismatches
            </span>
          </article>
          <article className="card">
            <h3>{totals.connectorUsedGrants}/{totals.connectorGrants} connector grants used</h3>
            <p>
              {totals.connectorUnusedGrants} unused · {totals.connectorStaleGrants} stale
              at 30+ days.
            </p>
            <span className="badge">{totals.connectorInstallations} installations</span>
          </article>
          <article className="card">
            <h3>{totals.permissionReviewWorkspaces} permission review workspaces</h3>
            <p>
              {totals.owners} owners · {totals.admins} admins · {totals.members} members.
            </p>
            <span className="badge">no automatic role changes</span>
          </article>
          <article className="card">
            <h3>Feature adoption</h3>
            <p>
              Barcode {totals.barcodeWorkspaces} · Scheduled {totals.scheduledWorkspaces} ·
              Remote {totals.remoteWorkspaces} · Integrations {totals.integrationWorkspaces}
              {" "}workspace(s).
            </p>
            <span className="badge">durable evidence only</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Profile outcomes</p>
            <h2>Where real use exists</h2>
          </div>
        </div>
        <div className="grid">
          {review.profiles.map((profile) => (
            <article className="card" key={profile.profileKey}>
              <h3>{profile.profileName}</h3>
              <p>
                {profile.activeWorkspaces}/{profile.workspaces} active workspace(s) ·{" "}
                {profile.activityEvents} measured activity events.
              </p>
              <p>
                Capabilities: {profile.usedCapabilitySlots}/{profile.enabledCapabilitySlots} used ·{" "}
                {profile.highRiskUnusedCapabilitySlots} high-risk unused.
              </p>
              <p>
                Connectors: {profile.connectorInstallations} installed ·{" "}
                {profile.connectorUsedGrants} grants with execution evidence.
              </p>
              <span className="badge">{profile.profileKey}</span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Workspace review</p>
            <h2>Capability, connector and permission outcomes</h2>
          </div>
        </div>
        <div className="grid">
          {review.workspaces.map((workspace) => (
            <article className="card" key={workspace.workspaceId}>
              <span className="badge">
                {workspace.permissions.status.toUpperCase()} · {workspace.role}
              </span>
              <h3>{workspace.workspaceName}</h3>
              <p>{workspace.profileName}</p>
              <p>
                Activity: {workspace.activityEvents} · trend{" "}
                {delta(workspace.trend.activityEventsDelta)}.
              </p>
              <p>
                Used capabilities: {list(workspace.capabilities.used)}
              </p>
              <p>
                Unused enabled: {list(workspace.capabilities.unusedEnabled)}
              </p>
              <p>
                High-risk unused: {list(workspace.capabilities.highRiskUnused)}
              </p>
              <p>
                Connector grants: {workspace.connectors.usedGrants.length} used ·{" "}
                {workspace.connectors.unusedGrants.length} unused ·{" "}
                {workspace.connectors.staleUnusedGrants.length} stale.
              </p>
              <p>
                Barcode {workspace.activity.barcodeCaptures} · Scheduled{" "}
                {workspace.activity.scheduledJobs}/{workspace.activity.scheduledAttempts} jobs/attempts ·
                Remote {workspace.activity.remoteJobs}/{workspace.activity.remoteRuns} jobs/runs ·
                Integrations {workspace.activity.integrationEvents}.
              </p>
              <p>
                Permissions: {workspace.permissions.owners} owner ·{" "}
                {workspace.permissions.admins} admin · {workspace.permissions.members} member.
              </p>
              {workspace.permissions.recommendations.map((recommendation) => (
                <p key={recommendation}>
                  <strong>Recommendation:</strong> {recommendation}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Investment / least privilege</p>
            <h2>Evidence-driven recommendations</h2>
          </div>
        </div>
        <div className="grid">
          {review.recommendations.map((recommendation) => (
            <article className="card" key={recommendation}>
              <p>{recommendation}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
