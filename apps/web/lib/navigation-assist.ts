import {
  MODULE_CARDS,
  moduleHubHref
} from "./application-navigation";
import {
  OPERATOR_COMMAND_TARGETS,
  operatorCommandTargetByPathname,
  type OperatorCommandTarget
} from "./operator-command-palette";

export type NavigationKeyboardAction = {
  id: string;
  keys: string[];
  label: string;
  description: string;
  scope: "global" | "dialog" | "navigation";
};

export const NAVIGATION_KEYBOARD_ACTIONS: NavigationKeyboardAction[] = [
  {
    id: "command-palette",
    keys: ["Ctrl/⌘", "K"],
    label: "Open command palette",
    description: "Search registered modules, workflows, favorites and saved navigation sets.",
    scope: "global"
  },
  {
    id: "keyboard-map",
    keys: ["Shift", "?"],
    label: "Open keyboard action map",
    description: "Review navigation shortcuts, current-context jumps and accessibility guidance.",
    scope: "global"
  },
  {
    id: "close-dialog",
    keys: ["Esc"],
    label: "Close active navigation dialog",
    description: "Dismiss the keyboard guide or command palette without navigating.",
    scope: "dialog"
  },
  {
    id: "move-focus",
    keys: ["Tab", "Shift+Tab"],
    label: "Move keyboard focus",
    description: "Move forward or backward through interactive controls using visible focus.",
    scope: "navigation"
  },
  {
    id: "activate-focused",
    keys: ["Enter"],
    label: "Activate focused destination",
    description: "Open the focused link or button; no workflow action is executed from the guide.",
    scope: "navigation"
  }
];

export const NAVIGATION_ACCESSIBILITY_AUDIT = [
  {
    id: "skip-link",
    label: "Skip-to-main link",
    description: "Keyboard users can bypass repeated navigation and move directly to the page main landmark."
  },
  {
    id: "main-landmark",
    label: "Semantic main landmark",
    description: "Application content is exposed through a named, focusable main region."
  },
  {
    id: "visible-focus",
    label: "Visible focus treatment",
    description: "Interactive navigation controls preserve a high-contrast focus-visible outline."
  },
  {
    id: "dialog-focus",
    label: "Modal focus containment",
    description: "The keyboard guide traps Tab focus while open and restores focus when dismissed."
  },
  {
    id: "editable-guard",
    label: "Editable-control shortcut guard",
    description: "Global navigation shortcuts do not fire while typing in editable controls."
  },
  {
    id: "navigation-only",
    label: "Navigation-only keyboard contract",
    description: "Keyboard actions open guidance or registered destinations and never mutate workflow state."
  }
] as const;

function groupTargets(groupId: string) {
  const moduleTarget = OPERATOR_COMMAND_TARGETS.find(
    (target) => target.kind === "module" && target.groupId === groupId
  );
  const screenTargets = OPERATOR_COMMAND_TARGETS.filter(
    (target) => target.kind === "screen" && target.groupId === groupId
  );
  return moduleTarget ? [moduleTarget, ...screenTargets] : screenTargets;
}

function uniqueTargets(targets: OperatorCommandTarget[], limit: number) {
  const seen = new Set<string>();
  const result: OperatorCommandTarget[] = [];
  for (const target of targets) {
    if (seen.has(target.href)) continue;
    seen.add(target.href);
    result.push(target);
    if (result.length >= limit) break;
  }
  return result;
}

export function contextAwareJumpTargets(pathname: string, limit = 6) {
  const current = operatorCommandTargetByPathname(pathname);

  if (!current) {
    return MODULE_CARDS
      .map((group) =>
        OPERATOR_COMMAND_TARGETS.find(
          (target) => target.href === moduleHubHref(group.id)
        )
      )
      .filter((target): target is OperatorCommandTarget => Boolean(target))
      .slice(0, limit);
  }

  const siblings = groupTargets(current.groupId);
  const currentIndex = siblings.findIndex((target) => target.href === current.href);
  const moduleTarget = siblings.find((target) => target.kind === "module") ?? null;

  const nearby: OperatorCommandTarget[] = [];

  if (moduleTarget && moduleTarget.href !== current.href) nearby.push(moduleTarget);

  if (currentIndex >= 0) {
    const next = siblings[currentIndex + 1];
    const previous = siblings[currentIndex - 1];
    if (next && next.href !== current.href) nearby.push(next);
    if (previous && previous.href !== current.href) nearby.push(previous);
  }

  nearby.push(
    ...siblings.filter(
      (target) =>
        target.href !== current.href &&
        target.href !== moduleTarget?.href
    )
  );

  if (current.groupId === "overview") {
    nearby.push(
      ...MODULE_CARDS.map((group) =>
        OPERATOR_COMMAND_TARGETS.find(
          (target) => target.href === moduleHubHref(group.id)
        )
      ).filter((target): target is OperatorCommandTarget => Boolean(target))
    );
  }

  return uniqueTargets(nearby, limit);
}
