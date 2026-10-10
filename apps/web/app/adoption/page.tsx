import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildAdoptionReview } from "@/lib/adoption-database";

import { HelpInfo } from "../help/HelpInfo";

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
          <p className="eyebrow">Build 035</p>
          <h1>Adoption & permissions</h1>
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

  const review = await buildAdoptionReview(session.user.id);
  const { totals } = review;

  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="adoption-overview" />
        <p className="eyebrow">Build 035</p>
        <h1>Workspace, Profile & Connector Adoption / Permission Outcomes</h1>
        <p className="lead">
          Durable evidence compares enabled capabilities with actual use,
          connector grants with executions, feature adoption across workspaces and
          owner/admin/member distribution. Recommendations never change permissions
          automatically.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/production-learning">
            Production learning
          </Link>
          <a className="secondaryButton" href="/api/adoption">
            Evidence JSON
          </a>
          <Link className="secondaryButton" href="/">
            Back to platform
          </Link>
        </div>
      </section>

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
