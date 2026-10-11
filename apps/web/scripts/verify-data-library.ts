import {
  DATA_LIBRARY_SORTS,
  DATA_LIBRARY_TYPES,
  normalizeDataLibraryQuery,
  recordFlags,
  safeSourceHref
} from "../lib/data-library";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const normalized = normalizeDataLibraryQuery({
  workspaceId: "  workspace-1 ",
  type: "barcode-capture",
  search: "  Supplier Price ",
  sort: "observed-desc",
  page: "3",
  pageSize: "50"
});
assert(normalized.workspaceId === "workspace-1", "workspace filters must normalize");
assert(normalized.type === "barcode-capture", "known library type must survive");
assert(normalized.search === "Supplier Price", "search must trim");
assert(normalized.sort === "observed-desc", "known sort must survive");
assert(normalized.page === 3 && normalized.pageSize === 50, "valid pagination must survive");

const bounded = normalizeDataLibraryQuery({
  type: "not-real",
  sort: "not-real",
  page: "-2",
  pageSize: "500"
});
assert(bounded.type === "", "unknown type must fail closed to all supported types");
assert(bounded.sort === "updated-desc", "unknown sort must use deterministic default");
assert(bounded.page === 1, "invalid page must use page one");
assert(bounded.pageSize === 50, "page size must be capped");
assert(DATA_LIBRARY_TYPES.length === 5, "Build 044 must retain all five unified record types");
assert(DATA_LIBRARY_SORTS.length === 5, "Build 044 must retain deterministic sort options");

const flags = recordFlags({ duplicate: true, deleted: true, status: "pending" });
assert(flags.includes("duplicate"), "duplicate records must be visibly flagged");
assert(flags.includes("tombstoned"), "deleted sync records must remain visibly tombstoned");
assert(flags.includes("review-pending"), "pending review records must be visible");
assert(recordFlags({ duplicate: false, deleted: false, status: "active" }).length === 0,
  "healthy active records must not receive invented warning flags");

console.log("Build 044 data-library filters, pagination bounds and record-quality flags passed.");

assert(safeSourceHref("https://example.com/path") === "https://example.com/path",
  "https source URLs must remain clickable");
assert(safeSourceHref("http://example.com/") === "http://example.com/",
  "http source URLs must remain clickable");
assert(safeSourceHref("javascript:alert(1)") === "",
  "non-http source references must never become clickable links");
assert(safeSourceHref("not a url") === "",
  "invalid source references must remain plain text");
