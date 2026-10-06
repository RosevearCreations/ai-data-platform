import {
  buildCaptureSummary,
  normalizeRosieCompetitiveRows,
  updateCompetitorSeries
} from "./rosie-competitive-engine";
import type { RosieCompetitiveRow } from "./rosie-competitive-engine";
import type {
  OntarioDatasetCaptureSummary,
  OntarioDetailerDataset,
  RosieCompetitiveMapping
} from "./types";

const STORAGE_KEY = "ai-data-platform-rosie-ontario-detailers-v1";
const DATASET_ID = "rosie-dazzlers-ontario-detailers";
const MAX_SERIES = 75;

function emptyDataset(now = new Date().toISOString()): OntarioDetailerDataset {
  return {
    version: 1,
    id: DATASET_ID,
    province: "ON",
    createdAt: now,
    updatedAt: now,
    series: []
  };
}

function normalizeDataset(value: unknown): OntarioDetailerDataset | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<OntarioDetailerDataset>;

  if (
    candidate.version !== 1 ||
    candidate.id !== DATASET_ID ||
    candidate.province !== "ON" ||
    !Array.isArray(candidate.series)
  ) {
    return null;
  }

  return candidate as OntarioDetailerDataset;
}

export async function loadOntarioDetailerDataset() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeDataset(stored[STORAGE_KEY]) ?? emptyDataset();
}

async function writeOntarioDetailerDataset(dataset: OntarioDetailerDataset) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: dataset
  });
}

export async function saveOntarioCompetitiveCapture(input: {
  sourceUrl: string;
  retrievedAt: string;
  verifiedOntario: boolean;
  mapping: RosieCompetitiveMapping;
  rows: RosieCompetitiveRow[];
}): Promise<{
  dataset: OntarioDetailerDataset;
  summary: OntarioDatasetCaptureSummary;
}> {
  if (!input.verifiedOntario) {
    throw new Error(
      "Confirm that the included businesses are Ontario detailers before saving them to the Ontario dataset."
    );
  }

  const normalized = normalizeRosieCompetitiveRows({
    sourceUrl: input.sourceUrl,
    retrievedAt: input.retrievedAt,
    mapping: input.mapping,
    rows: input.rows
  });
  const bySeries = new Map<string, typeof normalized>();

  for (const offering of normalized) {
    const key = offering.sourceScope + "::" + offering.businessKey;
    const existing = bySeries.get(key) ?? [];
    existing.push(offering);
    bySeries.set(key, existing);
  }

  const current = await loadOntarioDetailerDataset();
  const seriesByKey = new Map(
    current.series.map((series) => [series.seriesKey, series])
  );
  let added = 0;
  let removed = 0;
  let changed = 0;
  let snapshotsCaptured = 0;

  for (const [seriesKey, offerings] of bySeries) {
    const result = updateCompetitorSeries(
      seriesByKey.get(seriesKey) ?? null,
      offerings,
      input.retrievedAt
    );
    seriesByKey.set(seriesKey, result.series);
    added += result.added;
    removed += result.removed;
    changed += result.changed;
    snapshotsCaptured += 1;
  }

  const now = new Date().toISOString();
  const dataset: OntarioDetailerDataset = {
    ...current,
    updatedAt: now,
    series: Array.from(seriesByKey.values())
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, MAX_SERIES)
  };
  await writeOntarioDetailerDataset(dataset);

  const businessCount = new Set(
    dataset.series.map((series) => series.businessKey)
  ).size;

  return {
    dataset,
    summary: buildCaptureSummary(
      bySeries.size,
      snapshotsCaptured,
      normalized.length,
      businessCount,
      added,
      removed,
      changed
    )
  };
}

export async function clearOntarioDetailerDataset() {
  await chrome.storage.local.remove(STORAGE_KEY);
  return emptyDataset();
}
