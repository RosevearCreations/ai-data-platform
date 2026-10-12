import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { listWorkspacesForUser, withUserDatabase } from "./database";

type JsonRecord = Record<string, unknown>;

export interface DataReviewRow {
  id: string;
  included: boolean;
  original: JsonRecord;
  cleaned: JsonRecord;
  changedFields: number;
  issues: string[];
  duplicateOf: string | null;
}

export interface DataReviewCandidate {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  datasetId: string;
  recipeName: string;
  sourceUrl: string;
  retrievedAt: string;
  serverVersion: number;
  rowCount: number;
  sourceFingerprint: string;
  reviewId: string | null;
  reviewStatus: string | null;
}

export interface DataReviewBatch {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  reviewId: string;
  sourceDatasetId: string;
  sourceServerVersion: number;
  sourceFingerprint: string;
  title: string;
  sourceUrl: string;
  status: "in-review" | "approved" | "rejected";
  rows: DataReviewRow[];
  rowCount: number;
  includedCount: number;
  cleanupSummary: JsonRecord;
  reviewNote: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  canApprove: boolean;
}

export interface DataReviewWorkbenchModel {
  workspaces: Array<{
    id: string;
    name: string;
    role: "owner" | "admin" | "member";
  }>;
  candidates: DataReviewCandidate[];
  batches: DataReviewBatch[];
  totals: {
    candidates: number;
    inReview: number;
    approved: number;
    rejected: number;
    rowsInReview: number;
  };
}

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : { value };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

function fingerprint(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function dataReviewSourceFingerprint(payload: JsonRecord) {
  return "drs1-" + fingerprint(payload);
}

function cleanValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim().replace(/\s+/g, " ");
  }
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, nested]) => [
        key,
        cleanValue(nested)
      ])
    );
  }
  return value;
}

function changedFieldCount(original: JsonRecord, cleaned: JsonRecord) {
  const keys = new Set([...Object.keys(original), ...Object.keys(cleaned)]);
  let changes = 0;
  for (const key of keys) {
    if (
      JSON.stringify(canonicalize(original[key])) !==
      JSON.stringify(canonicalize(cleaned[key]))
    ) {
      changes += 1;
    }
  }
  return changes;
}

function blankFieldCount(row: JsonRecord) {
  return Object.values(row).filter(
    (value) => typeof value === "string" && value.trim() === ""
  ).length;
}

export function buildDataReviewRows(payload: JsonRecord): DataReviewRow[] {
  const sourceRows = Array.isArray(payload.rows) ? payload.rows.slice(0, 500) : [];
  const seen = new Map<string, string>();

  return sourceRows.map((value, index) => {
    const original = jsonRecord(value);
    const cleaned = jsonRecord(cleanValue(original));
    const changedFields = changedFieldCount(original, cleaned);
    const id =
      "row-" +
      String(index + 1).padStart(3, "0") +
      "-" +
      fingerprint(original).slice(0, 10);
    const cleanedFingerprint = fingerprint(cleaned);
    const duplicateOf = seen.get(cleanedFingerprint) ?? null;
    if (!duplicateOf) seen.set(cleanedFingerprint, id);

    const issues: string[] = [];
    const blanks = blankFieldCount(cleaned);
    if (!Object.keys(cleaned).length) issues.push("empty-row");
    if (blanks) issues.push("blank-fields:" + String(blanks));
    if (changedFields) issues.push("cleanup-suggested:" + String(changedFields));
    if (duplicateOf) issues.push("duplicate-cleaned-row");

    return {
      id,
      included: !duplicateOf,
      original,
      cleaned,
      changedFields,
      issues,
      duplicateOf
    };
  });
}

export function summarizeDataReviewRows(rows: DataReviewRow[]) {
  return {
    rows: rows.length,
    included: rows.filter((row) => row.included).length,
    excluded: rows.filter((row) => !row.included).length,
    duplicateRows: rows.filter((row) => Boolean(row.duplicateOf)).length,
    cleanupRows: rows.filter((row) => row.changedFields > 0).length,
    issueRows: rows.filter((row) => row.issues.length > 0).length
  };
}

