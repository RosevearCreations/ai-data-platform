import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { MODULE_CARDS, moduleHubHref } from "@/lib/application-navigation";
import {
  buildCommandCenterHome,
  type CommandCenterAttentionSeverity,
  type CommandCenterHealthState
} from "@/lib/command-center";

import { AiFieldSuggestions } from "./ai-field-suggestions";
import { HelpInfo } from "./help/HelpInfo";
import type { HelpTopicKey } from "./help/help-content";
import { SignOutButton } from "./sign-out-button";\nimport { OperationsAreaBand } from "./OperationsCommandPanels";

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

function surfaceStatus(
  state: CommandCenterAttentionSeverity | CommandCenterHealthState
) {
  return state === "critical"
    ? "critical"
    : state === "attention"
      ? "attention"
      : state === "info"
        ? "info"
        : "healthy";
}

function MetricCard({
  value,
  label,
  topic = "command-center-v2"
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
    <main className="shell shellWide commandV2Shell opsCommandScreen opsCommandScreen--management">
      <section className="hero commandHero compactHero">
        <HelpInfo topic="command-center-v2" />
        <p className="eyebrow">Build 119</p>
        <h1>Operator Home</h1>
        <p className="lead">
          Start with what needs attention, move directly into the right workflow,
          and continue recent work from one operational dashboard.
        </p>

        {session ? (
          <div className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral accountBar cardHelpSurface">
            <HelpInfo topic="command-center-v2" inline />
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

      <OperationsAreaBand
        area="Management"
        description="Current priorities, operational health, workspace standing and governed follow-through from live platform evidence."
        links={[
          { label: "Workspaces", href: "/workspace-profiles" },
          { label: "Adoption", href: "/adoption" },
          { label: "Retention", href: "/retention" }
        ]}
      />

      {commandCenter ? (
        <>
          <section className="commandV2PriorityGrid" aria-label="Operator priorities">
            <div className="commandV2PriorityColumn">
              <div className="sectionHeading">
                <p className="eyebrow">Priority queue</p>
                <h2>Needs Attention</h2>
                <HelpInfo topic="dashboard-attention" />
              </div>

              {commandCenter.dashboard.attentionQueue.length ? (
                <div className="commandAttentionQueue">
                  {commandCenter.dashboard.attentionQueue.slice(0, 8).map((item) => (
                    <article
                      className={
                        "uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--" +
                        surfaceStatus(item.severity) +
                        " commandAttentionCard cardHelpSurface"
                      }
                      key={item.id}
                    >
                      <HelpInfo topic="dashboard-attention" inline />
                      <div className="commandAttentionCardHeader">
                        <span className={"uiStatusPill uiStatusPill--" + surfaceStatus(item.severity)}>
                          {item.severity === "critical" ? "Critical" : "Review"}
                        </span>
                        <small>{item.workspaceName}</small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      <Link className="primaryLink" href={item.href}>
                        {item.actionLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <article className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--healthy commandAllClear cardHelpSurface">
                  <HelpInfo topic="dashboard-attention" inline />
                  <span className="uiStatusPill uiStatusPill--healthy">Healthy</span>
                  <h3>No measured attention condition</h3>
                  <p>
                    Current workspace, collection, delivery, retention and corrective
                    evidence does not surface an operator attention item.
                  </p>
                </article>
              )}
            </div>

            <div className="commandV2QuickColumn">
              <div className="sectionHeading">
                <p className="eyebrow">Start work</p>
                <h2>Quick Actions</h2>
                <HelpInfo topic="dashboard-quick-actions" />
              </div>
              <div className="commandQuickActions">
                {commandCenter.dashboard.quickActions.map((action) => (
                  <article className="uiSurfaceCard uiSurfaceCard--interactive uiSurfaceCard--neutral commandQuickAction cardHelpSurface" key={action.id}>
                    <HelpInfo topic="dashboard-quick-actions" inline />
                    <span className="commandQuickActionGroup">{action.group}</span>
                    <h3>{action.label}</h3>
                    <p>{action.description}</p>
                    <Link href={action.href}>Open workflow →</Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="commandSection" aria-labelledby="health-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Operational health</p>
              <h2 id="health-heading">
                {commandCenter.dashboard.overallHealth === "healthy"
                  ? "Measured systems are healthy"
                  : commandCenter.dashboard.overallHealth === "critical"
                    ? "Critical conditions need review"
                    : "Some systems need attention"}
              </h2>
              <HelpInfo topic="dashboard-health" />
            </div>
            <div className="commandHealthGrid">
              {commandCenter.dashboard.healthSignals.map((signal) => (
                <article
                  className={
                    "uiSurfaceCard uiSurfaceCard--default uiSurfaceCard--" +
                    signal.state +
                    " commandHealthCard cardHelpSurface"
                  }
                  key={signal.id}
                >
                  <HelpInfo topic="dashboard-health" inline />
                  <div className="commandHealthCardHeader">
                    <span className={"uiStatusPill uiStatusPill--" + signal.state}>
                      {signal.state}
                    </span>
                    <strong>{signal.count}</strong>
                  </div>
                  <h3>{signal.label}</h3>
                  <p>{signal.detail}</p>
                  <Link href={signal.href}>Inspect →</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="commandSection commandV2SummaryBand" aria-labelledby="summary-heading">
            <div className="sectionHeading">
              <p className="eyebrow">At a glance</p>
              <h2 id="summary-heading">Current operating picture</h2>
              <HelpInfo topic="command-center-v2" />
            </div>
            <div className="commandMetrics">
              <MetricCard value={commandCenter.totals.workspaces} label="authorized workspaces" />
              <MetricCard value={commandCenter.dashboard.collection.activeProjects} label="active collection projects" topic="dashboard-health" />
              <MetricCard value={commandCenter.dashboard.corrective.activeCycles} label="active corrective cycles" topic="dashboard-health" />
              <MetricCard value={commandCenter.totals.activityEvents} label="measured activity events" />
              <MetricCard value={formatBytes(commandCenter.totals.measuredBytes)} label="managed evidence footprint" />
            </div>
          </section>

          <section className="commandSection" aria-labelledby="recent-work-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Continue</p>
              <h2 id="recent-work-heading">Recent Work</h2>
              <HelpInfo topic="dashboard-recent-work" />
            </div>
            {commandCenter.dashboard.recentWork.length ? (
              <div className="commandRecentWorkGrid">
                {commandCenter.dashboard.recentWork.map((item) => (
                  <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--info commandRecentWorkCard cardHelpSurface" key={item.id}>
                    <HelpInfo topic="dashboard-recent-work" inline />
                    <div className="commandRecentWorkHeader">
                      <span className="badge">{item.kind}</span>
                      <small>{item.at.toLocaleString()}</small>
                    </div>
                    <h3>{item.label}</h3>
                    <p>{item.workspaceName} · {item.detail}</p>
                    <Link href={item.href}>Continue →</Link>
                  </article>
                ))}
              </div>
            ) : (
              <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral emptyState cardHelpSurface">
                <HelpInfo topic="dashboard-recent-work" inline />
                <h3>No recent work yet</h3>
                <p>Recent collection, remote execution and delivery evidence will appear here.</p>
              </article>
            )}
          </section>

          <section className="commandSection" aria-labelledby="activity-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Measured activity</p>
              <h2 id="activity-heading">Operational Pulse</h2>
              <HelpInfo topic="command-center-v2" />
            </div>
            <div className="commandMetrics commandMetricsCompact">
              <MetricCard value={commandCenter.totals.sync} label="sync outcomes" />
              <MetricCard value={commandCenter.totals.barcodeCaptures} label="barcode captures" topic="barcode-overview" />
              <MetricCard value={commandCenter.totals.scheduledAttempts} label="scheduled attempts" topic="collection-projects-readiness" />
              <MetricCard value={commandCenter.totals.remoteRuns} label="remote runs" topic="remote-overview" />
              <MetricCard value={commandCenter.totals.integrationEvents} label="integration events" topic="integration-delivery" />
            </div>
          </section>

          <section className="commandSection" aria-labelledby="workspace-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Working contexts</p>
              <h2 id="workspace-heading">Workspaces</h2>
              <HelpInfo topic="dashboard-workspaces" />
            </div>
            {commandCenter.workspaces.length ? (
              <div className="grid commandWorkspaceGrid">
                {commandCenter.workspaces.map((workspace) => (
                  <article
                    className={
                      "card uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--" +
                      (workspace.attention.length ? "attention" : "healthy") +
                      " commandWorkspaceCard cardHelpSurface"
                    }
                    key={workspace.workspaceId}
                  >
                    <HelpInfo topic="dashboard-workspaces" inline />
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
              <article className="uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral emptyState cardHelpSurface">
                <HelpInfo topic="dashboard-workspaces" inline />
                <h3>No workspace access</h3>
                <p>This authenticated account has not been granted a workspace.</p>
              </article>
            )}
          </section>

          <section className="commandSection" aria-labelledby="module-heading">
            <div className="sectionHeading">
              <p className="eyebrow">Browse</p>
              <h2 id="module-heading">Application Modules</h2>
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
                    <Link className="primaryLink" href={moduleHubHref(group.id)}>
                      Open {group.shortLabel} hub
                    </Link>
                    <Link className="secondaryButton" href="/workflows">
                      Browse workflows
                    </Link>
                  </div>
                </article>
              ))}
            </div>
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
