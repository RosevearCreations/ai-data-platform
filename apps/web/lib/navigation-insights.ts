import {
  OPERATOR_COMMAND_TARGETS,
  operatorCommandTargetByPathname,
  type OperatorCommandTarget
} from "./operator-command-palette";

export const NAVIGATION_INSIGHTS_STORAGE_KEY =
  "ai-data-platform:navigation-usage-insights:v1";
export const NAVIGATION_USAGE_EVENT = "ai-data-platform:navigation-usage";

export type NavigationShortcutId = "command-palette" | "keyboard-map";

export type NavigationUsageSnapshot = {
  version: 1;
  visits: Record<string, number>;
  shortcuts: Record<NavigationShortcutId, number>;
};

export type ShortcutDiscoverabilityMetric = {
  id: NavigationShortcutId;
  label: string;
  keys: string;
  uses: number;
  level: "not-tried" | "exploring" | "established";
  guidance: string;
};

export type InterfaceRecommendation =
  | {
      id: string;
      kind: "destination";
      label: string;
      description: string;
      href: string;
      reason: string;
    }
  | {
      id: string;
      kind: "shortcut";
      label: string;
      description: string;
      keys: string;
      reason: string;
    };

const MAX_COUNTER = 999;
const TARGET_HREFS = new Set(OPERATOR_COMMAND_TARGETS.map((target) => target.href));

export function emptyNavigationUsageSnapshot(): NavigationUsageSnapshot {
  return {
    version: 1,
    visits: {},
    shortcuts: {
      "command-palette": 0,
      "keyboard-map": 0
    }
  };
}

function sanitizeCounter(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(MAX_COUNTER, Math.floor(value));
}

export function sanitizeNavigationUsageSnapshot(
  value: unknown
): NavigationUsageSnapshot {
  const result = emptyNavigationUsageSnapshot();
  if (!value || typeof value !== "object") return result;

  const record = value as Record<string, unknown>;
  const visits =
    record.visits && typeof record.visits === "object"
      ? (record.visits as Record<string, unknown>)
      : {};

  for (const [href, count] of Object.entries(visits)) {
    if (!TARGET_HREFS.has(href)) continue;
    const sanitized = sanitizeCounter(count);
    if (sanitized > 0) result.visits[href] = sanitized;
  }

  const shortcuts =
    record.shortcuts && typeof record.shortcuts === "object"
      ? (record.shortcuts as Record<string, unknown>)
      : {};

  result.shortcuts["command-palette"] = sanitizeCounter(shortcuts["command-palette"]);
  result.shortcuts["keyboard-map"] = sanitizeCounter(shortcuts["keyboard-map"]);

  return result;
}

function incrementCounter(value: number) {
  return Math.min(MAX_COUNTER, value + 1);
}

export function recordNavigationVisit(
  snapshot: NavigationUsageSnapshot,
  pathname: string
) {
  const current = operatorCommandTargetByPathname(pathname);
  if (!current) return sanitizeNavigationUsageSnapshot(snapshot);

  const next = sanitizeNavigationUsageSnapshot(snapshot);
  next.visits[current.href] = incrementCounter(next.visits[current.href] ?? 0);
  return next;
}

export function recordNavigationShortcutUse(
  snapshot: NavigationUsageSnapshot,
  shortcutId: NavigationShortcutId
) {
  const next = sanitizeNavigationUsageSnapshot(snapshot);
  next.shortcuts[shortcutId] = incrementCounter(next.shortcuts[shortcutId]);
  return next;
}

export function navigationUsageTotals(snapshot: NavigationUsageSnapshot) {
  const safe = sanitizeNavigationUsageSnapshot(snapshot);
  const totalVisits = Object.values(safe.visits).reduce((sum, count) => sum + count, 0);
  const uniqueDestinations = Object.keys(safe.visits).length;
  const shortcutUses =
    safe.shortcuts["command-palette"] + safe.shortcuts["keyboard-map"];

  return { totalVisits, uniqueDestinations, shortcutUses };
}

