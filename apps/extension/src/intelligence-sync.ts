import {
  applyIntelligenceServerRecord,
  buildLocalIntelligenceSnapshots
} from "./intelligence-local";
import {
  getCachedAuthorizedWorkspaces,
  getWorkspaceSyncCredentials
} from "./workspace-session";
import type {
  IntelligenceServerRecord,
  IntelligenceSyncConflict,
  IntelligenceSyncLocalState,
  IntelligenceSyncMetadata,
  IntelligenceSyncQueueItem,
  IntelligenceSyncSummary
} from "./types";

const STATE_KEY = "ai-data-platform-intelligence-sync-v1";
const MAX_QUEUE = 100;
const MAX_CONFLICTS = 50;

function nowIso() {
  return new Date().toISOString();
}

function itemKey(workspaceId: string, moduleKey: string) {
  return workspaceId + "::" + moduleKey;
}

function emptyState(): IntelligenceSyncLocalState {
  return {
    version: 1,
    id: "ai-data-platform-intelligence-sync",
    updatedAt: nowIso(),
    lastSyncAt: null,
    metadata: [],
    queue: [],
    conflicts: []
  };
}

function normalizeState(value: unknown): IntelligenceSyncLocalState {
  if (!value || typeof value !== "object") return emptyState();
  const candidate = value as Partial<IntelligenceSyncLocalState>;
  return candidate.version === 1 &&
    candidate.id === "ai-data-platform-intelligence-sync" &&
    Array.isArray(candidate.metadata) &&
    Array.isArray(candidate.queue) &&
    Array.isArray(candidate.conflicts)
    ? (candidate as IntelligenceSyncLocalState)
    : emptyState();
}

export async function loadIntelligenceSyncState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  return normalizeState(stored[STATE_KEY]);
}

async function writeState(state: IntelligenceSyncLocalState) {
  const next = { ...state, updatedAt: nowIso() };
  await chrome.storage.local.set({ [STATE_KEY]: next });
  return next;
}

function metadataFor(
  state: IntelligenceSyncLocalState,
  workspaceId: string,
  moduleKey: string
) {
  const key = itemKey(workspaceId, moduleKey);
  return state.metadata.find((item) => item.key === key) ?? null;
}

function replaceMetadata(
  state: IntelligenceSyncLocalState,
  item: IntelligenceSyncMetadata
) {
  return {
    ...state,
    metadata: [item, ...state.metadata.filter((entry) => entry.key !== item.key)]
  };
}

function replaceQueue(
  state: IntelligenceSyncLocalState,
  item: IntelligenceSyncQueueItem
) {
  const key = itemKey(item.workspaceId, item.moduleKey);
  return {
    ...state,
    queue: [
      item,
      ...state.queue.filter(
        (entry) => itemKey(entry.workspaceId, entry.moduleKey) !== key
      )
    ].slice(0, MAX_QUEUE)
  };
}

function removeQueue(
  state: IntelligenceSyncLocalState,
  workspaceId: string,
  moduleKey: string
) {
  const key = itemKey(workspaceId, moduleKey);
  return {
    ...state,
    queue: state.queue.filter(
      (entry) => itemKey(entry.workspaceId, entry.moduleKey) !== key
    )
  };
}

function replaceConflict(
  state: IntelligenceSyncLocalState,
  conflict: IntelligenceSyncConflict
) {
  return {
    ...state,
    conflicts: [
      conflict,
      ...state.conflicts.filter((entry) => entry.key !== conflict.key)
    ].slice(0, MAX_CONFLICTS)
  };
}

function removeConflict(
  state: IntelligenceSyncLocalState,
  workspaceId: string,
  moduleKey: string
) {
  const key = itemKey(workspaceId, moduleKey);
  return {
    ...state,
    conflicts: state.conflicts.filter((entry) => entry.key !== key)
  };
}

