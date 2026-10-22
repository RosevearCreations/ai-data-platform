import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildCommandCenterHome } from "@/lib/command-center";

import { AiFieldSuggestions } from "./ai-field-suggestions";
import { SignOutButton } from "./sign-out-button";
import { HelpInfo } from "./help/HelpInfo";

const foundations = [
  "PostgreSQL row-level workspace isolation",
  "Source evidence on every external observation",
  "Review before downstream business writes",
  "AI for interpretation; deterministic code for repetition"
] as const;

const workflowLinks = [
  ["/capture", "Barcode intake"],
  ["/data-library", "Unified data library"],
  ["/data-review", "Data review workbench"],
  ["/approved-data", "Approved data publishing"],
  ["/approved-data/delivery", "Publication delivery bridge"],
  ["/approved-data/live-delivery", "Controlled live delivery"],
  ["/approved-data/reconciliation", "Post-delivery reconciliation"],
  ["/approved-data/reconciliation/triage", "Reconciliation exception triage"],
  ["/approved-data/reconciliation/corrective-delivery", "Corrective delivery execution"],
  ["/approved-data/reconciliation/corrective-closure", "Corrective reconciliation & closure"],
  ["/approved-data/reconciliation/post-closure-regression", "Post-closure regression & reopen governance"],
  ["/approved-data/reconciliation/reopened-planning", "Reopened exception re-triage & successor planning"],
  ["/approved-data/reconciliation/successor-delivery", "Successor corrective delivery execution"],
  ["/approved-data/reconciliation/successor-closure", "Successor reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-reclosure-regression", "Post-re-closure recurrence monitoring"],
  ["/approved-data/reconciliation/recurrent-planning", "Recurrent exception re-triage & next-generation planning"],
  ["/approved-data/reconciliation/next-generation-delivery", "Next-generation corrective delivery execution"],
  ["/approved-data/reconciliation/next-generation-closure", "Next-generation reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-next-generation-reclosure", "Post-next-generation re-closure monitoring & recurrence governance"],
  ["/approved-data/reconciliation/second-recurrence-planning", "Second-recurrence re-triage & successor-generation planning"],
  ["/approved-data/reconciliation/successor-generation-delivery", "Successor-generation corrective delivery execution"],
  ["/approved-data/reconciliation/successor-generation-closure", "Successor-generation reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-successor-generation-reclosure", "Post-successor-generation re-closure monitoring & recurrence governance"],
  ["/approved-data/reconciliation/successor-generation-recurrence-planning", "Successor-generation recurrence re-triage & subsequent-generation planning"],
  ["/approved-data/reconciliation/subsequent-generation-delivery", "Subsequent-generation corrective delivery execution"],
  ["/approved-data/reconciliation/subsequent-generation-closure", "Subsequent-generation reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-subsequent-generation-reclosure", "Post-subsequent-generation re-closure monitoring & recurrence governance"],
  ["/approved-data/reconciliation/subsequent-generation-recurrence-planning", "Subsequent-generation recurrence re-triage & successive-generation planning"],
  ["/approved-data/reconciliation/successive-generation-delivery", "Successive-generation corrective delivery execution"],
  ["/approved-data/reconciliation/successive-generation-closure", "Successive-generation reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-successive-generation-reclosure", "Post-successive-generation re-closure monitoring & recurrence governance"],
  ["/approved-data/reconciliation/successive-generation-recurrence-planning", "Successive-generation recurrence re-triage & continuation-generation planning"],
  ["/approved-data/reconciliation/continuation-generation-delivery", "Continuation-generation corrective delivery execution"],
  ["/approved-data/reconciliation/continuation-generation-closure", "Continuation-generation reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-continuation-generation-reclosure", "Post-continuation-generation recurrence monitoring"],
  ["/approved-data/reconciliation/continuation-generation-recurrence-planning", "Continuation-generation recurrence re-triage & next-cycle planning"],
  ["/approved-data/reconciliation/next-cycle-delivery", "Next-cycle corrective delivery execution"],
  ["/approved-data/reconciliation/next-cycle-closure", "Next-cycle reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-next-cycle-reclosure", "Post-next-cycle recurrence monitoring"],
  ["/approved-data/reconciliation/next-cycle-recurrence-planning", "Next-cycle recurrence re-triage & following-cycle planning"],
  ["/approved-data/reconciliation/following-cycle-delivery", "Following-cycle corrective delivery execution"],
  ["/approved-data/reconciliation/following-cycle-closure", "Following-cycle reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-following-cycle-reclosure", "Post-following-cycle recurrence monitoring"],
  ["/approved-data/reconciliation/following-cycle-recurrence-planning", "Following-cycle recurrence re-triage & subsequent-cycle planning"],
  ["/approved-data/reconciliation/subsequent-cycle-delivery", "Subsequent-cycle corrective delivery execution"],
  ["/approved-data/reconciliation/subsequent-cycle-closure", "Subsequent-cycle reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-subsequent-cycle-reclosure", "Post-subsequent-cycle recurrence monitoring"],
  ["/approved-data/reconciliation/subsequent-cycle-recurrence-planning", "Subsequent-cycle recurrence re-triage & successive-cycle planning"],
  ["/approved-data/reconciliation/successive-cycle-delivery", "Successive-cycle corrective delivery execution"],
  ["/approved-data/reconciliation/successive-cycle-closure", "Successive-cycle reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-successive-cycle-reclosure", "Post-successive-cycle recurrence monitoring"],
  ["/approved-data/reconciliation/successive-cycle-recurrence-planning", "Successive-cycle recurrence re-triage & continuation-cycle planning"],
  ["/approved-data/reconciliation/continuation-cycle-delivery", "Continuation-cycle corrective delivery execution"],
  ["/approved-data/reconciliation/continuation-cycle-closure", "Continuation-cycle reconciliation & re-closure"],
  ["/approved-data/reconciliation/post-continuation-cycle-reclosure", "Post-continuation-cycle recurrence monitoring"],
  ["/collection-projects", "Collection projects"],
  ["/recipe-builder", "Visual recipe builder"],
  ["/collection-runs", "Collection run console"],
  ["/intelligence", "Intelligence library"],
  ["/remote-execution", "Remote execution"],
  ["/connectors", "Connectors"],
  ["/integration-delivery", "Integration delivery"],
  ["/retention", "Retention & cleanup"],
  ["/adoption", "Adoption & permissions"],
  ["/first-evidence", "First-evidence runbook"],
  ["/workspace-profiles", "Workspace profiles"],
  ["/production-learning", "Production learning"],
  ["/help", "Help center"]
] as const;

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KiB";
  return (value / (1024 * 1024)).toFixed(1) + " MiB";
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const commandCenter = session
    ? await buildCommandCenterHome(session.user.id)
    : null;

  return (
    <main className="shell">
      <section className="hero commandHero">
        <HelpInfo topic="command-center" />
        <p className="eyebrow">Build 043</p>
        <h1>Application Command Center</h1>
        <p className="lead">
          Start work, see workspace activity, and surface operational attention from
          the durable evidence the platform already records.
        </p>

        {session ? (
          <div className="accountBar">
            <div>
              <strong>{session.user.name}</strong>
              <span>{session.user.email}</span>
            </div>
            <SignOutButton />
          </div>
        ) : (
          <div className="heroActions">
            <Link className="primaryLink" href="/sign-in">Sign in</Link>
            <span>Authentication and workspace isolation are enabled.</span>
          </div>
        )}
      </section>

      {commandCenter ? (
        <>
          <section aria-labelledby="command-overview">
            <div className="sectionHeading">
              <p className="eyebrow">Today&apos;s workspace home</p>
              <h2 id="command-overview">What needs your attention</h2>
              <HelpInfo topic="command-center" />
            </div>
            <div className="commandMetrics">
              <article><strong>{commandCenter.totals.workspaces}</strong><span>authorized workspaces</span></article>
              <article><strong>{commandCenter.totals.activeWorkspaces}</strong><span>with durable activity</span></article>
              <article><strong>{commandCenter.totals.attentionWorkspaces}</strong><span>need review</span></article>
              <article><strong>{commandCenter.totals.activityEvents}</strong><span>measured activity events</span></article>
              <article><strong>{formatBytes(commandCenter.totals.measuredBytes)}</strong><span>managed evidence footprint</span></article>
            </div>
          </section>

          <section className="commandSection" aria-labelledby="activity-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Activity</p>
              <h2 id="activity-heading">Operational pulse</h2>
            </div>
            <div className="commandMetrics commandMetricsCompact">
              <article><strong>{commandCenter.totals.sync}</strong><span>sync outcomes</span></article>
              <article><strong>{commandCenter.totals.barcodeCaptures}</strong><span>barcode captures</span></article>
              <article><strong>{commandCenter.totals.scheduledAttempts}</strong><span>scheduled attempts</span></article>
              <article><strong>{commandCenter.totals.remoteRuns}</strong><span>remote runs</span></article>
              <article><strong>{commandCenter.totals.integrationEvents}</strong><span>integration events</span></article>
            </div>
          </section>

          <section className="commandSection" aria-labelledby="workspace-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Workspaces</p>
              <h2 id="workspace-heading">Your working contexts</h2>
              <HelpInfo topic="workspaces" />
            </div>
            {commandCenter.workspaces.length ? (
              <div className="grid commandWorkspaceGrid">
                {commandCenter.workspaces.map((workspace) => (
                  <article className="card commandWorkspaceCard" key={workspace.workspaceId}>
                    <div>
                      <h3>{workspace.workspaceName}</h3>
                      <span className="badge">{workspace.profileName} · {workspace.role}</span>
                    </div>
                    <p>{workspace.activityEvents} durable activity event(s)</p>
                    <p>
                      Sync {workspace.activity.sync} · Barcode {workspace.activity.barcodeCaptures} ·
                      Remote {workspace.activity.remoteRuns} · Integrations {workspace.activity.integrationEvents}
                    </p>
                    {workspace.attention.length ? (
                      <div className="commandAttention">
                        {workspace.attention.map((item) => <span key={item}>{item}</span>)}
                      </div>
                    ) : (
                      <span className="commandHealthy">No measured attention condition</span>
                    )}
                    {workspace.latest ? (
                      <small>
                        Latest {workspace.latest.kind.toLowerCase()}: {workspace.latest.label} ·{" "}
                        {workspace.latest.at.toLocaleString()}
                      </small>
                    ) : (
                      <small>No recent remote or delivery event recorded.</small>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="emptyState">
                <h3>No workspace access</h3>
                <p>This authenticated account has not been granted a workspace.</p>
              </div>
            )}
          </section>

          <section className="commandSection" aria-labelledby="recent-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Recent evidence</p>
              <h2 id="recent-heading">Latest provider & delivery events</h2>
            </div>
            {commandCenter.latestEvents.length ? (
              <div className="commandRecentList">
                {commandCenter.latestEvents.map((event, index) => (
                  <article key={event.workspaceName + event.label + index}>
                    <div><strong>{event.workspaceName}</strong><span>{event.kind}</span></div>
                    <p>{event.label}</p>
                    <small>{event.at.toLocaleString()}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="emptyState">No recent provider or delivery evidence yet.</div>
            )}
          </section>

          <section className="commandSection" aria-labelledby="launch-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Launch</p>
              <h2 id="launch-heading">Go directly to the work</h2>
            </div>
            <nav className="commandLaunchGrid" aria-label="Application workflows">
              {workflowLinks.map(([href, label], index) => (
                <Link className={index === 0 ? "primaryLink" : "secondaryButton"} href={href} key={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </section>

          <AiFieldSuggestions />
        </>
      ) : (
        <section aria-labelledby="workspace-heading">
          <div className="sectionHeading">
            <p className="eyebrow">Private application</p>
            <h2 id="workspace-heading">One engine, isolated workspaces</h2>
            <HelpInfo topic="platform-overview" />
          </div>
          <div className="grid">
            <article className="card"><h3>Rosie Dazzlers</h3><p>Detailing intelligence, pricing history and operational evidence.</p></article>
            <article className="card"><h3>Devil n Dove</h3><p>Supplier, product, tool and inventory intelligence.</p></article>
            <article className="card"><h3>Personal</h3><p>Movie metadata enrichment and approved private datasets.</p></article>
          </div>
        </section>
      )}

      <section className="principles" aria-labelledby="principles-heading">
        <HelpInfo topic="guardrails" />
        <div><p className="eyebrow">Guardrails</p><h2 id="principles-heading">Designed for traceable data</h2></div>
        <ul>{foundations.map((foundation) => <li key={foundation}>{foundation}</li>)}</ul>
      </section>
    </main>
  );
}
