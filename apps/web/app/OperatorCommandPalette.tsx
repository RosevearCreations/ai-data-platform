"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { HelpInfo } from "@/app/help/HelpInfo";
import { NAVIGATION_USAGE_EVENT } from "@/lib/navigation-insights";
import {
  type SavedOperatorNavigationSet,
  operatorCommandTargetByHref,
  operatorCommandTargetByPathname,
  sanitizeFavoriteOperatorDestinationHrefs,
  sanitizeRecentOperatorDestinationHrefs,
  sanitizeSavedOperatorNavigationSets,
  searchOperatorCommandTargets,
  workspaceOperatorShortcutTargets
} from "@/lib/operator-command-palette";

const RECENT_DESTINATIONS_KEY = "ai-data-platform:recent-operator-destinations:v1";
const FAVORITE_DESTINATIONS_KEY = "ai-data-platform:favorite-operator-destinations:v1";
const SAVED_NAVIGATION_SETS_KEY = "ai-data-platform:saved-navigation-sets:v1";
const MAX_RECENT_DESTINATIONS = 6;
const MAX_FAVORITES = 8;
const MAX_SAVED_SETS = 6;

type PaletteCollection = "recent" | "favorites" | "workspace" | `set:${string}`;

function readLocalJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage is optional; navigation itself must remain usable.
  }
}

