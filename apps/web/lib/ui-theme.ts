// Build 118 — Marble Design System, Card Framework & Visual Theme Foundation
export const UI_THEMES = [
  {
    id: "marble-standard",
    name: "Operations Command",
    description:
      "Midnight data-grid surfaces, violet and electric-blue command accents, gold evidence highlights and dense operational information.",
    status: "active" as const
  }
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]["id"];

export const DEFAULT_UI_THEME: UiThemeId = "marble-standard";

export function uiThemeById(id: string) {
  return UI_THEMES.find((theme) => theme.id === id) ?? UI_THEMES[0];
}

// Build 241 visual-system compatibility marker: Marble Standard remains the persisted theme id.
