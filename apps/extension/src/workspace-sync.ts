import {
  getActiveWorkspaceId,
  getWorkspaceSyncCredentials
} from "./workspace-session";
import type {
  ReviewedDataset,
  SavedScraper,
  WorkspaceSyncConflict,
  WorkspaceSyncLocalState,
  WorkspaceSyncMetadataEntry,
  WorkspaceSyncQueueItem,
  WorkspaceSyncResource,
  WorkspaceSyncServerRecord,
  WorkspaceSyncSummary
} from "./types";

const SYNC_STATE_KEY = "ai-data-platform-workspace-sync-v1";
const SAVED_SCRAPERS_KEY = "ai-data-platform-saved-scrapers-v1";
const REVIEWED_DATASETS_KEY = "ai-data-platform:reviewed-datasets:v1";
const MAX_QUEUE = 500;
const MAX_CONFLICTS = 100;
const MAX_REVIEW_ROWS_SERVER = 500;

function nowIso() {
  return new Date().toISOString();
}

function syncKey(
  workspaceId: string,
  resource: WorkspaceSyncResource,
  recordId: string
) {
  return workspaceId + "::" + resource + "::" + recordId;
}

function emptyState(): WorkspaceSyncLocalState {
  return {
    version: 1,
    id: "ai-data-platform-workspace-sync",
    updatedAt: nowIso(),
    lastSyncAt: null,
    metadata: [],
    queue: [],
    conflicts: []
  };
}

function normalizeState(value: unknown): WorkspaceSyncLocalState {
  if (!value || typeof value !== "object") return emptyState();
  const candidate = value as Partial<WorkspaceSyncLocalState>;
  if (
    candidate.version !== 1 ||
    candidate.id !== "ai-data-platform-workspace-sync" ||
    !Array.isArray(candidate.metadata) ||
    !Array.isArray(candidate.queue) ||
    !Array.isArray(candidate.conflicts)
  ) {
    return emptyState();
  }
  return candidate as WorkspaceSyncLocalState;
}

export async function loadWorkspaceSyncState() {
  const stored = await chrome.storage.local.get(SYNC_STATE_KEY);
  return normalizeState(stored[SYNC_STATE_KEY]);
}

async function writeWorkspaceSyncState(state: WorkspaceSyncLocalState) {
  const next = { ...state, updatedAt: nowIso() };
  await chrome.storage.local.set({ [SYNC_STATE_KEY]: next });
  return next;
}

function asPayload(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeSavedScrapers(value: unknown): SavedScraper[] {
  if (!value || typeof value !== "object") return [];
  const envelope = value as { version?: unknown; items?: unknown };
  if (envelope.version !== 1 || !Array.isArray(envelope.items)) return [];

  return envelope.items.filter((item): item is SavedScraper => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<SavedScraper>;
    return (
      candidate.version === 1 &&
      typeof candidate.id === "string" &&
      (candidate.kind === "scraper" || candidate.kind === "template") &&
      typeof candidate.updatedAt === "string" &&
      Boolean(candidate.recipe)
    );
  });
}

async function loadAllSavedScrapers() {
  const stored = await chrome.storage.local.get(SAVED_SCRAPERS_KEY);
  return normalizeSavedScrapers(stored[SAVED_SCRAPERS_KEY]);
}

async function writeAllSavedScrapers(items: SavedScraper[]) {
  await chrome.storage.local.set({
    [SAVED_SCRAPERS_KEY]: { version: 1, items }
  });
}

function loadAllReviewedDatasets() {
  try {
    const raw = localStorage.getItem(REVIEWED_DATASETS_KEY);
    if (!raw) return [] as ReviewedDataset[];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as ReviewedDataset[];

    return parsed.filter((item): item is ReviewedDataset => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<ReviewedDataset>;
      return (
        candidate.version === 1 &&
        typeof candidate.id === "string" &&
        typeof candidate.updatedAt === "string" &&
        Array.isArray(candidate.rows) &&
        Array.isArray(candidate.columns)
      );
    });
  } catch {
    return [] as ReviewedDataset[];
  }
}

