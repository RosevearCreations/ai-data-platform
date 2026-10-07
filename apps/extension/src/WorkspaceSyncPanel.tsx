import { useEffect, useMemo, useState } from "react";

import { getActiveWorkspaceId } from "./workspace-session";
import {
  copyLegacyRecordsIntoActiveWorkspace,
  getActiveWorkspaceSyncSummary,
  loadWorkspaceSyncState,
  migrationCandidatesForActiveWorkspace,
  resolveWorkspaceSyncConflict,
  synchronizeActiveWorkspace
} from "./workspace-sync";
import type {
  WorkspaceSyncConflict,
  WorkspaceSyncLocalState
} from "./types";

export function WorkspaceSyncPanel() {
  const [state, setState] = useState<WorkspaceSyncLocalState | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [migrationTotal, setMigrationTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [nextState, activeWorkspaceId, migration, summary] =
      await Promise.all([
        loadWorkspaceSyncState(),
        getActiveWorkspaceId(),
        migrationCandidatesForActiveWorkspace(),
        getActiveWorkspaceSyncSummary()
      ]);

    setState(nextState);
    setWorkspaceId(activeWorkspaceId ?? "");
    setMigrationTotal(migration.total);

    if (!message && summary.lastSyncAt) {
      setMessage(
        "Last successful workspace sync: " +
          new Date(summary.lastSyncAt).toLocaleString() +
          "."
      );
    }
  }

  useEffect(() => {
    void refresh().catch(() => undefined);

    const listener = (
      _changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local") {
        void refresh().catch(() => undefined);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const queue = useMemo(
    () =>
      (state?.queue ?? []).filter(
        (item) => item.workspaceId === workspaceId
      ),
    [state, workspaceId]
  );

  const conflicts = useMemo(
    () =>
      (state?.conflicts ?? []).filter(
        (item) => item.workspaceId === workspaceId
      ),
    [state, workspaceId]
  );

  async function syncNow() {
    setPending(true);
    setMessage(null);
    try {
      const result = await synchronizeActiveWorkspace();
      await refresh();
      setMessage(
        "Workspace sync complete · " +
          result.pushed +
          " pushed · " +
          result.pulled +
          " pulled · " +
          result.deleted +
          " deleted/tombstoned · " +
          result.conflicts +
          " conflict" +
          (result.conflicts === 1 ? "" : "s") +
          " · " +
          result.queued +
          " queued."
      );
    } catch (reason) {
      await refresh();
      setMessage(
        reason instanceof Error
          ? reason.message +
              " Local changes remain queued and can be retried later."
          : "Workspace sync is unavailable. Local changes remain queued."
      );
    } finally {
      setPending(false);
    }
  }

  async function migrateLegacy() {
    setPending(true);
    setMessage(null);
    try {
      const result = await copyLegacyRecordsIntoActiveWorkspace();
      await refresh();
      setMessage(
        "Copied " +
          result.savedScrapers +
          " saved scraper/template record" +
          (result.savedScrapers === 1 ? "" : "s") +
          " and " +
          result.reviewedDatasets +
          " reviewed dataset" +
          (result.reviewedDatasets === 1 ? "" : "s") +
          " into the active workspace. Original unscoped local records were retained."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to copy legacy local records."
      );
    } finally {
      setPending(false);
    }
  }

  async function resolve(
    conflict: WorkspaceSyncConflict,
    choice: "use-server" | "keep-local"
  ) {
    setPending(true);
    setMessage(null);
    try {
      await resolveWorkspaceSyncConflict(conflict.key, choice);
      await refresh();
      setMessage(
        choice === "use-server"
          ? "Conflict resolved with the server copy."
          : "Conflict resolved by reapplying the local copy against the latest server version."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to resolve the sync conflict."
      );
    } finally {
      setPending(false);
    }
  }

  if (!workspaceId) {
    return (
      <section className="workspaceSync">
        <div className="workspaceSyncHeader">
          <div>
            <p className="eyebrow">Build 020</p>
            <h2>Workspace sync</h2>
          </div>
          <span className="workspaceSyncBadge">offline-ready</span>
        </div>
        <p className="workspaceSyncIntro">
          Connect and select an authenticated workspace to synchronize saved
          scrapers and reviewed datasets across devices.
        </p>
      </section>
    );
  }

  return (
    <section className="workspaceSync">
      <div className="workspaceSyncHeader">
        <div>
          <p className="eyebrow">Build 020</p>
          <h2>Workspace persistence & sync</h2>
        </div>
        <span className="workspaceSyncBadge">
          {queue.length} queued · {conflicts.length} conflicts
        </span>
      </div>

      <p className="workspaceSyncIntro">
        Local storage remains the offline working cache. Sync uses authenticated
        workspace APIs with optimistic server versions; conflicting edits are
        never silently overwritten.
      </p>

      <div className="workspaceSyncStats">
        <div>
          <strong>{queue.length}</strong>
          <span>queued operations</span>
        </div>
        <div>
          <strong>{conflicts.length}</strong>
          <span>version conflicts</span>
        </div>
        <div>
          <strong>{migrationTotal}</strong>
          <span>legacy candidates</span>
        </div>
        <div>
          <strong>
            {state?.lastSyncAt
              ? new Date(state.lastSyncAt).toLocaleDateString()
              : "—"}
          </strong>
          <span>last sync</span>
        </div>
      </div>

      <div className="workspaceSyncActions">
        <button
          className="workspaceSyncPrimary"
          disabled={pending}
          onClick={() => void syncNow()}
          type="button"
        >
          {pending ? "Synchronizing…" : "Sync workspace now"}
        </button>

        {migrationTotal ? (
          <button
            disabled={pending}
            onClick={() => void migrateLegacy()}
            type="button"
          >
            Copy legacy records into this workspace
          </button>
        ) : null}
      </div>

      {migrationTotal ? (
        <p className="workspaceSyncMigration">
          Migration is explicit and non-destructive. Build 020 copies each
          unscoped legacy record into this workspace and keeps the original
          local record intact.
        </p>
      ) : null}

      {queue.length ? (
        <details className="workspaceSyncQueue">
          <summary>Offline/deferred queue ({queue.length})</summary>
          <div>
            {queue.slice(0, 12).map((item) => (
              <span key={item.id}>
                {item.action} · {item.resource} · {item.recordId} · attempt{" "}
                {item.attempts}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {conflicts.length ? (
        <div className="workspaceSyncConflicts">
          <strong>Conflicts require a choice</strong>
          {conflicts.map((conflict) => (
            <article key={conflict.key}>
              <div>
                <span>{conflict.resource}</span>
                <strong>{conflict.recordId}</strong>
              </div>
              <small>
                Detected {new Date(conflict.detectedAt).toLocaleString()} ·
                server version{" "}
                {conflict.serverRecord?.serverVersion ?? "missing/deleted"}
              </small>
              <p>
                Use server replaces this device’s cached record. Keep local
                retries your current local value against the latest server
                version.
              </p>
              <div className="workspaceSyncConflictActions">
                <button
                  disabled={pending}
                  onClick={() => void resolve(conflict, "use-server")}
                  type="button"
                >
                  Use server
                </button>
                <button
                  disabled={pending}
                  onClick={() => void resolve(conflict, "keep-local")}
                  type="button"
                >
                  Keep local
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="workspaceSyncMessage" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
