import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  UNIFIED_SEARCH_SCOPES,
  buildUnifiedCrossModuleSearch,
  normalizeUnifiedSearchScope,
  type UnifiedSearchScope
} from "@/lib/unified-search";

import { HelpInfo } from "../help/HelpInfo";
import { OperationsAreaBand } from "../OperationsCommandPanels";
import { OperatorWorkspaceSavePanel } from "../OperatorWorkspaceControls";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<UnifiedSearchScope, string> = {
  all: "All",
  navigation: "Navigation",
  data: "Data",
  approved: "Approved",
  collection: "Collection",
  intelligence: "Intelligence",
  integrations: "Integrations",
  workspace: "Workspaces",
  help: "Help"
};

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function scopeHref(query: string, scope: UnifiedSearchScope) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (scope !== "all") params.set("scope", scope);
  const encoded = params.toString();
  return encoded ? "/search?" + encoded : "/search";
}

export default async function UnifiedSearchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?callbackUrl=%2Fsearch");

  const params = await searchParams;
  const query = stringParam(params.q).slice(0, 120);
  const scope = normalizeUnifiedSearchScope(stringParam(params.scope));
  const model = await buildUnifiedCrossModuleSearch(session.user.id, { query, scope });
  const currentQuery = new URLSearchParams();
  if (model.query) currentQuery.set("q", model.query);
  if (scope !== "all") currentQuery.set("scope", scope);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--management unifiedSearchShell">
      <section className="hero unifiedSearchHero">
        <HelpInfo topic="unified-search" />
        <p className="eyebrow">Build 256</p>
        <h1>Unified Search & Results Explorer</h1>
        <p className="lead">
          Search authorized records, approved data, collection work, recipes,
          intelligence, integration evidence, workspaces, help and navigation
          without copying records into a separate search store.
        </p>
      </section>

      <OperationsAreaBand
        area="Management"
        description="One read-only search surface across governed application context while existing workspace authorization remains authoritative."
        links={[
          { label: "Data Library", href: "/data-library" },
          { label: "Collection Runs", href: "/collection-runs" },
          { label: "System Status", href: "/integration-delivery" }
        ]}
      />

      <OperatorWorkspaceSavePanel
        destination="/search"
        destinationLabel="Unified Search"
        currentQuery={currentQuery.toString()}
        search={model.query}
        sort={scope}
        compact
      />

      <section className="unifiedSearchControls" aria-labelledby="unified-search-heading">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Cross-module search</p>
            <h2 id="unified-search-heading">Find records, evidence and destinations</h2>
          </div>
          <HelpInfo topic="unified-search" />
        </div>
        <form method="get" action="/search" className="unifiedSearchForm">
          <label>
            <span>Search</span>
            <input
              type="search"
              name="q"
              defaultValue={model.query}
              maxLength={120}
              placeholder="Workspace, record, project, recipe, evidence, help…"
              autoComplete="off"
            />
          </label>
          {scope !== "all" ? <input type="hidden" name="scope" value={scope} /> : null}
          <button type="submit">Search</button>
          {model.query ? <Link href="/search">Clear</Link> : null}
        </form>
      </section>

      {model.query ? (
        <>
          <nav className="unifiedSearchScopes" aria-label="Search result scopes">
            {UNIFIED_SEARCH_SCOPES.map((value) => {
              const count = value === "all" ? model.total : model.counts[value];
              return (
                <Link
                  className={scope === value ? "active" : ""}
                  href={scopeHref(model.query, value)}
                  aria-current={scope === value ? "page" : undefined}
                  key={value}
                >
                  <span>{SCOPE_LABELS[value]}</span>
                  <b>{count}</b>
                </Link>
              );
            })}
          </nav>

          <section className="unifiedSearchSummary" aria-live="polite">
            <strong>{model.results.length} visible result{model.results.length === 1 ? "" : "s"}</strong>
            <span>{model.total} match{model.total === 1 ? "" : "es"} across authorized search sources</span>
          </section>

          {model.results.length ? (
            <div className="unifiedSearchResults" aria-label="Unified search results">
              {model.results.map((item) => (
                <article className="unifiedSearchResult" key={item.id}>
                  <div className="unifiedSearchResultHeader">
                    <span>{SCOPE_LABELS[item.scope]}</span>
                    <small>{item.meta ?? item.kind}</small>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.detail}</p>
                  {item.workspaceName ? <div className="unifiedSearchWorkspace">{item.workspaceName}</div> : null}
                  <Link className="primaryLink" href={item.href}>
                    Open in source context
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <section className="uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral unifiedSearchEmpty">
              <h2>No matches in this scope</h2>
              <p>Try another scope or a broader term. Search never broadens workspace access.</p>
              {scope !== "all" ? <Link className="primaryLink" href={scopeHref(model.query, "all")}>Search all scopes</Link> : null}
            </section>
          )}
        </>
      ) : (
        <section className="unifiedSearchWelcome">
          <div>
            <h2>Search only what we are authorized to see</h2>
            <p>
              Build 256 composes existing RLS-scoped application read models. It
              does not create a second search database, change roles, expose hidden
              workspaces or authorize any workflow action.
            </p>
          </div>
          <div className="unifiedSearchSourceGrid">
            {[
              "Data Library & reviewed records",
              "Approved datasets & publications",
              "Collection projects, runs & recipes",
              "Intelligence & append-only evidence",
              "Integration delivery evidence",
              "Authorized workspaces",
              "Navigation destinations",
              "Help topics"
            ].map((label) => <span key={label}>{label}</span>)}
          </div>
        </section>
      )}
    </main>
  );
}