function writeAllReviewedDatasets(items: ReviewedDataset[]) {
  localStorage.setItem(REVIEWED_DATASETS_KEY, JSON.stringify(items));
}

function syncableReviewedDataset(dataset: ReviewedDataset): ReviewedDataset {
  if (dataset.rows.length <= MAX_REVIEW_ROWS_SERVER) {
    return {
      ...dataset,
      retrievedAt: dataset.retrievedAt ?? dataset.createdAt,
      syncTruncated: false
    };
  }

  const rows = dataset.rows.slice(0, MAX_REVIEW_ROWS_SERVER);
  return {
    ...dataset,
    retrievedAt: dataset.retrievedAt ?? dataset.createdAt,
    rows,
    syncTruncated: true,
    stats: {
      ...dataset.stats,
      totalRows: rows.length,
      includedRows: rows.filter((row) => row.included).length,
      excludedRows: rows.filter((row) => !row.included).length,
      editedCells: rows.reduce(
        (total, row) => total + row.editedKeys.length,
        0
      ),
      warningRows: rows.filter((row) => row.warnings.length > 0).length
    }
  };
}

function metadataFor(
  state: WorkspaceSyncLocalState,
  workspaceId: string,
  resource: WorkspaceSyncResource,
  recordId: string
) {
  const key = syncKey(workspaceId, resource, recordId);
  return state.metadata.find((entry) => entry.key === key) ?? null;
}

function replaceMetadata(
  state: WorkspaceSyncLocalState,
  entry: WorkspaceSyncMetadataEntry
) {
  return {
    ...state,
    metadata: [
      entry,
      ...state.metadata.filter((item) => item.key !== entry.key)
    ]
  };
}

function replaceConflict(
  state: WorkspaceSyncLocalState,
  conflict: WorkspaceSyncConflict
) {
  return {
    ...state,
    conflicts: [
      conflict,
      ...state.conflicts.filter((item) => item.key !== conflict.key)
    ].slice(0, MAX_CONFLICTS)
  };
}

function removeConflict(
  state: WorkspaceSyncLocalState,
  key: string
) {
  return {
    ...state,
    conflicts: state.conflicts.filter((item) => item.key !== key)
  };
}

function replaceQueueItem(
  state: WorkspaceSyncLocalState,
  item: WorkspaceSyncQueueItem
) {
  const key = syncKey(item.workspaceId, item.resource, item.recordId);
  return {
    ...state,
    queue: [
      item,
      ...state.queue.filter(
        (entry) =>
          syncKey(entry.workspaceId, entry.resource, entry.recordId) !== key
      )
    ].slice(0, MAX_QUEUE)
  };
}

function removeQueueItem(
  state: WorkspaceSyncLocalState,
  workspaceId: string,
  resource: WorkspaceSyncResource,
  recordId: string
) {
  const key = syncKey(workspaceId, resource, recordId);
  return {
    ...state,
    queue: state.queue.filter(
      (entry) =>
        syncKey(entry.workspaceId, entry.resource, entry.recordId) !== key
    )
  };
}

