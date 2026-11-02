export type HardeningStatus = "hardened" | "review";

export type HardeningAuditItem = {
  key: string;
  area: "Accessibility" | "Mobile" | "Performance" | "Recovery";
  label: string;
  status: HardeningStatus;
  detail: string;
  evidence: string;
};

export type HardeningAuditModel = {
  schema: "ai-data-platform.hardening-audit.v1";
  generatedAt: string;
  items: HardeningAuditItem[];
  budgets: {
    narrowViewportPx: number;
    tapTargetPx: number;
    routeAnnouncement: boolean;
    reducedMotion: boolean;
    forcedColors: boolean;
    retryBoundary: boolean;
    loadingState: boolean;
    queryConcurrencyPreferred: boolean;
    noNewTelemetryStore: true;
  };
};

export function buildHardeningAudit(): HardeningAuditModel {
  const items: HardeningAuditItem[] = [
    {
      key: "keyboard-focus",
      area: "Accessibility",
      label: "Keyboard navigation and focus visibility",
      status: "hardened",
      detail: "Skip navigation, visible focus treatment and focusable main content remain available across the application shell.",
      evidence: "ApplicationShell + global focus styles"
    },
    {
      key: "screen-reader-route",
      area: "Accessibility",
      label: "Screen-reader route announcements",
      status: "hardened",
      detail: "Route changes announce the current application section through a polite live region without stealing focus.",
      evidence: "ApplicationShell route status"
    },
    {
      key: "reduced-motion",
      area: "Accessibility",
      label: "Reduced motion",
      status: "hardened",
      detail: "Motion and smooth transitions are suppressed when the operating system requests reduced motion.",
      evidence: "prefers-reduced-motion global override"
    },
    {
      key: "forced-colors",
      area: "Accessibility",
      label: "Forced colors and high contrast",
      status: "hardened",
      detail: "Interactive controls retain visible boundaries and focus indicators under forced-colors mode.",
      evidence: "forced-colors global override"
    },
    {
      key: "narrow-layout",
      area: "Mobile",
      label: "Narrow layout containment",
      status: "hardened",
      detail: "Application navigation, action rows, tables, forms and cards are constrained to the viewport with safe wrapping and horizontal overflow containment.",
      evidence: "760px and 520px shell hardening"
    },
    {
      key: "touch-targets",
      area: "Mobile",
      label: "Touch target sizing",
      status: "hardened",
      detail: "Primary mobile navigation links, buttons and disclosure controls receive a minimum comfortable interaction height.",
      evidence: "mobile control min-height"
    },
    {
      key: "loading-state",
      area: "Recovery",
      label: "Route loading state",
      status: "hardened",
      detail: "Navigation can render a semantic loading state with aria-live status text instead of an unexplained blank region.",
      evidence: "app/loading.tsx"
    },
    {
      key: "error-retry",
      area: "Recovery",
      label: "Recoverable error boundary",
      status: "hardened",
      detail: "Unexpected route failures expose a retry action and a safe route back to the command center.",
      evidence: "app/error.tsx"
    },
    {
      key: "empty-state",
      area: "Recovery",
      label: "Empty-state semantics",
      status: "hardened",
      detail: "The hardening standard requires empty states to identify the missing evidence and provide a next action instead of presenting a zero as proof.",
      evidence: "Build 271 hardening standard"
    },
    {
      key: "page-weight",
      area: "Performance",
      label: "Page-weight discipline",
      status: "hardened",
      detail: "Build 271 adds no new client framework or analytics bundle; the audit surface is server-rendered and reuses the existing design system.",
      evidence: "No new runtime dependency"
    },
    {
      key: "query-performance",
      area: "Performance",
      label: "Query concurrency and bounded reads",
      status: "hardened",
      detail: "Existing review builders continue to prefer bounded workspace-scoped reads and parallel independent lookups instead of serial duplicate fetching.",
      evidence: "Existing Promise.all/RLS data paths"
    },
    {
      key: "external-load",
      area: "Performance",
      label: "External-resource failure containment",
      status: "hardened",
      detail: "This build introduces no new third-party runtime fetch on page render, keeping failure recovery inside existing authenticated application boundaries.",
      evidence: "No new external runtime dependency"
    }
  ];

  return {
    schema: "ai-data-platform.hardening-audit.v1",
    generatedAt: new Date().toISOString(),
    items,
    budgets: {
      narrowViewportPx: 360,
      tapTargetPx: 44,
      routeAnnouncement: true,
      reducedMotion: true,
      forcedColors: true,
      retryBoundary: true,
      loadingState: true,
      queryConcurrencyPreferred: true,
      noNewTelemetryStore: true
    }
  };
}
