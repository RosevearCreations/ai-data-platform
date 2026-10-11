"use client";

import { useEffect, useMemo, useState } from "react";

type SavedView = {
  name: string;
  query: string;
};

const STORAGE_KEY = "ai-data-platform:data-library-saved-views:v1";

function safeViews(raw: string | null): SavedView[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Record<string, unknown>;
      return typeof candidate.name === "string" && typeof candidate.query === "string"
        ? [{ name: candidate.name.slice(0, 60), query: candidate.query.slice(0, 500) }]
        : [];
    }).slice(0, 12);
  } catch {
    return [];
  }
}

export function DataLibrarySavedViews({ currentQuery }: { currentQuery: string }) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setViews(safeViews(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const normalizedQuery = useMemo(
    () => currentQuery.replace(/^\?/, ""),
    [currentQuery]
  );

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [
      { name: trimmed.slice(0, 60), query: normalizedQuery },
      ...views.filter((view) => view.name !== trimmed)
    ].slice(0, 12);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setViews(next);
    setName("");
  }

  function remove(viewName: string) {
    const next = views.filter((view) => view.name !== viewName);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setViews(next);
  }

  return (
    <div className="librarySavedViews">
      <div className="librarySaveRow">
        <input
          aria-label="Saved view name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name this filter view"
          maxLength={60}
        />
        <button className="secondaryButton" type="button" onClick={save}>
          Save current view
        </button>
      </div>
      {views.length ? (
        <div className="librarySavedList">
          {views.map((view) => (
            <span key={view.name}>
              <a className="textLink" href={"/data-library" + (view.query ? "?" + view.query : "")}>
                {view.name}
              </a>
              <button type="button" onClick={() => remove(view.name)} aria-label={"Remove " + view.name}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <small>Saved views stay in this browser only and never change workspace data.</small>
      )}
    </div>
  );
}