export function OperatorCommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);
  const [savedSets, setSavedSets] = useState<SavedOperatorNavigationSet[]>([]);
  const [collection, setCollection] = useState<PaletteCollection>("recent");
  const [setName, setSetName] = useState("");

  const normalizedQuery = query.trim();

  useEffect(() => {
    const recent = sanitizeRecentOperatorDestinationHrefs(
      readLocalJson(RECENT_DESTINATIONS_KEY),
      MAX_RECENT_DESTINATIONS
    );
    const favorites = sanitizeFavoriteOperatorDestinationHrefs(
      readLocalJson(FAVORITE_DESTINATIONS_KEY),
      MAX_FAVORITES
    );
    const sets = sanitizeSavedOperatorNavigationSets(
      readLocalJson(SAVED_NAVIGATION_SETS_KEY),
      MAX_SAVED_SETS,
      MAX_FAVORITES
    );

    const current = operatorCommandTargetByPathname(pathname);
    const shouldRemember =
      current &&
      current.groupId !== "overview" &&
      current.groupId !== "help";

    const nextRecent = shouldRemember
      ? [current.href, ...recent.filter((href) => href !== current.href)].slice(
          0,
          MAX_RECENT_DESTINATIONS
        )
      : recent;

    setRecentHrefs(nextRecent);
    setFavoriteHrefs(favorites);
    setSavedSets(sets);
    writeLocalJson(RECENT_DESTINATIONS_KEY, nextRecent);
  }, [pathname]);

  const recentTargets = useMemo(
    () =>
      recentHrefs
        .map((href) => operatorCommandTargetByHref(href))
        .filter((target): target is NonNullable<typeof target> => Boolean(target)),
    [recentHrefs]
  );

  const favoriteTargets = useMemo(
    () =>
      favoriteHrefs
        .map((href) => operatorCommandTargetByHref(href))
        .filter((target): target is NonNullable<typeof target> => Boolean(target)),
    [favoriteHrefs]
  );

  const workspaceTargets = useMemo(
    () => workspaceOperatorShortcutTargets(8),
    []
  );

  const activeSavedSet =
    collection.startsWith("set:")
      ? savedSets.find((set) => `set:${set.id}` === collection) ?? null
      : null;

  const activeSavedSetTargets = useMemo(
    () =>
      (activeSavedSet?.hrefs ?? [])
        .map((href) => operatorCommandTargetByHref(href))
        .filter((target): target is NonNullable<typeof target> => Boolean(target)),
    [activeSavedSet]
  );

  const searchTargets = useMemo(
    () => searchOperatorCommandTargets(query, 12),
    [query]
  );

  const collectionTargets =
    collection === "favorites"
      ? favoriteTargets
      : collection === "workspace"
        ? workspaceTargets
        : collection === "recent"
          ? recentTargets.length
            ? recentTargets
            : searchOperatorCommandTargets("", 8)
          : activeSavedSetTargets;

  const displayTargets = normalizedQuery ? searchTargets : collectionTargets;

  const collectionTitle =
    collection === "favorites"
      ? "Pinned operator favorites"
      : collection === "workspace"
        ? "Workspace shortcuts"
        : collection === "recent"
          ? recentTargets.length
            ? "Recent operator destinations"
            : "Module destinations"
          : activeSavedSet?.name ?? "Saved navigation set";

  const collectionSubtitle =
    collection === "favorites"
      ? favoriteTargets.length
        ? "Pinned only in this browser"
        : "Pin destinations from any result"
      : collection === "workspace"
        ? "Registered Workspace & Administration destinations"
        : collection === "recent"
          ? recentTargets.length
            ? "Stored only in this browser"
            : "Start with a module hub"
          : activeSavedSet
            ? activeSavedSet.hrefs.length + " saved destination" + (activeSavedSet.hrefs.length === 1 ? "" : "s")
            : "Saved set is no longer available";

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(NAVIGATION_USAGE_EVENT, {
        detail: { shortcutId: "command-palette" }
      })
    );
    setOpen(true);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      closePalette();
    },
    [closePalette, router]
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) closePalette();
        else openPalette();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, recentHrefs, favoriteHrefs, savedSets, collection, open]);

  useEffect(() => {
    if (!open) return;

    function handlePaletteKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
        return;
      }

      if (event.target !== inputRef.current || !displayTargets.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % displayTargets.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (index) => (index - 1 + displayTargets.length) % displayTargets.length
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        navigate(displayTargets[activeIndex]?.href ?? displayTargets[0].href);
      }
    }

    document.addEventListener("keydown", handlePaletteKey);
    return () => document.removeEventListener("keydown", handlePaletteKey);
  }, [activeIndex, closePalette, displayTargets, navigate, open]);

  function clearRecentDestinations() {
    setRecentHrefs([]);
    try {
      window.localStorage.removeItem(RECENT_DESTINATIONS_KEY);
    } catch {
      // Browser storage is optional.
    }
  }

  function toggleFavorite(href: string) {
    const next = favoriteHrefs.includes(href)
      ? favoriteHrefs.filter((candidate) => candidate !== href)
      : sanitizeFavoriteOperatorDestinationHrefs(
          [href, ...favoriteHrefs],
          MAX_FAVORITES
        );

    setFavoriteHrefs(next);
    writeLocalJson(FAVORITE_DESTINATIONS_KEY, next);
  }

  function saveFavoriteNavigationSet() {
    const name = setName.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name || !favoriteHrefs.length) return;

    const id = "set-" + Date.now().toString(36);
    const next = sanitizeSavedOperatorNavigationSets(
      [{ id, name, hrefs: favoriteHrefs }, ...savedSets],
      MAX_SAVED_SETS,
      MAX_FAVORITES
    );

    setSavedSets(next);
    setSetName("");
    setCollection(`set:${id}`);
    writeLocalJson(SAVED_NAVIGATION_SETS_KEY, next);
  }

  function removeSavedNavigationSet(id: string) {
    const next = savedSets.filter((set) => set.id !== id);
    setSavedSets(next);
    if (collection === `set:${id}`) setCollection("favorites");
    writeLocalJson(SAVED_NAVIGATION_SETS_KEY, next);
  }

  return (
    <>
      <button
        className="commandPaletteTrigger"
        type="button"
        onClick={openPalette}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>Command</span>
        <kbd>Ctrl K</kbd>
      </button>

      {open ? (
        <div
          className="commandPaletteBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette();
          }}
        >
          <section
            className="commandPaletteDialog uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral"
            role="dialog"
            aria-modal="true"
            aria-labelledby="operator-command-palette-title"
          >
            <div className="commandPaletteHeader">
              <div>
                <p className="eyebrow">Build 123 · Personal navigation</p>
                <h2 id="operator-command-palette-title">Operator command palette</h2>
              </div>
              <div className="commandPaletteHeaderActions">
                <HelpInfo topic="command-palette" inline />
                <button type="button" onClick={closePalette} aria-label="Close command palette">
                  ×
                </button>
              </div>
            </div>

            <label className="commandPaletteSearch" htmlFor="operator-command-search">
              <span className="srOnly">Search modules and operator screens</span>
              <input
                ref={inputRef}
                id="operator-command-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, workflows or operator tasks"
                autoComplete="off"
              />
              <kbd>Esc</kbd>
            </label>

            {!normalizedQuery ? (
              <div className="commandPaletteCollections" aria-label="Operator navigation collections">
                <div className="commandPaletteCollectionTabs">
                  {([
                    ["recent", "Recent"],
                    ["favorites", "Favorites"],
                    ["workspace", "Workspace"]
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      className={collection === value ? "active" : ""}
                      aria-pressed={collection === value}
                      onClick={() => setCollection(value)}
                      key={value}
                    >
                      {label}
                    </button>
                  ))}
                  {savedSets.map((set) => (
                    <span className="commandPaletteSavedSetTab" key={set.id}>
                      <button
                        type="button"
                        className={collection === `set:${set.id}` ? "active" : ""}
                        aria-pressed={collection === `set:${set.id}`}
                        onClick={() => setCollection(`set:${set.id}`)}
                      >
                        {set.name}
                      </button>
                      <button
                        type="button"
                        className="commandPaletteSavedSetRemove"
                        aria-label={"Remove saved navigation set " + set.name}
                        onClick={() => removeSavedNavigationSet(set.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <HelpInfo topic="saved-navigation-sets" inline />
              </div>
            ) : null}

            <div className="commandPaletteListHeader">
              <div>
                <strong>{normalizedQuery ? "Search results" : collectionTitle}</strong>
                <span>
                  {normalizedQuery
                    ? displayTargets.length + " match" + (displayTargets.length === 1 ? "" : "es")
                    : collectionSubtitle}
                </span>
              </div>
              {!normalizedQuery && collection === "recent" && recentTargets.length ? (
                <div className="commandPaletteRecentActions">
                  <HelpInfo topic="recent-operator-destinations" inline />
                  <button type="button" onClick={clearRecentDestinations}>
                    Clear recent
                  </button>
                </div>
              ) : !normalizedQuery && collection === "favorites" ? (
                <HelpInfo topic="operator-favorites" inline />
              ) : !normalizedQuery && collection === "workspace" ? (
                <HelpInfo topic="workspace-shortcuts" inline />
              ) : null}
            </div>

            {displayTargets.length ? (
              <div
                className="commandPaletteResults"
                role="listbox"
                aria-label={normalizedQuery ? "Command search results" : "Operator destinations"}
              >
                {displayTargets.map((target, index) => {
                  const isFavorite = favoriteHrefs.includes(target.href);
                  return (
                    <div
                      className={
                        index === activeIndex
                          ? "commandPaletteResultRow active"
                          : "commandPaletteResultRow"
                      }
                      role="option"
                      aria-selected={index === activeIndex}
                      key={target.href}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <button
                        className="commandPaletteResult"
                        type="button"
                        onClick={() => navigate(target.href)}
                      >
                        <span className="commandPaletteResultKind">
                          {target.kind === "module" ? "Module" : target.groupShortLabel}
                        </span>
                        <span className="commandPaletteResultBody">
                          <strong>{target.label}</strong>
                          <small>{target.description}</small>
                        </span>
                        <span className="commandPaletteResultGroup">{target.groupLabel}</span>
                      </button>
                      <button
                        className={isFavorite ? "commandPaletteFavorite active" : "commandPaletteFavorite"}
                        type="button"
                        aria-pressed={isFavorite}
                        aria-label={(isFavorite ? "Unpin " : "Pin ") + target.label}
                        title={(isFavorite ? "Unpin " : "Pin ") + target.label}
                        onClick={() => toggleFavorite(target.href)}
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="commandPaletteEmpty">
                <strong>
                  {normalizedQuery
                    ? "No registered destination matches that search."
                    : collection === "favorites"
                      ? "No favorites pinned yet."
                      : collection.startsWith("set:")
                        ? "This saved set has no valid registered destinations."
                        : "No destinations are available in this collection."}
                </strong>
                <span>
                  {normalizedQuery
                    ? "Try a module name, workflow name or broader operator task."
                    : "Use search or another collection, then pin the destinations you use most."}
                </span>
              </div>
            )}

            {!normalizedQuery ? (
              <div className="commandPaletteSetBuilder uiSurfaceCard uiSurfaceCard--inset uiSurfaceCard--neutral">
                <div>
                  <strong>Save current favorites as a navigation set</strong>
                  <span>
                    {favoriteHrefs.length
                      ? favoriteHrefs.length + " pinned destination" + (favoriteHrefs.length === 1 ? "" : "s") + " ready"
                      : "Pin at least one destination first"}
                  </span>
                </div>
                <div className="commandPaletteSetForm">
                  <input
                    type="text"
                    value={setName}
                    onChange={(event) => setSetName(event.target.value)}
                    placeholder="Set name"
                    maxLength={40}
                    aria-label="Saved navigation set name"
                  />
                  <button
                    type="button"
                    onClick={saveFavoriteNavigationSet}
                    disabled={!setName.trim() || !favoriteHrefs.length}
                  >
                    Save set
                  </button>
                </div>
              </div>
            ) : null}

            <footer className="commandPaletteFooter">
              <span><kbd>↑</kbd><kbd>↓</kbd> select</span>
              <span><kbd>Enter</kbd> open</span>
              <span>Navigation only · workflow controls remain authoritative</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
