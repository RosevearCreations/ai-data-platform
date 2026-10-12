import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { listWorkspacesForUser, withUserDatabase } from "./database";

type JsonRecord = Record<string, unknown>;
type WorkspaceRole = "owner" | "admin" | "member";
type PublicationStatus = "published" | "withdrawn";
export type PublicationExportFormat = "json" | "csv";

type ReviewRow = {
  id?: string;
  included?: boolean;
  cleaned?: unknown;
};

export interface ApprovedDatasetCandidate {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  reviewId: string;
  title: string;
  sourceDatasetId: string;
  sourceServerVersion: number;
  sourceFingerprint: string;
  sourceUrl: string;
  rowCount: number;
  approvedBy: string | null;
  approvedAt: string;
  approvalNote: string;
  publicationId: string | null;
  publicationStatus: PublicationStatus | null;
  canPublish: boolean;
}

export interface DatasetPublication {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  publicationId: string;
  reviewId: string;
  title: string;
  sourceDatasetId: string;
  sourceServerVersion: number;
  sourceFingerprint: string;
  sourceUrl: string;
  status: PublicationStatus;
  publicationFingerprint: string;
  rowCount: number;
  fieldOrder: string[];
  publishedRows: JsonRecord[];
  approvalNote: string;
  publicationNote: string;
  reviewApprovedBy: string | null;
  reviewApprovedAt: string;
  publishedBy: string;
  publishedAt: string;
  withdrawnBy: string | null;
  withdrawnAt: string | null;
  withdrawalNote: string;
  eventCount: number;
  canManage: boolean;
}

export interface ApprovedDatasetPublishingModel {
  workspaces: Array<{
    id: string;
    name: string;
    role: WorkspaceRole;
  }>;
  candidates: ApprovedDatasetCandidate[];
  publications: DatasetPublication[];
  totals: {
    approvedCandidates: number;
    unpublished: number;
    published: number;
    withdrawn: number;
    publishedRows: number;
  };
}

export interface PublicationManifest {
  schema: "ai-data-platform.approved-dataset-publication.v1";
  publicationId: string;
  workspace: {
    id: string;
    name: string;
  };
  review: {
    reviewId: string;
    approvedBy: string | null;
    approvedAt: string;
    approvalNote: string;
  };
  source: {
    datasetId: string;
    serverVersion: number;
    fingerprint: string;
    title: string;
    url: string;
  };
  publication: {
    status: PublicationStatus;
    fingerprint: string;
    rowCount: number;
    fields: string[];
    publishedBy: string;
    publishedAt: string;
    note: string;
    withdrawnBy: string | null;
    withdrawnAt: string | null;
    withdrawalNote: string;
  };
  exportFormats: PublicationExportFormat[];
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
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

function hash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function buildApprovedPublicationRows(
  reviewRows: unknown
): {
  rows: JsonRecord[];
  fieldOrder: string[];
} {
  if (!Array.isArray(reviewRows)) {
    throw new Error("approved_publication_rows_invalid");
  }

  const rows = reviewRows
    .filter((value) => record(value).included !== false)
    .map((value) => {
      const cleaned = record(value).cleaned;
      if (!cleaned || typeof cleaned !== "object" || Array.isArray(cleaned)) {
        throw new Error("approved_publication_cleaned_row_invalid");
      }
      return structuredClone(cleaned) as JsonRecord;
    });

  if (!rows.length || rows.length > 500) {
    throw new Error("approved_publication_row_count_invalid");
  }

  const fieldOrder: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      fieldOrder.push(key);
      if (fieldOrder.length > 100) {
        throw new Error("approved_publication_too_many_fields");
      }
    }
  }

  if (!fieldOrder.length) {
    throw new Error("approved_publication_no_fields");
  }

  if (Buffer.byteLength(JSON.stringify(rows), "utf8") > 900_000) {
    throw new Error("approved_publication_too_large");
  }

  return { rows, fieldOrder };
}

export function approvedPublicationFingerprint(input: {
  reviewId: string;
  sourceDatasetId: string;
  sourceServerVersion: number;
  sourceFingerprint: string;
  fieldOrder: string[];
  rows: JsonRecord[];
}) {
  return "pub1-" + hash(input);
}

function csvValue(value: unknown) {
  let output = "";
  if (value === null || value === undefined) output = "";
  else if (typeof value === "string") output = value;
  else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    output = String(value);
  } else {
    output = JSON.stringify(canonicalize(value));
  }
  return '"' + output.replaceAll('"', '""') + '"';
}

export function renderPublicationCsv(
  rows: JsonRecord[],
  fieldOrder: string[]
) {
  const lines = [
    fieldOrder.map(csvValue).join(","),
    ...rows.map((row) => fieldOrder.map((field) => csvValue(row[field])).join(","))
  ];
  return lines.join("\r\n") + "\r\n";
}

