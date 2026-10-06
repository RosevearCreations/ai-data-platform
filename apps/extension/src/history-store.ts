import { captureHistoricalVersion, historicalSeriesKey } from "./history-engine";
import type { HistoricalCaptureRow } from "./history-engine";
import type {
  HistoricalCaptureSummary,
  HistoricalFieldDefinition,
  HistoricalSeries,
  HistoryReviewStatus
} from "./types";

const STORAGE_KEY = "ai-data-platform-history-series-v1";
const MAX_SERIES = 30;

interface StoredHistory {
  version: 1;
  series: HistoricalSeries[];
}

function normalizeStored(value: unknown): HistoricalSeries[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const stored = value as Partial<StoredHistory>;

  if (stored.version !== 1 || !Array.isArray(stored.series)) {
    return [];
  }

  return stored.series.filter((item): item is HistoricalSeries => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Partial<HistoricalSeries>;
    return (
      candidate.version === 1 &&
      typeof candidate.id === "string" &&
      typeof candidate.seriesKey === "string" &&
      typeof candidate.latestVersion === "number" &&
      Array.isArray(candidate.snapshots) &&
      Array.isArray(candidate.changes) &&
      Boolean(candidate.lastSummary)
    );
  });
}

export async function loadHistoricalSeries() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeStored(stored[STORAGE_KEY]).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

async function writeHistoricalSeries(series: HistoricalSeries[]) {
  const stored: StoredHistory = {
    version: 1,
    series: series.slice(0, MAX_SERIES)
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: stored });
}

export async function findHistoricalSeries(
  recipeName: string,
  sourceUrl: string,
  identityKey: string
) {
  const key = historicalSeriesKey(recipeName, sourceUrl, identityKey);
  const series = await loadHistoricalSeries();
  return series.find((item) => item.seriesKey === key) ?? null;
}

export async function saveHistoricalCapture(input: {
  recipeName: string;
  sourceUrl: string;
  identityKey: string;
  fields: HistoricalFieldDefinition[];
  rows: HistoricalCaptureRow[];
}): Promise<{
  series: HistoricalSeries;
  summary: HistoricalCaptureSummary;
}> {
  const all = await loadHistoricalSeries();
  const key = historicalSeriesKey(
    input.recipeName,
    input.sourceUrl,
    input.identityKey
  );
  const current = all.find((item) => item.seriesKey === key) ?? null;
  const result = captureHistoricalVersion(current, input);
  const next = [
    result.series,
    ...all.filter((item) => item.seriesKey !== key)
  ];

  await writeHistoricalSeries(next);
  return result;
}

export async function updateHistoricalReviewStatus(
  seriesId: string,
  changeId: string,
  reviewStatus: HistoryReviewStatus
): Promise<HistoricalSeries> {
  const all = await loadHistoricalSeries();
  const index = all.findIndex((series) => series.id === seriesId);

  if (index < 0) {
    throw new Error("Historical series no longer exists.");
  }

  const series = all[index];
  const changes = series.changes.map((change) =>
    change.id === changeId ? { ...change, reviewStatus } : change
  );
  const pendingQueue = changes.filter(
    (change) => change.reviewStatus === "pending"
  ).length;
  const updated: HistoricalSeries = {
    ...series,
    changes,
    updatedAt: new Date().toISOString(),
    lastSummary: {
      ...series.lastSummary,
      pendingQueue
    }
  };
  const next = [...all];
  next[index] = updated;

  await writeHistoricalSeries(next);
  return updated;
}

export async function deleteHistoricalSeries(seriesId: string) {
  const all = await loadHistoricalSeries();
  await writeHistoricalSeries(all.filter((series) => series.id !== seriesId));
}