async function prepareQueue() {
  const snapshots = await buildLocalIntelligenceSnapshots();
  let state = await loadIntelligenceSyncState();

  for (const snapshot of snapshots) {
    const key = itemKey(snapshot.workspaceId, snapshot.moduleKey);
    if (state.conflicts.some((item) => item.key === key)) continue;
    const metadata = metadataFor(state, snapshot.workspaceId, snapshot.moduleKey);
    if (
      metadata?.state === "clean" &&
      metadata.localUpdatedAt === snapshot.clientUpdatedAt
    ) {
      continue;
    }

    state = replaceQueue(state, {
      id: "intelligence-sync-" + crypto.randomUUID(),
      workspaceId: snapshot.workspaceId,
      moduleKey: snapshot.moduleKey,
      expectedServerVersion: metadata?.serverVersion ?? null,
      clientUpdatedAt: snapshot.clientUpdatedAt,
      summary: snapshot.summary,
      payload: snapshot.payload,
      auditEntries: snapshot.auditEntries,
      enqueuedAt: nowIso(),
      attempts: 0
    });
    state = replaceMetadata(state, {
      key,
      workspaceId: snapshot.workspaceId,
      moduleKey: snapshot.moduleKey,
      serverVersion: metadata?.serverVersion ?? null,
      state: "queued",
      localUpdatedAt: snapshot.clientUpdatedAt,
      lastSyncedAt: metadata?.lastSyncedAt ?? null,
      error: ""
    });
  }

  await writeState(state);
}

async function send(
  platformOrigin: string,
  token: string,
  item: IntelligenceSyncQueueItem
) {
  const response = await fetch(
    new URL("/api/extension/intelligence", platformOrigin),
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspaceId: item.workspaceId,
        moduleKey: item.moduleKey,
        expectedServerVersion: item.expectedServerVersion,
        clientUpdatedAt: item.clientUpdatedAt,
        summary: item.summary,
        payload: item.payload,
        auditEntries: item.auditEntries
      })
    }
  );

  if (response.status === 401) throw new Error("The extension session expired.");
  if (response.status === 403) throw new Error("Workspace access was revoked.");
  if (!response.ok) {
    throw new Error("Intelligence sync returned HTTP " + response.status + ".");
  }

  return (await response.json()) as {
    result: {
      status: "applied" | "conflict";
      record: IntelligenceServerRecord;
    };
    auditInserted: number;
  };
}

async function fetchWorkspace(
  platformOrigin: string,
  token: string,
  workspaceId: string
) {
  const url = new URL("/api/extension/intelligence", platformOrigin);
  url.searchParams.set("workspaceId", workspaceId);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: "Bearer " + token }
  });

  if (response.status === 401) throw new Error("The extension session expired.");
  if (response.status === 403) throw new Error("Workspace access was revoked.");
  if (!response.ok) {
    throw new Error("Intelligence sync returned HTTP " + response.status + ".");
  }

  return (await response.json()) as {
    modules: IntelligenceServerRecord[];
  };
}

async function flushQueue(platformOrigin: string, token: string) {
  let pushed = 0;
  let auditInserted = 0;
  let state = await loadIntelligenceSyncState();

  for (const item of [...state.queue].sort((a, b) =>
    a.enqueuedAt.localeCompare(b.enqueuedAt)
  )) {
    try {
      const response = await send(platformOrigin, token, item);
      state = await loadIntelligenceSyncState();
      state = removeQueue(state, item.workspaceId, item.moduleKey);
      const key = itemKey(item.workspaceId, item.moduleKey);

      if (response.result.status === "conflict") {
        state = replaceConflict(state, {
          key,
          workspaceId: item.workspaceId,
          moduleKey: item.moduleKey,
          detectedAt: nowIso(),
          localPayload: item.payload,
          serverRecord: response.result.record
        });
        state = replaceMetadata(state, {
          key,
          workspaceId: item.workspaceId,
          moduleKey: item.moduleKey,
          serverVersion: response.result.record.serverVersion,
          state: "conflict",
          localUpdatedAt: item.clientUpdatedAt,
          lastSyncedAt: null,
          error: "Server state changed before this local snapshot was applied."
        });
      } else {
        state = removeConflict(state, item.workspaceId, item.moduleKey);
        state = replaceMetadata(state, {
          key,
          workspaceId: item.workspaceId,
          moduleKey: item.moduleKey,
          serverVersion: response.result.record.serverVersion,
          state: "clean",
          localUpdatedAt: item.clientUpdatedAt,
          lastSyncedAt: nowIso(),
          error: ""
        });
        pushed += 1;
        auditInserted += response.auditInserted;
      }
      await writeState(state);
    } catch (reason) {
      state = await loadIntelligenceSyncState();
      const current = state.queue.find((entry) => entry.id === item.id);
      if (current) {
        state = replaceQueue(state, { ...current, attempts: current.attempts + 1 });
      }
      const metadata = metadataFor(state, item.workspaceId, item.moduleKey);
      if (metadata) {
        state = replaceMetadata(state, {
          ...metadata,
          state: "queued",
          error:
            reason instanceof Error ? reason.message : "Sync is temporarily unavailable."
        });
      }
      await writeState(state);
      break;
    }
  }

  return { pushed, auditInserted };
}

