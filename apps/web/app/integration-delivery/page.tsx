import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { integrationConsumerConfiguration } from "@/lib/integration-delivery";
import { listIntegrationDeliveryOverviewForUser } from "@/lib/integration-delivery-database";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsActionDrawer, OperationsActivitySummary, OperationsComparisonCard, OperationsContextInspector, OperationsDataTable, OperationsDetailInspector, OperationsEvidenceGroup, OperationsEvidenceTimeline, OperationsExceptionPivot, OperationsExceptionQueue, OperationsHistoryPanel, OperationsInspector, OperationsInspectorShortcuts, OperationsInspectorWorkflow, OperationsModuleGrid, OperationsQueueSummary, OperationsSavedViews, OperationsSearchPanel, OperationsStatusBadge, OperationsStatusGroup, OpsDrawerLink } from "../OperationsCommandPanels";
import { IntegrationDeliveryPanel } from "./IntegrationDeliveryPanel";

export const dynamic = "force-dynamic";

export default async function IntegrationDeliveryPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="integration-delivery" />
          <p className="eyebrow">Build 033</p>
          <h1>Integration consumer delivery</h1>
          <p className="lead">
            Sign in to review consumer conformance, handshake readiness and durable delivery acknowledgements.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/integration-delivery">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const view = ["all","configured","needs-config","exceptions"].includes(params.view ?? "") ? (params.view ?? "all") : "all";
  const overview = await listIntegrationDeliveryOverviewForUser(session.user.id);
  const consumers = (["rosie-dazzlers", "devil-n-dove"] as const).map((target) => {
    const config = integrationConsumerConfiguration(target);
    return {
      target,
      configured: config.configured,
      endpointOrigin: config.endpointOrigin,
      urlName: config.urlName,
      tokenName: config.tokenName
    };
  });
  const viewConsumers =
    view === "configured" ? consumers.filter((consumer) => consumer.configured) :
    view === "needs-config" ? consumers.filter((consumer) => !consumer.configured) :
    consumers;
  const filteredConsumers = query
    ? viewConsumers.filter((consumer) =>
        [consumer.target, consumer.endpointOrigin ?? "", consumer.urlName, consumer.tokenName]
          .some((value) => value.toLowerCase().includes(query))
      )
    : viewConsumers;
  const recentEvents = overview.flatMap((entry) => entry.recent);
  const successfulEvents = recentEvents.filter((event) => !event.httpStatus || event.httpStatus < 400);
  const rejectedEvents = recentEvents.filter((event) => Boolean(event.httpStatus && event.httpStatus >= 400)).length;
  const configuredCount = consumers.filter((consumer) => consumer.configured).length;
  const needsConfigCount = consumers.length - configuredCount;
  const savedViewHref = (nextView: string) => {
    const paramsOut = new URLSearchParams();
    if (query) paramsOut.set("q", query);
    if (nextView !== "all") paramsOut.set("view", nextView);
    const suffix = paramsOut.toString();
    return suffix ? "/integration-delivery?" + suffix : "/integration-delivery";
  };

  return (
    <main className="shell opsCommandScreen opsCommandScreen--status">
      <section className="hero">
        <HelpInfo topic="integration-delivery" />
        <p className="eyebrow">Build 033</p>
        <h1>Integration Consumer Acceptance & Delivery Observability</h1>
        <p className="lead">
          Prove the receiver contract first, then test an authenticated external
          handshake and one dry-run package. No Build 033 action authorizes
          downstream business-system mutation.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/integration-delivery/comms-hub">Comms Hub Connection · local I.T. test</Link>
          <Link className="secondaryButton" href="/intelligence">Integration evidence</Link>
          <Link className="secondaryButton" href="/production-learning">Production learning</Link>
        </div>
      </section>

      <section className="opsScreenBand" aria-label="Operations Command System Status">
        <div><span className="opsScreenBandLabel">Operations Command</span><strong>System Status</strong><p>Receiver readiness, connection state, delivery observability and append-only integration acknowledgements.</p></div>
        <nav className="opsScreenBandLinks" aria-label="System Status command links">
          <Link href="/integration-delivery/comms-hub">Comms Hub</Link><Link href="/remote-execution">Remote Execution</Link><Link href="/production-learning">Production Learning</Link>
        </nav>
      </section>

      <div className="opsComparisonLayout">
        <OperationsComparisonCard
          title="Consumer configuration"
          left={{ label: "Configured", value: configuredCount, tone: configuredCount === consumers.length ? "healthy" as const : "info" as const }}
          right={{ label: "Needs review", value: needsConfigCount, tone: needsConfigCount ? "attention" as const : "healthy" as const }}
          detail={consumers.length + " configured consumer target(s) are currently visible in this workspace."}
        />
        <OperationsComparisonCard
          title="Delivery outcomes"
          left={{ label: "Accepted / non-error", value: successfulEvents.length, tone: "healthy" as const }}
          right={{ label: "HTTP exceptions", value: rejectedEvents, tone: rejectedEvents ? "critical" as const : "healthy" as const }}
          detail={recentEvents.length + " durable acknowledgement event(s) are available for comparison."}
        />
      </div>

      <OperationsExceptionPivot
        title="Exception focus"
        pivots={[
          { label: "All consumers", href: savedViewHref("all"), count: consumers.length, active: view === "all", tone: "info" as const },
          { label: "Configuration gaps", href: savedViewHref("needs-config"), count: needsConfigCount, active: view === "needs-config", tone: needsConfigCount ? "attention" as const : "healthy" as const },
          { label: "HTTP exceptions", href: savedViewHref("exceptions"), count: rejectedEvents, active: view === "exceptions", tone: rejectedEvents ? "critical" as const : "healthy" as const }
        ]}
      />

      <div className="opsHistoryLayout">
        <OperationsHistoryPanel
          title="Recent delivery history"
          entries={recentEvents.slice(0, 10).map((event) => ({
            id: event.eventId,
            label: event.eventType,
            detail: event.target + " · " + event.validationCode + (event.httpStatus ? " · HTTP " + event.httpStatus : ""),
            timestamp: event.occurredAt.toLocaleString(),
            tone: event.httpStatus && event.httpStatus >= 400 ? "critical" as const : "info" as const
          }))}
        />
        <OperationsInspectorShortcuts
          title="System Status shortcuts"
          shortcuts={[
            { label: "Comms Hub checks", href: "/integration-delivery/comms-hub", detail: "Review source-side connection checks." },
            { label: "Remote execution", href: "/remote-execution", detail: "Review governed execution readiness." },
            { label: "Production learning", href: "/production-learning", detail: "Review statistical and operational evidence." },
            { label: "Integration evidence", href: "/intelligence", detail: "Inspect broader integration evidence." }
          ]}
        />
      </div>

      <div className="opsSavedLayout">
        <OperationsSavedViews
          title="Consumer views"
          views={[
            { label: "All", href: savedViewHref("all"), active: view === "all", count: consumers.length },
            { label: "Configured", href: savedViewHref("configured"), active: view === "configured", count: configuredCount },
            { label: "Needs configuration", href: savedViewHref("needs-config"), active: view === "needs-config", count: needsConfigCount },
            { label: "Exceptions", href: savedViewHref("exceptions"), active: view === "exceptions", count: rejectedEvents }
          ]}
        />
        <OperationsContextInspector
          title="Review actions"
          description="Use the current saved view to focus the existing governed System Status workflow. QL-266 remains outside the active workflow while under review."
          actions={[
            { label: "Comms Hub checks", href: "/integration-delivery/comms-hub" },
            { label: "Remote execution", href: "/remote-execution" },
            { label: "Production learning", href: "/production-learning" }
          ]}
        />
      </div>

      <OperationsQueueSummary
        title="Current review queues"
        items={[
          { label: "Needs configuration", count: needsConfigCount, detail: "Consumers without endpoint/credential pairs.", tone: needsConfigCount ? "attention" as const : "healthy" as const },
          { label: "HTTP exceptions", count: rejectedEvents, detail: "Recent delivery acknowledgements with HTTP 4xx/5xx.", tone: rejectedEvents ? "critical" as const : "healthy" as const },
          { label: "Configured", count: configuredCount, detail: "Consumers with current endpoint/credential configuration.", tone: configuredCount === consumers.length ? "healthy" as const : "info" as const }
        ]}
      />

      <OperationsEvidenceGroup title="Current evidence groups">
        <article className="card">
          <h3>Consumer configuration</h3>
          <p>{configuredCount}/{consumers.length} configured · {needsConfigCount} need review.</p>
          <OperationsStatusBadge tone={needsConfigCount ? "attention" : "healthy"}>{needsConfigCount ? "Configuration review needed" : "Configuration complete"}</OperationsStatusBadge>
        </article>
        <article className="card">
          <h3>Delivery acknowledgements</h3>
          <p>{recentEvents.length} recent event(s) · {rejectedEvents} HTTP exception(s).</p>
          <OperationsStatusBadge tone={rejectedEvents ? "attention" : "healthy"}>{rejectedEvents ? "Exceptions present" : "No HTTP exceptions"}</OperationsStatusBadge>
        </article>
        <article className="card">
          <h3>QL-266</h3>
          <p>Deferred by owner direction and not reactivated in Build 248.</p>
          <OperationsStatusBadge tone="info">UNDER REVIEW</OperationsStatusBadge>
        </article>
      </OperationsEvidenceGroup>

      <div className="opsSearchLayout">
        <OperationsSearchPanel title="Search consumer configuration" description="Filter the current consumer configuration without changing delivery state.">
          <form method="get" action="/integration-delivery" className="opsSearchPanelBody">
            <input name="q" defaultValue={params.q ?? ""} placeholder="Consumer, endpoint or credential binding" aria-label="Search consumer configuration" />
            {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
            <button type="submit">Search</button>
            {query ? <Link href="/integration-delivery">Clear</Link> : null}
          </form>
        </OperationsSearchPanel>
        <OperationsStatusGroup
          title="Review state"
          items={[
            { label: "QL-266", value: "UNDER REVIEW", tone: "info" as const },
            { label: "Configured consumers", value: consumers.filter((consumer) => consumer.configured).length + "/" + consumers.length, tone: consumers.every((consumer) => consumer.configured) ? "healthy" as const : "attention" as const },
            { label: "Connection", value: "DISCONNECTED", tone: "info" as const }
          ]}
        />
      </div>

      <OperationsActivitySummary
        title="Delivery activity"
        items={[
          { label: "Visible consumers", value: filteredConsumers.length, detail: query ? "Filtered from " + consumers.length : "Current configuration", tone: "info" as const },
          { label: "Recent acknowledgements", value: recentEvents.length, detail: "Durable delivery events", tone: recentEvents.length ? "healthy" as const : "info" as const },
          { label: "HTTP exceptions", value: rejectedEvents, detail: "Recent events with HTTP 4xx/5xx", tone: rejectedEvents ? "attention" as const : "healthy" as const },
          { label: "Workspaces", value: overview.length, detail: "Authorized delivery workspaces", tone: "info" as const }
        ]}
      />

      <OperationsInspectorWorkflow
        title="Consumer review workflow"
        steps={[
          { label: "Filter", detail: "Find the consumer or credential binding that needs review.", state: query ? "complete" : "current" },
          { label: "Inspect", detail: "Compare configuration, readiness exceptions and acknowledgement evidence.", state: query ? "current" : "pending" },
          { label: "Decide", detail: "Use the existing governed delivery controls; QL-266 remains outside this workflow while under review.", state: "pending" }
        ]}
      />

      <OperationsActionDrawer title="System status actions" description="Open source-side connection checks, remote execution status and production-learning evidence without authorizing downstream mutation.">
        <OpsDrawerLink href="/integration-delivery/comms-hub">Comms Hub Connection</OpsDrawerLink>
        <OpsDrawerLink href="/remote-execution">Remote Execution</OpsDrawerLink>
        <OpsDrawerLink href="/production-learning">Production Learning</OpsDrawerLink>
      </OperationsActionDrawer>

      <div className="opsTemplateGrid">
        <OperationsExceptionQueue
          title="Consumer readiness exceptions"
          items={consumers.filter((consumer) => !consumer.configured).map((consumer) => ({
            id: consumer.target,
            label: consumer.target + " not configured",
            detail: "No endpoint/credential pair is configured for authenticated dry-run delivery.",
            tone: "attention" as const
          }))}
          emptyLabel="All configured consumers currently have endpoint/credential pairs."
        />
        <OperationsEvidenceTimeline
          title="Delivery acknowledgements"
          entries={overview.flatMap((entry) => entry.recent.slice(0, 5).map((event) => ({
            id: entry.workspace.id + ":" + event.eventId,
            title: event.eventType,
            detail: entry.workspace.name + " · " + event.target + " · " + event.validationCode + (event.httpStatus ? " · HTTP " + event.httpStatus : ""),
            timestamp: event.occurredAt.toLocaleString(),
            tone: event.httpStatus && event.httpStatus >= 400 ? "critical" as const : "info" as const
          }))).slice(0, 12)}
        />
      </div>

      <div className="opsWorkflowLayout">
        <OperationsDataTable
          caption="Consumer configuration"
          rows={filteredConsumers}
          rowKey={(consumer) => consumer.target}
          columns={[
            { key: "target", label: "Consumer", render: (consumer) => <strong>{consumer.target}</strong> },
            { key: "state", label: "Status", render: (consumer) => <OperationsStatusBadge tone={consumer.configured ? "healthy" : "attention"}>{consumer.configured ? "Configured" : "Not configured"}</OperationsStatusBadge> },
            { key: "origin", label: "Endpoint", render: (consumer) => consumer.endpointOrigin ?? "External consumer gated" },
            { key: "credential", label: "Credential binding", render: (consumer) => consumer.tokenName }
          ]}
        />
        <OperationsInspector title="Connection boundary" eyebrow="System Status">
          <OperationsStatusBadge tone="info">QL-266 under review</OperationsStatusBadge>
          <p>QL-266 has been set aside for later review. Consumer configuration remains visible, but this screen does not start or authorize a new QL-266 gateway test.</p>
          <p>Existing source-side checks remain available. QL-266 will be resumed only when we deliberately return to that review.</p>
          <OpsDrawerLink href="/integration-delivery/comms-hub">Open Comms Hub gate</OpsDrawerLink>
        </OperationsInspector>
      </div>

      <OperationsModuleGrid>
        <OperationsDetailInspector title="Consumer review" status="Current">
          <p>Review consumer configuration and delivery evidence from the current system-status workspace.</p>
        </OperationsDetailInspector>
        <OperationsDetailInspector title="Responsive module layout" status="Active">
          <p>This workspace uses the shared responsive module-grid pattern for desktop and smaller screens.</p>
        </OperationsDetailInspector>
      </OperationsModuleGrid>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Consumer configuration</p>
            <h2>Fail-closed receiver readiness</h2>
          </div>
          <HelpInfo topic="integration-delivery" />
        </div>
        <div className="grid">
          {consumers.map((consumer) => (
            <article className="card" key={consumer.target}>
              <h3>{consumer.target}</h3>
              <p>
                {consumer.configured
                  ? "Configured for authenticated dry-run delivery."
                  : "No endpoint/credential pair is configured."}
              </p>
              <span className="badge">
                {consumer.endpointOrigin ?? "external consumer gated"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <IntegrationDeliveryPanel
        consumers={consumers}
        workspaces={overview.map((entry) => ({
          id: entry.workspace.id,
          name: entry.workspace.name,
          role: entry.workspace.role,
          batches: entry.eligibleBatches
        }))}
      />

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only evidence</p>
            <h2>Recent delivery acknowledgements</h2>
          </div>
          <HelpInfo topic="integration-delivery" />
        </div>
        <div className="grid">
          {overview.flatMap((entry) =>
            entry.recent.slice(0, 8).map((event) => (
              <article className="card" key={entry.workspace.id + ":" + event.eventId}>
                <h3>{event.eventType}</h3>
                <p>
                  {entry.workspace.name} · {event.target} · {event.transportMode}
                </p>
                <p>
                  {event.validationCode}
                  {event.httpStatus ? " · HTTP " + event.httpStatus : ""}
                </p>
                <span className="badge">{event.occurredAt.toLocaleString()}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
