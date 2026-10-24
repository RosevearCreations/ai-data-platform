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
  INTERFACE_PREFERENCE_PRESETS,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_RECONCILED_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  INTERFACE_RESET_GOVERNANCE,
  applyInterfacePreferencePreset,
  defaultInterfacePreferences,
  matchingInterfacePreferencePreset,
  parseInterfacePreferenceProfile,
  previewInterfacePreferenceProfile,
  recommendationPreferenceAllowsKind,
  sanitizeInterfacePreferences,
  serializeInterfacePreferenceProfile,
  type InterfacePreferencePresetId,
  type InterfacePreferenceReconciliation,
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
  const importFileRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<NavigationUsageSnapshot>(
    emptyNavigationUsageSnapshot
  );
  const [preferences, setPreferences] = useState<InterfacePreferences>(
    defaultInterfacePreferences
  );
  const [reconciliation, setReconciliation] =
    useState<InterfacePreferenceReconciliation | null>(null);
  const [resetAllArmed, setResetAllArmed] = useState(false);
  const [importPreview, setImportPreview] =
    useState<InterfacePreferenceReconciliation | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);

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

  useEffect(() => {
    function handleReconciliation(event: Event) {
      const detail = (
        event as CustomEvent<InterfacePreferenceReconciliation>
      ).detail;
      if (!detail?.effectivePreferences) return;
      setReconciliation(detail);
    }

    window.addEventListener(
      INTERFACE_PREFERENCES_RECONCILED_EVENT,
      handleReconciliation
    );
    return () =>
      window.removeEventListener(
        INTERFACE_PREFERENCES_RECONCILED_EVENT,
        handleReconciliation
      );
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
  const activePreset = useMemo(
    () => matchingInterfacePreferencePreset(preferences),
    [preferences]
  );

  const openInsights = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    window.dispatchEvent(
      new CustomEvent(INTERFACE_PREFERENCES_EVENT, {
        detail: { preferences }
      })
    );
  }, [preferences]);

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
    setResetAllArmed(false);
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
    setResetAllArmed(false);

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
    setResetAllArmed(false);
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

  function applyPreset(id: InterfacePreferencePresetId) {
    updatePreferences(applyInterfacePreferencePreset(id));
  }

  function currentAccessibilityEnvironment() {
    return {
      viewportWidth: window.innerWidth,
      forcedColors: window.matchMedia("(forced-colors: active)").matches,
      prefersMoreContrast: window.matchMedia("(prefers-contrast: more)").matches,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  }

  function exportPreferenceProfile() {
    const payload = serializeInterfacePreferenceProfile(preferences);
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-data-platform-interface-preferences.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setImportError(null);
    setPortabilityStatus(
      "Preference profile exported. Navigation insights and business data were not included."
    );
  }

  async function stagePreferenceProfileImport(file?: File) {
    setImportError(null);
    setPortabilityStatus(null);
    setImportPreview(null);

    if (!file) return;
    if (file.size > 32 * 1024) {
      setImportError("Preference profile files must be 32 KB or smaller.");
      return;
    }

    const parsed = parseInterfacePreferenceProfile(await file.text());
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }

    setImportPreview(
      previewInterfacePreferenceProfile(
        parsed.profile,
        currentAccessibilityEnvironment()
      )
    );
    setPortabilityStatus(
      "Profile loaded for preview. Nothing has been applied yet."
    );
  }

  function applyImportedPreferenceProfile() {
    if (!importPreview) return;
    updatePreferences(importPreview.storedPreferences);
    setImportPreview(null);
    setImportError(null);
    setPortabilityStatus(
      "Imported interface preferences are now active in this browser."
    );
  }

  function cancelPreferenceProfileImport() {
    setImportPreview(null);
    setImportError(null);
    setPortabilityStatus("Import cancelled. Current preferences were not changed.");
  }

  function resetAllLocalNavigationData() {
    if (!resetAllArmed) {
      setResetAllArmed(true);
      return;
    }

    const defaults = defaultInterfacePreferences();
    const empty = emptyNavigationUsageSnapshot();
    setPreferences(defaults);
    setSnapshot(empty);
    setResetAllArmed(false);

    try {
      window.localStorage.removeItem(INTERFACE_PREFERENCES_STORAGE_KEY);
      window.localStorage.removeItem(NAVIGATION_INSIGHTS_STORAGE_KEY);
    } catch {
      // Browser-local state is optional.
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
                <p className="eyebrow">Build 128 · Preference profile portability & reconciliation preview</p>
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
                <HelpInfo topic="interface-preference-presets" inline />
              </div>

              <section className="interfacePresetSection" aria-labelledby="interface-preset-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="interface-preset-heading">Preference presets</strong>
                    <span>Apply a known browser-local combination, then fine-tune any setting below.</span>
                  </div>
                  <HelpInfo topic="interface-preference-presets" inline />
                </div>
                <div className="interfacePresetGrid">
                  {INTERFACE_PREFERENCE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      className={activePreset?.id === preset.id ? "active" : ""}
                      aria-pressed={activePreset?.id === preset.id}
                      onClick={() => applyPreset(preset.id)}
                      key={preset.id}
                    >
                      <strong>{preset.label}</strong>
                      <span>{preset.description}</span>
                    </button>
                  ))}
                </div>
              </section>

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

              <section className="interfaceReconciliationStatus" aria-live="polite">
                <div>
                  <strong>Accessibility-safe reconciliation</strong>
                  <HelpInfo topic="accessibility-preference-reconciliation" inline />
                </div>
                {reconciliation?.accessibilityGuardActive ? (
                  <ul>
                    {reconciliation.adjustments.map((adjustment) => (
                      <li key={adjustment}>{adjustment}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No accessibility reconciliation is currently required. Stored preferences are active as selected.</p>
                )}
                <small>Accessibility safeguards can temporarily change the effective shell without rewriting your saved preference.</small>
              </section>

              <section className="interfacePortabilitySection" aria-labelledby="preference-portability-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="preference-portability-heading">Preference profile portability</strong>
                    <span>Move interface preferences between browsers without syncing account, workspace or navigation-history data.</span>
                  </div>
                  <HelpInfo topic="preference-profile-portability" inline />
                </div>

                <div className="interfacePortabilityActions">
                  <button type="button" onClick={exportPreferenceProfile}>
                    Export profile
                  </button>
                  <button type="button" onClick={() => importFileRef.current?.click()}>
                    Import profile
                  </button>
                  <input
                    ref={importFileRef}
                    hidden
                    type="file"
                    accept=".json,application/json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void stagePreferenceProfileImport(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>

                <p className="interfacePortabilityBoundary">
                  Portable files contain only density, layout and recommendation preferences. Navigation insights, account information and business data are excluded.
                </p>

                {importError ? (
                  <div className="interfacePortabilityError" role="alert">{importError}</div>
                ) : null}
                {portabilityStatus ? (
                  <div className="interfacePortabilityStatus" role="status">{portabilityStatus}</div>
                ) : null}

                {importPreview ? (
                  <div className="interfaceImportPreview">
                    <div className="interfacePresetHeading">
                      <div>
                        <strong>Import reconciliation preview</strong>
                        <span>Review stored values and the effective values this browser will use before applying.</span>
                      </div>
                      <HelpInfo topic="preference-import-preview" inline />
                    </div>

                    <dl>
                      <div>
                        <dt>Navigation density</dt>
                        <dd>{importPreview.storedPreferences.navigationDensity} → {importPreview.effectivePreferences.navigationDensity}</dd>
                      </div>
                      <div>
                        <dt>Workspace layout</dt>
                        <dd>{importPreview.storedPreferences.workspaceLayout} → {importPreview.effectivePreferences.workspaceLayout}</dd>
                      </div>
                      <div>
                        <dt>Recommendations</dt>
                        <dd>{importPreview.storedPreferences.recommendations} → {importPreview.effectivePreferences.recommendations}</dd>
                      </div>
                    </dl>

                    {importPreview.adjustments.length ? (
                      <ul>
                        {importPreview.adjustments.map((adjustment) => (
                          <li key={adjustment}>{adjustment}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No accessibility reconciliation is required for this imported profile in the current browser.</p>
                    )}

                    <div className="interfaceImportPreviewActions">
                      <button type="button" onClick={applyImportedPreferenceProfile}>
                        Apply imported profile
                      </button>
                      <button type="button" onClick={cancelPreferenceProfileImport}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="interfaceResetGovernance" aria-labelledby="reset-governance-heading">
                <div className="interfacePresetHeading">
                  <div>
                    <strong id="reset-governance-heading">Operator reset governance</strong>
                    <span>Choose the reset scope deliberately. Full reset requires a second activation.</span>
                  </div>
                  <HelpInfo topic="operator-reset-governance" inline />
                </div>
                <div className="interfaceResetChoices">
                  <button type="button" onClick={resetInterfacePreferences}>
                    <strong>{INTERFACE_RESET_GOVERNANCE.preferences.label}</strong>
                    <span>{INTERFACE_RESET_GOVERNANCE.preferences.description}</span>
                  </button>
                  <button type="button" onClick={resetLocalInsights}>
                    <strong>{INTERFACE_RESET_GOVERNANCE.insights.label}</strong>
                    <span>{INTERFACE_RESET_GOVERNANCE.insights.description}</span>
                  </button>
                  <button
                    type="button"
                    className={resetAllArmed ? "armed" : ""}
                    onClick={resetAllLocalNavigationData}
                    aria-pressed={resetAllArmed}
                  >
                    <strong>
                      {resetAllArmed ? "Confirm full local reset" : INTERFACE_RESET_GOVERNANCE.all.label}
                    </strong>
                    <span>
                      {resetAllArmed
                        ? "Activate once more to clear preferences and insights in this browser."
                        : INTERFACE_RESET_GOVERNANCE.all.description}
                    </span>
                  </button>
                </div>
              </section>
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
              <span>Browser-local preferences and insights only · portable profiles contain no business data and never change workflow authority.</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
