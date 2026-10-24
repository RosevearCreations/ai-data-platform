"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HelpInfo } from "@/app/help/HelpInfo";
import {
  NAVIGATION_INSIGHTS_STORAGE_KEY,
  NAVIGATION_USAGE_EVENT,
  emptyNavigationUsageSnapshot,
  navigationUsageTotals,
  personalizedInterfaceRecommendations,
  recordNavigationShortcutUse,
  recordNavigationVisit,
  sanitizeNavigationUsageSnapshot,
  shortcutDiscoverabilityMetrics,
  type NavigationShortcutId,
  type NavigationUsageSnapshot
} from "@/lib/navigation-insights";
import {
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  defaultInterfacePreferences,
  recommendationPreferenceAllowsKind,
  sanitizeInterfacePreferences,
  type InterfacePreferences
} from "@/lib/navigation-preferences";

function readSnapshot() {
  try {
    const raw = window.localStorage.getItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
    return sanitizeNavigationUsageSnapshot(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyNavigationUsageSnapshot();
  }
}

function writeSnapshot(snapshot: NavigationUsageSnapshot) {
  try {
    window.localStorage.setItem(
      NAVIGATION_INSIGHTS_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // Local insights are optional and must never interrupt navigation.
  }
}

export function NavigationInsights() {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<NavigationUsageSnapshot>(
    emptyNavigationUsageSnapshot
  );
  const [preferences, setPreferences] = useState<InterfacePreferences>(
    defaultInterfacePreferences
  );

  useEffect(() => {
    const next = recordNavigationVisit(readSnapshot(), pathname);
    setSnapshot(next);
    writeSnapshot(next);

    try {
      const raw = window.localStorage.getItem(INTERFACE_PREFERENCES_STORAGE_KEY);
      setPreferences(
        sanitizeInterfacePreferences(raw ? JSON.parse(raw) : null)
      );
    } catch {
      setPreferences(defaultInterfacePreferences());
    }
  }, [pathname]);

  useEffect(() => {
    function handleUsage(event: Event) {
      const detail = (event as CustomEvent<{ shortcutId?: NavigationShortcutId }>).detail;
      const shortcutId = detail?.shortcutId;
      if (shortcutId !== "command-palette" && shortcutId !== "keyboard-map") return;

      setSnapshot((current) => {
        const next = recordNavigationShortcutUse(current, shortcutId);
        writeSnapshot(next);
        return next;
      });
    }

    window.addEventListener(NAVIGATION_USAGE_EVENT, handleUsage);
    return () => window.removeEventListener(NAVIGATION_USAGE_EVENT, handleUsage);
  }, []);

  const totals = useMemo(() => navigationUsageTotals(snapshot), [snapshot]);
  const shortcutMetrics = useMemo(
    () => shortcutDiscoverabilityMetrics(snapshot),
    [snapshot]
  );
  const recommendations = useMemo(
    () => personalizedInterfaceRecommendations(snapshot, pathname, 6),
    [pathname, snapshot]
  );
  const visibleRecommendations = useMemo(
    () =>
      recommendations.filter((recommendation) =>
        recommendationPreferenceAllowsKind(
          preferences.recommendations,
          recommendation.kind
        )
      ),
    [preferences.recommendations, recommendations]
  );

  const openInsights = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const closeInsights = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeInsights();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeInsights, open]);

  function resetLocalInsights() {
    const empty = emptyNavigationUsageSnapshot();
    setSnapshot(empty);
    try {
      window.localStorage.removeItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
    } catch {
      // Local insights are optional.
    }
  }

  function updatePreferences(next: Partial<InterfacePreferences>) {
    const sanitized = sanitizeInterfacePreferences({
      ...preferences,
      ...next,
      version: 1
    });
    setPreferences(sanitized);

    try {
      window.localStorage.setItem(
        INTERFACE_PREFERENCES_STORAGE_KEY,
        JSON.stringify(sanitized)
      );
    } catch {
      // Browser-local preferences are optional.
    }

    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences: sanitized }
      })
    );
  }

  function resetInterfacePreferences() {
    const defaults = defaultInterfacePreferences();
    setPreferences(defaults);
    try {
      window.localStorage.removeItem(INTERFACE_PREFERENCES_STORAGE_KEY);
    } catch {
      // Browser-local preferences are optional.
    }
    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences: defaults }
      })
    );
  }

  return (
    <>
      <button
        className="navigationInsightsTrigger"
        type="button"
        onClick={openInsights}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Insights
      </button>

      {open ? (
        <div
          className="navigationInsightsBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInsights();
          }}
        >
          <section
            className="navigationInsightsDialog uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral"
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-insights-title"
          >
            <header className="navigationInsightsHeader">
              <div>
                <p className="eyebrow">Build 126 · Adaptive interface preferences</p>
                <h2 id="navigation-insights-title">Navigation usage insights</h2>
                <p>
                  Aggregate navigation counts stay in this browser. No timestamps, search terms or business data are collected.
                </p>
              </div>
              <div className="navigationInsightsHeaderActions">
                <HelpInfo topic="navigation-usage-insights" inline />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeInsights}
                  aria-label="Close navigation insights"
                >
                  ×
                </button>
              </div>
            </header>

            <section className="interfacePreferencePanel" aria-labelledby="interface-preferences-heading">
              <div className="navigationInsightsSectionHeading">
                <div>
                  <p className="eyebrow">Role-neutral browser preferences</p>
                  <h3 id="interface-preferences-heading">Interface preferences</h3>
                </div>
                <HelpInfo topic="adaptive-navigation-density" inline />
              </div>

              <div className="interfacePreferenceGrid">
                <fieldset>
                  <legend>Navigation density</legend>
                  <div className="interfacePreferenceChoices">
                    {(["adaptive", "comfortable", "compact"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.navigationDensity === value ? "active" : ""}
                        aria-pressed={preferences.navigationDensity === value}
                        onClick={() => updatePreferences({ navigationDensity: value })}
                        key={value}
                      >
                        {value === "adaptive" ? "Adaptive" : value === "comfortable" ? "Comfortable" : "Compact"}
                      </button>
                    ))}
                  </div>
                  <small>Adaptive responds only to viewport width.</small>
                </fieldset>

                <fieldset>
                  <legend>Workspace layout</legend>
                  <div className="interfacePreferenceChoices">
                    {(["balanced", "wide", "focused"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.workspaceLayout === value ? "active" : ""}
                        aria-pressed={preferences.workspaceLayout === value}
                        onClick={() => updatePreferences({ workspaceLayout: value })}
                        key={value}
                      >
                        {value === "balanced" ? "Balanced" : value === "wide" ? "Wide" : "Focused"}
                      </button>
                    ))}
                  </div>
                  <small>No role, permission or job-function inference is used.</small>
                </fieldset>

                <fieldset>
                  <legend>Recommendations</legend>
                  <div className="interfacePreferenceChoices">
                    {(["all", "destinations", "shortcuts", "off"] as const).map((value) => (
                      <button
                        type="button"
                        className={preferences.recommendations === value ? "active" : ""}
                        aria-pressed={preferences.recommendations === value}
                        onClick={() => updatePreferences({ recommendations: value })}
                        key={value}
                      >
                        {value === "all" ? "All" : value === "destinations" ? "Destinations" : value === "shortcuts" ? "Shortcuts" : "Off"}
                      </button>
                    ))}
                  </div>
                  <small>Controls what appears in Suggested for you.</small>
                </fieldset>
              </div>

              <div className="interfacePreferenceActions">
                <HelpInfo topic="workspace-layout-preferences" inline />
                <HelpInfo topic="recommendation-controls" inline />
                <button type="button" onClick={resetInterfacePreferences}>
                  Reset interface preferences
                </button>
              </div>
            </section>

            <div className="navigationInsightMetrics" aria-label="Local navigation usage summary">
              <article><strong>{totals.totalVisits}</strong><span>Registered visits</span></article>
              <article><strong>{totals.uniqueDestinations}</strong><span>Destinations used</span></article>
              <article><strong>{totals.shortcutUses}</strong><span>Shortcut opens</span></article>
            </div>

            <div className="navigationInsightsGrid">
              <section className="navigationInsightsPanel" aria-labelledby="shortcut-discoverability-heading">
                <div className="navigationInsightsSectionHeading">
                  <div><p className="eyebrow">Discoverability</p><h3 id="shortcut-discoverability-heading">Shortcut metrics</h3></div>
                  <HelpInfo topic="shortcut-discoverability-metrics" inline />
                </div>
                <div className="shortcutDiscoverabilityList">
                  {shortcutMetrics.map((metric) => (
                    <article key={metric.id}>
                      <div><strong>{metric.label}</strong><span>{metric.guidance}</span></div>
                      <div className="shortcutDiscoverabilityMeta">
                        <kbd>{metric.keys}</kbd>
                        <span>{metric.uses} use{metric.uses === 1 ? "" : "s"}</span>
                        <em>{metric.level.replace("-", " ")}</em>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="navigationInsightsPanel" aria-labelledby="personalized-recommendations-heading">
                <div className="navigationInsightsSectionHeading">
                  <div><p className="eyebrow">Local recommendations</p><h3 id="personalized-recommendations-heading">Suggested for you</h3></div>
                  <HelpInfo topic="personalized-interface-recommendations" inline />
                </div>
                <div className="interfaceRecommendationList">
                  {visibleRecommendations.map((recommendation) =>
                    recommendation.kind === "destination" ? (
                      <Link href={recommendation.href} onClick={closeInsights} key={recommendation.id}>
                        <span><strong>{recommendation.label}</strong><small>{recommendation.description}</small></span>
                        <em>{recommendation.reason}</em>
                      </Link>
                    ) : (
                      <article key={recommendation.id}>
                        <span><strong>{recommendation.label}</strong><small>{recommendation.description}</small></span>
                        <div><kbd>{recommendation.keys}</kbd><em>{recommendation.reason}</em></div>
                      </article>
                    )
                  )}
                  {!visibleRecommendations.length ? (
                    <div className="interfaceRecommendationEmpty">
                      Recommendations are hidden by your local interface preference.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <footer className="navigationInsightsFooter">
              <span>Browser-local aggregate counts only · navigation recommendations never change workflow authority.</span>
              <button type="button" onClick={resetLocalInsights}>Reset local insights</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
