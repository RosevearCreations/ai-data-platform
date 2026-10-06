import { useEffect, useState } from "react";

import {
  connectWorkspaceSession,
  countUnscopedMigrationCandidates,
  disconnectWorkspaceSession,
  getPlatformOrigin,
  refreshWorkspaceSession,
  setActiveWorkspace,
  setPlatformOrigin
} from "./workspace-session";
import type { WorkspaceBridgeState } from "./types";

const EMPTY_STATE: WorkspaceBridgeState = {
  status: "loading",
  platformOrigin: "",
  user: null,
  workspaces: [],
  activeWorkspaceId: null,
  expiresAt: null,
  message: "Loading authenticated workspace state…"
};

export function WorkspaceSessionPanel() {
  const [bridge, setBridge] = useState<WorkspaceBridgeState>(EMPTY_STATE);
  const [originDraft, setOriginDraft] = useState("");
  const [migrationCount, setMigrationCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [state, migration, origin] = await Promise.all([
      refreshWorkspaceSession(),
      countUnscopedMigrationCandidates(),
      getPlatformOrigin()
    ]);
    setBridge(state);
    setMigrationCount(migration.total);
    setOriginDraft(origin);
  }

  useEffect(() => {
    void refresh().catch((reason) => {
      setBridge({
        ...EMPTY_STATE,
        status: "unavailable",
        message:
          reason instanceof Error
            ? reason.message
            : "Workspace state is unavailable."
      });
    });
  }, []);

  async function connect() {
    setPending(true);
    setMessage(null);
    try {
      const state = await connectWorkspaceSession(originDraft);
      setBridge(state);
      const migration = await countUnscopedMigrationCandidates();
      setMigrationCount(migration.total);
      setMessage("Extension workspace session connected.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to connect the extension session."
      );
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    setMessage(null);
    try {
      await disconnectWorkspaceSession();
      await refresh();
      setMessage("Extension session disconnected and local bearer session cleared.");
    } finally {
      setPending(false);
    }
  }

  async function changeWorkspace(workspaceId: string) {
    setPending(true);
    setMessage(null);
    try {
      await setActiveWorkspace(workspaceId, bridge.workspaces);
      setBridge((current) => ({
        ...current,
        activeWorkspaceId: workspaceId
      }));
      const selected = bridge.workspaces.find(
        (workspace) => workspace.id === workspaceId
      );
      setMessage(
        selected
          ? "Active workspace changed to " + selected.name + "."
          : "Active workspace changed."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to change workspace."
      );
    } finally {
      setPending(false);
    }
  }

  async function saveOrigin() {
    setPending(true);
    setMessage(null);
    try {
      const normalized = await setPlatformOrigin(originDraft);
      setOriginDraft(normalized);
      setMessage("AI Data Platform URL saved locally.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Invalid platform URL."
      );
    } finally {
      setPending(false);
    }
  }

  const active = bridge.workspaces.find(
    (workspace) => workspace.id === bridge.activeWorkspaceId
  );

  return (
    <section className="workspaceSession">
      <div className="workspaceSessionHeader">
        <div>
          <label htmlFor="workspace">Authenticated workspace</label>
          <strong>{active?.name ?? "No active workspace"}</strong>
        </div>
        <span className={"workspaceSessionStatus status-" + bridge.status}>
          {bridge.status}
        </span>
      </div>

      {bridge.status === "connected" ? (
        <>
          <select
            disabled={pending}
            id="workspace"
            onChange={(event) => void changeWorkspace(event.target.value)}
            value={bridge.activeWorkspaceId ?? ""}
          >
            {bridge.workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {workspace.role}
              </option>
            ))}
          </select>
          <small>
            Signed in as {bridge.user?.email}. Session expires{" "}
            {bridge.expiresAt
              ? new Date(bridge.expiresAt).toLocaleString()
              : "when revoked"}.
          </small>
          <div className="workspaceSessionActions">
            <button disabled={pending} onClick={() => void refresh()} type="button">
              Refresh
            </button>
            <button disabled={pending} onClick={() => void disconnect()} type="button">
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="workspaceOrigin">
            AI Data Platform URL
            <input
              disabled={pending}
              onChange={(event) => setOriginDraft(event.target.value)}
              placeholder="https://your-platform.example"
              value={originDraft}
            />
          </label>
          <div className="workspaceSessionActions">
            <button disabled={pending} onClick={() => void saveOrigin()} type="button">
              Save URL
            </button>
            <button
              className="workspaceConnect"
              disabled={pending || !originDraft.trim()}
              onClick={() => void connect()}
              type="button"
            >
              {pending ? "Connecting…" : "Connect / sign in"}
            </button>
          </div>
          <small>{bridge.message}</small>
        </>
      )}

      {migrationCount ? (
        <p className="workspaceMigration">
          {migrationCount} older local record{migrationCount === 1 ? "" : "s"}{" "}
          have no workspace ID. They are flagged as Build 020 migration candidates
          and have not been assigned automatically.
        </p>
      ) : null}

      {message ? (
        <p className="workspaceSessionMessage" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