export function safePublicationFilename(title: string, publicationId: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return (slug || "approved-dataset") + "-" + publicationId.slice(0, 8);
}

export function buildPublicationManifest(
  publication: DatasetPublication
): PublicationManifest {
  return {
    schema: "ai-data-platform.approved-dataset-publication.v1",
    publicationId: publication.publicationId,
    workspace: {
      id: publication.workspaceId,
      name: publication.workspaceName
    },
    review: {
      reviewId: publication.reviewId,
      approvedBy: publication.reviewApprovedBy,
      approvedAt: publication.reviewApprovedAt,
      approvalNote: publication.approvalNote
    },
    source: {
      datasetId: publication.sourceDatasetId,
      serverVersion: publication.sourceServerVersion,
      fingerprint: publication.sourceFingerprint,
      title: publication.title,
      url: publication.sourceUrl
    },
    publication: {
      status: publication.status,
      fingerprint: publication.publicationFingerprint,
      rowCount: publication.rowCount,
      fields: publication.fieldOrder,
      publishedBy: publication.publishedBy,
      publishedAt: publication.publishedAt,
      note: publication.publicationNote,
      withdrawnBy: publication.withdrawnBy,
      withdrawnAt: publication.withdrawnAt,
      withdrawalNote: publication.withdrawalNote
    },
    exportFormats: ["json", "csv"]
  };
}

export function renderPublicationJson(publication: DatasetPublication) {
  return JSON.stringify(
    {
      ...buildPublicationManifest(publication),
      rows: publication.publishedRows
    },
    null,
    2
  ) + "\n";
}

async function requireWorkspaceManager(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: WorkspaceRole }>(
    `select role
     from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id', true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") {
    throw new Error("approved_publication_manager_required");
  }
}

async function insertPublicationEvent(
  client: PoolClient,
  input: {
    workspaceId: string;
    publicationId: string;
    action: "published" | "exported-json" | "exported-csv" | "withdrawn";
    actorUserId: string;
    details?: JsonRecord;
  }
) {
  await client.query(
    `insert into app.workspace_dataset_publication_events
      (workspace_id,event_id,publication_id,action,actor_user_id,details)
     values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      input.workspaceId,
      randomUUID(),
      input.publicationId,
      input.action,
      input.actorUserId,
      JSON.stringify(input.details ?? {})
    ]
  );
}

type CandidateRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  review_id: string;
  title: string;
  source_dataset_id: string;
  source_server_version: string | number;
  source_fingerprint: string;
  source_url: string;
  included_count: string | number;
  approved_by: string | null;
  approved_at: Date;
  review_note: string;
  publication_id: string | null;
  publication_status: PublicationStatus | null;
};

type PublicationRow = QueryResultRow & {
  workspace_id: string;
  workspace_name: string;
  publication_id: string;
  review_id: string;
  source_dataset_id: string;
  source_server_version: string | number;
  source_fingerprint: string;
  title: string;
  source_url: string;
  status: PublicationStatus;
  publication_fingerprint: string;
  row_count: string | number;
  field_order: string[];
  published_rows: JsonRecord[];
  approval_note: string;
  publication_note: string;
  review_approved_by: string | null;
  review_approved_at: Date;
  published_by: string;
  published_at: Date;
  withdrawn_by: string | null;
  withdrawn_at: Date | null;
  withdrawal_note: string;
  event_count: string | number;
};

function publicationFromRow(
  row: PublicationRow,
  role: WorkspaceRole
): DatasetPublication {
  return {
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    role,
    publicationId: row.publication_id,
    reviewId: row.review_id,
    title: row.title,
    sourceDatasetId: row.source_dataset_id,
    sourceServerVersion: Number(row.source_server_version),
    sourceFingerprint: row.source_fingerprint,
    sourceUrl: row.source_url,
    status: row.status,
    publicationFingerprint: row.publication_fingerprint,
    rowCount: Number(row.row_count),
    fieldOrder: Array.isArray(row.field_order) ? row.field_order : [],
    publishedRows: Array.isArray(row.published_rows) ? row.published_rows : [],
    approvalNote: row.approval_note ?? "",
    publicationNote: row.publication_note ?? "",
    reviewApprovedBy: row.review_approved_by,
    reviewApprovedAt: row.review_approved_at.toISOString(),
    publishedBy: row.published_by,
    publishedAt: row.published_at.toISOString(),
    withdrawnBy: row.withdrawn_by,
    withdrawnAt: row.withdrawn_at?.toISOString() ?? null,
    withdrawalNote: row.withdrawal_note ?? "",
    eventCount: Number(row.event_count),
    canManage: role === "owner" || role === "admin"
  };
}

