import { useEffect, useMemo, useState } from "react";

import {
  adoptLegacyIntelligenceIntoActiveWorkspace,
  countLegacyIntelligenceCandidates
} from "./intelligence-local";
import {
  loadIntelligenceSyncState,
  resolveIntelligenceConflict,
  scheduleIntelligenceSyncAttempt,
  synchronizeIntelligenceModules
} from "./intelligence-sync";
import type {
  IntelligenceSyncConflict,
  IntelligenceSyncState
} from "./types";

export function IntelligenceContinuityPanel() {
  const [state, setState] = useState<IntelligenceSyncState | null>(null);
  const [legacy, setLegacy] = useState({ history: 0, jobs: 0, total: 0 });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [next, candidates] = await Promise.all([
      loadIntelligenceSyncState(),
      countLegacyIntelligenceCandidates()
    ]);
    setState(next);
    setLegacy(candidates);
  }

  useEffect(() => {
    void refresh();
    const listener = (
      _changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local") void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const conflicts = useMemo(() => state?.conflicts ?? [], [state]);
  const queue = state?.queue ?? [];

  async function syncNow() {
    setPending(true);
    setMessage(null);
    try {
      const result = await synchronizeIntelligenceModules();
      await refresh();
      setMessage(
        "Intelligence sync complete · " +
          result.pushed +
          " pushed · " +
          result.pulled +
          " pulled · " +
          result.auditInserted +
          " audit entries appended · " +
          result.conflicts +
          " conflicts · " +
          result.queued +
          " queued."
      );
    } catch (reason) {
      await refresh();
      setMessage(
        reason instanceof Error
          ? reason.message + " Local intelligence remains available for retry."
          : "Intelligence sync is unavailable; local state remains available."
      );
    } finally {
      setPending(false);
    }
  }

  async function adoptLegacy() {
    setPending(true);
    setMessage(null);
    try {
      const result = await adoptLegacyIntelligenceIntoActiveWorkspace();
      scheduleIntelligenceSyncAttempt();
      await refresh();
      setMessage(
        "Adopted " +
          result.history +
          " historical series and " +
          result.jobs +
          " scheduled jobs into the active workspace."
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to adopt legacy intelligence.");
    } finally {
      setPending(false);
    }
  }

  async function resolve(
    conflict: IntelligenceSyncConflict,
    resolution: "use-server" | "keep-local"
  ) {
    setPending(true);
    setMessage(null);
    try {
      await resolveIntelligenceConflict(conflict.key, resolution);
      await refresh();
      setMessage(
        resolution === "use-server"
          ? "Conflict resolved with the durable server state."
          : "Conflict resolved by reapplying the current local state."
      );
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to resolve conflict.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="workspaceSync intelligenceContinuity">
      <div className="workspaceSyncHeader">
        <div>
          <p className="eyebrow">Build 021</p>
          <h2>Persistent intelligence & audit</h2>
        </div>
        <span className="workspaceSyncBadge">
          {queue.length} queued · {conflicts.length} conflicts
        </span>
      </div>

      <p className="workspaceSyncIntro">
        History, competitive intelligence, supplier staging, movie review state,
        scheduled-job evidence and business-integration audit state are mirrored
        into authenticated workspace storage.
      </p>

      <div className="workspaceSyncStats">
        <div>
          <strong>{queue.length}</strong>
          <span>queued modules</span>
        </div>
        <div>
          <strong>{conflicts.length}</strong>
          <span>module conflicts</span>
        </div>
        <div>
          <strong>{legacy.total}</strong>
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
          {pending ? "Synchronizing…" : "Sync intelligence now"}
        </button>

        {legacy.total ? (
          <button disabled={pending} onClick={() => void adoptLegacy()} type="button">
            Adopt legacy history/jobs into active workspace
          </button>
        ) : null}
      </div>

      {legacy.total ? (
        <p className="workspaceSyncMigration">
          {legacy.history} unscoped historical series and {legacy.jobs} unscoped
          scheduled jobs remain local-only until explicitly adopted into the
          active workspace.
        </p>
      ) : null}

      {conflicts.length ? (
        <div className="workspaceSyncConflicts">
          <strong>Intelligence conflicts require a choice</strong>
          {conflicts.map((conflict) => (
            <article key={conflict.key}>
              <div>
                <span>{conflict.moduleKey}</span>
                <strong>server v{conflict.serverRecord.serverVersion}</strong>
              </div>
              <small>{new Date(conflict.detectedAt).toLocaleString()}</small>
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