async function pullServer(platformOrigin: string, token: string) {
  const snapshots = await buildLocalIntelligenceSnapshots();
  const authorized = await getCachedAuthorizedWorkspaces();
  const workspaceIds = new Set([
    ...snapshots.map((item) => item.workspaceId),
    ...authorized.map((workspace) => workspace.id)
  ]);
  let pulled = 0;
  let state = await loadIntelligenceSyncState();

  for (const workspaceId of workspaceIds) {
    const server = await fetchWorkspace(platformOrigin, token, workspaceId);
    for (const record of server.modules) {
      const key = itemKey(workspaceId, record.moduleKey);
      if (state.conflicts.some((item) => item.key === key)) continue;
      if (
        state.queue.some(
          (item) =>
            item.workspaceId === workspaceId &&
            item.moduleKey === record.moduleKey
        )
      ) continue;

      const metadata = metadataFor(state, workspaceId, record.moduleKey);
      if (metadata?.serverVersion === record.serverVersion) continue;

      await applyIntelligenceServerRecord(record);
      state = replaceMetadata(state, {
        key,
        workspaceId,
        moduleKey: record.moduleKey,
        serverVersion: record.serverVersion,
        state: "clean",
        localUpdatedAt: record.clientUpdatedAt,
        lastSyncedAt: nowIso(),
        error: ""
      });
      pulled += 1;
    }
  }

  await writeState(state);
  return pulled;
}

export async function synchronizeIntelligenceModules(): Promise<IntelligenceSyncSummary> {
  const credentials = await getWorkspaceSyncCredentials();
  await prepareQueue();
  const flushed = await flushQueue(credentials.platformOrigin, credentials.token);
  const pulled = await pullServer(credentials.platformOrigin, credentials.token);
  let state = await loadIntelligenceSyncState();
  const lastSyncAt = nowIso();
  state = await writeState({ ...state, lastSyncAt });

  return {
    pushed: flushed.pushed,
    pulled,
    conflicts: state.conflicts.length,
    queued: state.queue.length,
    auditInserted: flushed.auditInserted,
    lastSyncAt
  };
}

export function scheduleIntelligenceSyncAttempt() {
  void synchronizeIntelligenceModules().catch(() => {
    // Local state remains durable and can be retried later.
  });
}

export async function resolveIntelligenceConflict(
  key: string,
  resolution: "use-server" | "keep-local"
) {
  let state = await loadIntelligenceSyncState();
  const conflict = state.conflicts.find((item) => item.key === key);
  if (!conflict) throw new Error("The intelligence conflict no longer exists.");

  if (resolution === "use-server") {
    await applyIntelligenceServerRecord(conflict.serverRecord);
    state = removeConflict(state, conflict.workspaceId, conflict.moduleKey);
    state = removeQueue(state, conflict.workspaceId, conflict.moduleKey);
    state = replaceMetadata(state, {
      key,
      workspaceId: conflict.workspaceId,
      moduleKey: conflict.moduleKey,
      serverVersion: conflict.serverRecord.serverVersion,
      state: "clean",
      localUpdatedAt: conflict.serverRecord.clientUpdatedAt,
      lastSyncedAt: nowIso(),
      error: ""
    });
    await writeState(state);
    return;
  }

  const snapshot = (await buildLocalIntelligenceSnapshots()).find(
    (item) =>
      item.workspaceId === conflict.workspaceId &&
      item.moduleKey === conflict.moduleKey
  );
  if (!snapshot) throw new Error("The local module snapshot is no longer available.");

  state = removeConflict(state, conflict.workspaceId, conflict.moduleKey);
  state = replaceQueue(state, {
    id: "intelligence-sync-" + crypto.randomUUID(),
    workspaceId: conflict.workspaceId,
    moduleKey: conflict.moduleKey,
    expectedServerVersion: conflict.serverRecord.serverVersion,
    clientUpdatedAt: snapshot.clientUpdatedAt,
    summary: snapshot.summary,
    payload: snapshot.payload,
    auditEntries: snapshot.auditEntries,
    enqueuedAt: nowIso(),
    attempts: 0
  });
  state = replaceMetadata(state, {
    key,
    workspaceId: conflict.workspaceId,
    moduleKey: conflict.moduleKey,
    serverVersion: conflict.serverRecord.serverVersion,
    state: "queued",
    localUpdatedAt: snapshot.clientUpdatedAt,
    lastSyncedAt: null,
    error: ""
  });
  await writeState(state);
  return synchronizeIntelligenceModules();
}
