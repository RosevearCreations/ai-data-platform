"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  MAX_OPERATOR_WORKSPACES,
  OPERATOR_WORKSPACE_EVENT,
  OPERATOR_WORKSPACE_STORAGE_KEY,
  createOperatorWorkspaceProfile,
  operatorWorkspaceHref,
  removeOperatorWorkspaceProfile,
  sanitizeOperatorWorkspaceProfiles,
  upsertOperatorWorkspaceProfile,
  type OperatorWorkspaceProfile
} from "@/lib/operator-workspaces";

function readProfiles() {
  try {
    const raw = window.localStorage.getItem(OPERATOR_WORKSPACE_STORAGE_KEY);
    return sanitizeOperatorWorkspaceProfiles(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function writeProfiles(profiles: OperatorWorkspaceProfile[]) {
  try {
    window.localStorage.setItem(
      OPERATOR_WORKSPACE_STORAGE_KEY,
      JSON.stringify(sanitizeOperatorWorkspaceProfiles(profiles))
    );
    window.dispatchEvent(new CustomEvent(OPERATOR_WORKSPACE_EVENT));
  } catch {
    // Browser-local workspace convenience must never block application navigation.
  }
}

function makeId() {
  try {
    return "workspace-" + crypto.randomUUID().replace(/-/g, "").slice(0, 18);
  } catch {
    return "workspace-" + Date.now().toString(36);
  }
}

export function OperatorWorkspaceSavePanel({
  destination,
  destinationLabel,
  currentQuery,
  workspaceId = "",
  search = "",
  sort = "",
  visibleColumns = [],
  dateFrom = "",
  dateTo = "",
  compact = false
}: {
  destination: string;
  destinationLabel: string;
  currentQuery: string;
  workspaceId?: string;
  search?: string;
  sort?: string;
  visibleColumns?: string[];
  dateFrom?: string;
  dateTo?: string;
  compact?: boolean;
}) {
  const [profiles, setProfiles] = useState<OperatorWorkspaceProfile[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProfiles(readProfiles());
    const refresh = () => setProfiles(readProfiles());
    window.addEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const currentDestinationProfiles = useMemo(
    () => profiles.filter((profile) => profile.destination === destination),
    [destination, profiles]
  );

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Enter a name for this operator workspace.");
      return;
    }
    if (
      profiles.length >= MAX_OPERATOR_WORKSPACES &&
      !profiles.some((profile) => profile.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setMessage("This browser already has the maximum number of operator workspaces.");
      return;
    }

    try {
      const profile = createOperatorWorkspaceProfile({
        id:
          profiles.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())?.id ??
          makeId(),
        name: trimmed,
        destination,
        destinationLabel,
        query: currentQuery,
        workspaceId,
        search,
        sort,
        visibleColumns,
        dateFrom,
        dateTo
      });
      const next = upsertOperatorWorkspaceProfile(profiles, profile);
      writeProfiles(next);
      setProfiles(next);
      setName("");
      setMessage("Saved to Operator Workspaces.");
    } catch {
      setMessage("This view could not be saved.");
    }
  }

  function remove(id: string) {
    const next = removeOperatorWorkspaceProfile(profiles, id);
    writeProfiles(next);
    setProfiles(next);
    setMessage("Saved workspace removed.");
  }

  return (
    <section className={compact ? "operatorWorkspaceSave operatorWorkspaceSave--compact" : "operatorWorkspaceSave"}>
      <div className="operatorWorkspaceSaveHeading">
        <div>
          <span>Shared saved view</span>
          <strong>Operator Workspace</strong>
        </div>
        <Link href="/operator-workspaces">Manage all</Link>
      </div>
      <div className="operatorWorkspaceSaveRow">
        <input
          aria-label="Operator workspace name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name this workspace"
          maxLength={60}
        />
        <button type="button" className="secondaryButton" onClick={save}>
          Save current view
        </button>
      </div>
      {currentDestinationProfiles.length ? (
        <div className="operatorWorkspaceQuickList">
          {currentDestinationProfiles.slice(0, 6).map((profile) => (
            <span key={profile.id}>
              <Link href={operatorWorkspaceHref(profile)}>{profile.name}</Link>
              <button type="button" onClick={() => remove(profile.id)} aria-label={"Remove " + profile.name}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <small>Saved views stay in this browser and never change workspace permissions or data.</small>
      )}
      {message ? <p className="operatorWorkspaceMessage" role="status">{message}</p> : null}
    </section>
  );
}

export function OperatorWorkspaceMenu() {
  const [profiles, setProfiles] = useState<OperatorWorkspaceProfile[]>([]);

  useEffect(() => {
    const refresh = () => setProfiles(readProfiles());
    refresh();
    window.addEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <details className="operatorWorkspaceMenu">
      <summary>Workspaces{profiles.length ? <b>{profiles.length}</b> : null}</summary>
      <div className="operatorWorkspaceMenuPanel">
        <div>
          <strong>Operator Workspaces</strong>
          <small>Browser-local saved filter profiles</small>
        </div>
        {profiles.length ? (
          <nav aria-label="Saved operator workspaces">
            {profiles.slice(0, 8).map((profile) => (
              <Link href={operatorWorkspaceHref(profile)} key={profile.id}>
                <span>{profile.name}</span>
                <small>{profile.destinationLabel}</small>
              </Link>
            ))}
          </nav>
        ) : (
          <p>No saved workspaces yet.</p>
        )}
        <Link className="operatorWorkspaceManageLink" href="/operator-workspaces">Manage operator workspaces</Link>
      </div>
    </details>
  );
}

export function OperatorWorkspaceManager() {
  const [profiles, setProfiles] = useState<OperatorWorkspaceProfile[]>([]);

  useEffect(() => {
    const refresh = () => setProfiles(readProfiles());
    refresh();
    window.addEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(OPERATOR_WORKSPACE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function remove(id: string) {
    const next = removeOperatorWorkspaceProfile(profiles, id);
    writeProfiles(next);
    setProfiles(next);
  }

  if (!profiles.length) {
    return (
      <section className="operatorWorkspaceEmpty">
        <h2>No operator workspaces saved</h2>
        <p>Save a view from Unified Search or the Data Library. It will appear here and in the Operations Command top bar.</p>
      </section>
    );
  }

  return (
    <div className="operatorWorkspaceGrid">
      {profiles.map((profile) => (
        <article className="operatorWorkspaceCard" key={profile.id}>
          <div className="operatorWorkspaceCardTop">
            <div>
              <span>{profile.destinationLabel}</span>
              <h2>{profile.name}</h2>
            </div>
            <button type="button" onClick={() => remove(profile.id)} aria-label={"Remove " + profile.name}>Remove</button>
          </div>
          <dl>
            <div><dt>Workspace context</dt><dd>{profile.workspaceId || "All authorized workspaces"}</dd></div>
            <div><dt>Search</dt><dd>{profile.search || "None"}</dd></div>
            <div><dt>Sort</dt><dd>{profile.sort || "Source default"}</dd></div>
            <div><dt>Visible columns</dt><dd>{profile.visibleColumns.length ? profile.visibleColumns.join(", ") : "Source default"}</dd></div>
            <div><dt>Date range</dt><dd>{profile.dateRange.from || profile.dateRange.to ? (profile.dateRange.from || "Any") + " → " + (profile.dateRange.to || "Any") : "Any date"}</dd></div>
          </dl>
          <Link className="primaryLink" href={operatorWorkspaceHref(profile)}>Reopen workspace</Link>
        </article>
      ))}
    </div>
  );
}
