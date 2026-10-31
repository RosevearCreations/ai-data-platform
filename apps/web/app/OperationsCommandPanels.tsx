import Link from "next/link";
import type { ReactNode } from "react";

export type OpsExceptionItem = {
  id: string;
  label: string;
  detail: string;
  tone?: "info" | "healthy" | "attention" | "critical";
  href?: string;
};

export type OpsTimelineEntry = {
  id: string;
  title: string;
  detail: string;
  timestamp?: string;
  tone?: "info" | "healthy" | "attention" | "critical";
};

export function OperationsActionDrawer({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="opsActionDrawer">
      <summary>
        <span>
          <small>Quick actions</small>
          <strong>{title}</strong>
        </span>
        <span aria-hidden="true">›</span>
      </summary>
      <div className="opsActionDrawerBody">
        <p>{description}</p>
        <div className="opsActionDrawerActions">{children}</div>
      </div>
    </details>
  );
}

export function OperationsExceptionQueue({
  title,
  items,
  emptyLabel = "No current exceptions."
}: {
  title: string;
  items: OpsExceptionItem[];
  emptyLabel?: string;
}) {
  return (
    <section className="opsExceptionQueue" aria-label={title}>
      <div className="opsPanelHeading">
        <span>Exception queue</span>
        <strong>{title}</strong>
      </div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li className={"opsExceptionItem opsTone--" + (item.tone ?? "attention")} key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
              {item.href ? <Link href={item.href}>Open</Link> : <span className="opsStatusText">Review</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="opsEmptyState">{emptyLabel}</p>
      )}
    </section>
  );
}

