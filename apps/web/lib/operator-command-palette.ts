import {
  APPLICATION_NAVIGATION,
  MODULE_CARDS,
  moduleHubHref
} from "./application-navigation";

export type OperatorCommandTarget = {
  href: string;
  label: string;
  description: string;
  groupId: string;
  groupLabel: string;
  groupShortLabel: string;
  kind: "module" | "screen";
};

const MODULE_TARGETS: OperatorCommandTarget[] = MODULE_CARDS.map((group) => ({
  href: moduleHubHref(group.id),
  label: group.label,
  description: group.description,
  groupId: group.id,
  groupLabel: group.label,
  groupShortLabel: group.shortLabel,
  kind: "module"
}));

const SCREEN_TARGETS: OperatorCommandTarget[] = APPLICATION_NAVIGATION.flatMap((group) =>
  group.items.map((item) => ({
    href: item.href,
    label: item.label,
    description: item.description,
    groupId: group.id,
    groupLabel: group.label,
    groupShortLabel: group.shortLabel,
    kind: "screen" as const
  }))
);

export const OPERATOR_COMMAND_TARGETS: OperatorCommandTarget[] = [
  ...MODULE_TARGETS,
  ...SCREEN_TARGETS
];

const TARGET_BY_HREF = new Map(
  OPERATOR_COMMAND_TARGETS.map((target) => [target.href, target] as const)
);

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreTarget(target: OperatorCommandTarget, query: string) {
  const haystacks = [
    target.label,
    target.groupLabel,
    target.groupShortLabel,
    target.description,
    target.kind === "module" ? "module hub" : "workflow screen"
  ].map(normalizeSearchValue);

  const tokens = query.split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  if (!tokens.every((token) => haystacks.some((value) => value.includes(token)))) return -1;

  let score = 0;
  const label = haystacks[0];
  const group = haystacks[1];

  if (label === query) score += 120;
  else if (label.startsWith(query)) score += 90;
  else if (label.includes(query)) score += 70;

  if (group === query) score += 50;
  else if (group.startsWith(query)) score += 35;
  else if (group.includes(query)) score += 20;

  score += target.kind === "module" ? 8 : 0;
  score += tokens.reduce(
    (total, token) => total + haystacks.filter((value) => value.includes(token)).length * 3,
    0
  );

  return score;
}

export function searchOperatorCommandTargets(query: string, limit = 12) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return MODULE_TARGETS.slice(0, limit);

  return OPERATOR_COMMAND_TARGETS
    .map((target) => ({ target, score: scoreTarget(target, normalizedQuery) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.target.kind !== right.target.kind) {
        return left.target.kind === "module" ? -1 : 1;
      }
      return left.target.label.localeCompare(right.target.label);
    })
    .slice(0, limit)
    .map(({ target }) => target);
}

export function operatorCommandTargetByHref(href: string) {
  return TARGET_BY_HREF.get(href) ?? null;
}

export function operatorCommandTargetByPathname(pathname: string) {
  const candidates = [...OPERATOR_COMMAND_TARGETS].sort(
    (left, right) => right.href.length - left.href.length
  );

  return (
    candidates.find((target) =>
      target.href === "/"
        ? pathname === "/"
        : pathname === target.href || pathname.startsWith(target.href + "/")
    ) ?? null
  );
}

export function sanitizeRecentOperatorDestinationHrefs(
  value: unknown,
  limit = 6
) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    if (!TARGET_BY_HREF.has(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    result.push(candidate);
    if (result.length >= limit) break;
  }

  return result;
}
