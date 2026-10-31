import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { integrationConsumerConfiguration } from "@/lib/integration-delivery";
import { listIntegrationDeliveryOverviewForUser } from "@/lib/integration-delivery-database";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsActionDrawer, OperationsActivityLane, OperationsActivitySummary, OperationsComparisonCard, OperationsContextInspector, OperationsDataTable, OperationsDetailInspector, OperationsDrilldownFilters, OperationsEventGroup, OperationsEvidenceGroup, OperationsEvidenceTimeline, OperationsExceptionPivot, OperationsExceptionQueue, OperationsHealthSummary, OperationsHistoryPanel, OperationsInspector, OperationsInspectorCheckpoints, OperationsInspectorHandoffCard, OperationsInspectorShortcuts, OperationsInspectorTaskLinks, OperationsInspectorWorkflow, OperationsLayeredFilters, OperationsModuleGrid, OperationsQueueSummary, OperationsSavedViews, OperationsScorecard, OperationsSearchPanel, OperationsSegmentedView, OperationsStatusBadge, OperationsStatusGroup, OperationsTrendCard, OperationsWorkflowTimeline, OpsDrawerLink } from "../OperationsCommandPanels";
import { IntegrationDeliveryPanel } from "./IntegrationDeliveryPanel";

export const dynamic = "force-dynamic";