export async function queueWorkspaceSyncUpsert(input: {
  workspaceId: string;
  resource: WorkspaceSyncResource;
  recordId: string;
  clientUpdatedAt: string;
  payload: Record<string, unknown>;
}) {
  let state = await loadWorkspaceSyncState();
  const key = syncKey(input.workspaceId, input.resource, input.recordId);
  const metadata = metadataFor(
    state,
    input.workspaceId,
    input.resource,
    input.recordId
  );
  const existingConflict = state.conflicts.some(
    (conflict) => conflict.key === key
  );

  if (existingConflict) {
    state = replaceMetadata(state, {
      key,
      workspaceId: input.workspaceId,
      resource: input.resource,
      recordId: input.recordId,
      serverVersion: metadata?.serverVersion ?? null,
      state: "conflict",
      localUpdatedAt: input.clientUpdatedAt,
      lastSyncedAt: metadata?.lastSyncedAt ?? null,
      error: "Resolve the existing sync conflict before uploading this change."
    });
    return writeWorkspaceSyncState(state);
  }

  const queueItem: WorkspaceSyncQueueItem = {
    id: "sync-queue-" + crypto.randomUUID(),
    workspaceId: input.workspaceId,
    resource: input.resource,
    recordId: input.recordId,
    action: "upsert",
    expectedServerVersion: metadata?.serverVersion ?? null,
    clientUpdatedAt: input.clientUpdatedAt,
    payload: input.payload,
    enqueuedAt: nowIso(),
    attempts: 0
  };

  state = replaceQueueItem(state, queueItem);
  state = replaceMetadata(state, {
    key,
    workspaceId: input.workspaceId,
    resource: input.resource,
    recordId: input.recordId,
    serverVersion: metadata?.serverVersion ?? null,
    state: "queued",
    localUpdatedAt: input.clientUpdatedAt,
    lastSyncedAt: metadata?.lastSyncedAt ?? null,
    error: ""
  });

  return writeWorkspaceSyncState(state);
}

export async function queueWorkspaceSyncDelete(input: {
  workspaceId: string;
  resource: WorkspaceSyncResource;
  recordId: string;
  clientUpdatedAt: string;
}) {
  let state = await loadWorkspaceSyncState();
  const metadata = metadataFor(
    state,
    input.workspaceId,
    input.resource,
    input.recordId
  );

  if (!metadata?.serverVersion) {
    state = removeQueueItem(
      state,
      input.workspaceId,
      input.resource,
      input.recordId
    );
    state = {
      ...state,
      metadata: state.metadata.filter(
        (entry) =>
          entry.key !==
          syncKey(input.workspaceId, input.resource, input.recordId)
      )
    };
    return writeWorkspaceSyncState(state);
  }

  const item: WorkspaceSyncQueueItem = {
    id: "sync-queue-" + crypto.randomUUID(),
    workspaceId: input.workspaceId,
    resource: input.resource,
    recordId: input.recordId,
    action: "delete",
    expectedServerVersion: metadata.serverVersion,
    clientUpdatedAt: input.clientUpdatedAt,
    payload: null,
    enqueuedAt: nowIso(),
    attempts: 0
  };

  state = replaceQueueItem(state, item);
  state = replaceMetadata(state, {
    ...metadata,
    state: "deleted",
    localUpdatedAt: input.clientUpdatedAt,
    error: ""
  });

  return writeWorkspaceSyncState(state);
}

async function localPayload(
  workspaceId: string,
  resource: WorkspaceSyncResource,
  recordId: string
) {
  if (resource === "saved-scraper") {
    const item = (await loadAllSavedScrapers()).find(
      (candidate) =>
        candidate.workspaceId === workspaceId &&
        candidate.id === recordId
    );
    return item ? asPayload(item) : null;
  }

  const item = loadAllReviewedDatasets().find(
    (candidate) =>
      candidate.workspaceId === workspaceId &&
      candidate.id === recordId
  );
  return item ? asPayload(syncableReviewedDataset(item)) : null;
}

async function localRecordsForWorkspace(workspaceId: string) {
  const scrapers = (await loadAllSavedScrapers())
    .filter((item) => item.workspaceId === workspaceId)
    .map((item) => ({
      resource: "saved-scraper" as const,
      recordId: item.id,
      updatedAt: item.updatedAt,
      payload: asPayload(item)
    }));

  const datasets = loadAllReviewedDatasets()
    .filter((item) => item.workspaceId === workspaceId)
    .map((item) => {
      const bounded = syncableReviewedDataset(item);
      return {
        resource: "reviewed-dataset" as const,
        recordId: item.id,
        updatedAt: item.updatedAt,
        payload: asPayload(bounded)
      };
    });

  return [...scrapers, ...datasets];
}

