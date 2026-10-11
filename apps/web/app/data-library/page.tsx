import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  DATA_LIBRARY_SORTS,
  DATA_LIBRARY_TYPES,
  listUnifiedDataLibrary,
  normalizeDataLibraryQuery
} from "@/lib/data-library";

import { DataLibrarySavedViews } from "./DataLibrarySavedViews";
import { HelpInfo } from "../help/HelpInfo";

export const dynamic = "force-dynamic";

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function jsonPreview(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function pageHref(query: URLSearchParams, page: number) {
  const next = new URLSearchParams(query);
  next.set("page", String(page));
  return "/data-library?" + next.toString();
}

export default async function DataLibraryPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fdata-library");

  const params = await searchParams;
  const query = normalizeDataLibraryQuery({
    workspaceId: stringParam(params.workspace),
    type: stringParam(params.type),
    search: stringParam(params.q),
    sort: stringParam(params.sort),
    page: stringParam(params.page),
    pageSize: stringParam(params.pageSize)
  });
  const library = await listUnifiedDataLibrary(session.user.id, query);

  const currentQuery = new URLSearchParams();
  if (library.query.workspaceId) currentQuery.set("workspace", library.query.workspaceId);
  if (library.query.type) currentQuery.set("type", library.query.type);
  if (library.query.search) currentQuery.set("q", library.query.search);
  currentQuery.set("sort", library.query.sort);
  currentQuery.set("pageSize", String(library.query.pageSize));

  return (
    <main className="shell libraryShell">
      <section className="hero libraryHero">
        <HelpInfo topic="data-library-overview" />
        <p className="eyebrow">Build 044</p>
        <h1>Unified Data Library</h1>
        <p className="lead">
          Search and inspect authorized workspace records across extraction recipes,
          reviewed datasets, intelligence modules and barcode intake without copying
          them into a second store.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/intelligence">Intelligence</Link>
        </div>
      </section>

      <section className="libraryFilters" aria-labelledby="library-filter-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Find records</p>
          <h2 id="library-filter-heading">Filter & sort</h2>
          <HelpInfo topic="data-library-filters" />
        </div>
        <form method="get" className="libraryFilterGrid">
          <label>
            Workspace
            <select name="workspace" defaultValue={library.query.workspaceId}>
              <option value="">All authorized workspaces</option>
              {library.workspaces.map((workspace) => (
                <option value={workspace.id} key={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
          <label>
            Record type
            <select name="type" defaultValue={library.query.type}>
              <option value="">All record types</option>
              {DATA_LIBRARY_TYPES.map((type) => (
                <option value={type} key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input name="q" defaultValue={library.query.search} placeholder="Title, source, values…" maxLength={120} />
          </label>
          <label>
            Sort
            <select name="sort" defaultValue={library.query.sort}>
              {DATA_LIBRARY_SORTS.map((sort) => (
                <option value={sort} key={sort}>{sort}</option>
              ))}
            </select>
          </label>
          <label>
            Rows
            <select name="pageSize" defaultValue={String(library.query.pageSize)}>
              {[10,20,50].map((size) => <option value={size} key={size}>{size}</option>)}
            </select>
          </label>
          <button className="primary" type="submit">Apply</button>
        </form>
        <DataLibrarySavedViews currentQuery={currentQuery.toString()} />
      </section>

      <section className="libraryResults" aria-labelledby="library-results-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Record explorer</p>
          <h2 id="library-results-heading">{library.total} record(s)</h2>
          <HelpInfo topic="data-library-records" />
        </div>

        {library.records.length ? (
          <div className="libraryRecordList">
            {library.records.map((record) => (
              <article className="libraryRecord" key={record.workspaceId + ":" + record.recordType + ":" + record.recordId}>
                <div className="libraryRecordTop">
                  <div>
                    <span className="badge">{record.workspaceName} · {record.workspaceProfile}</span>
                    <h3>{record.title}</h3>
                    <p>{record.subtitle}</p>
                  </div>
                  <div className="libraryRecordMeta">
                    <span>{record.recordType}</span>
                    <span>{record.status}</span>
                    {record.serverVersion !== null ? <span>v{record.serverVersion}</span> : null}
                  </div>
                </div>

                <div className="libraryFlags">
                  {record.flags.map((flag) => <span key={flag}>{flag}</span>)}
                  {!record.flags.length ? <span className="libraryFlagOk">no warning flags</span> : null}
                </div>

                <dl className="libraryProvenanceSummary">
                  <div><dt>Record ID</dt><dd>{record.recordId}</dd></div>
                  <div><dt>Observed</dt><dd>{record.observedAt.toLocaleString()}</dd></div>
                  <div><dt>Updated</dt><dd>{record.updatedAt.toLocaleString()}</dd></div>
                  <div><dt>Source</dt><dd>{record.sourceLabel || "workspace record"}</dd></div>
                </dl>

                {record.sourceUrl ? (
                  <p className="librarySource">
                    Source: <a className="textLink" href={record.sourceUrl} rel="noreferrer" target="_blank">{record.sourceUrl}</a>
                  </p>
                ) : null}

                <details className="libraryDetails">
                  <summary>Explore record detail</summary>
                  <div className="libraryDetailGrid">
                    <section>
                      <h4>Normalized / summary</h4>
                      <pre>{jsonPreview(record.normalized)}</pre>
                    </section>
                    <section>
                      <h4>Raw durable payload</h4>
                      <pre>{jsonPreview(record.raw)}</pre>
                    </section>
                    <section>
                      <h4>Provenance</h4>
                      <pre>{jsonPreview(record.provenance)}</pre>
                    </section>
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            No authorized records match the current filters. Clearing the search or
            widening the workspace/type filter may reveal existing records.
          </div>
        )}

        <nav className="libraryPagination" aria-label="Data library pages">
          {library.query.page > 1 ? (
            <Link className="secondaryButton" href={pageHref(currentQuery, library.query.page - 1)}>Previous</Link>
          ) : <span />}
          <span>Page {library.query.page} of {library.totalPages}</span>
          {library.query.page < library.totalPages ? (
            <Link className="secondaryButton" href={pageHref(currentQuery, library.query.page + 1)}>Next</Link>
          ) : <span />}
        </nav>
      </section>
    </main>
  );
}
