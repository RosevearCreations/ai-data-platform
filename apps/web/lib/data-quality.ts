import { listDataReviewWorkbenchForUser, type DataReviewRow } from "./data-review-workbench";
import { withUserDatabase } from "./database";

type JsonRecord = Record<string, unknown>;

export const DATA_QUALITY_RULES = [
  {
    id: "missing-fields",
    label: "Missing fields",
    description: "Blank strings, null values and undefined values are counted as missing."
  },
  {
    id: "malformed-values",
    label: "Malformed values",
    description: "Common email, URL, phone, date/year and numeric-looking fields are checked conservatively."
  },
  {
    id: "duplicates",
    label: "Duplicate rows",
    description: "Canonical cleaned-row equality is used to find exact duplicate groups."
  },
  {
    id: "inconsistent-formats",
    label: "Inconsistent formats",
    description: "Mixed primitive types and inconsistent date/phone representations within a field are flagged."
  },
  {
    id: "stale-records",
    label: "Stale records",
    description: "Current source snapshots older than 30 days and open review batches untouched for 14 days are highlighted."
  },
  {
    id: "unexpected-changes",
    label: "Unexpected source changes",
    description: "A newer server version or changed fingerprint after an earlier review is surfaced for operator review."
  },
  {
    id: "normalization",
    label: "Normalization issues",
    description: "Whitespace cleanup and other deterministic cleaned-row differences remain visible before approval."
  }
] as const;

export type DataQualityRuleId = (typeof DATA_QUALITY_RULES)[number]["id"];
export type DataQualityState = "healthy" | "review" | "poor";

export interface DataQualityFinding {
  ruleId: DataQualityRuleId;
  label: string;
  count: number;
  detail: string;
  rowIds: string[];
  fields: string[];
}

export interface DataQualityDuplicateGroup {
  fingerprint: string;
  rowIds: string[];
}

export interface DataQualityAssessment {
  rowCount: number;
  fieldCount: number;
  score: number;
  state: DataQualityState;
  findings: DataQualityFinding[];
  duplicateGroups: DataQualityDuplicateGroup[];
  metrics: {
    missingValues: number;
    malformedValues: number;
    duplicateRows: number;
    inconsistentFields: number;
    normalizationRows: number;
    stale: boolean;
    unexpectedChange: boolean;
  };
}

export interface DataQualityDatasetItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  title: string;
  datasetId: string;
  serverVersion: number;
  retrievedAt: string;
  reviewId: string | null;
  reviewStatus: string | null;
  sourceFingerprint: string;
  quality: DataQualityAssessment;
  href: string;
  statusLabel: string;
}

export interface DataQualityBatchItem {
  id: string;
  workspaceId: string;
  workspaceName: string;
  title: string;
  reviewId: string;
  status: "in-review" | "approved" | "rejected";
  sourceDatasetId: string;
  sourceServerVersion: number;
  updatedAt: string;
  quality: DataQualityAssessment;
  href: string;
}

export interface DataQualityWorkbenchModel {
  generatedAt: string;
  rules: typeof DATA_QUALITY_RULES;
  datasets: DataQualityDatasetItem[];
  batches: DataQualityBatchItem[];
  totals: {
    datasets: number;
    batches: number;
    healthy: number;
    review: number;
    poor: number;
    duplicateGroups: number;
    stale: number;
    unexpectedChanges: number;
  };
  workspaces: Array<{ id: string; name: string }>;
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

function canonicalFingerprint(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

function normalizedValue(value: unknown): unknown {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ");
  if (Array.isArray(value)) return value.map(normalizedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, nested]) => [
        key,
        normalizedValue(nested)
      ])
    );
  }
  return value;
}

function primitiveType(value: unknown) {
  if (value === null || value === undefined) return "missing";
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "object" : typeof value;
}

function missing(value: unknown) {
  return value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "");
}

function keyKind(key: string) {
  const value = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (value.includes("email")) return "email";
  if (value.includes("phone") || value.includes("telephone") || value.includes("mobile")) return "phone";
  if (
    value === "url" ||
    value.endsWith("url") ||
    value.includes("website") ||
    value.includes("link")
  ) return "url";
  if (
    value === "date" ||
    value.endsWith("date") ||
    value.includes("timestamp") ||
    /^(created|updated|retrieved|observed|published|approved|rejected|started|finished)at$/.test(value)
  ) return "date";
  if (value === "year" || value.endsWith("year")) return "year";
  if (
    value.includes("price") ||
    value.includes("cost") ||
    value.includes("amount") ||
    value.includes("quantity") ||
    value === "qty" ||
    value.endsWith("count") ||
    value === "total"
  ) return "number";
  return "generic";
}