async function prepareUnsyncedLocalRecords(workspaceId: string) {
  let state = await loadWorkspaceSyncState();
  const local = await localRecordsForWorkspace(workspaceId);

  for (const record of local) {
    const key = syncKey(workspaceId, record.resource, record.recordId);
    const hasMetadata = state.metadata.some((entry) => entry.key === key);
    const hasQueue = state.queue.some(
      (entry) =>
        syncKey(entry.workspaceId, entry.resource, entry.recordId) === key
    );
    const hasConflict = state.conflicts.some(
      (entry) => entry.key === key
    );

    if (hasMetadata || hasQueue || hasConflict) continue;

    const item: WorkspaceSyncQueueItem = {
      id: "sync-queue-" + crypto.randomUUID(),
      workspaceId,
      resource: record.resource,
      recordId: record.recordId,
      action: "upsert",
      expectedServerVersion: null,
      clientUpdatedAt: record.updatedAt,
      payload: record.payload,
      enqueuedAt: nowIso(),
      attempts: 0
    };

    state = replaceQueueItem(state, item);
    state = replaceMetadata(state, {
      key,
      workspaceId,
      resource: record.resource,
      recordId: record.recordId,
      serverVersion: null,
      state: "queued",
      localUpdatedAt: record.updatedAt,
      lastSyncedAt: null,
      error: ""
    });
  }

  await writeWorkspaceSyncState(state);
}

async function postQueueItem(
  platformOrigin: string,
  token: string,
  item: WorkspaceSyncQueueItem
) {
  const response = await fetch(
    new URL("/api/extension/sync", platformOrigin),
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspaceId: item.workspaceId,
        mutation: {
          resource: item.resource,
          action: item.action,
          recordId: item.recordId,
          expectedServerVersion: item.expectedServerVersion,
          clientUpdatedAt: item.clientUpdatedAt,
          payload: item.payload
        }
      })
    }
  );

  if (response.status === 401) {
    throw new Error("The extension session expired during synchronization.");
  }
  if (response.status === 403) {
    throw new Error("The current account no longer has access to this workspace.");
  }
  if (!response.ok) {
    throw new Error("Workspace sync returned HTTP " + response.status + ".");
  }

  return (await response.json()) as {
    result: {
      status: "applied" | "conflict" | "noop";
      record: WorkspaceSyncServerRecord | null;
    };
  };
}

async function fetchServerRecords(
  platformOrigin: string,
  token: string,
  workspaceId: string
) {
  const url = new URL("/api/extension/sync", platformOrigin);
  url.searchParams.set("workspaceId", workspaceId);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (response.status === 401) {
    throw new Error("The extension session expired during synchronization.");
  }
  if (response.status === 403) {
    throw new Error("The current account no longer has access to this workspace.");
  }
  if (!response.ok) {
    throw new Error("Workspace sync returned HTTP " + response.status + ".");
  }

  const payload = (await response.json()) as {
    records: WorkspaceSyncServerRecord[];
  };
  return payload.records;
}

