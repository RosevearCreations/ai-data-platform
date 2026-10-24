import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  NAVIGATION_ACCESSIBILITY_AUDIT,
  NAVIGATION_KEYBOARD_ACTIONS,
  contextAwareJumpTargets
} from "../lib/navigation-assist";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const actionIds = NAVIGATION_KEYBOARD_ACTIONS.map((action) => action.id);
  for (const id of [
    "command-palette",
    "keyboard-map",
    "close-dialog",
    "move-focus",
    "activate-focused"
  ]) {
    assert(actionIds.includes(id), "Build 124 keyboard action missing: " + id);
  }

  const auditIds = NAVIGATION_ACCESSIBILITY_AUDIT.map((item) => item.id);
  for (const id of [
    "skip-link",
    "main-landmark",
    "visible-focus",
    "dialog-focus",
    "editable-guard",
    "navigation-only"
  ] as const) {
    assert(auditIds.includes(id), "Build 124 accessibility audit item missing: " + id);
  }

  const collectionJumps = contextAwareJumpTargets("/collection-runs", 6);
  assert(collectionJumps.length > 1, "Build 124 collection context must produce nearby jumps.");
  assert(
    collectionJumps.some((target) => target.href === "/modules/collection"),
    "Build 124 context suggestions must include the current module hub when applicable."
  );
  assert(
    collectionJumps.every((target) => target.href !== "/collection-runs"),
    "Build 124 context suggestions must exclude the current destination."
  );
  assert(
    collectionJumps.slice(0, 3).every((target) => target.groupId === "collection"),
    "Build 124 nearby suggestions must prioritize the current navigation group."
  );

  const unknownJumps = contextAwareJumpTargets("/not-a-registered-route", 3);
  assert(
    unknownJumps.length === 3 && unknownJumps.every((target) => target.kind === "module"),
    "Build 124 unknown-route fallback must use registered module hubs."
  );

  const [component, shell, css, help, pkg, verify123, doc] = await Promise.all([
    source("../app/NavigationAssist.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-123-navigation-personalization.ts"),
    source("../../../docs/BUILD_124_KEYBOARD_NAVIGATION_ACCESSIBILITY.md")
  ]);

  assert(
    component.includes('event.key === "?" && event.shiftKey') &&
      component.includes("isEditableTarget") &&
      component.includes('event.key === "Escape"') &&
      component.includes('event.key !== "Tab"') &&
      component.includes("previousFocusRef") &&
      component.includes("focusableElements") &&
      component.includes('role="dialog"') &&
      component.includes('aria-modal="true"') &&
      component.includes("Suggested jumps") &&
      component.includes("Navigation baseline"),
    "Build 124 navigation assist must implement the keyboard map, context jumps and accessible dialog behavior."
  );

  assert(
    shell.includes('<a className="skipToContent" href="#application-main-content">') &&
      shell.includes('<main id="application-main-content"') &&
      shell.includes("tabIndex={-1}") &&
      shell.includes("<NavigationAssist />") &&
      shell.includes("Build 124 · Marble Standard"),
    "Build 124 shell must install skip navigation, semantic main content and the navigation assist."
  );

  for (const selector of [
    ".skipToContent",
    ".navigationAssistTrigger",
    ".navigationAssistBackdrop",
    ".navigationAssistDialog",
    ".navigationActionList",
    ".navigationJumpList",
    ".navigationAccessibilityAudit",
    ":focus-visible"
  ]) {
    assert(css.includes(selector), "Build 124 CSS selector or focus contract missing: " + selector);
  }

  for (const topic of [
    "keyboard-action-map",
    "context-jump-suggestions",
    "navigation-accessibility-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 124 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 124 keyboard action map, context jumps & navigation accessibility"),
    "Help Center must register the Build 124 help group."
  );
  assert(
    verify123.includes('shell.includes("Marble Standard")') &&
      !verify123.includes('shell.includes("Build 123 · Marble Standard")'),
    "Build 123 verifier must remain forward-compatible with later interface build labels."
  );
  assert(
    pkg.includes("verify-build-124-navigation-accessibility.ts"),
    "Build 124 verifier must run in the application test chain."
  );
  assert(
    doc.includes("no database migration") &&
      doc.includes("navigation-only") &&
      doc.includes("RLS") &&
      doc.includes("focus restoration"),
    "Build 124 documentation must preserve navigation-only safety and accessibility boundaries."
  );

  console.log("Build 124 keyboard action map, context-aware jumps and navigation accessibility verification passed.");
}

void main();
