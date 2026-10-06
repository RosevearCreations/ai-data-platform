import type {
  HistoricalCaptureSummary,
  HistoricalChangeItem,
  HistoricalFieldChange,
  HistoricalFieldDefinition,
  HistoricalRecordVersion,
  HistoricalSeries,
  HistoricalSnapshot
} from "./types";

const MAX_HISTORY_RECORDS = 500;
const MAX_SNAPSHOTS = 20;
const MAX_CHANGES = 1000;

export interface HistoricalCaptureRow {
  sourceIndex: number;
  values: Record<string, string | number | null>;
}

export interface HistoricalCaptureInput {
  recipeName: string;
  sourceUrl: string;
  identityKey: string;
  fields: HistoricalFieldDefinition[];
  rows: HistoricalCaptureRow[];
}

function nextId(prefix: string) {
  return (
    prefix +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

function cleanName(value: string) {
  return value.trim() || "Untitled extraction recipe";
}

export function sourceScopeFor(url: string) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return url.split(/[?#]/, 1)[0] ?? "";
  }
}

export function historicalSeriesKey(
  recipeName: string,
  sourceUrl: string,
  identityKey: string
) {
  return [
    sourceScopeFor(sourceUrl),
    cleanName(recipeName).toLowerCase(),
    identityKey.trim().toLowerCase()
  ].join("::");
}

function normalizeIdentity(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeValue(value: string | number | null | undefined) {
  return value === undefined ? null : value;
}

function equalValue(
  left: string | number | null | undefined,
  right: string | number | null | undefined
) {
  return normalizeValue(left) === normalizeValue(right);
}

function snapshotMap(snapshot: HistoricalSnapshot) {
  return new Map(snapshot.records.map((record) => [record.identity, record]));
}

function fieldMap(
  previous: HistoricalSnapshot | null,
  fields: HistoricalFieldDefinition[]
) {
  const map = new Map<string, string>();

  for (const field of previous?.fields ?? []) {
    map.set(field.key, field.label);
  }

  for (const field of fields) {
    map.set(field.key, field.label);
  }

  return map;
}

function fieldChangesFor(
  before: HistoricalRecordVersion | null,
  after: HistoricalRecordVersion | null,
  labels: Map<string, string>
): HistoricalFieldChange[] {
  const keys = new Set<string>([
    ...Object.keys(before?.values ?? {}),
    ...Object.keys(after?.values ?? {})
  ]);
  const changes: HistoricalFieldChange[] = [];

  for (const key of keys) {
    const previous = normalizeValue(before?.values[key]);
    const current = normalizeValue(after?.values[key]);

    if (before && after && equalValue(previous, current)) {
      continue;
    }

    changes.push({
      key,
      label: labels.get(key) ?? key,
      before: previous,
      after: current
    });
  }

  return changes;
}

function validateInput(input: HistoricalCaptureInput) {
  const identityKey = input.identityKey.trim();

  if (!identityKey) {
    throw new Error("Choose an identity field before capturing history.");
  }

  if (!input.fields.some((field) => field.key === identityKey)) {
    throw new Error("The identity field must be one of the visible reviewed fields.");
  }

  if (!input.rows.length) {
    throw new Error("Historical capture needs at least one included reviewed row.");
  }

  if (input.rows.length > MAX_HISTORY_RECORDS) {
    throw new Error(
      "Historical capture is capped at " +
        MAX_HISTORY_RECORDS +
        " included rows per snapshot."
    );
  }

  const seen = new Set<string>();

  for (const row of input.rows) {
    const identity = normalizeIdentity(row.values[identityKey]);

    if (!identity) {
      throw new Error(
        "Every included row needs a value in the identity field before history can be captured."
      );
    }

    if (seen.has(identity)) {
      throw new Error(
        'Identity value "' +
          identity +
          '" appears more than once. Choose a field that uniquely identifies each record.'
      );
    }

    seen.add(identity);
  }
}

function makeSnapshot(
  input: HistoricalCaptureInput,
  snapshotVersion: number,
  capturedAt: string
): HistoricalSnapshot {
  const visibleKeys = new Set(input.fields.map((field) => field.key));

  return {
    version: 1,
    snapshotVersion,
    id: nextId("snapshot"),
    capturedAt,
    recipeName: cleanName(input.recipeName),
    sourceUrl: input.sourceUrl,
    sourceScope: sourceScopeFor(input.sourceUrl),
    identityKey: input.identityKey,
    fields: input.fields.map((field) => ({ ...field })),
    records: input.rows.map((row) => {
      const values: Record<string, string | number | null> = {};

      for (const [key, value] of Object.entries(row.values)) {
        if (visibleKeys.has(key)) {
          values[key] = normalizeValue(value);
        }
      }

      return {
        identity: normalizeIdentity(row.values[input.identityKey]),
        sourceIndex: row.sourceIndex,
        observedAt: capturedAt,
        values
      };
    })
  };
}

export function captureHistoricalVersion(
  current: HistoricalSeries | null,
  input: HistoricalCaptureInput
): { series: HistoricalSeries; summary: HistoricalCaptureSummary } {
  validateInput(input);

  const capturedAt = new Date().toISOString();
  const nextVersion = (current?.latestVersion ?? 0) + 1;
  const snapshot = makeSnapshot(input, nextVersion, capturedAt);
  const previous = current?.snapshots[current.snapshots.length - 1] ?? null;
  const labels = fieldMap(previous, snapshot.fields);
  const nextMap = snapshotMap(snapshot);
  const previousMap = previous ? snapshotMap(previous) : new Map();
  const newChanges: HistoricalChangeItem[] = [];

  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;

  if (previous) {
    for (const [identity, after] of nextMap) {
      const before = previousMap.get(identity) ?? null;

      if (!before) {
        added += 1;
        newChanges.push({
          id: nextId("change"),
          kind: "added",
          identity,
          detectedAt: capturedAt,
          fromVersion: previous.snapshotVersion,
          toVersion: snapshot.snapshotVersion,
          fields: fieldChangesFor(null, after, labels),
          reviewStatus: "pending"
        });
        continue;
      }

      const fields = fieldChangesFor(before, after, labels);

      if (fields.length) {
        changed += 1;
        newChanges.push({
          id: nextId("change"),
          kind: "changed",
          identity,
          detectedAt: capturedAt,
          fromVersion: previous.snapshotVersion,
          toVersion: snapshot.snapshotVersion,
          fields,
          reviewStatus: "pending"
        });
      } else {
        unchanged += 1;
      }
    }

    for (const [identity, before] of previousMap) {
      if (nextMap.has(identity)) {
        continue;
      }

      removed += 1;
      newChanges.push({
        id: nextId("change"),
        kind: "removed",
        identity,
        detectedAt: capturedAt,
        fromVersion: previous.snapshotVersion,
        toVersion: snapshot.snapshotVersion,
        fields: fieldChangesFor(before, null, labels),
        reviewStatus: "pending"
      });
    }
  } else {
    unchanged = snapshot.records.length;
  }

  const priorChanges = current?.changes ?? [];
  const changes = [...priorChanges, ...newChanges].slice(-MAX_CHANGES);
  const pendingQueue = changes.filter(
    (item) => item.reviewStatus === "pending"
  ).length;
  const summary: HistoricalCaptureSummary = {
    snapshotVersion: nextVersion,
    baseline: !previous,
    added,
    removed,
    changed,
    unchanged,
    pendingQueue
  };
  const createdAt = current?.createdAt ?? capturedAt;
  const series: HistoricalSeries = {
    version: 1,
    id: current?.id ?? nextId("history"),
    seriesKey: historicalSeriesKey(
      input.recipeName,
      input.sourceUrl,
      input.identityKey
    ),
    recipeName: cleanName(input.recipeName),
    sourceUrl: input.sourceUrl,
    sourceScope: sourceScopeFor(input.sourceUrl),
    identityKey: input.identityKey,
    createdAt,
    updatedAt: capturedAt,
    latestVersion: nextVersion,
    snapshots: [...(current?.snapshots ?? []), snapshot].slice(-MAX_SNAPSHOTS),
    changes,
    lastSummary: summary
  };

  return { series, summary };
}