async function flushQueue(
  platformOrigin: string,
  token: string,
  workspaceId: string
) {
  let pushed = 0;
  let deleted = 0;
  let conflictCount = 0;
  let state = await loadWorkspaceSyncState();

  const items = state.queue
    .filter((item) => item.workspaceId === workspaceId)
    .sort((left, right) => left.enqueuedAt.localeCompare(right.enqueuedAt));

  for (const item of items) {
    try {
      const response = await postQueueItem(platformOrigin, token, item);
      state = await loadWorkspaceSyncState();
      state = removeQueueItem(
        state,
        item.workspaceId,
        item.resource,
        item.recordId
      );

      const key = syncKey(item.workspaceId, item.resource, item.recordId);

      if (response.result.status === "conflict") {
        const conflict: WorkspaceSyncConflict = {
          key,
          workspaceId: item.workspaceId,
          resource: item.resource,
          recordId: item.recordId,
          detectedAt: nowIso(),
          localPayload: item.payload,
          serverRecord: response.result.record
        };
        state = replaceConflict(state, conflict);
        state = replaceMetadata(state, {
          key,
          workspaceId: item.workspaceId,
          resource: item.resource,
          recordId: item.recordId,
          serverVersion: response.result.record?.serverVersion ?? null,
          state: "conflict",
          localUpdatedAt: item.clientUpdatedAt,
          lastSyncedAt: null,
          error: "Server version changed before this local update could be applied."
        });
        conflictCount += 1;
      } else if (item.action === "delete") {
        state = removeConflict(state, key);
        if (response.result.record) {
          state = replaceMetadata(state, {
            key,
            workspaceId: item.workspaceId,
            resource: item.resource,
            recordId: item.recordId,
            serverVersion: response.result.record.serverVersion,
            state: "clean",
            localUpdatedAt: item.clientUpdatedAt,
            lastSyncedAt: nowIso(),
            error: ""
          });
        } else {
          state = {
            ...state,
            metadata: state.metadata.filter((entry) => entry.key !== key)
          };
        }
        deleted += 1;
      } else if (response.result.record) {
        state = removeConflict(state, key);
        state = replaceMetadata(state, {
          key,
          workspaceId: item.workspaceId,
          resource: item.resource,
          recordId: item.recordId,
          serverVersion: response.result.record.serverVersion,
          state: "clean",
          localUpdatedAt: response.result.record.clientUpdatedAt,
          lastSyncedAt: nowIso(),
          error: ""
        });
        pushed += 1;
      }

      await writeWorkspaceSyncState(state);
    } catch (reason) {
      state = await loadWorkspaceSyncState();
      const current = state.queue.find((entry) => entry.id === item.id);
      if (current) {
        const updated = {
          ...current,
          attempts: current.attempts + 1
        };
        state = replaceQueueItem(state, updated);
      }

      const key = syncKey(item.workspaceId, item.resource, item.recordId);
      const metadata = metadataFor(
        state,
        item.workspaceId,
        item.resource,
        item.recordId
      );
      if (metadata) {
        state = replaceMetadata(state, {
          ...metadata,
          state: "queued",
          error:
            reason instanceof Error
              ? reason.message
              : "Synchronization is temporarily unavailable."
        });
      }
      await writeWorkspaceSyncState(state);
      break;
    }
  }

  return { pushed, deleted, conflictCount };
}

function validSavedScraperPayload(
  payload: Record<string, unknown>
): SavedScraper | null {
  const value = payload as unknown as Partial<SavedScraper>;
  return (
    value.version === 1 &&
    typeof value.id === "string" &&
    typeof value.workspaceId === "string" &&
    (value.kind === "scraper" || value.kind === "template") &&
    typeof value.updatedAt === "string" &&
    Boolean(value.recipe)
  )
    ? (value as SavedScraper)
    : null;
}

function validReviewedDatasetPayload(
  payload: Record<string, unknown>
): ReviewedDataset | null {
  const value = payload as unknown as Partial<ReviewedDataset>;
  return (
    value.version === 1 &&
    typeof value.id === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.rows) &&
    Array.isArray(value.columns)
  )
    ? (value as ReviewedDataset)
    : null;
}

