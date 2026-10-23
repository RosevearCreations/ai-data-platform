import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { buildCommandCenterHome } from "@/lib/command-center";
import { MODULE_CARDS } from "@/lib/application-navigation";

import { AiFieldSuggestions } from "./ai-field-suggestions";
import { SignOutButton } from "./sign-out-button";
import { HelpInfo } from "./help/HelpInfo";
import type { HelpTopicKey } from "./help/help-content";

const foundations = [
  "PostgreSQL row-level workspace isolation",
  "Source evidence on every external observation",
  "Review before downstream business writes",
  "AI for interpretation; deterministic code for repetition"
] as const;

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KiB";
  return (value / (1024 * 1024)).toFixed(1) + " MiB";
}

function MetricCard({
  value,
  label,
  topic = "command-center"
}: {
  value: string | number;
  label: string;
  topic?: HelpTopicKey;
}) {
  return (
    <article className="uiSurfaceCard uiSurfaceCard--metric uiSurfaceCard--neutral commandMetricCard cardHelpSurface">
      <HelpInfo topic={topic} inline />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const commandCenter = session
    ? await buildCommandCenterHome(session.user.id)
    : null;

  return (
    <main className="shell shellWide">
      <section className="hero commandHero compactHero">
        <HelpInfo topic="command-center" />
        <p className="eyebrow">Build 118</p>
        <h1>Application Command Center</h1>
        <p className="lead">
          See what needs attention, reopen recent evidence and enter the platform
          through task-oriented modules instead of a long list of implementation screens.
        </p>

        {session ? (
          <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral accountBar cardHelpSurface">
            <HelpInfo topic="shell-overview" inline />
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
              <MetricCard value={commandCenter.totals.workspaces} label="authorized workspaces" />
              <MetricCard value={commandCenter.totals.activeWorkspaces} label="with durable activity" />
              <MetricCard value={commandCenter.totals.attentionWorkspaces} label="need review" />
              <MetricCard value={commandCenter.totals.activityEvents} label="measured activity events" />
              <MetricCard value={formatBytes(commandCenter.totals.measuredBytes)} label="managed evidence footprint" />
            </div>
          </section>

          <section className="commandSection" aria-labelledby="activity-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Activity</p>
              <h2 id="activity-heading">Operational pulse</h2>
              <HelpInfo topic="command-center" />
            </div>
            <div className="commandMetrics commandMetricsCompact">
              <MetricCard value={commandCenter.totals.sync} label="sync outcomes" />
              <MetricCard value={commandCenter.totals.barcodeCaptures} label="barcode captures" topic="barcode-overview" />
              <MetricCard value={commandCenter.totals.scheduledAttempts} label="scheduled attempts" topic="collection-projects-readiness" />
              <MetricCard value={commandCenter.totals.remoteRuns} label="remote runs" topic="remote-overview" />
              <MetricCard value={commandCenter.totals.integrationEvents} label="integration events" topic="integration-delivery" />
            </div>
          </section>

          <section className="commandSection" aria-labelledby="module-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Modules</p>
              <h2 id="module-heading">Go directly to the work</h2>
              <HelpInfo topic="workflow-directory" />
            </div>
            <div className="commandModuleGrid">
              {MODULE_CARDS.map((group) => (
                <article className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral commandModuleCard cardHelpSurface" key={group.id}>
                  <HelpInfo topic={group.helpTopic as HelpTopicKey} inline />
                  <div className="commandModuleCardHeader">
                    <div>
                      <span className="commandModuleLabel">{group.shortLabel}</span>
                      <h3>{group.label}</h3>
                    </div>
                    <span className="badge">{group.items.length} workflows</span>
                  </div>
                  <p>{group.description}</p>
                  <div className="commandModuleActions">
                    <Link className="primaryLink" href={group.items[0].href}>
                      Open {group.shortLabel}
                    </Link>
                    <Link className="secondaryButton" href="/workflows">
                      Browse workflows
                    </Link>
                  </div>
                </article>
              ))}
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
                  <article className="card uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral commandWorkspaceCard cardHelpSurface" key={workspace.workspaceId}>
                    <HelpInfo topic="workspaces" inline />
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
              <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral emptyState cardHelpSurface">
                <HelpInfo topic="workspaces" inline />
                <h3>No workspace access</h3>
                <p>This authenticated account has not been granted a workspace.</p>
              </div>
            )}
          </section>

          <section className="commandSection" aria-labelledby="recent-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Recent evidence</p>
              <h2 id="recent-heading">Latest provider & delivery events</h2>
              <HelpInfo topic="command-center" />
            </div>
            {commandCenter.latestEvents.length ? (
              <div className="commandRecentList">
                {commandCenter.latestEvents.map((event, index) => (
                  <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--info cardHelpSurface" key={event.workspaceName + event.label + index}>
                    <HelpInfo topic="command-center" inline />
                    <div><strong>{event.workspaceName}</strong><span>{event.kind}</span></div>
                    <p>{event.label}</p>
                    <small>{event.at.toLocaleString()}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral emptyState cardHelpSurface">
                <HelpInfo topic="command-center" inline />
                No recent provider or delivery evidence yet.
              </div>
            )}
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
            <article className="card uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral cardHelpSurface">
              <HelpInfo topic="platform-overview" inline />
              <h3>Rosie Dazzlers</h3>
              <p>Detailing intelligence, pricing history and operational evidence.</p>
            </article>
            <article className="card uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral cardHelpSurface">
              <HelpInfo topic="platform-overview" inline />
              <h3>Devil n Dove</h3>
              <p>Supplier, product, tool and inventory intelligence.</p>
            </article>
            <article className="card uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral cardHelpSurface">
              <HelpInfo topic="platform-overview" inline />
              <h3>Personal</h3>
              <p>Movie metadata enrichment and approved private datasets.</p>
            </article>
          </div>
        </section>
      )}

      <section className="principles uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral cardHelpSurface" aria-labelledby="principles-heading">
        <HelpInfo topic="guardrails" />
        <div>
          <p className="eyebrow">Guardrails</p>
          <h2 id="principles-heading">Designed for traceable data</h2>
        </div>
        <ul>{foundations.map((foundation) => <li key={foundation}>{foundation}</li>)}</ul>
      </section>
    </main>
  );
}