export default async function IntegrationDeliveryPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string; event?: string }> }) {
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
  const eventView = ["all","accepted","errors"].includes(params.event ?? "") ? (params.event ?? "all") : "all";
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
  const rejectedEventRows = recentEvents.filter((event) => Boolean(event.httpStatus && event.httpStatus >= 400));
  const rejectedEvents = rejectedEventRows.length;
  const acceptedEventRows = recentEvents.filter((event) => !event.httpStatus || event.httpStatus < 400);
  const eventRows =
    eventView === "accepted" ? acceptedEventRows :
    eventView === "errors" ? rejectedEventRows :
    recentEvents;
  const nowMs = Date.now();
  const last24hEvents = recentEvents.filter((event) => {
    const age = nowMs - event.occurredAt.getTime();
    return age >= 0 && age <= 86_400_000;
  });
  const previous24hEvents = recentEvents.filter((event) => {
    const age = nowMs - event.occurredAt.getTime();
    return age > 86_400_000 && age <= 172_800_000;
  });
  const eventDelta = last24hEvents.length - previous24hEvents.length;
  const configuredCount = consumers.filter((consumer) => consumer.configured).length;
  const needsConfigCount = consumers.length - configuredCount;
  const eventViewHref = (nextEventView: string) => {
    const paramsOut = new URLSearchParams();
    if (query) paramsOut.set("q", query);
    if (view !== "all") paramsOut.set("view", view);
    if (nextEventView !== "all") paramsOut.set("event", nextEventView);
    const suffix = paramsOut.toString();
    return suffix ? "/integration-delivery?" + suffix : "/integration-delivery";
  };
  const savedViewHref = (nextView: string) => {
    const paramsOut = new URLSearchParams();
    if (query) paramsOut.set("q", query);
    if (nextView !== "all") paramsOut.set("view", nextView);
    if (eventView !== "all") paramsOut.set("event", eventView);
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

      <div className="opsTrendGrid">
        <OperationsTrendCard
          label="Delivery events · last 24h"
          value={last24hEvents.length}
          trend={(eventDelta >= 0 ? "+" : "") + eventDelta + " vs prior 24h"}
          detail={previous24hEvents.length + " event(s) in the preceding 24-hour window."}
          tone={eventDelta > 0 ? "info" : "healthy"}
        />
        <OperationsTrendCard
          label="Accepted / non-error"
          value={acceptedEventRows.length}
          trend={recentEvents.length ? Math.round((acceptedEventRows.length / recentEvents.length) * 100) + "% of recent events" : "No recent events"}
          detail="Current durable acknowledgement history."
          tone={rejectedEvents ? "attention" : "healthy"}
        />
        <OperationsTrendCard
          label="HTTP exceptions"
          value={rejectedEvents}
          trend={recentEvents.length ? Math.round((rejectedEvents / recentEvents.length) * 100) + "% of recent events" : "No recent events"}
          detail="HTTP 4xx/5xx acknowledgements in visible history."
          tone={rejectedEvents ? "critical" : "healthy"}
        />
        <OperationsTrendCard
          label="Configured consumers"
          value={configuredCount + "/" + consumers.length}
          trend={consumers.length ? Math.round((configuredCount / consumers.length) * 100) + "% configured" : "No consumers"}
          detail={needsConfigCount + " consumer(s) still require configuration review."}
          tone={needsConfigCount ? "attention" : "healthy"}
        />
      </div>

      <div className="opsTrendLayout">
        <OperationsDrilldownFilters
          title="Delivery event drilldown"
          filters={[
            { label: "All events", href: eventViewHref("all"), active: eventView === "all", count: recentEvents.length },
            { label: "Accepted / non-error", href: eventViewHref("accepted"), active: eventView === "accepted", count: acceptedEventRows.length },
            { label: "HTTP exceptions", href: eventViewHref("errors"), active: eventView === "errors", count: rejectedEvents }
          ]}
        />
        <OperationsInspectorTaskLinks
          title="Review tasks"
          tasks={[
            { label: "Review visible event history", href: "#build250-event-groups", detail: eventRows.length + " event(s) in the current drilldown.", state: "ready" },
            { label: "Inspect consumer configuration", href: "#build250-consumer-table", detail: needsConfigCount + " consumer(s) need configuration review.", state: needsConfigCount ? "review" : "ready" },
            { label: "Review Comms Hub checks", href: "/integration-delivery/comms-hub", detail: "Source-side connection checks remain available.", state: "review" },
            { label: "QL-266 review", href: "#build250-ql266", detail: "Still UNDER REVIEW; not reactivated by Build 250.", state: "review" }
          ]}
        />
      </div>

      <div className="opsEventGroupLayout" id="build250-event-groups">
        <OperationsEventGroup
          title="Accepted / non-error events"
          entries={acceptedEventRows.slice(0, 8).map((event) => ({
            id: event.eventId,
            label: event.eventType,
            detail: event.target + " · " + event.validationCode + (event.httpStatus ? " · HTTP " + event.httpStatus : ""),
            timestamp: event.occurredAt.toLocaleString(),
            tone: "healthy" as const
          }))}
          emptyLabel="No accepted/non-error events are available in the current history."
        />
        <OperationsEventGroup
          title="HTTP exception events"
          entries={rejectedEventRows.slice(0, 8).map((event) => ({
            id: event.eventId,
            label: event.eventType,
            detail: event.target + " · " + event.validationCode + " · HTTP " + event.httpStatus,
            timestamp: event.occurredAt.toLocaleString(),
            tone: "critical" as const
          }))}
          emptyLabel="No HTTP exception events are available in the current history."
        />
      </div>

      <div className="opsScorecardGrid" id="build251-scorecards">
        <OperationsScorecard
          label="Consumer readiness"
          value={configuredCount + "/" + consumers.length}
          detail="Configured delivery consumers"
          meta={needsConfigCount + " configuration review(s) remaining"}
          tone={needsConfigCount ? "attention" : "healthy"}
        />
        <OperationsScorecard
          label="Delivery acceptance"
          value={recentEvents.length ? Math.round((acceptedEventRows.length / recentEvents.length) * 100) + "%" : "—"}
          detail={acceptedEventRows.length + " accepted/non-error acknowledgement(s)"}
          meta={recentEvents.length + " recent delivery event(s)"}
          tone={rejectedEvents ? "attention" : "healthy"}
        />
        <OperationsScorecard
          label="Exception load"
          value={rejectedEvents}
          detail="HTTP exception acknowledgements"
          meta={eventView === "errors" ? "Exception layer active" : "All event layers available"}
          tone={rejectedEvents ? "critical" : "healthy"}
        />
        <OperationsScorecard
          label="QL-266"
          value="UNDER REVIEW"
          detail="Owner-deferred integration gate"
          meta="No Build 251 reactivation"
          tone="info"
        />
      </div>

      <div className="opsBuild251Layout">
        <OperationsLayeredFilters
          title="System Status review layers"
          layers={[
            {
              label: "Consumer layer",
              options: [
                { label: "All", href: savedViewHref("all"), active: view === "all", count: consumers.length },
                { label: "Configured", href: savedViewHref("configured"), active: view === "configured", count: configuredCount },
                { label: "Needs review", href: savedViewHref("needs-config"), active: view === "needs-config", count: needsConfigCount }
              ]
            },
            {
              label: "Delivery layer",
              options: [
                { label: "All events", href: eventViewHref("all"), active: eventView === "all", count: recentEvents.length },
                { label: "Accepted", href: eventViewHref("accepted"), active: eventView === "accepted", count: acceptedEventRows.length },
                { label: "Exceptions", href: eventViewHref("errors"), active: eventView === "errors", count: rejectedEvents }
              ]
            }
          ]}
        />
        <OperationsInspectorCheckpoints
          title="Build 251 review checkpoints"
          checkpoints={[
            { label: "Recovery presets", detail: "Recovery preset definitions remain available and verifiable.", state: "complete" },
            { label: "Renewal filtering", detail: "Renewal recovery evidence supports all, 24-hour and 7-day filters.", state: "complete" },
            { label: "Receipt persistence", detail: "Receipt recovery evidence retains versioned storage and parse/serialize checks.", state: "complete" },
            { label: "QL-266 boundary", detail: "UNDER REVIEW; external testing stays deferred and disconnected.", state: "review" }
          ]}
        />
      </div>

      <div className="opsActivityLaneLayout" id="build251-activity-lanes">
        <OperationsActivityLane
          title="Accepted delivery activity"
          entries={acceptedEventRows.slice(0, 6).map((event) => ({
            id: event.eventId,
            label: event.eventType,
            detail: event.target + " · " + event.validationCode + (event.httpStatus ? " · HTTP " + event.httpStatus : ""),
            timestamp: event.occurredAt.toLocaleString(),
            state: "complete" as const
          }))}
          emptyLabel="No accepted delivery activity is available."
        />
        <OperationsActivityLane
          title="Exception delivery activity"
          entries={rejectedEventRows.slice(0, 6).map((event) => ({
            id: event.eventId,
            label: event.eventType,
            detail: event.target + " · " + event.validationCode + " · HTTP " + event.httpStatus,
            timestamp: event.occurredAt.toLocaleString(),
            state: "attention" as const
          }))}
          emptyLabel="No HTTP exception activity is available."
        />
      </div>

      <div className="opsBuild252HealthLayout" id="build252-health-summary">
        <OperationsHealthSummary
          title="Delivery health"
          items={[
            { label: "Consumer readiness", value: configuredCount + "/" + consumers.length, detail: needsConfigCount + " consumer(s) need review.", tone: needsConfigCount ? "attention" as const : "healthy" as const },
            { label: "Accepted delivery", value: recentEvents.length ? Math.round((acceptedEventRows.length / recentEvents.length) * 100) + "%" : "—", detail: acceptedEventRows.length + " accepted/non-error event(s).", tone: rejectedEvents ? "attention" as const : "healthy" as const },
            { label: "Exception pressure", value: rejectedEvents, detail: "HTTP exception acknowledgement(s).", tone: rejectedEvents ? "critical" as const : "healthy" as const },
            { label: "QL-266", value: "UNDER REVIEW", detail: "Review deferred; connection remains disconnected.", tone: "info" as const }
          ]}
        />
        <OperationsSegmentedView
          title="System Status segments"
          segments={[
            { label: "All consumers", href: savedViewHref("all"), active: view === "all", count: consumers.length, detail: "Entire configured scope" },
            { label: "Configured", href: savedViewHref("configured"), active: view === "configured", count: configuredCount, detail: "Ready configuration" },
            { label: "Needs review", href: savedViewHref("needs-config"), active: view === "needs-config", count: needsConfigCount, detail: "Configuration gaps" },
            { label: "Accepted", href: eventViewHref("accepted"), active: eventView === "accepted", count: acceptedEventRows.length, detail: "Non-error receipts" },
            { label: "Exceptions", href: eventViewHref("errors"), active: eventView === "errors", count: rejectedEvents, detail: "HTTP 4xx/5xx" }
          ]}
        />
      </div>

      <div className="opsBuild252WorkflowLayout" id="build252-workflow-timeline">
        <OperationsWorkflowTimeline
          title="Delivery review workflow"
          entries={[
            { id: "observe", label: "Observe delivery evidence", detail: recentEvents.length + " recent durable acknowledgement event(s) are available.", state: "complete", meta: last24hEvents.length + " event(s) in the last 24 hours" },
            { id: "segment", label: "Segment accepted and exception outcomes", detail: acceptedEventRows.length + " accepted/non-error and " + rejectedEvents + " exception event(s).", state: "complete", meta: eventView === "all" ? "All delivery segments visible" : "Segmented review active" },
            { id: "inspect", label: "Inspect configuration gaps", detail: needsConfigCount + " consumer configuration gap(s) remain.", state: needsConfigCount ? "current" : "complete", meta: configuredCount + "/" + consumers.length + " consumers configured" },
            { id: "handoff", label: "Preserve QL-266 review boundary", detail: "No Build 252 step activates external testing or connection gates.", state: "review", meta: "UNDER REVIEW · REVIEW_DEFERRED · DISCONNECTED" }
          ]}
        />
        <div className="opsInspectorHandoffGrid" id="build252-inspector-handoffs">
          <OperationsInspectorHandoffCard
            title="Configuration review"
            status={needsConfigCount ? "REVIEW REQUIRED" : "READY"}
            detail={needsConfigCount + " consumer(s) require configuration review before broader delivery work."}
            href={savedViewHref("needs-config")}
            actionLabel="Open configuration segment"
            tone={needsConfigCount ? "attention" : "healthy"}
          />
          <OperationsInspectorHandoffCard
            title="Exception review"
            status={rejectedEvents ? "ATTENTION" : "CLEAR"}
            detail={rejectedEvents + " HTTP exception acknowledgement(s) are visible in current history."}
            href={eventViewHref("errors")}
            actionLabel="Open exception segment"
            tone={rejectedEvents ? "critical" : "healthy"}
          />
          <OperationsInspectorHandoffCard
            title="QL-266 owner boundary"
            status="UNDER REVIEW"
            detail="Owner-deferred QL-266 remains disconnected and is not resumed by Build 252."
            href="#build250-ql266"
            actionLabel="Review QL-266 evidence"
            tone="info"
          />
        </div>
      </div>

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
        <article className="card" id="build250-ql266">
          <h3>QL-266</h3>
          <p>Deferred by owner direction and not reactivated in Build 250.</p>
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

      <div className="opsWorkflowLayout" id="build250-consumer-table">
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
