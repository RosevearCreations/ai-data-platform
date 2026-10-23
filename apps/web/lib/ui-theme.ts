// Build 118 — Marble Design System, Card Framework & Visual Theme Foundation
export const UI_THEMES = [
  {
    id: "marble-standard",
    name: "Marble Standard",
    description:
      "Deep charcoal stone, restrained pale veining, translucent depth and teal operational accents.",
    status: "active" as const
  }
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]["id"];

export const DEFAULT_UI_THEME: UiThemeId = "marble-standard";

export function uiThemeById(id: string) {
  return UI_THEMES.find((theme) => theme.id === id) ?? UI_THEMES[0];
}