function malformedForKey(key: string, value: unknown) {
  if (missing(value)) return false;
  const kind = keyKind(key);
  if (kind === "email" && typeof value === "string") {
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
  if (kind === "url" && typeof value === "string") {
    try {
      const url = new URL(value.trim());
      return url.protocol !== "http:" && url.protocol !== "https:";
    } catch {
      return true;
    }
  }
  if (kind === "phone" && typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    return digits.length < 7 || digits.length > 15;
  }
  if (kind === "date") {
    if (value instanceof Date) return false;
    if (typeof value !== "string") return true;
    return !Number.isFinite(Date.parse(value));
  }
  if (kind === "year") {
    const number = typeof value === "number" ? value : Number(String(value).trim());
    return !Number.isInteger(number) || number < 1800 || number > 2200;
  }
  if (kind === "number") {
    if (typeof value === "number") return !Number.isFinite(value);
    if (typeof value !== "string") return true;
    const cleaned = value.trim().replace(/[$,%\s]/g, "").replace(/,/g, "");
    return cleaned === "" || !Number.isFinite(Number(cleaned));
  }
  return false;
}

function formatSignature(key: string, value: unknown) {
  if (missing(value)) return "";
  const kind = keyKind(key);
  if (kind === "date" && typeof value === "string" && Number.isFinite(Date.parse(value))) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return "iso-date";
    if (/^\d{4}-\d{2}-\d{2}T/.test(value.trim())) return "iso-datetime";
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value.trim())) return "slash-date";
    return "other-date";
  }
  if (kind === "phone" && typeof value === "string") {
    if (/^\+?\d+$/.test(value.trim())) return "digits";
    if (/[()\-\s.]/.test(value)) return "punctuated";
    return "other-phone";
  }
  return primitiveType(value);
}

