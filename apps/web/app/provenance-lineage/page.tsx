import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { buildProvenanceLineageExplorer, type ProvenanceLineageRecord } from "@/lib/provenance-lineage";

import { OperationsAreaBand } from "../OperationsCommandPanels";
import { OperatorWorkspaceSavePanel } from "../OperatorWorkspaceControls";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function tone(status: ProvenanceLineageRecord["status"]) {
  return status === "delivered" || status === "published" ? "healthy" :
    status === "approved" ? "info" : status === "reviewed" ? "attention" : "neutral";
}

export default async function ProvenanceLineagePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fprovenance-lineage");

  const params = await searchParams;
  const workspace = value(params.workspace);
  const status = value(params.status);
  const query = value(params.q).trim().toLowerCase().slice(0, 120);
  const model = await buildProvenanceLineageExplorer(session.user.id);

  const records = model.records.filter((item) => {
    if (workspace && item.workspaceId !== workspace) return false;
    if (status && item.status !== status) return false;
    if (!query) return true;
    return [
      item.title,
      item.datasetId,
      item.sourceUrl,
      item.recipeName,
      item.sourceFingerprint,
      ...item.stages.flatMap((stage) => [stage.label, stage.title, stage.detail, stage.evidenceId ?? "", stage.fingerprint ?? ""])
    ].join(" ").toLowerCase().includes(query);
  });

  const currentQuery = new URLSearchParams();
  if (workspace) currentQuery.set("workspace", workspace);
  if (status) currentQuery.set("status", status);
  if (query) currentQuery.set("q", query);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--frontEnd">
      <section className="hero">
        <p className="eyebrow">Build 260</p>
        <h1>Provenance & Data Lineage Explorer</h1>
        <p className="lead">
          Trace governed data from source and capture through recipe, collection evidence,
          review, approval, immutable publication and downstream delivery receipts.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-library">Data Library</Link>
          <Link className="secondaryButton" href="/data-review">Data Review</Link>
          <Link className="secondaryButton" href="/approved-data/delivery">Delivery receipts</Link>
        </div>
      </section>

      <OperationsAreaBand
        area="Front End"
        description="Read-only chain-of-custody reconstruction across existing RLS-scoped evidence. No lineage step approves, edits or delivers data."
        links={[
          { label: "Data Quality", href: "/data-quality" },
          { label: "Collection Runs", href: "/collection-runs" },
          { label: "Approved Data", href: "/approved-data" }
        ]}
      />

      <section className="opsKpiGrid" aria-label="Lineage summary">
        <article className="opsKpiCard opsTone--info"><span>Traces</span><strong>{model.totals.records}</strong><p>Current source versions</p></article>
        <article className="opsKpiCard opsTone--attention"><span>Reviewed</span><strong>{model.totals.reviewed}</strong><p>Review evidence, not yet approved</p></article>
        <article className="opsKpiCard opsTone--info"><span>Approved</span><strong>{model.totals.approved}</strong><p>Approved, not yet published</p></article>
        <article className="opsKpiCard opsTone--healthy"><span>Published</span><strong>{model.totals.published}</strong><p>Immutable Approved Data</p></article>
        <article className="opsKpiCard opsTone--healthy"><span>Delivered</span><strong>{model.totals.delivered}</strong><p>Accepted downstream receipt</p></article>
        <article className="opsKpiCard opsTone--neutral"><span>Transforms</span><strong>{model.totals.transforms}</strong><p>Reviewed field changes</p></article>
      </section>

      <OperatorWorkspaceSavePanel
        destination="/provenance-lineage"
        destinationLabel="Provenance & Data Lineage Explorer"
        currentQuery={currentQuery.toString()}
        workspaceId={workspace}
        search={query}
        sort="lineage"
        compact
      />

      <section className="dataQualityFilterPanel">
        <form method="get" action="/provenance-lineage" className="dataQualityFilters">
          <label>
            Workspace
            <select name="workspace" defaultValue={workspace}>
              <option value="">All authorized workspaces</option>
              {model.workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Furthest stage
            <select name="status" defaultValue={status}>
              <option value="">All stages</option>
              <option value="captured">Captured</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="delivered">Delivered</option>
            </select>
          </label>
          <label>
            Search evidence
            <input name="q" defaultValue={query} maxLength={120} placeholder="Dataset, fingerprint, receipt…" />
          </label>
          <button className="primary" type="submit">Apply</button>
          <Link className="secondaryButton" href="/provenance-lineage">Clear</Link>
        </form>
      </section>

      <section className="dataQualitySection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Chain of custody</p>
            <h2>{records.length} lineage trace{records.length === 1 ? "" : "s"}</h2>
          </div>
          <span>Live readback · {new Date(model.generatedAt).toLocaleString()}</span>
        </div>

        <div className="dataQualityList">
          {records.map((record) => (
            <article className={"dataQualityCard opsTone--" + tone(record.status)} key={record.id}>
              <div className="dataQualityCardHeader">
                <div>
                  <span className={"uiStatusPill uiStatusPill--" + tone(record.status)}>{record.status}</span>
                  <span className="badge">{record.workspaceName}</span>
                  <span className="badge">source v{record.sourceVersion}</span>
                </div>
                <strong>{record.stages.filter((stage) => stage.state === "complete").length}/8 linked</strong>
              </div>
              <h3>{record.title}</h3>
              <p>{record.datasetId} · {record.recipeName || "recipe not linked"}</p>
              <div className="dataQualityRuleGrid">
                {record.stages.map((stage) => (
                  <article key={stage.id}>
                    <span className={"uiStatusPill uiStatusPill--" + (stage.state === "complete" ? "healthy" : stage.state === "pending" ? "attention" : "neutral")}>{stage.state}</span>
                    <strong>{stage.label}</strong>
                    <p>{stage.title}</p>
                    <p>{stage.detail}</p>
                    {stage.timestamp ? <small>{new Date(stage.timestamp).toLocaleString()}</small> : null}
                    {stage.evidenceId ? <small>Evidence: {stage.evidenceId}</small> : null}
                    {stage.fingerprint ? <small title={stage.fingerprint}>Fingerprint: {stage.fingerprint.slice(0, 28)}…</small> : null}
                    <div><Link className="primaryLink" href={stage.href}>Open evidence</Link></div>
                  </article>
                ))}
              </div>
            </article>
          ))}
          {!records.length ? <article className="emptyState">No lineage trace matches these filters.</article> : null}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Lineage is reconstructed from evidence; it is not a new authority.</strong>
        <p>
          Build 260 performs read-only correlation across existing workspace-scoped records.
          Missing links stay visibly missing. It does not fabricate a collection run, approve a review,
          publish data, create a mapping, resend a delivery, or restart QL-266.
        </p>
      </section>
    </main>
  );
}
