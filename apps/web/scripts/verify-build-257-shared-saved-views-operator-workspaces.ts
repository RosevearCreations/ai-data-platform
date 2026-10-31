import { readFile } from "node:fs/promises";

import {
  MAX_OPERATOR_WORKSPACES,
  createOperatorWorkspaceProfile,
  migrateLegacyDataLibrarySavedViews,
  operatorWorkspaceHref,
  sanitizeOperatorWorkspaceProfiles,
  sanitizeOperatorWorkspaceQuery,
  upsertOperatorWorkspaceProfile
} from "../lib/operator-workspaces";
import {
  DATA_LIBRARY_COLUMNS,
  normalizeDataLibraryQuery
} from "../lib/data-library";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  ensure(MAX_OPERATOR_WORKSPACES===16,"profile cap");
  const query=sanitizeOperatorWorkspaceQuery("?workspace=workspace-1&q=supplier&sort=updated-desc&columns=workspace&columns=source&from=2026-10-01&to=2026-10-31");
  ensure(query.workspace==="workspace-1"&&query.q==="supplier"&&query.sort==="updated-desc","query sanitization");

  const profile=createOperatorWorkspaceProfile({
    id:"profile-1",
    name:"Supplier review",
    destination:"/data-library",
    destinationLabel:"Unified Data Library",
    query:"workspace=workspace-1&q=supplier&sort=updated-desc&columns=workspace&columns=source&from=2026-10-01&to=2026-10-31",
    workspaceId:"workspace-1",
    search:"supplier",
    sort:"updated-desc",
    visibleColumns:["workspace","source"],
    dateFrom:"2026-10-01",
    dateTo:"2026-10-31"
  });
  ensure(profile.workspaceId==="workspace-1","workspace context");
  ensure(profile.visibleColumns.join(",")==="workspace,source","visible columns");
  ensure(profile.dateRange.from==="2026-10-01"&&profile.dateRange.to==="2026-10-31","date range");
  ensure(operatorWorkspaceHref(profile).startsWith("/data-library?"),"reopen href");

  const updated=upsertOperatorWorkspaceProfile([],profile);
  ensure(updated.length===1&&updated[0]?.name==="Supplier review","profile upsert");
  ensure(sanitizeOperatorWorkspaceProfiles([{...profile,version:2}]).length===0,"unsupported profile version rejected");

  const migrated=migrateLegacyDataLibrarySavedViews([],JSON.stringify([{name:"Legacy view",query:"q=legacy&sort=title-asc"}]));
  ensure(migrated.length===1&&migrated[0]?.destination==="/data-library","legacy migration");
  ensure(migrated[0]?.search==="legacy"&&migrated[0]?.sort==="title-asc","legacy state extraction");

  const dataQuery=normalizeDataLibraryQuery({
    workspaceId:" workspace-1 ",
    type:"reviewed-dataset",
    search:" supplier ",
    sort:"title-asc",
    from:"2026-10-01",
    to:"2026-10-31",
    columns:["workspace","updated","source"],
    page:1,
    pageSize:20
  });
  ensure(dataQuery.from==="2026-10-01"&&dataQuery.to==="2026-10-31","Data Library date range");
  ensure(dataQuery.columns.join(",")==="workspace,updated,source","Data Library visible columns");
  ensure(DATA_LIBRARY_COLUMNS.includes("source"),"Data Library column registry");

  const [shell,controls,manager,dlSaved,dlPage,dataLib,searchPage,nav,help,css,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperatorWorkspaceControls.tsx"),
    source("../app/operator-workspaces/page.tsx"),
    source("../app/data-library/DataLibrarySavedViews.tsx"),
    source("../app/data-library/page.tsx"),
    source("../lib/data-library.ts"),
    source("../app/search/page.tsx"),
    source("../lib/application-navigation.ts"),
    source("../app/help/help-content.ts"),
    source("../app/globals.css"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build257-review.json"),
    source("../../../docs/BUILD_257_SHARED_SAVED_VIEWS_OPERATOR_WORKSPACES.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(shell.includes("Build 257 · Operations Command"),"Build 257 shell");
  ensure(shell.includes("Build 256 · Operations Command"),"Build 256 compatibility");
  ensure(shell.includes("<OperatorWorkspaceMenu />"),"Operations Command workspace menu");
  ensure(controls.includes("OPERATOR_WORKSPACE_STORAGE_KEY")&&controls.includes("window.localStorage"),"browser-local storage");
  ensure(controls.includes("OperatorWorkspaceSavePanel")&&controls.includes("OperatorWorkspaceManager"),"shared controls");
  ensure(manager.includes("Operator Workspaces & Filter Profiles"),"manager screen");
  ensure(dlSaved.includes("migrateLegacyDataLibrarySavedViews")&&dlSaved.includes("LEGACY_STORAGE_KEY"),"legacy Data Library migration");
  ensure(dlPage.includes('type="date" name="from"')&&dlPage.includes('type="date" name="to"'),"Data Library date controls");
  ensure(dlPage.includes('select name="columns" multiple'),"Data Library visible-column control");
  ensure(dataLib.includes("updated_at >=")&&dataLib.includes("interval '1 day'"),"Data Library date query");
  ensure(searchPage.includes('destination="/search"')&&searchPage.includes("OperatorWorkspaceSavePanel"),"Unified Search saved view");
  ensure(nav.includes('href: "/operator-workspaces"'),"Operator Workspace navigation");
  ensure(help.includes('"operator-workspaces": {'),"Operator Workspace help");
  ensure(css.includes("Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces"),"Build 257 styles");
  ensure(pkg.includes("verify-build-257-shared-saved-views-operator-workspaces.ts"),"Build 257 verifier registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===257,"build");
  ensure(status.source_A_sha==="37697a9712df87677c4beb2ec38f7493a1c7b8d0","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41249471654","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.operator_workspaces.shared_saved_views===true&&status.operator_workspaces.filter_profiles===true,"saved views/profile scope");
  ensure(status.operator_workspaces.local_storage_only===true&&status.operator_workspaces.server_preference_table===false,"local-only storage");
  ensure(status.operator_workspaces.data_library_legacy_migration===true,"legacy migration status");
  ensure(status.authorization.navigation_state_only===true&&status.authorization.rls_preserved===true,"authorization boundary");
  ensure(status.authorization.role_change===false&&status.authorization.mutation_from_saved_view===false,"no authority mutation");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.next_build===258,"next build");

  const lower=doc.toLowerCase();
  for(const token of ["shared local profile contract","data library integration","unified search integration","operations command integration","authorization boundary","localstorage","under_review","disconnected","build 258"]) ensure(lower.includes(token),"doc "+token);
  ensure(queue.includes("Build 257 — Shared Saved Views, Filter Profiles & Operator Workspaces"),"queue Build 257");
  ensure(queue.includes("Build 258 — Operator Attention Center, Exception Inbox & Follow-Up Queue"),"queue Build 258");

  console.log("Build 257 shared saved views, filter profiles and Operator Workspaces verification passed; local view state preserves authorization and QL-266 remains under review.");
}
void main();