export function normalizeDataReviewEdits(
  currentRows: DataReviewRow[],
  input: unknown
): DataReviewRow[] {
  if (!Array.isArray(input) || input.length !== currentRows.length) {
    throw new Error("data_review_rows_mismatch");
  }
  const byId = new Map(currentRows.map((row) => [row.id, row]));
  const seen = new Set<string>();

  const next = input.map((value) => {
    const draft = jsonRecord(value);
    const id = typeof draft.id === "string" ? draft.id : "";
    if (!id || seen.has(id)) throw new Error("data_review_row_id_invalid");
    seen.add(id);
    const current = byId.get(id);
    if (!current) throw new Error("data_review_row_scope_invalid");
    if (!draft.cleaned || typeof draft.cleaned !== "object" || Array.isArray(draft.cleaned)) {
      throw new Error("data_review_cleaned_row_invalid");
    }
    const cleaned = draft.cleaned as JsonRecord;
    if (Buffer.byteLength(JSON.stringify(cleaned), "utf8") > 50_000) {
      throw new Error("data_review_row_too_large");
    }
    return {
      ...current,
      included: draft.included !== false,
      cleaned,
      changedFields: changedFieldCount(current.original, cleaned)
    };
  });

  if (next.some((row) => row.included) === false) {
    throw new Error("data_review_requires_included_row");
  }
  if (Buffer.byteLength(JSON.stringify(next), "utf8") > 900_000) {
    throw new Error("data_review_batch_too_large");
  }
  return next;
}

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    "select role from app.workspace_members where workspace_id=$1 and user_id=nullif(current_setting('app.user_id', true),'') limit 1",
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("data_review_admin_required");
  }
}

