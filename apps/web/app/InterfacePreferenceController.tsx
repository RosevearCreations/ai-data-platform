"use client";

import { useEffect } from "react";

import {
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_STORAGE_KEY,
  defaultInterfacePreferences,
  resolveNavigationDensity,
  sanitizeInterfacePreferences,
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

function applyPreferences(preferences: InterfacePreferences) {
  const root = document.documentElement;
  root.dataset.navigationDensityPreference = preferences.navigationDensity;
  root.dataset.navigationDensity = resolveNavigationDensity(
    preferences.navigationDensity,
    window.innerWidth
  );
  root.dataset.workspaceLayout = preferences.workspaceLayout;
  root.dataset.recommendationMode = preferences.recommendations;
}

export function InterfacePreferenceController() {
  useEffect(() => {
    let preferences = readPreferences();
    applyPreferences(preferences);

    function handlePreferenceChange(event: Event) {
      const detail = (
        event as CustomEvent<{ preferences?: InterfacePreferences }>
      ).detail;
      preferences = sanitizeInterfacePreferences(
        detail?.preferences ?? readPreferences()
      );
      applyPreferences(preferences);
    }

    function handleResize() {
      if (preferences.navigationDensity === "adaptive") {
        applyPreferences(preferences);
      }
    }

    window.addEventListener(
      INTERFACE_PREFERENCES_EVENT,
      handlePreferenceChange
    );
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        INTERFACE_PREFERENCES_EVENT,
        handlePreferenceChange
      );
      window.removeEventListener("resize", handleResize);

      const root = document.documentElement;
      delete root.dataset.navigationDensityPreference;
      delete root.dataset.navigationDensity;
      delete root.dataset.workspaceLayout;
      delete root.dataset.recommendationMode;
    };
  }, []);

  return null;
}
