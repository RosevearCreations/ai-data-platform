"use client";

import { useEffect } from "react";

import {
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_RECONCILED_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  defaultInterfacePreferences,
  reconcileInterfacePreferences,
  resolveNavigationDensity,
  sanitizeInterfacePreferences,
  type InterfaceAccessibilityEnvironment,
  type InterfacePreferences
} from "@/lib/navigation-preferences";

function readPreferences() {
  try {
    const raw = window.localStorage.getItem(INTERFACE_PREFERENCES_STORAGE_KEY);
    return sanitizeInterfacePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultInterfacePreferences();
  }
}

function readAccessibilityEnvironment(): InterfaceAccessibilityEnvironment {
  return {
    viewportWidth: window.innerWidth,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
    prefersMoreContrast: window.matchMedia("(prefers-contrast: more)").matches,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
}

function applyPreferences(preferences: InterfacePreferences) {
  const reconciliation = reconcileInterfacePreferences(
    preferences,
    readAccessibilityEnvironment()
  );
  const root = document.documentElement;
  const effective = reconciliation.effectivePreferences;

  root.dataset.navigationDensityPreference =
    reconciliation.storedPreferences.navigationDensity;
  root.dataset.navigationDensity = resolveNavigationDensity(
    effective.navigationDensity,
    window.innerWidth
  );
  root.dataset.workspaceLayout = effective.workspaceLayout;
  root.dataset.recommendationMode =
    reconciliation.storedPreferences.recommendations;
  root.dataset.preferenceReconciled =
    reconciliation.accessibilityGuardActive ? "true" : "false";
  root.dataset.reducedMotion = reconciliation.reducedMotion ? "true" : "false";

  window.dispatchEvent(
    new CustomEvent(INTERFACE_PREFERENCES_RECONCILED_EVENT, {
      detail: reconciliation
    })
  );
}

export function InterfacePreferenceController() {
  useEffect(() => {
    let preferences = readPreferences();
    applyPreferences(preferences);

    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    function handlePreferenceChange(event: Event) {
      const detail = (
        event as CustomEvent<{ preferences?: InterfacePreferences }>
      ).detail;
      preferences = sanitizeInterfacePreferences(
        detail?.preferences ?? readPreferences()
      );
      applyPreferences(preferences);
    }

    function handleEnvironmentChange() {
      applyPreferences(preferences);
    }

    window.addEventListener(
      INTERFACE_PREFERENCES_EVENT,
      handlePreferenceChange
    );
    window.addEventListener("resize", handleEnvironmentChange);
    contrastQuery.addEventListener("change", handleEnvironmentChange);
    forcedColorsQuery.addEventListener("change", handleEnvironmentChange);
    reducedMotionQuery.addEventListener("change", handleEnvironmentChange);

    return () => {
      window.removeEventListener(
        INTERFACE_PREFERENCES_EVENT,
        handlePreferenceChange
      );
      window.removeEventListener("resize", handleEnvironmentChange);
      contrastQuery.removeEventListener("change", handleEnvironmentChange);
      forcedColorsQuery.removeEventListener("change", handleEnvironmentChange);
      reducedMotionQuery.removeEventListener("change", handleEnvironmentChange);

      const root = document.documentElement;
      delete root.dataset.navigationDensityPreference;
      delete root.dataset.navigationDensity;
      delete root.dataset.workspaceLayout;
      delete root.dataset.recommendationMode;
      delete root.dataset.preferenceReconciled;
      delete root.dataset.reducedMotion;
    };
  }, []);

  return null;
}