async function applyServerRecord(record: WorkspaceSyncServerRecord) {
  if (record.resource === "saved-scraper") {
    const all = await loadAllSavedScrapers();
    const without = all.filter(
      (item) =>
        !(
          item.workspaceId === record.workspaceId &&
          item.id === record.recordId
        )
    );

    if (record.deleted) {
      await writeAllSavedScrapers(without);
      return;
    }

    const parsed = validSavedScraperPayload(record.payload);
    if (!parsed) {
      throw new Error("Server saved-scraper payload failed local validation.");
    }
    await writeAllSavedScrapers([parsed, ...without]);
    return;
  }

  const all = loadAllReviewedDatasets();
  const without = all.filter(
    (item) =>
      !(
        item.workspaceId === record.workspaceId &&
        item.id === record.recordId
      )
  );

  if (record.deleted) {
    writeAllReviewedDatasets(without);
    return;
  }

  const parsed = validReviewedDatasetPayload(record.payload);
  if (!parsed) {
    throw new Error("Server reviewed-dataset payload failed local validation.");
  }
  writeAllReviewedDatasets([parsed, ...without]);
}

async function mergeServerRecords(
  workspaceId: string,
  records: WorkspaceSyncServerRecord[]
) {
  let pulled = 0;
  let deleted = 0;
  let state = await loadWorkspaceSyncState();

  for (const record of records) {
    const key = syncKey(workspaceId, record.resource, record.recordId);
    if (state.conflicts.some((conflict) => conflict.key === key)) {
      continue;
    }

    const metadata = metadataFor(
      state,
      workspaceId,
      record.resource,
      record.recordId
    );
    const queued = state.queue.some(
      (item) =>
        syncKey(item.workspaceId, item.resource, item.recordId) === key
    );

    if (queued || metadata?.state === "dirty") {
      continue;
    }

    if (
      metadata?.serverVersion === record.serverVersion &&
      metadata.state === "clean"
    ) {
      const local = await localPayload(
        workspaceId,
        record.resource,
        record.recordId
      );
      if (local || record.deleted) continue;
    }

    await applyServerRecord(record);
    state = replaceMetadata(state, {
      key,
      workspaceId,
      resource: record.resource,
      recordId: record.recordId,
      serverVersion: record.serverVersion,
      state: "clean",
      localUpdatedAt: record.clientUpdatedAt,
      lastSyncedAt: nowIso(),
      error: ""
    });
    state = removeConflict(state, key);

    if (record.deleted) {
      deleted += 1;
    } else {
      pulled += 1;
    }
  }

  await writeWorkspaceSyncState(state);
  return { pulled, deleted };
}

export async function synchronizeActiveWorkspace(): Promise<WorkspaceSyncSummary> {
  const credentials = await getWorkspaceSyncCredentials();
  await prepareUnsyncedLocalRecords(credentials.workspaceId);

  const flushed = await flushQueue(
    credentials.platformOrigin,
    credentials.token,
    credentials.workspaceId
  );

  const records = await fetchServerRecords(
    credentials.platformOrigin,
    credentials.token,
    credentials.workspaceId
  );
  const merged = await mergeServerRecords(credentials.workspaceId, records);

  let state = await loadWorkspaceSyncState();
  const lastSyncAt = nowIso();
  state = await writeWorkspaceSyncState({
    ...state,
    lastSyncAt
  });

  return {
    workspaceId: credentials.workspaceId,
    pushed: flushed.pushed,
    pulled: merged.pulled,
    deleted: flushed.deleted + merged.deleted,
    conflicts:
      state.conflicts.filter(
        (conflict) => conflict.workspaceId === credentials.workspaceId
      ).length,
    queued:
      state.queue.filter(
        (item) => item.workspaceId === credentials.workspaceId
      ).length,
    lastSyncAt
  };
}

export async function queueReviewedDatasetForSync(
  dataset: ReviewedDataset
) {
  if (!dataset.workspaceId) {
    throw new Error("Reviewed dataset is missing its workspace ID.");
  }

  const bounded = syncableReviewedDataset(dataset);
  await queueWorkspaceSyncUpsert({
    workspaceId: dataset.workspaceId,
    resource: "reviewed-dataset",
    recordId: dataset.id,
    clientUpdatedAt: dataset.updatedAt,
    payload: asPayload(bounded)
  });
  scheduleWorkspaceSyncAttempt();

  return {
    queuedRows: bounded.rows.length,
    truncated: Boolean(bounded.syncTruncated)
  };
}

