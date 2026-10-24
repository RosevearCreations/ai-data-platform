# Build 127 — Interface Preference Presets, Accessibility-Safe Preference Reconciliation & Operator Reset Governance

## Objective

Make Build 126 interface preferences easier to reuse and safer to operate by adding named presets, separating stored preferences from accessibility-reconciled effective preferences, and making local reset scope explicit.

## Functional scope

- four named browser-local preference presets:
  - **Standard**;
  - **Focus**;
  - **Wide Canvas**;
  - **Compact Workspace**;
- exact preset-match indication;
- continued fine-grained density, layout and recommendation controls;
- accessibility-safe effective preference reconciliation;
- visible reconciliation status in Insights;
- scoped local reset governance:
  - Interface only;
  - Insights only;
  - All local navigation data;
- required second activation for the full local reset;
- contextual help for presets, reconciliation and resets;
- Build 125–126 browser-local privacy and role-neutrality retained.

## Preset contract

Presets are known combinations of the existing Build 126 preference fields.

### Standard
- Adaptive navigation density;
- Balanced workspace layout;
- All recommendations.

### Focus
- Comfortable navigation density;
- Focused workspace layout;
- Destination recommendations.

### Wide Canvas
- Comfortable navigation density;
- Wide workspace layout;
- All recommendations.

### Compact Workspace
- Compact navigation density;
- Wide workspace layout;
- Shortcut recommendations.

Applying a preset writes the same versioned browser-local preference object introduced by Build 126. A preset does not create a new server-side profile and does not change role, permission, RLS or workflow state.

A preset is shown as selected only while all three stored preference values exactly match that preset. Fine-tuning any value can intentionally produce a custom combination with no active preset label.

## Accessibility-safe reconciliation contract

Build 127 separates **stored preferences** from **effective preferences**.

Stored preferences remain the operator's browser-local choices.

Effective preferences are the presentation values that the shell can safely apply in the current environment.

Reconciliation rules:

- when forced-colors or increased-contrast is detected:
  - stored Compact density is temporarily effective as Comfortable;
  - stored Wide layout is temporarily effective as Balanced;
- on viewport widths of 760px or below:
  - any non-Balanced stored layout is temporarily effective as Balanced;
- when reduced motion is requested:
  - preference-interface transitions are suppressed.

Accessibility reconciliation never rewrites the stored preferences. When the environmental safeguard no longer applies, the stored preference becomes effective again automatically.

The reconciliation layer reads only viewport width and browser media preferences. It does not inspect roles, permissions, navigation usage counts, business records, workflow state or account profile data.

## Operator reset governance

Build 127 makes reset scope explicit.

### Interface only

Restores:
- Adaptive density;
- Balanced layout;
- All recommendations.

It removes the interface preference object from browser `localStorage` while preserving Build 125 navigation insight counts.

### Insights only

Clears Build 125 browser-local navigation usage counts while preserving Build 126/127 interface preferences.

### All local navigation data

Clears both:
- interface preferences;
- navigation usage insights.

Because this is the broadest local reset, it requires a **second activation**. The first activation arms the reset; the second confirms it.

All reset actions affect only the current browser.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side preference or preset table;
- no account or workspace synchronization;
- no role-based personalization;
- no analytics provider;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no business-data search;
- all presets, reconciliation and reset controls are presentation and navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 127 verifier requires:

- all four preset definitions;
- deterministic preset application and exact-match recognition;
- high-contrast reconciliation without stored-preference mutation;
- narrow-view layout reconciliation;
- reduced-motion reporting;
- full-reset confirmation governance;
- browser accessibility media-query monitoring;
- effective reconciliation event propagation;
- visible preset/reconciliation/reset UI;
- forced-colors and reduced-motion CSS;
- contextual help coverage;
- continued Build 126 compatibility.

## Next roadmap item

**Build 128 — Preference Profile Export/Import, Reconciliation Preview & Local Portability.**
