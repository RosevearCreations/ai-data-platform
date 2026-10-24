# Build 124 — Keyboard Action Map, Context-Aware Jump Suggestions & Navigation Accessibility Audit

## Objective

Make cross-application navigation easier to learn and safer to operate from the keyboard while preserving every existing workflow authorization and execution boundary.

## Functional scope

- persistent top-bar **Keyboard** control;
- global **Shift+?** shortcut to open the keyboard action map;
- explicit action map for supported navigation keys;
- editable-control guard so global shortcuts do not fire while typing;
- route-aware nearby destination suggestions derived from the registered navigation graph;
- skip-to-main link as the first keyboard bypass control;
- semantic, focusable `<main>` application landmark;
- modal focus containment and Escape dismissal;
- focus restoration to the opening control;
- strengthened shell-wide `:focus-visible` treatment;
- visible navigation accessibility baseline inside the keyboard guide;
- Build 122 command palette and Build 123 personalization retained unchanged.

## Keyboard action contract

Build 124 documents and supports navigation-only keyboard actions:

- **Ctrl/Command + K** — existing command palette;
- **Shift + ?** — keyboard action map;
- **Escape** — close the active navigation guide/dialog;
- **Tab / Shift+Tab** — move keyboard focus;
- **Enter** — activate the currently focused link or button.

No Build 124 shortcut executes a workflow mutation, approval, delivery, state transition or remote action.

Global Build 124 shortcuts are ignored while focus is inside an input, textarea, select or content-editable control.

## Context-aware jump contract

Context suggestions are deterministic and registry-derived.

For a known current route, Build 124 prioritizes:

1. the current module hub when available;
2. the nearest registered sibling destinations;
3. other registered destinations in the same navigation group.

For an unknown route, suggestions fall back to registered module hubs.

Suggestions do not inspect:

- PostgreSQL;
- operator activity history;
- workspace evidence;
- permissions;
- business data;
- external services.

A suggested jump is navigation-only and does not imply that the destination workflow is currently eligible.

## Navigation accessibility audit

The Build 124 shell baseline verifies:

- a keyboard-visible **Skip to main content** link;
- a semantic and programmatically focusable main landmark;
- high-contrast visible focus for shell interactive controls;
- modal Tab focus containment in the keyboard guide;
- Escape dismissal;
- focus restoration after the guide closes;
- editable-control shortcut guards;
- no mutation-capable keyboard shortcuts.

This is a navigation accessibility audit, not a claim that every feature screen has completed an independent WCAG conformance audit.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no new mutation endpoint;
- no server-side preference state;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no business-data search;
- no keyboard shortcut that performs a consequential workflow action;
- all Build 124 context suggestions and keyboard actions are navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 124 verifier requires:

- complete keyboard action-map definitions;
- complete accessibility-baseline definitions;
- context-aware current-module jump prioritization;
- unknown-route module fallback;
- editable-field shortcut suppression;
- Escape and Tab dialog handling;
- focus restoration;
- skip navigation and main landmark installation;
- visible focus CSS;
- contextual help coverage;
- continued Build 123 compatibility.

## Next roadmap item

**Build 125 — Navigation Usage Insights, Shortcut Discoverability Metrics & Personalized Interface Recommendations.**