function ageDays(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

function qualityState(score: number): DataQualityState {
  return score >= 90 ? "healthy" : score >= 70 ? "review" : "poor";
}

function rawRows(payload: JsonRecord) {
  return Array.isArray(payload.rows)
    ? payload.rows.slice(0, 500).map((value, index) => ({
        id: "source-" + String(index + 1).padStart(3, "0"),
        original: record(value),
        cleaned: record(normalizedValue(record(value))),
        changedFields: 0,
        issues: [],
        duplicateOf: null,
        included: true
      } satisfies DataReviewRow))
    : [];
}

export function assessDataQuality(input: {
  rows: DataReviewRow[];
  retrievedAt?: string;
  updatedAt?: string;
  currentServerVersion?: number;
  reviewedServerVersion?: number | null;
  currentFingerprint?: string;
  reviewedFingerprint?: string | null;
  now?: Date;
}): DataQualityAssessment {
  const now = input.now ?? new Date();
  const rows = input.rows;
  const allFields = [...new Set(rows.flatMap((row) => Object.keys(row.cleaned)))].sort();

  const missingRows = new Set<string>();
  const malformedRows = new Set<string>();
  const malformedFields = new Set<string>();
  let missingValues = 0;
  let malformedValues = 0;

  for (const row of rows) {
    for (const field of allFields) {
      const value = row.cleaned[field];
      if (missing(value)) {
        missingValues += 1;
        missingRows.add(row.id);
      } else if (malformedForKey(field, value)) {
        malformedValues += 1;
        malformedRows.add(row.id);
        malformedFields.add(field);
      }
    }
  }

  const duplicateMap = new Map<string, string[]>();
  for (const row of rows) {
    const fingerprint = canonicalFingerprint(row.cleaned);
    const group = duplicateMap.get(fingerprint) ?? [];
    group.push(row.id);
    duplicateMap.set(fingerprint, group);
  }
  const duplicateGroups = [...duplicateMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([fingerprint, rowIds]) => ({ fingerprint, rowIds }));
  const duplicateRowIds = new Set(duplicateGroups.flatMap((group) => group.rowIds.slice(1)));

  const inconsistentFields: string[] = [];
  for (const field of allFields) {
    const signatures = new Set(
      rows
        .map((row) => formatSignature(field, row.cleaned[field]))
        .filter(Boolean)
    );
    if (signatures.size > 1) inconsistentFields.push(field);
  }

  const normalizationRows = rows.filter((row) =>
    row.changedFields > 0 ||
    canonicalFingerprint(row.original) !== canonicalFingerprint(normalizedValue(row.original))
  ).map((row) => row.id);

  const sourceStale = Boolean(
    input.retrievedAt && ageDays(input.retrievedAt, now) >= 30
  );
  const reviewStale = Boolean(
    input.updatedAt && ageDays(input.updatedAt, now) >= 14
  );
  const stale = sourceStale || reviewStale;
  const unexpectedChange = Boolean(
    input.currentServerVersion &&
    input.reviewedServerVersion &&
    input.currentServerVersion > input.reviewedServerVersion
  ) || Boolean(
    input.currentFingerprint &&
    input.reviewedFingerprint &&
    input.currentFingerprint !== input.reviewedFingerprint
  );

  const findings: DataQualityFinding[] = [];
  if (missingValues) {
    findings.push({
      ruleId: "missing-fields",
      label: "Missing fields",
      count: missingValues,
      detail: missingValues + " missing value(s) across " + missingRows.size + " row(s).",
      rowIds: [...missingRows],
      fields: []
    });
  }
  if (malformedValues) {
    findings.push({
      ruleId: "malformed-values",
      label: "Malformed values",
      count: malformedValues,
      detail: malformedValues + " value(s) do not match conservative field-format rules.",
      rowIds: [...malformedRows],
      fields: [...malformedFields]
    });
  }
  if (duplicateGroups.length) {
    findings.push({
      ruleId: "duplicates",
      label: "Duplicate rows",
      count: duplicateRowIds.size,
      detail: duplicateGroups.length + " exact cleaned-row duplicate group(s) were found.",
      rowIds: [...duplicateRowIds],
      fields: []
    });
  }
  if (inconsistentFields.length) {
    findings.push({
      ruleId: "inconsistent-formats",
      label: "Inconsistent formats",
      count: inconsistentFields.length,
      detail: inconsistentFields.length + " field(s) use mixed types or keyed formats.",
      rowIds: [],
      fields: inconsistentFields
    });
  }
  if (stale) {
    findings.push({
      ruleId: "stale-records",
      label: "Stale records",
      count: 1,
      detail: sourceStale
        ? "The source snapshot is at least 30 days old."
        : "The open review batch has not changed for at least 14 days.",
      rowIds: [],
      fields: []
    });
  }
  if (unexpectedChange) {
    findings.push({
      ruleId: "unexpected-changes",
      label: "Unexpected source changes",
      count: 1,
      detail: "A newer server version or changed source fingerprint exists after the reviewed snapshot.",
      rowIds: [],
      fields: []
    });
  }
  if (normalizationRows.length) {
    findings.push({
      ruleId: "normalization",
      label: "Normalization issues",
      count: normalizationRows.length,
      detail: normalizationRows.length + " row(s) require or contain deterministic normalization changes.",
      rowIds: normalizationRows,
      fields: []
    });
  }

  const rowDenominator = Math.max(1, rows.length);
  const cellDenominator = Math.max(1, rows.length * Math.max(1, allFields.length));
  const penalties =
    (missingValues / cellDenominator) * 25 +
    (malformedValues / cellDenominator) * 25 +
    (duplicateRowIds.size / rowDenominator) * 20 +
    (normalizationRows.length / rowDenominator) * 10 +
    (inconsistentFields.length / Math.max(1, allFields.length)) * 10 +
    (stale ? 5 : 0) +
    (unexpectedChange ? 5 : 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalties)));

  return {
    rowCount: rows.length,
    fieldCount: allFields.length,
    score,
    state: qualityState(score),
    findings,
    duplicateGroups,
    metrics: {
      missingValues,
      malformedValues,
      duplicateRows: duplicateRowIds.size,
      inconsistentFields: inconsistentFields.length,
      normalizationRows: normalizationRows.length,
      stale,
      unexpectedChange
    }
  };
}

