import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  buildDataQualityWorkbench,
  type DataQualityAssessment,
  type DataQualityState
} from "@/lib/data-quality";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsAreaBand } from "../OperationsCommandPanels";
import { OperatorWorkspaceSavePanel } from "../OperatorWorkspaceControls";

export const dynamic = "force-dynamic";

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function stateParam(value: string | string[] | undefined): "all" | DataQualityState {
  const raw = stringParam(value);
  return raw === "healthy" || raw === "review" || raw === "poor" ? raw : "all";
}

function qualityTone(state: DataQualityState) {
  return state === "healthy" ? "healthy" : state === "poor" ? "critical" : "attention";
}

function FindingSummary({ quality }: { quality: DataQualityAssessment }) {
  if (!quality.findings.length) {
    return <span className="dataQualityClear">No automatic finding</span>;
  }
  return (
    <div className="dataQualityFindings">
      {quality.findings.map((finding) => (
        <span key={finding.ruleId} title={finding.detail}>
          {finding.label}: {finding.count}
        </span>
      ))}
    </div>
  );
}

export default async function DataQualityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fdata-quality");

  const params = await searchParams;
  const workspace = stringParam(params.workspace);
  const state = stateParam(params.state);
  const query = stringParam(params.q).trim().toLowerCase().slice(0, 120);
  const model = await buildDataQualityWorkbench(session.user.id);

  const datasets = model.datasets.filter((item) => {
    if (workspace && item.workspaceId !== workspace) return false;
    if (state !== "all" && item.quality.state !== state) return false;
    if (query) {
      const haystack = [
        item.title,
        item.workspaceName,
        item.datasetId,
        item.statusLabel,
        ...item.quality.findings.map((finding) => finding.label + " " + finding.detail)
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const batches = model.batches.filter((item) => {
    if (workspace && item.workspaceId !== workspace) return false;
    if (state !== "all" && item.quality.state !== state) return false;
    if (query) {
      const haystack = [
        item.title,
        item.workspaceName,
        item.reviewId,
        item.status,
        ...item.quality.findings.map((finding) => finding.label + " " + finding.detail)
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const currentQuery = new URLSearchParams();
  if (workspace) currentQuery.set("workspace", workspace);
  if (state !== "all") currentQuery.set("state", state);
  if (query) currentQuery.set("q", query);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--frontEnd dataQualityShell">
      <section className="hero">
        <HelpInfo topic="data-quality-workbench" />
        <p className="eyebrow">Build 259</p>
        <h1>Data Quality Workbench</h1>
        <p className="lead">
          Score current source snapshots and review batches against deterministic
          validation rules before Approved Data, while keeping correction and
          approval inside the governed Data Review workflow.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/data-review">Data Review</Link>
          <Link className="secondaryButton" href="/approved-data">Approved Data</Link>
          <Link className="secondaryButton" href="/attention">Attention Center</Link>
        </div>
      </section>

      <OperationsAreaBand
        area="Front End"
        description="Deterministic quality scoring, validation findings, duplicates and source-change signals before governed approval."
        links={[
          { label: "Data Library", href: "/data-library" },
          { label: "Data Review", href: "/data-review" },
          { label: "Approved Data", href: "/approved-data" }
        ]}
      />

      <section className="dataQualityKpiGrid" aria-label="Data quality summary">
        <article className="opsKpiCard opsTone--healthy"><span>Healthy</span><strong>{model.totals.healthy}</strong><p>90–100 quality score</p></article>
        <article className="opsKpiCard opsTone--attention"><span>Review</span><strong>{model.totals.review}</strong><p>70–89 quality score</p></article>
        <article className="opsKpiCard opsTone--critical"><span>Poor</span><strong>{model.totals.poor}</strong><p>Below 70 quality score</p></article>
        <article className="opsKpiCard opsTone--info"><span>Duplicate groups</span><strong>{model.totals.duplicateGroups}</strong><p>Exact cleaned-row groups</p></article>
        <article className="opsKpiCard opsTone--info"><span>Stale</span><strong>{model.totals.stale}</strong><p>Source/review age findings</p></article>
        <article className="opsKpiCard opsTone--info"><span>Changed</span><strong>{model.totals.unexpectedChanges}</strong><p>Newer version/fingerprint drift</p></article>
      </section>

      <OperatorWorkspaceSavePanel
        destination="/data-quality"
        destinationLabel="Data Quality Workbench"
        currentQuery={currentQuery.toString()}
        workspaceId={workspace}
        search={query}
        sort="quality"
        compact
      />

      <section className="dataQualityRulePanel" aria-labelledby="quality-rules-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Validation contract</p>
            <h2 id="quality-rules-heading">Active deterministic rules</h2>
          </div>
          <HelpInfo topic="data-quality-rules" />
        </div>
        <div className="dataQualityRuleGrid">
          {model.rules.map((rule) => (
            <article key={rule.id}>
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dataQualityFilterPanel">
        <form method="get" action="/data-quality" className="dataQualityFilters">
          <label>
            Workspace
            <select name="workspace" defaultValue={workspace}>
              <option value="">All authorized workspaces</option>
              {model.workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Quality state
            <select name="state" defaultValue={state}>
              <option value="all">All states</option>
              <option value="healthy">Healthy</option>
              <option value="review">Review</option>
              <option value="poor">Poor</option>
            </select>
          </label>
          <label>
            Search
            <input name="q" defaultValue={query} maxLength={120} placeholder="Dataset, rule or finding…" />
          </label>
          <button className="primary" type="submit">Apply</button>
          <Link className="secondaryButton" href="/data-quality">Clear</Link>
        </form>
      </section>

      <section className="dataQualitySection" aria-labelledby="quality-datasets-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Current source snapshots</p>
            <h2 id="quality-datasets-heading">{datasets.length} dataset assessment{datasets.length === 1 ? "" : "s"}</h2>
          </div>
          <span>Live readback · {new Date(model.generatedAt).toLocaleString()}</span>
        </div>
        <div className="dataQualityList">
          {datasets.map((item) => (
            <article className={"dataQualityCard opsTone--" + qualityTone(item.quality.state)} key={item.id}>
              <div className="dataQualityCardHeader">
                <div>
                  <span className={"uiStatusPill uiStatusPill--" + qualityTone(item.quality.state)}>{item.quality.state}</span>
                  <span className="badge">{item.workspaceName}</span>
                  <span className="badge">v{item.serverVersion}</span>
                </div>
                <strong>{item.quality.score}/100</strong>
              </div>
              <h3>{item.title}</h3>
              <p>{item.quality.rowCount} row(s) · {item.quality.fieldCount} field(s) · retrieved {new Date(item.retrievedAt).toLocaleString()}</p>
              <FindingSummary quality={item.quality} />
              {item.quality.duplicateGroups.length ? (
                <details>
                  <summary>Duplicate groups</summary>
                  {item.quality.duplicateGroups.map((group, index) => (
                    <p key={group.fingerprint}>Group {index + 1}: {group.rowIds.join(", ")}</p>
                  ))}
                </details>
              ) : null}
              <div className="dataQualityActions">
                <span>{item.reviewStatus ? "Review: " + item.reviewStatus : "Review not started"}</span>
                <Link className="primaryLink" href={item.href}>
                  {item.reviewId ? "Open Data Review" : "Start governed review"}
                </Link>
              </div>
            </article>
          ))}
          {!datasets.length ? <article className="emptyState">No source snapshot matches these filters.</article> : null}
        </div>
      </section>

      <section className="dataQualitySection" aria-labelledby="quality-batches-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Review snapshots</p>
            <h2 id="quality-batches-heading">{batches.length} review batch assessment{batches.length === 1 ? "" : "s"}</h2>
          </div>
          <HelpInfo topic="data-quality-workbench" />
        </div>
        <div className="dataQualityList">
          {batches.map((item) => (
            <article className={"dataQualityCard opsTone--" + qualityTone(item.quality.state)} key={item.id}>
              <div className="dataQualityCardHeader">
                <div>
                  <span className={"uiStatusPill uiStatusPill--" + qualityTone(item.quality.state)}>{item.quality.state}</span>
                  <span className="badge">{item.workspaceName}</span>
                  <span className="badge">{item.status}</span>
                </div>
                <strong>{item.quality.score}/100</strong>
              </div>
              <h3>{item.title}</h3>
              <p>Review v{item.sourceServerVersion} · updated {new Date(item.updatedAt).toLocaleString()}</p>
              <FindingSummary quality={item.quality} />
              <div className="dataQualityActions">
                <span>Quality assessment never changes the review decision.</span>
                <Link className="primaryLink" href={item.href}>Open Data Review</Link>
              </div>
            </article>
          ))}
          {!batches.length ? <article className="emptyState">No review batch matches these filters.</article> : null}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Quality is advisory, evidence remains authoritative.</strong>
        <p>
          Build 259 scores deterministic findings only. It does not silently fix
          source records, auto-exclude rows, approve data, or write Approved Data.
          Operators make corrections and approval decisions in Data Review with the
          original evidence still visible.
        </p>
      </section>
    </main>
  );
}