export function scheduleWorkspaceSyncAttempt() {
  void synchronizeActiveWorkspace().catch(() => {
    // The queued local operation remains durable for the next retry.
  });
}

export async function getActiveWorkspaceSyncSummary() {
  const workspaceId = await getActiveWorkspaceId();
  const state = await loadWorkspaceSyncState();

  if (!workspaceId) {
    return {
      workspaceId: "",
      queued: 0,
      conflicts: 0,
      lastSyncAt: state.lastSyncAt
    };
  }

  return {
    workspaceId,
    queued: state.queue.filter((item) => item.workspaceId === workspaceId).length,
    conflicts: state.conflicts.filter(
      (item) => item.workspaceId === workspaceId
    ).length,
    lastSyncAt: state.lastSyncAt
  };
}

export async function migrationCandidatesForActiveWorkspace() {
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) {
    return { workspaceId: "", savedScrapers: 0, reviewedDatasets: 0, total: 0 };
  }

  const scrapers = await loadAllSavedScrapers();
  const datasets = loadAllReviewedDatasets();

  const savedScrapers = scrapers.filter(
    (item) =>
      !item.workspaceId &&
      !(item.legacyMigrationCompletedFor ?? []).includes(workspaceId)
  ).length;
  const reviewedDatasets = datasets.filter(
    (item) =>
      !item.workspaceId &&
      !(item.legacyMigrationCompletedFor ?? []).includes(workspaceId)
  ).length;

  return {
    workspaceId,
    savedScrapers,
    reviewedDatasets,
    total: savedScrapers + reviewedDatasets
  };
}

