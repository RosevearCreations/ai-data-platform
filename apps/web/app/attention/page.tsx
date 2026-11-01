import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  OPERATOR_ATTENTION_CATEGORIES,
  OPERATOR_ATTENTION_SEVERITIES,
  buildOperatorAttentionCenter,
  type OperatorAttentionCategory
} from "@/lib/operator-attention";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsAreaBand } from "../OperationsCommandPanels";
import { OperatorWorkspaceSavePanel } from "../OperatorWorkspaceControls";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<OperatorAttentionCategory, string> = {
  all: "All categories",
  governance: "Governance",
  collection: "Collection",
  connectors: "Connectors",
  review: "Data review",
  approval: "Approvals",
  integration: "Integrations",
  retention: "Retention",
  corrective: "Corrective"
};

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function tone(severity: "critical" | "attention" | "info") {
  return severity === "critical"
    ? "critical"
    : severity === "attention"
      ? "attention"
      : "info";
}

export default async function AttentionPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fattention");

  const params = await searchParams;
  const model = await buildOperatorAttentionCenter(session.user.id, {
    category: stringParam(params.category),
    severity: stringParam(params.severity),
    workspace: stringParam(params.workspace),
    query: stringParam(params.q)
  });

  const currentQuery = new URLSearchParams();
  if (model.filters.category !== "all") currentQuery.set("category", model.filters.category);
  if (model.filters.severity !== "all") currentQuery.set("severity", model.filters.severity);
  if (model.filters.workspace) currentQuery.set("workspace", model.filters.workspace);
  if (model.filters.query) currentQuery.set("q", model.filters.query);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--management attentionCenterShell">
      <section className="hero">
        <HelpInfo topic="operator-attention-center" />
        <p className="eyebrow">Build 258</p>
        <h1>Operator Attention Center</h1>
        <p className="lead">
          One live follow-up queue for measured failures, configuration gaps,
          pending reviews, stale approvals, connector problems, integration
          exceptions and retention decisions across authorized workspaces.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Operator Home</Link>
          <Link className="secondaryButton" href="/workflows">Workflow Directory</Link>
        </div>
      </section>

      <OperationsAreaBand
        area="Management"
        description="Prioritized exception intake assembled from existing governed read models; all follow-up actions continue in their source workflows."
        links={[
          { label: "Collection Runs", href: "/collection-runs" },
          { label: "Data Review", href: "/data-review" },
          { label: "System Status", href: "/integration-delivery" }
        ]}
      />

      <section className="attentionKpiGrid" aria-label="Attention summary">
        <article className="opsKpiCard opsTone--critical"><span>Critical</span><strong>{model.counts.critical}</strong><p>Failures or untriaged drift</p></article>
        <article className="opsKpiCard opsTone--attention"><span>Needs review</span><strong>{model.counts.attention}</strong><p>Operator decisions and blockers</p></article>
        <article className="opsKpiCard opsTone--info"><span>Follow-up</span><strong>{model.counts.info}</strong><p>Open work without a critical condition</p></article>
        <article className="opsKpiCard opsTone--info"><span>Workspaces</span><strong>{model.counts.workspaces}</strong><p>Authorized contexts represented</p></article>
      </section>

      <OperatorWorkspaceSavePanel
        destination="/attention"
        destinationLabel="Operator Attention Center"
        currentQuery={currentQuery.toString()}
        workspaceId={model.filters.workspace}
        search={model.filters.query}
        sort="priority"
        compact
      />

      <section className="attentionFilterPanel" aria-labelledby="attention-filter-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Exception inbox</p>
            <h2 id="attention-filter-heading">Filter follow-up queue</h2>
          </div>
          <HelpInfo topic="operator-attention-center" />
        </div>
        <form method="get" action="/attention" className="attentionFilterGrid">
          <label>
            <span>Category</span>
            <select name="category" defaultValue={model.filters.category}>
              {OPERATOR_ATTENTION_CATEGORIES.map((category) => (
                <option value={category} key={category}>
                  {CATEGORY_LABELS[category]}
                  {category === "all" ? "" : " (" + model.counts.byCategory[category] + ")"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select name="severity" defaultValue={model.filters.severity}>
              {OPERATOR_ATTENTION_SEVERITIES.map((severity) => (
                <option value={severity} key={severity}>
                  {severity === "all" ? "All priorities" : severity}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Workspace</span>
            <select name="workspace" defaultValue={model.filters.workspace}>
              <option value="">All represented workspaces</option>
              {model.workspaces.map((workspace) => (
                <option value={workspace.id} key={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input name="q" defaultValue={model.filters.query} maxLength={120} placeholder="Failure, review, connector…" />
          </label>
          <button className="primary" type="submit">Apply</button>
          <Link className="secondaryButton" href="/attention">Clear</Link>
        </form>
      </section>

      <section className="attentionQueueSection" aria-labelledby="attention-queue-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Follow-up queue</p>
            <h2 id="attention-queue-heading">
              {model.filteredItems.length} visible item{model.filteredItems.length === 1 ? "" : "s"}
            </h2>
          </div>
          <span className="attentionGenerated">Live readback · {new Date(model.generatedAt).toLocaleString()}</span>
        </div>

        {model.filteredItems.length ? (
          <div className="attentionQueueList">
            {model.filteredItems.map((item) => (
              <article className={"attentionQueueCard opsTone--" + tone(item.severity)} key={item.id}>
                <div className="attentionQueueHeader">
                  <div className="attentionQueueBadges">
                    <span className={"uiStatusPill uiStatusPill--" + tone(item.severity)}>{item.severity}</span>
                    <span className="badge">{CATEGORY_LABELS[item.category]}</span>
                    <span className="badge">{item.statusLabel}</span>
                  </div>
                  <small>{item.workspaceName}</small>
                </div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <div className="attentionQueueFooter">
                  <span>{item.ageDays === null ? "Current measured state" : item.ageDays === 0 ? "Observed today" : item.ageDays + " day(s) old"}</span>
                  <Link className="primaryLink" href={item.href}>{item.actionLabel}</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <article className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--healthy attentionEmpty">
            <span className="uiStatusPill uiStatusPill--healthy">Clear</span>
            <h3>No attention item matches these filters</h3>
            <p>Clear a filter to widen the queue. This screen does not hide or resolve source evidence.</p>
          </article>
        )}
      </section>

      <section className="attentionPolicyNote">
        <strong>Queue semantics</strong>
        <p>
          Items disappear only when their underlying measured condition changes in
          the source workflow. The Attention Center does not manufacture completion,
          acknowledge failures on our behalf, or change authorization.
          Approved-but-unpublished datasets become “stale” after {model.staleApprovalDays} days.
        </p>
      </section>
    </main>
  );
}