async function insertReviewEvent(
  client: PoolClient,
  input: {
    workspaceId: string;
    reviewId: string;
    action: "created" | "saved" | "approved" | "rejected";
    actorUserId: string;
    details?: JsonRecord;
  }
) {
  await client.query(
    `insert into app.workspace_data_review_events
      (workspace_id,event_id,review_id,action,actor_user_id,details)
      values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.reviewId,
      input.action,
      input.actorUserId,
      JSON.stringify(input.details ?? {})
    ]
  );
}

type CandidateRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  dataset_id: string;
  recipe_name: string;
  source_url: string;
  retrieved_at: Date;
  server_version: string | number;
  row_count: string | number;
  payload: JsonRecord;
};

type BatchRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  review_id: string;
  source_dataset_id: string;
  source_server_version: string | number;
  source_fingerprint: string;
  title: string;
  source_url: string;
  status: "in-review" | "approved" | "rejected";
  working_rows: DataReviewRow[];
  row_count: string | number;
  included_count: string | number;
  cleanup_summary: JsonRecord;
  review_note: string;
  approved_by: string | null;
  approved_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
  event_count: string | number;
};

function batchFromRow(
  row: BatchRow,
  role: "owner" | "admin" | "member"
): DataReviewBatch {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    reviewId: row.review_id,
    sourceDatasetId: row.source_dataset_id,
    sourceServerVersion: Number(row.source_server_version),
    sourceFingerprint: row.source_fingerprint,
    title: row.title,
    sourceUrl: row.source_url,
    status: row.status,
    rows: Array.isArray(row.working_rows) ? row.working_rows : [],
    rowCount: Number(row.row_count),
    includedCount: Number(row.included_count),
    cleanupSummary: row.cleanup_summary ?? {},
    reviewNote: row.review_note ?? "",
    approvedBy: row.approved_by,
    approvedAt: row.approved_at?.toISOString() ?? null,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    eventCount: Number(row.event_count),
    canApprove: role === "owner" || role === "admin"
  };
}

export async function listDataReviewWorkbenchForUser(
  userId: string
): Promise<DataReviewWorkbenchModel> {
  const workspaces = await listWorkspacesForUser(userId);
  const roleByWorkspace = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.role])
  );

  const result = await withUserDatabase(userId, async (client) => {
    const candidates = await client.query<CandidateRow>(
      `select
        d.workspace_id,
        w.name as workspace_name,
        d.dataset_id,
        d.recipe_name,
        d.source_url,
        d.retrieved_at,
        d.server_version,
        d.row_count,
        d.payload
      from app.workspace_reviewed_datasets d
      join app.workspaces w on w.id=d.workspace_id
      where d.deleted_at is null
      order by d.updated_at desc
      limit 250`
    );
    const batches = await client.query<BatchRow>(
      `select
        b.*,
        w.name as workspace_name,
        (select count(*) from app.workspace_data_review_events e
          where e.workspace_id=b.workspace_id and e.review_id=b.review_id)::int as event_count
      from app.workspace_data_review_batches b
      join app.workspaces w on w.id=b.workspace_id
      order by b.updated_at desc
      limit 100`
    );
    return { candidates: candidates.rows, batches: batches.rows };
  });

  const batches = result.batches.map((row) =>
    batchFromRow(
      row,
      (roleByWorkspace.get(row.workspace_id) ?? "member") as
        | "owner"
        | "admin"
        | "member"
    )
  );
  const bySourceVersion = new Map(
    batches.map((batch) => [
      batch.workspaceId + ":" + batch.sourceDatasetId + ":" + batch.sourceServerVersion,
      batch
    ])
  );

  const candidates = result.candidates.map((row): DataReviewCandidate => {
    const sourceFingerprint = dataReviewSourceFingerprint(row.payload ?? {});
    const existing = bySourceVersion.get(
      row.workspace_id + ":" + row.dataset_id + ":" + Number(row.server_version)
    );
    return {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role: (roleByWorkspace.get(row.workspace_id) ?? "member") as
        | "owner"
        | "admin"
        | "member",
      datasetId: row.dataset_id,
      recipeName: row.recipe_name,
      sourceUrl: row.source_url,
      retrievedAt: row.retrieved_at.toISOString(),
      serverVersion: Number(row.server_version),
      rowCount: Number(row.row_count),
      sourceFingerprint,
      reviewId:
        existing?.sourceFingerprint === sourceFingerprint ? existing.reviewId : null,
      reviewStatus:
        existing?.sourceFingerprint === sourceFingerprint ? existing.status : null
    };
  });

  return {
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role
    })),
    candidates,
    batches,
    totals: {
      candidates: candidates.length,
      inReview: batches.filter((batch) => batch.status === "in-review").length,
      approved: batches.filter((batch) => batch.status === "approved").length,
      rejected: batches.filter((batch) => batch.status === "rejected").length,
      rowsInReview: batches
        .filter((batch) => batch.status === "in-review")
        .reduce((sum, batch) => sum + batch.includedCount, 0)
    }
  };
}

export async function createDataReviewBatch(
  userId: string,
  workspaceId: string,
  datasetId: string
) {
  return withUserDatabase(userId, async (client) => {
    const source = await client.query<CandidateRow>(
      `select
        d.workspace_id,
        w.name as workspace_name,
        d.dataset_id,
        d.recipe_name,
        d.source_url,
        d.retrieved_at,
        d.server_version,
        d.row_count,
        d.payload
      from app.workspace_reviewed_datasets d
      join app.workspaces w on w.id=d.workspace_id
      where d.workspace_id=$1 and d.dataset_id=$2 and d.deleted_at is null
      limit 1`,
      [workspaceId, datasetId]
    );
    const row = source.rows[0];
    if (!row) throw new Error("data_review_source_not_found");

    const sourceFingerprint = dataReviewSourceFingerprint(row.payload ?? {});
    const existing = await client.query<{ review_id: string }>(
      `select review_id
       from app.workspace_data_review_batches
       where workspace_id=$1
         and source_dataset_id=$2
         and source_server_version=$3
         and source_fingerprint=$4
       limit 1`,
      [workspaceId, datasetId, Number(row.server_version), sourceFingerprint]
    );
    if (existing.rows[0]) return existing.rows[0].review_id;

    const rows = buildDataReviewRows(row.payload ?? {});
    if (!rows.length) throw new Error("data_review_source_has_no_rows");
    const reviewId = randomUUID();
    const summary = summarizeDataReviewRows(rows);

    await client.query(
      `insert into app.workspace_data_review_batches (
        workspace_id,review_id,source_dataset_id,source_server_version,
        source_fingerprint,title,source_url,status,original_payload,working_rows,
        row_count,included_count,cleanup_summary,created_by,updated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,'in-review',$8::jsonb,$9::jsonb,$10,$11,$12::jsonb,$13,$13)`,
      [
        workspaceId,
        reviewId,
        datasetId,
        Number(row.server_version),
        sourceFingerprint,
        row.recipe_name,
        row.source_url,
        JSON.stringify(row.payload ?? {}),
        JSON.stringify(rows),
        rows.length,
        summary.included,
        JSON.stringify(summary),
        userId
      ]
    );
    await insertReviewEvent(client, {
      workspaceId,
      reviewId,
      action: "created",
      actorUserId: userId,
      details: {
        sourceDatasetId: datasetId,
        sourceServerVersion: Number(row.server_version),
        sourceFingerprint,
        rows: rows.length,
        included: summary.included
      }
    });
    return reviewId;
  });
}

async function currentBatchRows(
  client: PoolClient,
  workspaceId: string,
  reviewId: string
) {
  const result = await client.query<{
    status: string;
    working_rows: DataReviewRow[];
  }>(
    `select status,working_rows
     from app.workspace_data_review_batches
     where workspace_id=$1 and review_id=$2
     limit 1`,
    [workspaceId, reviewId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("data_review_batch_not_found");
  if (row.status !== "in-review") throw new Error("data_review_batch_terminal");
  return Array.isArray(row.working_rows) ? row.working_rows : [];
}

export async function saveDataReviewBatch(
  userId: string,
  input: {
    workspaceId: string;
    reviewId: string;
    rows: unknown;
    reviewNote?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    const current = await currentBatchRows(
      client,
      input.workspaceId,
      input.reviewId
    );
    const rows = normalizeDataReviewEdits(current, input.rows);
    const summary = summarizeDataReviewRows(rows);
    const note =
      typeof input.reviewNote === "string"
        ? input.reviewNote.trim().slice(0, 4000)
        : "";

    await client.query(
      `update app.workspace_data_review_batches
       set working_rows=$3::jsonb,
           included_count=$4,
           cleanup_summary=$5::jsonb,
           review_note=$6,
           updated_by=$7,
           updated_at=now()
       where workspace_id=$1 and review_id=$2 and status='in-review'`,
      [
        input.workspaceId,
        input.reviewId,
        JSON.stringify(rows),
        summary.included,
        JSON.stringify(summary),
        note,
        userId
      ]
    );
    await insertReviewEvent(client, {
      workspaceId: input.workspaceId,
      reviewId: input.reviewId,
      action: "saved",
      actorUserId: userId,
      details: summary
    });
  });
}

export async function decideDataReviewBatch(
  userId: string,
  input: {
    workspaceId: string;
    reviewId: string;
    decision: "approved" | "rejected";
    reviewNote?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceAdmin(client, input.workspaceId);
    const rows = await currentBatchRows(client, input.workspaceId, input.reviewId);
    const summary = summarizeDataReviewRows(rows);
    if (input.decision === "approved" && summary.included < 1) {
      throw new Error("data_review_requires_included_row");
    }
    const note =
      typeof input.reviewNote === "string"
        ? input.reviewNote.trim().slice(0, 4000)
        : "";

    if (input.decision === "approved") {
      await client.query(
        `update app.workspace_data_review_batches
         set status='approved',
             included_count=$3,
             cleanup_summary=$4::jsonb,
             review_note=$5,
             approved_by=$6,
             approved_at=now(),
             updated_by=$6,
             updated_at=now()
         where workspace_id=$1 and review_id=$2 and status='in-review'`,
        [
          input.workspaceId,
          input.reviewId,
          summary.included,
          JSON.stringify(summary),
          note,
          userId
        ]
      );
      await insertReviewEvent(client, {
        workspaceId: input.workspaceId,
        reviewId: input.reviewId,
        action: "approved",
        actorUserId: userId,
        details: summary
      });
    } else {
      await client.query(
        `update app.workspace_data_review_batches
         set status='rejected',
             review_note=$3,
             rejected_by=$4,
             rejected_at=now(),
             updated_by=$4,
             updated_at=now()
         where workspace_id=$1 and review_id=$2 and status='in-review'`,
        [input.workspaceId, input.reviewId, note, userId]
      );
      await insertReviewEvent(client, {
        workspaceId: input.workspaceId,
        reviewId: input.reviewId,
        action: "rejected",
        actorUserId: userId,
        details: summary
      });
    }
  });
}
