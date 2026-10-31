export const OPERATOR_WORKSPACE_STORAGE_KEY =
  "ai-data-platform:operator-workspaces:v1";
export const OPERATOR_WORKSPACE_EVENT = "ai-data-platform:operator-workspaces-changed";
export const MAX_OPERATOR_WORKSPACES = 16;

export type OperatorWorkspaceDateRange = {
  from: string;
  to: string;
};

export type OperatorWorkspaceProfile = {
  version: 1;
  id: string;
  name: unknown;
  destination: unknown;
  destinationLabel: unknown;
  queryParams: Record<string, string>;
  workspaceId: string;
  search: string;
  sort: string;
  filters: Record<string, string>;
  visibleColumns: string[];
  dateRange: OperatorWorkspaceDateRange;
};

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanId(value: unknown) {
  return cleanText(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
}

function cleanDestination(value: unknown) {
  const path = cleanText(value, 180);
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) return "";
  return path;
}

function cleanDate(value: unknown) {
  const date = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function cleanColumns(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const item of raw) {
    const column = cleanText(item, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!column || seen.has(column)) continue;
    seen.add(column);
    columns.push(column);
    if (columns.length >= 16) break;
  }
  return columns;
}

export function sanitizeOperatorWorkspaceQuery(
  value: unknown
): Record<string, string> {
  let entries: Array<[string, string]> = [];
  if (typeof value === "string") {
    const params = new URLSearchParams(value.replace(/^\?/, "").slice(0, 2000));
    entries = [...params.entries()];
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    entries = Object.entries(value as Record<string, unknown>).flatMap(([key, raw]) =>
      typeof raw === "string" ? [[key, raw] as [string, string]] : []
    );
  }

  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = cleanText(rawKey, 40).replace(/[^a-zA-Z0-9_-]/g, "");
    const item = cleanText(rawValue, 240);
    if (!key || !item || key in result) continue;
    result[key] = item;
    if (Object.keys(result).length >= 20) break;
  }
  return result;
}

function structuredFilters(queryParams: Record<string, string>) {
  const excluded = new Set([
    "workspace","workspaceId","q","search","sort","columns","visibleColumns","from","to","page"
  ]);
  return Object.fromEntries(
    Object.entries(queryParams).filter(([key]) => !excluded.has(key)).slice(0, 12)
  );
}

export function createOperatorWorkspaceProfile(input: {
  id: string;
  name: string;
  destination: string;
  destinationLabel: string;
  query?: unknown;
  workspaceId?: unknown;
  search?: unknown;
  sort?: unknown;
  visibleColumns?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
}): OperatorWorkspaceProfile {
  const id = cleanId(input.id);
  const name = cleanText(input.name, 60);
  const destination = cleanDestination(input.destination);
  const destinationLabel = cleanText(input.destinationLabel, 60);
  if (!id || !name || !destination || !destinationLabel) {
    throw new Error("operator_workspace_invalid");
  }

  const queryParams = sanitizeOperatorWorkspaceQuery(input.query);
  const visibleColumns = cleanColumns(
    input.visibleColumns ??
      queryParams.columns ??
      queryParams.visibleColumns
  );
  const workspaceId = cleanText(
    input.workspaceId ?? queryParams.workspace ?? queryParams.workspaceId,
    80
  );
  const search = cleanText(input.search ?? queryParams.q ?? queryParams.search, 120);
  const sort = cleanText(input.sort ?? queryParams.sort, 60);
  const dateRange = {
    from: cleanDate(input.dateFrom ?? queryParams.from),
    to: cleanDate(input.dateTo ?? queryParams.to)
  };

  return {
    version: 1,
    id,
    name,
    destination,
    destinationLabel,
    queryParams,
    workspaceId,
    search,
    sort,
    filters: structuredFilters(queryParams),
    visibleColumns,
    dateRange
  };
}