export async function buildDataQualityWorkbench(
  userId: string,
  now = new Date()
): Promise<DataQualityWorkbenchModel> {
  const review = await listDataReviewWorkbenchForUser(userId);
  const currentPayloads = await withUserDatabase(userId, async (client) => {
    const result = await client.query<{
      workspace_id: string;
      dataset_id: string;
      payload: JsonRecord;
    }>(
      "select workspace_id,dataset_id,payload from app.workspace_reviewed_datasets where deleted_at is null"
    );
    return result.rows;
  });
  const payloadByDataset = new Map(
    currentPayloads.map((row) => [
      row.workspace_id + ":" + row.dataset_id,
      row.payload ?? {}
    ])
  );

  const latestBatchByDataset = new Map<string, (typeof review.batches)[number]>();
  for (const batch of [...review.batches].sort(
    (left, right) => right.sourceServerVersion - left.sourceServerVersion
  )) {
    const key = batch.workspaceId + ":" + batch.sourceDatasetId;
    if (!latestBatchByDataset.has(key)) latestBatchByDataset.set(key, batch);
  }

  const datasets = review.candidates.map((candidate): DataQualityDatasetItem => {
    const key = candidate.workspaceId + ":" + candidate.datasetId;
    const latestBatch = latestBatchByDataset.get(key) ?? null;
    const payload = payloadByDataset.get(key) ?? {};
    const quality = assessDataQuality({
      rows: rawRows(payload),
      retrievedAt: candidate.retrievedAt,
      currentServerVersion: candidate.serverVersion,
      reviewedServerVersion: latestBatch?.sourceServerVersion ?? null,
      currentFingerprint: candidate.sourceFingerprint,
      reviewedFingerprint: latestBatch?.sourceFingerprint ?? null,
      now
    });
    return {
      id: "dataset:" + key,
      workspaceId: candidate.workspaceId,
      workspaceName: candidate.workspaceName,
      title: candidate.recipeName,
      datasetId: candidate.datasetId,
      serverVersion: candidate.serverVersion,
      retrievedAt: candidate.retrievedAt,
      reviewId: candidate.reviewId,
      reviewStatus: candidate.reviewStatus,
      sourceFingerprint: candidate.sourceFingerprint,
      quality,
      href: "/data-review",
      statusLabel:
        quality.state === "healthy"
          ? "Quality healthy"
          : quality.state === "poor"
            ? "Quality risk"
            : "Quality review"
    };
  });

  const candidateByDataset = new Map(
    review.candidates.map((candidate) => [
      candidate.workspaceId + ":" + candidate.datasetId,
      candidate
    ])
  );

  const batches = review.batches.map((batch): DataQualityBatchItem => {
    const candidate = candidateByDataset.get(
      batch.workspaceId + ":" + batch.sourceDatasetId
    );
    return {
      id: "batch:" + batch.workspaceId + ":" + batch.reviewId,
      workspaceId: batch.workspaceId,
      workspaceName: batch.workspaceName,
      title: batch.title,
      reviewId: batch.reviewId,
      status: batch.status,
      sourceDatasetId: batch.sourceDatasetId,
      sourceServerVersion: batch.sourceServerVersion,
      updatedAt: batch.updatedAt,
      quality: assessDataQuality({
        rows: batch.rows,
        updatedAt: batch.status === "in-review" ? batch.updatedAt : undefined,
        currentServerVersion: candidate?.serverVersion,
        reviewedServerVersion: batch.sourceServerVersion,
        currentFingerprint: candidate?.sourceFingerprint,
        reviewedFingerprint: batch.sourceFingerprint,
        now
      }),
      href: "/data-review"
    };
  });

  const assessments = [...datasets.map((item) => item.quality), ...batches.map((item) => item.quality)];
  return {
    generatedAt: now.toISOString(),
    rules: DATA_QUALITY_RULES,
    datasets,
    batches,
    totals: {
      datasets: datasets.length,
      batches: batches.length,
      healthy: assessments.filter((item) => item.state === "healthy").length,
      review: assessments.filter((item) => item.state === "review").length,
      poor: assessments.filter((item) => item.state === "poor").length,
      duplicateGroups: assessments.reduce((sum, item) => sum + item.duplicateGroups.length, 0),
      stale: assessments.filter((item) => item.metrics.stale).length,
      unexpectedChanges: assessments.filter((item) => item.metrics.unexpectedChange).length
    },
    workspaces: review.workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name
    }))
  };
}
