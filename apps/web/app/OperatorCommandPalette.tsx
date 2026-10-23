"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { HelpInfo } from "@/app/help/HelpInfo";
import {
  operatorCommandTargetByHref,
  operatorCommandTargetByPathname,
  sanitizeRecentOperatorDestinationHrefs,
  searchOperatorCommandTargets
} from "@/lib/operator-command-palette";

const RECENT_DESTINATIONS_KEY = "ai-data-platform:recent-operator-destinations:v1";
const MAX_RECENT_DESTINATIONS = 6;

export function OperatorCommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  const normalizedQuery = query.trim();

  useEffect(() => {
    let stored: unknown = [];

    try {
      const raw = window.localStorage.getItem(RECENT_DESTINATIONS_KEY);
      stored = raw ? JSON.parse(raw) : [];
    } catch {
      stored = [];
    }

    const current = operatorCommandTargetByPathname(pathname);
    const recent = sanitizeRecentOperatorDestinationHrefs(
      stored,
      MAX_RECENT_DESTINATIONS
    );

    const shouldRemember =
      current &&
      current.groupId !== "overview" &&
      current.groupId !== "help";

    const next = shouldRemember
      ? [current.href, ...recent.filter((href) => href !== current.href)].slice(
          0,
          MAX_RECENT_DESTINATIONS
        )
      : recent;

    setRecentHrefs(next);

    try {
      window.localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(next));
    } catch {
      // Recent destinations are a convenience only; navigation must still work.
    }
  }, [pathname]);

  const recentTargets = useMemo(
    () =>
      recentHrefs
        .map((href) => operatorCommandTargetByHref(href))
        .filter((target): target is NonNullable<typeof target> => Boolean(target)),
    [recentHrefs]
  );

  const searchTargets = useMemo(
    () => searchOperatorCommandTargets(query, 12),
    [query]
  );

  const displayTargets = normalizedQuery
    ? searchTargets
    : recentTargets.length
      ? recentTargets
      : searchOperatorCommandTargets("", 8);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
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
        else setOpen(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closePalette, open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, recentHrefs, open]);

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

  return (
    <>
      <button
        className="commandPaletteTrigger"
        type="button"
        onClick={() => setOpen(true)}
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
                <p className="eyebrow">Build 122 · Cross-module navigation</p>
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

            <div className="commandPaletteListHeader">
              <div>
                <strong>
                  {normalizedQuery
                    ? "Search results"
                    : recentTargets.length
                      ? "Recent operator destinations"
                      : "Module destinations"}
                </strong>
                <span>
                  {normalizedQuery
                    ? displayTargets.length + " match" + (displayTargets.length === 1 ? "" : "es")
                    : recentTargets.length
                      ? "Stored only in this browser"
                      : "Start with a module hub"}
                </span>
              </div>
              {!normalizedQuery && recentTargets.length ? (
                <div className="commandPaletteRecentActions">
                  <HelpInfo topic="recent-operator-destinations" inline />
                  <button type="button" onClick={clearRecentDestinations}>
                    Clear recent
                  </button>
                </div>
              ) : null}
            </div>

            {displayTargets.length ? (
              <div
                className="commandPaletteResults"
                role="listbox"
                aria-label={normalizedQuery ? "Command search results" : "Operator destinations"}
              >
                {displayTargets.map((target, index) => (
                  <button
                    className={
                      index === activeIndex
                        ? "commandPaletteResult active"
                        : "commandPaletteResult"
                    }
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    key={target.href}
                    onMouseEnter={() => setActiveIndex(index)}
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
                ))}
              </div>
            ) : (
              <div className="commandPaletteEmpty">
                <strong>No registered destination matches that search.</strong>
                <span>Try a module name, workflow name or broader operator task.</span>
              </div>
            )}

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
