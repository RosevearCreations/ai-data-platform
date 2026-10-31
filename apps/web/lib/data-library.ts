import { listWorkspacesForUser, withUserDatabase } from "./database";

export const DATA_LIBRARY_TYPES = [
  "saved-scraper",
  "saved-template",
  "reviewed-dataset",
  "intelligence-module",
  "barcode-capture"
] as const;

export const DATA_LIBRARY_SORTS = [
  "updated-desc",
  "observed-desc",
  "title-asc",
  "workspace-asc",
  "type-asc"
] as const;

export const DATA_LIBRARY_COLUMNS = [
  "workspace",
  "type",
  "status",
  "observed",
  "updated",
  "source"
] as const;

export type DataLibraryType = (typeof DATA_LIBRARY_TYPES)[number];
export type DataLibrarySort = (typeof DATA_LIBRARY_SORTS)[number];
export type DataLibraryColumn = (typeof DATA_LIBRARY_COLUMNS)[number];

export interface DataLibraryQuery {
  workspaceId: string;
  type: DataLibraryType | "";
  search: string;
  sort: DataLibrarySort;
  from: string;
  to: string;
  columns: DataLibraryColumn[];
  page: number;
  pageSize: number;
}

export interface DataLibraryRecord {
  workspaceId: string;
  workspaceName: string;
  workspaceProfile: string;
  recordType: DataLibraryType;
  recordId: string;
  title: string;
  subtitle: string;
  sourceUrl: string;
  sourceLabel: string;
  observedAt: Date;
  updatedAt: Date;
  serverVersion: number | null;
  status: string;
  duplicate: boolean;
  deleted: boolean;
  provenance: Record<string, unknown>;
  normalized: Record<string, unknown>;
  raw: Record<string, unknown>;
  flags: string[];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateFilter(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function columnFilters(value: unknown): DataLibraryColumn[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const selected = raw.filter((item): item is DataLibraryColumn =>
    DATA_LIBRARY_COLUMNS.includes(item as DataLibraryColumn)
  );
  return selected.length ? [...new Set(selected)] : [...DATA_LIBRARY_COLUMNS];
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeDataLibraryQuery(input: {
  workspaceId?: unknown;
  type?: unknown;
  search?: unknown;
  sort?: unknown;
  from?: unknown;
  to?: unknown;
  columns?: unknown;
  page?: unknown;
  pageSize?: unknown;
}): DataLibraryQuery {
  const rawType = stringValue(input.type);
  const rawSort = stringValue(input.sort);
  return {
    workspaceId: stringValue(input.workspaceId).slice(0, 64),
    type: DATA_LIBRARY_TYPES.includes(rawType as DataLibraryType)
      ? (rawType as DataLibraryType)
      : "",
    search: stringValue(input.search).slice(0, 120),
    sort: DATA_LIBRARY_SORTS.includes(rawSort as DataLibrarySort)
      ? (rawSort as DataLibrarySort)
      : "updated-desc",
    from: dateFilter(input.from),
    to: dateFilter(input.to),
    columns: columnFilters(input.columns),
    page: Math.min(10_000, positiveInteger(input.page, 1)),
    pageSize: Math.min(50, positiveInteger(input.pageSize, 20))
  };
}

export function safeSourceHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function recordFlags(input: {
  duplicate: boolean;
  deleted: boolean;
  status: string;
}) {
  const flags: string[] = [];
  if (input.deleted) flags.push("tombstoned");
  if (input.duplicate) flags.push("duplicate");
  if (input.status === "pending") flags.push("review-pending");
  if (input.status === "rejected") flags.push("review-rejected");
  return flags;
}

function sqlParam(index: number) {
  return "$" + String(index);
}

const sortSql: Record<DataLibrarySort, string> = {
  "updated-desc": "updated_at desc, title asc",
  "observed-desc": "observed_at desc, title asc",
  "title-asc": "lower(title) asc, updated_at desc",
  "workspace-asc": "lower(workspace_name) asc, lower(title) asc",
  "type-asc": "record_type asc, lower(title) asc"
};

type LibraryRow = {
  workspace_id: string;
  workspace_name: string;
  workspace_profile: string;
  record_type: DataLibraryType;
  record_id: string;
  title: string;
  subtitle: string;
  source_url: string;
  source_label: string;
  observed_at: Date;
  updated_at: Date;
  server_version: string | number | null;
  status: string;
  duplicate: boolean;
  deleted: boolean;
  provenance: Record<string, unknown>;
  normalized: Record<string, unknown>;
  raw: Record<string, unknown>;
};

const recordsCte = `
  with records as (
    select
      w.id as workspace_id,
      w.name as workspace_name,
      p.name as workspace_profile,
      case when s.kind='template' then 'saved-template' else 'saved-scraper' end as record_type,
      s.scraper_id as record_id,
      s.name as title,
      coalesce(nullif(s.source_origin,''), s.kind) as subtitle,
      s.source_url,
      s.source_origin as source_label,
      s.client_updated_at as observed_at,
      s.updated_at,
      s.server_version,
      case when s.deleted_at is null then 'active' else 'deleted' end as status,
      false as duplicate,
      s.deleted_at is not null as deleted,
      jsonb_build_object(
        'sourceUrl',s.source_url,
        'sourceOrigin',s.source_origin,
        'clientUpdatedAt',s.client_updated_at,
        'createdAt',s.created_at
      ) as provenance,
      jsonb_build_object(
        'name',s.name,
        'kind',s.kind,
        'sourceOrigin',s.source_origin,
        'serverVersion',s.server_version,
        'deletedAt',s.deleted_at
      ) as normalized,
      s.payload as raw
    from app.workspace_saved_scrapers s
    join app.workspaces w on w.id=s.workspace_id
    join app.workspace_profiles p on p.profile_key=w.profile_key

    union all

    select
      w.id,
      w.name,
      p.name,
      'reviewed-dataset',
      d.dataset_id,
      d.recipe_name,
      d.row_count::text || ' reviewed row(s)',
      d.source_url,
      'reviewed extraction',
      d.retrieved_at,
      d.updated_at,
      d.server_version,
      case when d.deleted_at is null then 'active' else 'deleted' end,
      false,
      d.deleted_at is not null,
      jsonb_build_object(
        'sourceUrl',d.source_url,
        'retrievedAt',d.retrieved_at,
        'clientUpdatedAt',d.client_updated_at,
        'createdAt',d.created_at
      ),
      jsonb_build_object(
        'recipeName',d.recipe_name,
        'rowCount',d.row_count,
        'retrievedAt',d.retrieved_at,
        'serverVersion',d.server_version,
        'deletedAt',d.deleted_at
      ),
      d.payload
    from app.workspace_reviewed_datasets d
    join app.workspaces w on w.id=d.workspace_id
    join app.workspace_profiles p on p.profile_key=w.profile_key

    union all

    select
      w.id,
      w.name,
      p.name,
      'intelligence-module',
      i.module_key,
      i.module_key,
      'Durable intelligence module',
      coalesce(i.payload->>'sourceUrl',''),
      'workspace intelligence',
      i.client_updated_at,
      i.updated_at,
      i.server_version,
      'active',
      false,
      false,
      jsonb_build_object(
        'moduleKey',i.module_key,
        'clientUpdatedAt',i.client_updated_at,
        'createdAt',i.created_at
      ),
      i.summary,
      i.payload
    from app.workspace_intelligence_modules i
    join app.workspaces w on w.id=i.workspace_id
    join app.workspace_profiles p on p.profile_key=w.profile_key

    union all

    select
      w.id,
      w.name,
      p.name,
      'barcode-capture',
      b.capture_id::text,
      b.normalized_code,
      b.target || ' · ' || b.barcode_format,
      '',
      b.capture_method,
      b.captured_at,
      b.updated_at,
      null::bigint,
      b.review_status,
      b.match_status='duplicate',
      false,
      b.provenance,
      jsonb_build_object(
        'normalizedCode',b.normalized_code,
        'barcodeFormat',b.barcode_format,
        'target',b.target,
        'matchStatus',b.match_status,
        'reviewStatus',b.review_status,
        'reviewedAt',b.reviewed_at
      ),
      jsonb_build_object(
        'rawCode',b.raw_code,
        'matchPayload',b.match_payload
      )
    from app.workspace_barcode_captures b
    join app.workspaces w on w.id=b.workspace_id
    join app.workspace_profiles p on p.profile_key=w.profile_key
  )
`;

export async function listUnifiedDataLibrary(
  userId: string,
  input: DataLibraryQuery
) {
  const query = normalizeDataLibraryQuery(input);
  const result = await withUserDatabase(userId, async (client) => {
    const values: unknown[] = [];
    const conditions: string[] = [];

    if (query.workspaceId) {
      values.push(query.workspaceId);
      conditions.push("workspace_id = " + sqlParam(values.length));
    }
    if (query.type) {
      values.push(query.type);
      conditions.push("record_type = " + sqlParam(values.length));
    }
    if (query.search) {
      values.push("%" + query.search.toLowerCase() + "%");
      conditions.push(
        "lower(concat_ws(' ',workspace_name,title,subtitle,source_url,source_label,normalized::text,raw::text)) like " + sqlParam(values.length)
      );
    }
    if (query.from) {
      values.push(query.from);
      conditions.push("updated_at >= " + sqlParam(values.length) + "::date");
    }
    if (query.to) {
      values.push(query.to);
      conditions.push("updated_at < (" + sqlParam(values.length) + "::date + interval '1 day')");
    }

    const where = conditions.length ? " where " + conditions.join(" and ") : "";
    const countResult = await client.query<{ count: string }>(
      recordsCte + ` select count(*)::text as count from records${where}`,
      values
    );
    const total = Number(countResult.rows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const effectivePage = Math.min(query.page, totalPages);
    const offset = (effectivePage - 1) * query.pageSize;

    const pageValues = [...values, query.pageSize, offset];
    const rowsResult = await client.query<LibraryRow>(
      recordsCte +
        ` select * from records${where} order by ${sortSql[query.sort]} limit ` + sqlParam(pageValues.length - 1) + " offset " + sqlParam(pageValues.length),
      pageValues
    );

    return {
      total,
      totalPages,
      effectivePage,
      rows: rowsResult.rows
    };
  });

  const workspaces = await listWorkspacesForUser(userId);

  return {
    query: {
      ...query,
      page: result.effectivePage
    },
    workspaces,
    total: result.total,
    totalPages: result.totalPages,
    records: result.rows.map((row): DataLibraryRecord => ({
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      workspaceProfile: row.workspace_profile,
      recordType: row.record_type,
      recordId: row.record_id,
      title: row.title,
      subtitle: row.subtitle,
      sourceUrl: row.source_url,
      sourceLabel: row.source_label,
      observedAt: row.observed_at,
      updatedAt: row.updated_at,
      serverVersion:
        row.server_version === null ? null : Number(row.server_version),
      status: row.status,
      duplicate: row.duplicate,
      deleted: row.deleted,
      provenance: row.provenance ?? {},
      normalized: row.normalized ?? {},
      raw: row.raw ?? {},
      flags: recordFlags({
        duplicate: row.duplicate,
        deleted: row.deleted,
        status: row.status
      })
    }))
  };
}
