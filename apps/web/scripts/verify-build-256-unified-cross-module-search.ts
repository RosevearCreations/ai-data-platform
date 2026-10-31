import { readFile } from "node:fs/promises";

import {
  UNIFIED_SEARCH_SCOPES,
  normalizeUnifiedSearchScope
} from "../lib/unified-search";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  ensure(UNIFIED_SEARCH_SCOPES.join(",")==="all,navigation,data,approved,collection,intelligence,integrations,workspace,help","Build 256 scopes");
  ensure(normalizeUnifiedSearchScope("collection")==="collection","valid scope");
  ensure(normalizeUnifiedSearchScope("hidden-admin")==="all","invalid scope fails safe");

  const [shell,nav,searchLib,searchPage,palette,help,css,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../lib/application-navigation.ts"),
    source("../lib/unified-search.ts"),
    source("../app/search/page.tsx"),
    source("../app/OperatorCommandPalette.tsx"),
    source("../app/help/help-content.ts"),
    source("../app/globals.css"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build256-review.json"),
    source("../../../docs/BUILD_256_UNIFIED_CROSS_MODULE_SEARCH.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(shell.includes("Build 256 · Operations Command"),"Build 256 shell marker");
  ensure(shell.includes("Build 255 · Operations Command"),"Build 255 compatibility marker");
  ensure(shell.includes('href="/search">Search</Link>'),"topbar Search link");
  ensure(nav.includes('href: "/search"')&&nav.includes('label: "Unified Search"'),"registered search destination");

  for(const token of [
    "listUnifiedDataLibrary",
    "listApprovedDatasetPublishingForUser",
    "listCollectionProjectsForUser",
    "listCollectionRunConsoleForUser",
    "listVisualRecipesForUser",
    "listIntelligenceOverviewForUser",
    "listIntegrationDeliveryOverviewForUser",
    "listWorkspacesForUser"
  ]) ensure(searchLib.includes(token),"authorized source "+token);

  ensure(searchLib.includes("withUserDatabase")===false,"Build 256 must reuse source read models instead of creating a privileged database path");
  ensure(searchLib.includes("HELP_TOPICS")&&searchLib.includes("APPLICATION_NAVIGATION"),"static help/navigation search");
  ensure(searchPage.includes("Unified Search & Results Explorer"),"results explorer title");
  ensure(searchPage.includes("Search only what we are authorized to see"),"authorization explanation");
  ensure(searchPage.includes("Open in source context"),"context navigation");
  ensure(searchPage.includes("Search never broadens workspace access"),"empty-state authorization boundary");

  ensure(palette.includes("searchOperatorCommandTargets"),"Ctrl-K navigation search retained");
  ensure(!palette.includes("buildUnifiedCrossModuleSearch"),"Ctrl-K must not query business records");
  ensure(help.includes('"unified-search": {'),"unified search help topic");
  ensure(css.includes("Build 256 — Unified Cross-Module Search, Results Explorer & Context Navigation"),"Build 256 styles");
  ensure(pkg.includes("verify-build-256-unified-cross-module-search.ts"),"Build 256 verifier registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===256,"build");
  ensure(status.source_A_sha==="417f1e305405cab245ead9b31ea5b0c2e3350efe","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41245345473","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.search_scope.unified_results_explorer===true,"search explorer");
  ensure(status.search_scope.separate_search_database===false,"no second search database");
  ensure(status.search_scope.command_palette_remains_navigation_only===true,"palette boundary");
  ensure(status.authorization.existing_user_scoped_read_models===true&&status.authorization.rls_preserved===true,"authorization");
  ensure(status.authorization.mutation_from_search===false,"read-only search");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.next_build===257,"next build");

  const lower=doc.toLowerCase();
  for(const token of ["unified results explorer","authorization boundary","command palette boundary","row-level security","under_review","disconnected","build 257"]) ensure(lower.includes(token),"doc "+token);
  ensure(queue.includes("Build 256 — Unified Cross-Module Search, Results Explorer & Context Navigation"),"queue Build 256");
  ensure(queue.includes("Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces"),"queue Build 257");

  console.log("Build 256 unified cross-module search, results explorer and context navigation verification passed; existing authorization is preserved and QL-266 remains under review.");
}
void main();
