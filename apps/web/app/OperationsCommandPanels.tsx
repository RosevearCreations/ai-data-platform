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