export async function listApprovedDatasetPublishingForUser(
  userId: string
): Promise<ApprovedDatasetPublishingModel> {
  const workspaces = await listWorkspacesForUser(userId);
  const roleByWorkspace = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.role])
  );

  const result = await withUserDatabase(userId, async (client) => {
    const candidates = await client.query<CandidateRow>(
      `select
        b.workspace_id,
        w.name as workspace_name,
        b.review_id,
        b.title,
        b.source_dataset_id,
        b.source_server_version,
        b.source_fingerprint,
        b.source_url,
        b.included_count,
        b.approved_by,
        b.approved_at,
        b.review_note,
        p.publication_id,
        p.status as publication_status
      from app.workspace_data_review_batches b
      join app.workspaces w on w.id=b.workspace_id
      left join app.workspace_dataset_publications p
        on p.workspace_id=b.workspace_id and p.review_id=b.review_id
      where b.status='approved'
        and b.approved_at is not null
      order by b.approved_at desc
      limit 250`
    );

    const publications = await client.query<PublicationRow>(
      `select
        p.*,
        w.name as workspace_name,
        (select count(*)
         from app.workspace_dataset_publication_events e
         where e.workspace_id=p.workspace_id
           and e.publication_id=p.publication_id)::int as event_count
      from app.workspace_dataset_publications p
      join app.workspaces w on w.id=p.workspace_id
      order by p.published_at desc
      limit 150`
    );

    return {
      candidates: candidates.rows,
      publications: publications.rows
    };
  });

  const publications = result.publications.map((row) =>
    publicationFromRow(
      row,
      (roleByWorkspace.get(row.workspace_id) ?? "member") as WorkspaceRole
    )
  );

  const candidates = result.candidates.map((row): ApprovedDatasetCandidate => {
    const role = (roleByWorkspace.get(row.workspace_id) ?? "member") as WorkspaceRole;
    return {
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      role,
      reviewId: row.review_id,
      title: row.title,
      sourceDatasetId: row.source_dataset_id,
      sourceServerVersion: Number(row.source_server_version),
      sourceFingerprint: row.source_fingerprint,
      sourceUrl: row.source_url,
      rowCount: Number(row.included_count),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at.toISOString(),
      approvalNote: row.review_note ?? "",
      publicationId: row.publication_id,
      publicationStatus: row.publication_status,
      canPublish: role === "owner" || role === "admin"
    };
  });

  return {
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role
    })),
    candidates,
    publications,
    totals: {
      approvedCandidates: candidates.length,
      unpublished: candidates.filter((candidate) => !candidate.publicationId).length,
      published: publications.filter((publication) => publication.status === "published").length,
      withdrawn: publications.filter((publication) => publication.status === "withdrawn").length,
      publishedRows: publications
        .filter((publication) => publication.status === "published")
        .reduce((sum, publication) => sum + publication.rowCount, 0)
    }
  };
}

export async function createApprovedDatasetPublication(
  userId: string,
  input: {
    workspaceId: string;
    reviewId: string;
    publicationNote?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceManager(client, input.workspaceId);

    const existing = await client.query<{ publication_id: string }>(
      `select publication_id
       from app.workspace_dataset_publications
       where workspace_id=$1 and review_id=$2
       limit 1`,
      [input.workspaceId, input.reviewId]
    );
    if (existing.rows[0]) return existing.rows[0].publication_id;

    const review = await client.query<{
      review_id: string;
      source_dataset_id: string;
      source_server_version: string | number;
      source_fingerprint: string;
      title: string;
      source_url: string;
      working_rows: ReviewRow[];
      review_note: string;
      approved_by: string | null;
      approved_at: Date | null;
    }>(
      `select
        review_id,
        source_dataset_id,
        source_server_version,
        source_fingerprint,
        title,
        source_url,
        working_rows,
        review_note,
        approved_by,
        approved_at
       from app.workspace_data_review_batches
       where workspace_id=$1
         and review_id=$2
         and status='approved'
       limit 1`,
      [input.workspaceId, input.reviewId]
    );
    const source = review.rows[0];
    if (!source || !source.approved_at) {
      throw new Error("approved_publication_review_not_approved");
    }

    const snapshot = buildApprovedPublicationRows(source.working_rows);
    const publicationId = randomUUID();
    const publicationFingerprint = approvedPublicationFingerprint({
      reviewId: source.review_id,
      sourceDatasetId: source.source_dataset_id,
      sourceServerVersion: Number(source.source_server_version),
      sourceFingerprint: source.source_fingerprint,
      fieldOrder: snapshot.fieldOrder,
      rows: snapshot.rows
    });
    const publicationNote =
      typeof input.publicationNote === "string"
        ? input.publicationNote.trim().slice(0, 4000)
        : "";

    await client.query(
      `insert into app.workspace_dataset_publications (
        workspace_id,publication_id,review_id,source_dataset_id,
        source_server_version,source_fingerprint,title,source_url,status,
        publication_fingerprint,row_count,field_order,published_rows,
        approval_note,publication_note,review_approved_by,review_approved_at,
        published_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,'published',
        $9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17
      )`,
      [
        input.workspaceId,
        publicationId,
        source.review_id,
        source.source_dataset_id,
        Number(source.source_server_version),
        source.source_fingerprint,
        source.title,
        source.source_url,
        publicationFingerprint,
        snapshot.rows.length,
        JSON.stringify(snapshot.fieldOrder),
        JSON.stringify(snapshot.rows),
        source.review_note ?? "",
        publicationNote,
        source.approved_by,
        source.approved_at,
        userId
      ]
    );

    await insertPublicationEvent(client, {
      workspaceId: input.workspaceId,
      publicationId,
      action: "published",
      actorUserId: userId,
      details: {
        reviewId: source.review_id,
        sourceDatasetId: source.source_dataset_id,
        sourceServerVersion: Number(source.source_server_version),
        sourceFingerprint: source.source_fingerprint,
        publicationFingerprint,
        rowCount: snapshot.rows.length,
        fieldCount: snapshot.fieldOrder.length
      }
    });

    return publicationId;
  });
}