export function sanitizeOperatorWorkspaceProfiles(
  value: unknown
): OperatorWorkspaceProfile[] {
  if (!Array.isArray(value)) return [];
  const result: OperatorWorkspaceProfile[] = [];
  const ids = new Set<string>();

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    if (record.version !== 1) continue;
    try {
      const profile = createOperatorWorkspaceProfile({
        id: String(record.id ?? ""),
        name: record.name,
        destination: record.destination,
        destinationLabel: record.destinationLabel,
        query: record.queryParams,
        workspaceId: record.workspaceId,
        search: record.search,
        sort: record.sort,
        visibleColumns: record.visibleColumns,
        dateFrom:
          record.dateRange && typeof record.dateRange === "object"
            ? (record.dateRange as Record<string, unknown>).from
            : "",
        dateTo:
          record.dateRange && typeof record.dateRange === "object"
            ? (record.dateRange as Record<string, unknown>).to
            : ""
      });
      if (ids.has(profile.id)) continue;
      ids.add(profile.id);
      result.push(profile);
      if (result.length >= MAX_OPERATOR_WORKSPACES) break;
    } catch {
      // Invalid local entries are ignored rather than widening the profile contract.
    }
  }
  return result;
}

export function upsertOperatorWorkspaceProfile(
  profiles: OperatorWorkspaceProfile[],
  profile: OperatorWorkspaceProfile
) {
  const safe = sanitizeOperatorWorkspaceProfiles(profiles);
  const next = safe.filter((item) => item.id !== profile.id && item.name.toLowerCase() !== profile.name.toLowerCase());
  return [profile, ...next].slice(0, MAX_OPERATOR_WORKSPACES);
}

export function removeOperatorWorkspaceProfile(
  profiles: OperatorWorkspaceProfile[],
  id: string
) {
  const safeId = cleanId(id);
  return sanitizeOperatorWorkspaceProfiles(profiles).filter((item) => item.id !== safeId);
}

export function operatorWorkspaceHref(profile: OperatorWorkspaceProfile) {
  const params = new URLSearchParams(profile.queryParams);
  if (profile.workspaceId && !params.has("workspace") && !params.has("workspaceId")) {
    params.set("workspace", profile.workspaceId);
  }
  if (profile.search && !params.has("q") && !params.has("search")) params.set("q", profile.search);
  if (profile.sort && !params.has("sort")) params.set("sort", profile.sort);
  params.delete("columns");
  params.delete("visibleColumns");
  profile.visibleColumns.forEach((column) => params.append("columns", column));
  if (profile.dateRange.from && !params.has("from")) params.set("from", profile.dateRange.from);
  if (profile.dateRange.to && !params.has("to")) params.set("to", profile.dateRange.to);
  const query = params.toString();
  return profile.destination + (query ? "?" + query : "");
}

export function migrateLegacyDataLibrarySavedViews(
  existing: OperatorWorkspaceProfile[],
  rawLegacy: unknown
) {
  const safe = sanitizeOperatorWorkspaceProfiles(existing);
  let value: unknown = rawLegacy;
  if (typeof rawLegacy === "string") {
    try {
      value = JSON.parse(rawLegacy);
    } catch {
      return safe;
    }
  }
  if (!Array.isArray(value)) return safe;

  let next = safe;
  value.slice(0, 12).forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const name = cleanText(record.name, 60);
    if (!name || typeof record.query !== "string") return;
    if (next.some((profile) => profile.destination === "/data-library" && profile.name.toLowerCase() === name.toLowerCase())) return;
    try {
      const profile = createOperatorWorkspaceProfile({
        id: "legacy-data-library-" + String(index + 1),
        name,
        destination: "/data-library",
        destinationLabel: "Unified Data Library",
        query: record.query
      });
      next = upsertOperatorWorkspaceProfile(next, profile);
    } catch {
      // Ignore malformed legacy views.
    }
  });
  return next;
}
