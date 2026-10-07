import {
  applyMovieMetadata,
  buildMovieMatchQueue,
  collectionRecordsFromRows,
  metadataCandidatesFromRows
} from "./movie-metadata-engine";
import type {
  MovieCollectionImportMapping,
  MovieMatchReviewStatus,
  MovieMetadataMapping,
  MovieMetadataModuleDataset,
  MovieMetadataQueueSummary,
  MovieMetadataSource
} from "./types";
import type { MovieReviewedRow, TabularRow } from "./movie-metadata-engine";

import { scheduleIntelligenceSyncAttempt } from "./intelligence-sync";

const STORAGE_KEY = "ai-data-platform-personal-movie-metadata-v1";
const DATASET_ID = "personal-movie-metadata-module";
const MAX_COLLECTION = 7500;
const MAX_QUEUE = 1000;

function emptyDataset(now = new Date().toISOString()): MovieMetadataModuleDataset {
  return {
    version: 1,
    id: DATASET_ID,
    createdAt: now,
    updatedAt: now,
    collection: [],
    matchQueue: []
  };
}

function normalizeDataset(value: unknown): MovieMetadataModuleDataset | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MovieMetadataModuleDataset>;
  if (
    candidate.version !== 1 ||
    candidate.id !== DATASET_ID ||
    !Array.isArray(candidate.collection) ||
    !Array.isArray(candidate.matchQueue)
  ) {
    return null;
  }
  return candidate as MovieMetadataModuleDataset;
}

async function writeDataset(dataset: MovieMetadataModuleDataset) {
  await chrome.storage.local.set({ [STORAGE_KEY]: dataset });
  scheduleIntelligenceSyncAttempt();
}

export async function loadMovieMetadataModule() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeDataset(stored[STORAGE_KEY]) ?? emptyDataset();
}

function collectionIdentity(record: MovieMetadataModuleDataset["collection"][number]) {
  if (record.externalIds.imdb) return "imdb::" + record.externalIds.imdb;
  if (record.externalIds.tmdb) return "tmdb::" + record.externalIds.tmdb;
  if (record.upc) return "upc::" + record.upc;
  return (
    "title::" +
    record.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() +
    "::" +
    (record.year ?? "")
  );
}

function appendCollectionPreservingOwnedFields(
  current: MovieMetadataModuleDataset["collection"],
  imported: MovieMetadataModuleDataset["collection"]
) {
  const byIdentity = new Map(
    current.map((record) => [collectionIdentity(record), record])
  );

  for (const record of imported) {
    const key = collectionIdentity(record);
    if (!byIdentity.has(key)) {
      byIdentity.set(key, record);
    }
  }

  return Array.from(byIdentity.values()).slice(-MAX_COLLECTION);
}

export async function importMovieCollection(input: {
  rows: TabularRow[];
  mapping: MovieCollectionImportMapping;
  replaceExisting: boolean;
}) {
  const imported = collectionRecordsFromRows(input.rows, input.mapping);
  const current = await loadMovieMetadataModule();
  const now = new Date().toISOString();

  const collection = input.replaceExisting
    ? imported.slice(0, MAX_COLLECTION)
    : appendCollectionPreservingOwnedFields(current.collection, imported);

  const dataset: MovieMetadataModuleDataset = {
    ...current,
    updatedAt: now,
    collection,
    matchQueue: input.replaceExisting ? [] : current.matchQueue
  };

  await writeDataset(dataset);
  return dataset;
}

export async function queueMovieMetadataMatches(input: {
  sourceUrl: string;
  retrievedAt: string;
  provider: MovieMetadataSource;
  mapping: MovieMetadataMapping;
  rows: MovieReviewedRow[];
}) {
  const current = await loadMovieMetadataModule();
  if (!current.collection.length) {
    throw new Error("Import the owned movie collection before matching metadata.");
  }

  const candidates = metadataCandidatesFromRows(input);
  const queue = buildMovieMatchQueue(current.collection, candidates);
  const now = new Date().toISOString();

  const dataset: MovieMetadataModuleDataset = {
    ...current,
    updatedAt: now,
    matchQueue: [...queue, ...current.matchQueue].slice(0, MAX_QUEUE)
  };

  await writeDataset(dataset);
  return { dataset, summary: summarizeMovieQueue(dataset, candidates.length) };
}

export async function reviewMovieMatch(
  itemId: string,
  status: MovieMatchReviewStatus
) {
  const current = await loadMovieMetadataModule();
  const index = current.matchQueue.findIndex((item) => item.id === itemId);
  if (index < 0) throw new Error("The movie metadata match no longer exists.");

  const item = current.matchQueue[index];
  if (status === "approved" && (!item.recordId || item.confidence === "unmatched")) {
    throw new Error("Choose a valid owned movie match before approving metadata.");
  }

  const now = new Date().toISOString();
  let collection = current.collection;

  if (status === "approved" && item.recordId) {
    collection = current.collection.map((record) =>
      record.id === item.recordId
        ? applyMovieMetadata(record, item.candidate)
        : record
    );
  }

  const matchQueue = current.matchQueue.map((queueItem) =>
    queueItem.id === itemId
      ? {
          ...queueItem,
          reviewStatus: status,
          reviewedAt: status === "pending" ? null : now,
          updatedAt: now
        }
      : queueItem
  );

  const dataset = { ...current, updatedAt: now, collection, matchQueue };
  await writeDataset(dataset);
  return dataset;
}

export async function assignMovieMatch(itemId: string, recordId: string) {
  const current = await loadMovieMetadataModule();
  const record = current.collection.find((entry) => entry.id === recordId);
  if (!record) throw new Error("The selected owned movie no longer exists.");

  const now = new Date().toISOString();
  const matchQueue = current.matchQueue.map((item) =>
    item.id === itemId
      ? {
          ...item,
          recordId,
          recordTitle: record.title,
          confidence: "ambiguous" as const,
          reasons: [...item.reasons, "Owned movie selected manually"],
          competingRecordIds: [],
          reviewStatus: "pending" as const,
          reviewedAt: null,
          updatedAt: now
        }
      : item
  );

  const dataset = { ...current, updatedAt: now, matchQueue };
  await writeDataset(dataset);
  return dataset;
}

export async function removeMovieMatch(itemId: string) {
  const current = await loadMovieMetadataModule();
  const now = new Date().toISOString();
  const dataset = {
    ...current,
    updatedAt: now,
    matchQueue: current.matchQueue.filter((item) => item.id !== itemId)
  };
  await writeDataset(dataset);
  return dataset;
}

export function summarizeMovieQueue(
  dataset: MovieMetadataModuleDataset,
  candidates = 0
): MovieMetadataQueueSummary {
  return {
    candidates,
    exact: dataset.matchQueue.filter((item) => item.confidence === "exact").length,
    strong: dataset.matchQueue.filter((item) => item.confidence === "strong").length,
    ambiguous: dataset.matchQueue.filter((item) => item.confidence === "ambiguous").length,
    unmatched: dataset.matchQueue.filter((item) => item.confidence === "unmatched").length,
    pending: dataset.matchQueue.filter((item) => item.reviewStatus === "pending").length,
    approved: dataset.matchQueue.filter((item) => item.reviewStatus === "approved").length,
    rejected: dataset.matchQueue.filter((item) => item.reviewStatus === "rejected").length
  };
}