export async function withdrawApprovedDatasetPublication(
  userId: string,
  input: {
    workspaceId: string;
    publicationId: string;
    withdrawalNote?: string;
  }
) {
  return withUserDatabase(userId, async (client) => {
    await requireWorkspaceManager(client, input.workspaceId);
    const note =
      typeof input.withdrawalNote === "string"
        ? input.withdrawalNote.trim().slice(0, 4000)
        : "";

    const updated = await client.query<{ publication_id: string }>(
      `update app.workspace_dataset_publications
       set status='withdrawn',
           withdrawn_by=$3,
           withdrawn_at=now(),
           withdrawal_note=$4
       where workspace_id=$1
         and publication_id=$2
         and status='published'
       returning publication_id`,
      [input.workspaceId, input.publicationId, userId, note]
    );

    if (!updated.rows[0]) {
      const exists = await client.query<{ status: string }>(
        `select status
         from app.workspace_dataset_publications
         where workspace_id=$1 and publication_id=$2
         limit 1`,
        [input.workspaceId, input.publicationId]
      );
      if (!exists.rows[0]) throw new Error("approved_publication_not_found");
      throw new Error("approved_publication_already_withdrawn");
    }

    await insertPublicationEvent(client, {
      workspaceId: input.workspaceId,
      publicationId: input.publicationId,
      action: "withdrawn",
      actorUserId: userId,
      details: { withdrawalNote: note }
    });
  });
}

async function getPublicationForUser(
  client: PoolClient,
  workspaceId: string,
  publicationId: string,
  role: WorkspaceRole
) {
  const result = await client.query<PublicationRow>(
    `select
      p.*,
      w.name as workspace_name,
      (select count(*)
       from app.workspace_dataset_publication_events e
       where e.workspace_id=p.workspace_id
         and e.publication_id=p.publication_id)::int as event_count
     from app.workspace_dataset_publications p
     join app.workspaces w on w.id=p.workspace_id
     where p.workspace_id=$1 and p.publication_id=$2
     limit 1`,
    [workspaceId, publicationId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("approved_publication_not_found");
  return publicationFromRow(row, role);
}

export async function createApprovedDatasetExport(
  userId: string,
  input: {
    workspaceId: string;
    publicationId: string;
    format: PublicationExportFormat;
  }
) {
  if (input.format !== "json" && input.format !== "csv") {
    throw new Error("approved_publication_format_invalid");
  }

  const workspaces = await listWorkspacesForUser(userId);
  const role = workspaces.find((workspace) => workspace.id === input.workspaceId)?.role;
  if (!role) throw new Error("approved_publication_not_found");

  return withUserDatabase(userId, async (client) => {
    const publication = await getPublicationForUser(
      client,
      input.workspaceId,
      input.publicationId,
      role
    );
    if (publication.status !== "published") {
      throw new Error("approved_publication_withdrawn");
    }

    const basename = safePublicationFilename(
      publication.title,
      publication.publicationId
    );
    const body =
      input.format === "json"
        ? renderPublicationJson(publication)
        : renderPublicationCsv(publication.publishedRows, publication.fieldOrder);

    await insertPublicationEvent(client, {
      workspaceId: input.workspaceId,
      publicationId: input.publicationId,
      action: input.format === "json" ? "exported-json" : "exported-csv",
      actorUserId: userId,
      details: {
        format: input.format,
        publicationFingerprint: publication.publicationFingerprint,
        rowCount: publication.rowCount
      }
    });

    return {
      filename: basename + "." + input.format,
      contentType:
        input.format === "json"
          ? "application/json; charset=utf-8"
          : "text/csv; charset=utf-8",
      body,
      publication
    };
  });
}