function migratedId(
  originalId: string,
  used: Set<string>
) {
  if (!used.has(originalId)) {
    used.add(originalId);
    return originalId;
  }

  let candidate = originalId + "-migrated";
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = originalId + "-migrated-" + suffix;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export async function copyLegacyRecordsIntoActiveWorkspace() {
  const credentials = await getWorkspaceSyncCredentials();
  const workspaceId = credentials.workspaceId;
  const now = nowIso();

  const allScrapers = await loadAllSavedScrapers();
  const scraperIds = new Set(
    allScrapers
      .filter((item) => item.workspaceId === workspaceId)
      .map((item) => item.id)
  );
  const scraperCopies: SavedScraper[] = [];
  const nextScrapers = allScrapers.map((item) => {
    if (
      item.workspaceId ||
      (item.legacyMigrationCompletedFor ?? []).includes(workspaceId)
    ) {
      return item;
    }

    const copy: SavedScraper = {
      ...item,
      id: migratedId(item.id, scraperIds),
      workspaceId,
      legacyMigrationCompletedFor: undefined,
      updatedAt: now
    };
    scraperCopies.push(copy);

    return {
      ...item,
      legacyMigrationCompletedFor: [
        ...(item.legacyMigrationCompletedFor ?? []),
        workspaceId
      ]
    };
  });
  await writeAllSavedScrapers([...scraperCopies, ...nextScrapers]);

  const allDatasets = loadAllReviewedDatasets();
  const datasetIds = new Set(
    allDatasets
      .filter((item) => item.workspaceId === workspaceId)
      .map((item) => item.id)
  );
  const datasetCopies: ReviewedDataset[] = [];
  const nextDatasets = allDatasets.map((item) => {
    if (
      item.workspaceId ||
      (item.legacyMigrationCompletedFor ?? []).includes(workspaceId)
    ) {
      return item;
    }

    const copy: ReviewedDataset = {
      ...item,
      id: migratedId(item.id, datasetIds),
      workspaceId,
      retrievedAt: item.retrievedAt ?? item.createdAt,
      legacyMigrationCompletedFor: undefined,
      updatedAt: now
    };
    datasetCopies.push(copy);

    return {
      ...item,
      legacyMigrationCompletedFor: [
        ...(item.legacyMigrationCompletedFor ?? []),
        workspaceId
      ]
    };
  });
  writeAllReviewedDatasets([...datasetCopies, ...nextDatasets]);

  for (const item of scraperCopies) {
    await queueWorkspaceSyncUpsert({
      workspaceId,
      resource: "saved-scraper",
      recordId: item.id,
      clientUpdatedAt: item.updatedAt,
      payload: asPayload(item)
    });
  }

  for (const item of datasetCopies) {
    const bounded = syncableReviewedDataset(item);
    await queueWorkspaceSyncUpsert({
      workspaceId,
      resource: "reviewed-dataset",
      recordId: item.id,
      clientUpdatedAt: item.updatedAt,
      payload: asPayload(bounded)
    });
  }

  return {
    savedScrapers: scraperCopies.length,
    reviewedDatasets: datasetCopies.length,
    total: scraperCopies.length + datasetCopies.length
  };
}

export async function resolveWorkspaceSyncConflict(
  key: string,
  resolution: "use-server" | "keep-local"
) {
  let state = await loadWorkspaceSyncState();
  const conflict = state.conflicts.find((item) => item.key === key);
  if (!conflict) {
    throw new Error("The sync conflict no longer exists.");
  }

  if (resolution === "use-server") {
    if (conflict.serverRecord) {
      await applyServerRecord(conflict.serverRecord);
      state = replaceMetadata(state, {
        key,
        workspaceId: conflict.workspaceId,
        resource: conflict.resource,
        recordId: conflict.recordId,
        serverVersion: conflict.serverRecord.serverVersion,
        state: "clean",
        localUpdatedAt: conflict.serverRecord.clientUpdatedAt,
        lastSyncedAt: nowIso(),
        error: ""
      });
    } else {
      if (conflict.resource === "saved-scraper") {
        const all = await loadAllSavedScrapers();
        await writeAllSavedScrapers(
          all.filter(
            (item) =>
              !(
                item.workspaceId === conflict.workspaceId &&
                item.id === conflict.recordId
              )
          )
        );
      } else {
        writeAllReviewedDatasets(
          loadAllReviewedDatasets().filter(
            (item) =>
              !(
                item.workspaceId === conflict.workspaceId &&
                item.id === conflict.recordId
              )
          )
        );
      }
      state = {
        ...state,
        metadata: state.metadata.filter((entry) => entry.key !== key)
      };
    }

    state = removeConflict(state, key);
    state = removeQueueItem(
      state,
      conflict.workspaceId,
      conflict.resource,
      conflict.recordId
    );
    await writeWorkspaceSyncState(state);
    return;
  }

  const payload = await localPayload(
    conflict.workspaceId,
    conflict.resource,
    conflict.recordId
  );
  const expectedServerVersion =
    conflict.serverRecord?.serverVersion ?? null;

  state = removeConflict(state, key);

  const item: WorkspaceSyncQueueItem = {
    id: "sync-queue-" + crypto.randomUUID(),
    workspaceId: conflict.workspaceId,
    resource: conflict.resource,
    recordId: conflict.recordId,
    action: payload ? "upsert" : "delete",
    expectedServerVersion,
    clientUpdatedAt:
      (payload?.updatedAt as string | undefined) ?? nowIso(),
    payload,
    enqueuedAt: nowIso(),
    attempts: 0
  };

  state = replaceQueueItem(state, item);
  state = replaceMetadata(state, {
    key,
    workspaceId: conflict.workspaceId,
    resource: conflict.resource,
    recordId: conflict.recordId,
    serverVersion: expectedServerVersion,
    state: payload ? "queued" : "deleted",
    localUpdatedAt: item.clientUpdatedAt,
    lastSyncedAt: null,
    error: ""
  });
  await writeWorkspaceSyncState(state);
  return synchronizeActiveWorkspace();
}