export function OperationsEvidenceTimeline({
  title,
  entries,
  emptyLabel = "No durable evidence has been recorded yet."
}: {
  title: string;
  entries: OpsTimelineEntry[];
  emptyLabel?: string;
}) {
  return (
    <section className="opsEvidenceTimeline" aria-label={title}>
      <div className="opsPanelHeading">
        <span>Evidence timeline</span>
        <strong>{title}</strong>
      </div>
      {entries.length ? (
        <ol>
          {entries.map((entry) => (
            <li className={"opsTimelineEntry opsTone--" + (entry.tone ?? "info")} key={entry.id}>
              <span className="opsTimelineDot" aria-hidden="true" />
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.detail}</p>
                {entry.timestamp ? <time>{entry.timestamp}</time> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="opsEmptyState">{emptyLabel}</p>
      )}
    </section>
  );
}

export function OpsDrawerLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="secondaryButton" href={href}>{children}</Link>;
}


export function OperationsStatusBadge({
  tone = "info",
  children
}: {
  tone?: "info" | "healthy" | "attention" | "critical";
  children: ReactNode;
}) {
  return <span className={"opsStatusBadge opsTone--" + tone}>{children}</span>;
}

export type OpsTableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
};

export function OperationsDataTable<Row>({
  caption,
  rows,
  columns,
  rowKey,
  emptyLabel = "No records available."
}: {
  caption: string;
  rows: Row[];
  columns: OpsTableColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyLabel?: string;
}) {
  return (
    <div className="opsDataTableWrap">
      <table className="opsDataTable">
        <caption>{caption}</caption>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={columns.length}><span className="opsEmptyState">{emptyLabel}</span></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function OperationsInspector({
  title,
  eyebrow = "Inspector",
  children
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <aside className="opsInspector">
      <div className="opsPanelHeading"><span>{eyebrow}</span><strong>{title}</strong></div>
      <div className="opsInspectorBody">{children}</div>
    </aside>
  );
}


export function OperationsKpiCard({label,value,detail,tone="info"}:{label:string;value:ReactNode;detail?:ReactNode;tone?:"info"|"healthy"|"attention"|"critical"}) {
  return <article className={"opsKpiCard opsTone--"+tone}><span>{label}</span><strong>{value}</strong>{detail?<p>{detail}</p>:null}</article>;
}

export function OperationsFilterToolbar({children}:{children:ReactNode}) {
  return <div className="opsFilterToolbar" role="group" aria-label="Workflow filters">{children}</div>;
}

export function OperationsModuleGrid({children}:{children:ReactNode}) {
  return <div className="opsModuleGrid">{children}</div>;
}

export function OperationsDetailInspector({title,status="Under review",children}:{title:string;status?:string;children:ReactNode}) {
  return <aside className="opsDetailInspector"><div className="opsPanelHeading"><span>Detail inspector</span><strong>{title}</strong></div><OperationsStatusBadge tone="info">{status}</OperationsStatusBadge><div className="opsInspectorBody">{children}</div></aside>;
}


export function OperationsSearchPanel({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="opsSearchPanel" aria-label={title}>
      <div className="opsPanelHeading"><span>Search panel</span><strong>{title}</strong></div>
      {description ? <p>{description}</p> : null}
      <div className="opsSearchPanelBody">{children}</div>
    </section>
  );
}

export function OperationsActivitySummary({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: ReactNode; detail?: ReactNode; tone?: "info" | "healthy" | "attention" | "critical" }>;
}) {
  return (
    <section className="opsActivitySummary" aria-label={title}>
      <div className="opsPanelHeading"><span>Activity summary</span><strong>{title}</strong></div>
      <div className="opsActivitySummaryGrid">
        {items.map((item) => (
          <article className={"opsActivitySummaryItem opsTone--" + (item.tone ?? "info")} key={item.label}>
            <span>{item.label}</span><strong>{item.value}</strong>{item.detail ? <p>{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function OperationsStatusGroup({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: ReactNode; tone?: "info" | "healthy" | "attention" | "critical" }>;
}) {
  return (
    <section className="opsStatusGroup" aria-label={title}>
      <div className="opsPanelHeading"><span>Status group</span><strong>{title}</strong></div>
      <div className="opsStatusGroupItems">
        {items.map((item) => <OperationsStatusBadge tone={item.tone ?? "info"} key={item.label}>{item.label}: {item.value}</OperationsStatusBadge>)}
      </div>
    </section>
  );
}

export function OperationsInspectorWorkflow({
  title,
  steps
}: {
  title: string;
  steps: Array<{ label: string; detail: string; state?: "current" | "complete" | "pending" }>;
}) {
  return (
    <aside className="opsInspectorWorkflow">
      <div className="opsPanelHeading"><span>Inspector workflow</span><strong>{title}</strong></div>
      <ol>
        {steps.map((step) => (
          <li className={"opsWorkflowStep opsWorkflowStep--" + (step.state ?? "pending")} key={step.label}>
            <strong>{step.label}</strong><p>{step.detail}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}


export function OperationsSavedViews({
  title,
  views
}: {
  title: string;
  views: Array<{ label: string; href: string; active?: boolean; count?: number }>;
}) {
  return (
    <nav className="opsSavedViews" aria-label={title}>
      <div className="opsPanelHeading"><span>Saved views</span><strong>{title}</strong></div>
      <div className="opsSavedViewItems">
        {views.map((view) => (
          <Link className={view.active ? "active" : ""} href={view.href} key={view.href}>
            <span>{view.label}</span>{typeof view.count === "number" ? <strong>{view.count}</strong> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function OperationsQueueSummary({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; count: number; detail?: ReactNode; tone?: "info" | "healthy" | "attention" | "critical" }>;
}) {
  return (
    <section className="opsQueueSummary" aria-label={title}>
      <div className="opsPanelHeading"><span>Queue summary</span><strong>{title}</strong></div>
      <div className="opsQueueSummaryGrid">
        {items.map((item) => (
          <article className={"opsQueueSummaryItem opsTone--" + (item.tone ?? "info")} key={item.label}>
            <strong>{item.count}</strong><span>{item.label}</span>{item.detail ? <p>{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function OperationsEvidenceGroup({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="opsEvidenceGroup" aria-label={title}>
      <div className="opsPanelHeading"><span>Evidence group</span><strong>{title}</strong></div>
      <div className="opsEvidenceGroupBody">{children}</div>
    </section>
  );
}

export function OperationsContextInspector({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions: Array<{ label: string; href: string }>;
}) {
  return (
    <aside className="opsContextInspector">
      <div className="opsPanelHeading"><span>Contextual inspector</span><strong>{title}</strong></div>
      <p>{description}</p>
      <div className="opsContextInspectorActions">
        {actions.map((action) => <Link href={action.href} key={action.href}>{action.label}</Link>)}
      </div>
    </aside>
  );
}


export function OperationsComparisonCard({
  title,
  left,
  right,
  detail
}: {
  title: string;
  left: { label: string; value: ReactNode; tone?: "info" | "healthy" | "attention" | "critical" };
  right: { label: string; value: ReactNode; tone?: "info" | "healthy" | "attention" | "critical" };
  detail?: ReactNode;
}) {
  return (
    <article className="opsComparisonCard">
      <div className="opsPanelHeading"><span>Comparison</span><strong>{title}</strong></div>
      <div className="opsComparisonValues">
        <div className={"opsComparisonValue opsTone--" + (left.tone ?? "info")}><span>{left.label}</span><strong>{left.value}</strong></div>
        <div className={"opsComparisonValue opsTone--" + (right.tone ?? "info")}><span>{right.label}</span><strong>{right.value}</strong></div>
      </div>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function OperationsExceptionPivot({
  title,
  pivots
}: {
  title: string;
  pivots: Array<{ label: string; href: string; count: number; active?: boolean; tone?: "info" | "healthy" | "attention" | "critical" }>;
}) {
  return (
    <nav className="opsExceptionPivot" aria-label={title}>
      <div className="opsPanelHeading"><span>Exception pivot</span><strong>{title}</strong></div>
      <div className="opsExceptionPivotItems">
        {pivots.map((pivot) => (
          <Link className={(pivot.active ? "active " : "") + "opsTone--" + (pivot.tone ?? "info")} href={pivot.href} key={pivot.href}>
            <span>{pivot.label}</span><strong>{pivot.count}</strong>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function OperationsHistoryPanel({
  title,
  entries,
  emptyLabel = "No history available."
}: {
  title: string;
  entries: Array<{ id: string; label: string; detail: ReactNode; timestamp?: string; tone?: "info" | "healthy" | "attention" | "critical" }>;
  emptyLabel?: string;
}) {
  return (
    <section className="opsHistoryPanel" aria-label={title}>
      <div className="opsPanelHeading"><span>History panel</span><strong>{title}</strong></div>
      {entries.length ? <ol>{entries.map((entry) => (
        <li className={"opsHistoryEntry opsTone--" + (entry.tone ?? "info")} key={entry.id}>
          <div><strong>{entry.label}</strong><p>{entry.detail}</p></div>
          {entry.timestamp ? <time>{entry.timestamp}</time> : null}
        </li>
      ))}</ol> : <p className="opsEmptyState">{emptyLabel}</p>}
    </section>
  );
}

export function OperationsInspectorShortcuts({
  title,
  shortcuts
}: {
  title: string;
  shortcuts: Array<{ label: string; href: string; detail?: string }>;
}) {
  return (
    <aside className="opsInspectorShortcuts">
      <div className="opsPanelHeading"><span>Inspector shortcuts</span><strong>{title}</strong></div>
      <div className="opsInspectorShortcutItems">
        {shortcuts.map((shortcut) => (
          <Link href={shortcut.href} key={shortcut.href}>
            <strong>{shortcut.label}</strong>{shortcut.detail ? <span>{shortcut.detail}</span> : null}
          </Link>
        ))}
      </div>
    </aside>
  );
}


export function OperationsTrendCard({
  label,
  value,
  trend,
  detail,
  tone = "info"
}: {
  label: string;
  value: ReactNode;
  trend: ReactNode;
  detail?: ReactNode;
  tone?: "info" | "healthy" | "attention" | "critical";
}) {
  return (
    <article className={"opsTrendCard opsTone--" + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="opsTrendCardTrend">{trend}</div>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function OperationsDrilldownFilters({
  title,
  filters
}: {
  title: string;
  filters: Array<{ label: string; href: string; active?: boolean; count?: number }>;
}) {
  return (
    <nav className="opsDrilldownFilters" aria-label={title}>
      <div className="opsPanelHeading"><span>Drilldown filters</span><strong>{title}</strong></div>
      <div className="opsDrilldownFilterItems">
        {filters.map((filter) => (
          <Link className={filter.active ? "active" : ""} href={filter.href} key={filter.href}>
            <span>{filter.label}</span>{typeof filter.count === "number" ? <strong>{filter.count}</strong> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function OperationsEventGroup({
  title,
  entries,
  emptyLabel = "No events available."
}: {
  title: string;
  entries: Array<{ id: string; label: string; detail: ReactNode; timestamp?: string; tone?: "info" | "healthy" | "attention" | "critical" }>;
  emptyLabel?: string;
}) {
  return (
    <section className="opsEventGroup" aria-label={title}>
      <div className="opsPanelHeading"><span>Event group</span><strong>{title}</strong></div>
      {entries.length ? <div className="opsEventGroupItems">{entries.map((entry) => (
        <article className={"opsEventGroupItem opsTone--" + (entry.tone ?? "info")} key={entry.id}>
          <div><strong>{entry.label}</strong><p>{entry.detail}</p></div>
          {entry.timestamp ? <time>{entry.timestamp}</time> : null}
        </article>
      ))}</div> : <p className="opsEmptyState">{emptyLabel}</p>}
    </section>
  );
}

export function OperationsInspectorTaskLinks({
  title,
  tasks
}: {
  title: string;
  tasks: Array<{ label: string; href: string; detail?: string; state?: "ready" | "review" | "blocked" }>;
}) {
  return (
    <aside className="opsInspectorTaskLinks">
      <div className="opsPanelHeading"><span>Inspector tasks</span><strong>{title}</strong></div>
      <div className="opsInspectorTaskLinkItems">
        {tasks.map((task) => (
          <Link className={"opsInspectorTaskLink opsInspectorTaskLink--" + (task.state ?? "review")} href={task.href} key={task.href}>
            <strong>{task.label}</strong>
            {task.detail ? <span>{task.detail}</span> : null}
          </Link>
        ))}
      </div>
    </aside>
  );
}


export function OperationsScorecard({
  label,
  value,
  detail,
  meta,
  tone = "info"
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  tone?: "info" | "healthy" | "attention" | "critical";
}) {
  return (
    <article className={"opsScorecard opsTone--" + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
      {meta ? <small>{meta}</small> : null}
    </article>
  );
}

export function OperationsLayeredFilters({
  title,
  layers
}: {
  title: string;
  layers: Array<{
    label: string;
    options: Array<{ label: string; href: string; active?: boolean; count?: number }>;
  }>;
}) {
  return (
    <section className="opsLayeredFilters" aria-label={title}>
      <div className="opsPanelHeading"><span>Layered filters</span><strong>{title}</strong></div>
      <div className="opsLayeredFilterRows">
        {layers.map((layer) => (
          <div className="opsLayeredFilterRow" key={layer.label}>
            <strong>{layer.label}</strong>
            <div>
              {layer.options.map((option) => (
                <Link className={option.active ? "active" : ""} href={option.href} key={option.href}>
                  <span>{option.label}</span>
                  {typeof option.count === "number" ? <b>{option.count}</b> : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OperationsActivityLane({
  title,
  entries,
  emptyLabel = "No activity is available."
}: {
  title: string;
  entries: Array<{
    id: string;
    label: string;
    detail: ReactNode;
    timestamp?: string;
    state?: "complete" | "current" | "attention";
  }>;
  emptyLabel?: string;
}) {
  return (
    <section className="opsActivityLane" aria-label={title}>
      <div className="opsPanelHeading"><span>Activity lane</span><strong>{title}</strong></div>
      {entries.length ? (
        <ol>
          {entries.map((entry) => (
            <li className={"opsActivityLaneItem opsActivityLaneItem--" + (entry.state ?? "current")} key={entry.id}>
              <span className="opsActivityLaneDot" aria-hidden="true" />
              <div><strong>{entry.label}</strong><p>{entry.detail}</p>{entry.timestamp ? <time>{entry.timestamp}</time> : null}</div>
            </li>
          ))}
        </ol>
      ) : <p className="opsEmptyState">{emptyLabel}</p>}
    </section>
  );
}

export function OperationsInspectorCheckpoints({
  title,
  checkpoints
}: {
  title: string;
  checkpoints: Array<{
    label: string;
    detail: string;
    state?: "complete" | "current" | "review";
  }>;
}) {
  return (
    <aside className="opsInspectorCheckpoints">
      <div className="opsPanelHeading"><span>Inspector checkpoints</span><strong>{title}</strong></div>
      <ol>
        {checkpoints.map((checkpoint) => (
          <li className={"opsInspectorCheckpoint opsInspectorCheckpoint--" + (checkpoint.state ?? "review")} key={checkpoint.label}>
            <span aria-hidden="true">{checkpoint.state === "complete" ? "✓" : checkpoint.state === "current" ? "•" : "○"}</span>
            <div><strong>{checkpoint.label}</strong><p>{checkpoint.detail}</p></div>
          </li>
        ))}
      </ol>
    </aside>
  );
}


export function OperationsHealthSummary({
  title,
  items
}: {
  title: string;
  items: Array<{
    label: string;
    value: ReactNode;
    detail?: ReactNode;
    tone?: "info" | "healthy" | "attention" | "critical";
  }>;
}) {
  return (
    <section className="opsHealthSummary" aria-label={title}>
      <div className="opsPanelHeading"><span>Health summary</span><strong>{title}</strong></div>
      <div className="opsHealthSummaryItems">
        {items.map((item) => (
          <article className={"opsHealthSummaryItem opsTone--" + (item.tone ?? "info")} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.detail ? <p>{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function OperationsSegmentedView({
  title,
  segments
}: {
  title: string;
  segments: Array<{
    label: string;
    href: string;
    active?: boolean;
    count?: number;
    detail?: string;
  }>;
}) {
  return (
    <nav className="opsSegmentedView" aria-label={title}>
      <div className="opsPanelHeading"><span>Segmented view</span><strong>{title}</strong></div>
      <div className="opsSegmentedViewItems">
        {segments.map((segment) => (
          <Link className={segment.active ? "active" : ""} href={segment.href} key={segment.href}>
            <span><strong>{segment.label}</strong>{segment.detail ? <small>{segment.detail}</small> : null}</span>
            {typeof segment.count === "number" ? <b>{segment.count}</b> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function OperationsWorkflowTimeline({
  title,
  entries
}: {
  title: string;
  entries: Array<{
    id: string;
    label: string;
    detail: ReactNode;
    state?: "complete" | "current" | "review";
    meta?: ReactNode;
  }>;
}) {
  return (
    <section className="opsWorkflowTimeline" aria-label={title}>
      <div className="opsPanelHeading"><span>Workflow timeline</span><strong>{title}</strong></div>
      <ol>
        {entries.map((entry) => (
          <li className={"opsWorkflowTimelineItem opsWorkflowTimelineItem--" + (entry.state ?? "review")} key={entry.id}>
            <span className="opsWorkflowTimelineMarker" aria-hidden="true" />
            <div><strong>{entry.label}</strong><p>{entry.detail}</p>{entry.meta ? <small>{entry.meta}</small> : null}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OperationsInspectorHandoffCard({
  title,
  status,
  detail,
  href,
  actionLabel = "Open handoff",
  tone = "info"
}: {
  title: string;
  status: ReactNode;
  detail: ReactNode;
  href?: string;
  actionLabel?: string;
  tone?: "info" | "healthy" | "attention" | "critical";
}) {
  return (
    <article className={"opsInspectorHandoffCard opsTone--" + tone}>
      <div className="opsPanelHeading"><span>Inspector handoff</span><strong>{title}</strong></div>
      <div className="opsInspectorHandoffStatus">{status}</div>
      <p>{detail}</p>
      {href ? <Link href={href}>{actionLabel}</Link> : <span className="opsStatusText">{actionLabel}</span>}
    </article>
  );
}