function discoverabilityLevel(uses: number): ShortcutDiscoverabilityMetric["level"] {
  if (uses === 0) return "not-tried";
  if (uses < 3) return "exploring";
  return "established";
}

export function shortcutDiscoverabilityMetrics(
  snapshot: NavigationUsageSnapshot
): ShortcutDiscoverabilityMetric[] {
  const safe = sanitizeNavigationUsageSnapshot(snapshot);
  const definitions: Array<{
    id: NavigationShortcutId;
    label: string;
    keys: string;
    guidance: string;
  }> = [
    {
      id: "command-palette",
      label: "Command palette",
      keys: "Ctrl/⌘ + K",
      guidance: "Search registered destinations, favorites and saved navigation sets."
    },
    {
      id: "keyboard-map",
      label: "Keyboard action map",
      keys: "Shift + ?",
      guidance: "Review shortcuts, nearby jumps and the navigation accessibility baseline."
    }
  ];

  return definitions.map((definition) => {
    const uses = safe.shortcuts[definition.id];
    return {
      ...definition,
      uses,
      level: discoverabilityLevel(uses)
    };
  });
}

function targetVisitCount(snapshot: NavigationUsageSnapshot, target: OperatorCommandTarget) {
  return snapshot.visits[target.href] ?? 0;
}

export function personalizedInterfaceRecommendations(
  snapshot: NavigationUsageSnapshot,
  pathname: string,
  limit = 6
): InterfaceRecommendation[] {
  const safe = sanitizeNavigationUsageSnapshot(snapshot);
  const current = operatorCommandTargetByPathname(pathname);
  const recommendations: InterfaceRecommendation[] = [];

  const rankedDestinations = OPERATOR_COMMAND_TARGETS
    .filter((target) => target.href !== current?.href)
    .map((target) => ({
      target,
      count: targetVisitCount(safe, target),
      sameGroup: current ? target.groupId === current.groupId : false
    }))
    .filter(({ count }) => count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      if (left.sameGroup !== right.sameGroup) return left.sameGroup ? -1 : 1;
      return left.target.label.localeCompare(right.target.label);
    });

  for (const { target, count } of rankedDestinations.slice(0, 4)) {
    recommendations.push({
      id: "destination:" + target.href,
      kind: "destination",
      label: target.label,
      description: target.description,
      href: target.href,
      reason:
        count === 1
          ? "Visited once in this browser"
          : "Visited " + count + " times in this browser"
    });
  }

  const totalVisits = Object.values(safe.visits).reduce((sum, count) => sum + count, 0);
  if (totalVisits >= 2 && safe.shortcuts["command-palette"] === 0) {
    recommendations.push({
      id: "shortcut:command-palette",
      kind: "shortcut",
      label: "Try the command palette",
      description: "Jump across modules without scanning the full sidebar.",
      keys: "Ctrl/⌘ + K",
      reason: "No command-palette use recorded in this browser yet"
    });
  }

  if (totalVisits >= 2 && safe.shortcuts["keyboard-map"] === 0) {
    recommendations.push({
      id: "shortcut:keyboard-map",
      kind: "shortcut",
      label: "Review the keyboard action map",
      description: "See navigation shortcuts and nearby registered destinations.",
      keys: "Shift + ?",
      reason: "No keyboard-map use recorded in this browser yet"
    });
  }

  if (!recommendations.length && current) {
    const sibling = OPERATOR_COMMAND_TARGETS.find(
      (target) =>
        target.groupId === current.groupId &&
        target.href !== current.href &&
        target.kind === "screen"
    );
    if (sibling) {
      recommendations.push({
        id: "destination:" + sibling.href,
        kind: "destination",
        label: sibling.label,
        description: sibling.description,
        href: sibling.href,
        reason: "Nearby registered destination in the current module"
      });
    }
  }

  return recommendations.slice(0, Math.max(1, limit));
}
