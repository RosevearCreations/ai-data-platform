# Build 126 — Adaptive Navigation Density, Role-Neutral Workspace Layout Preferences & Interface Recommendation Controls

## Objective

Give operators explicit control over navigation spacing, workspace shell layout and Build 125 recommendations without introducing role-based UI inference, server-side preference profiles or workflow authority changes.

## Functional scope

- browser-local Navigation Density preference:
  - Adaptive;
  - Comfortable;
  - Compact;
- browser-local Workspace Layout preference:
  - Balanced;
  - Wide;
  - Focused;
- browser-local Recommendation preference:
  - All;
  - Destinations;
  - Shortcuts;
  - Off;
- immediate shell updates through a local preference event;
- reset to default interface preferences;
- continued Build 125 navigation usage insights;
- contextual help for all three preference groups.

## Adaptive density contract

**Adaptive** resolves navigation density from **viewport width only**:

- viewport width up to 1180px → Compact;
- wider viewport → Comfortable.

Explicit Comfortable or Compact choices remain fixed regardless of viewport width.

Adaptive density does not inspect:

- user role;
- permissions;
- workspace membership;
- navigation usage counts;
- business state;
- workflow state;
- account profile data.

## Role-neutral workspace layout contract

Workspace layout preferences are deliberately role-neutral presentation choices.

- **Balanced** preserves the standard Build 125 shell proportions.
- **Wide** reduces sidebar width and gives application content more horizontal room.
- **Focused** centers the application page within a bounded reading width.

The layout preference is not selected, suggested or enforced from role, permission, profile, employee classification or job function.

## Recommendation control contract

Build 126 lets the operator decide which Build 125 recommendations are visible:

- **All** — destination and shortcut recommendations;
- **Destinations** — registered destination recommendations only;
- **Shortcuts** — navigation shortcut recommendations only;
- **Off** — hide all interface recommendations.

Recommendation controls filter presentation only. They do not erase Build 125 local usage counts unless the operator separately chooses **Reset local insights**.

## Local storage contract

Build 126 stores one versioned preference object in browser `localStorage` containing only:

- navigation density preference;
- workspace layout preference;
- recommendation visibility preference.

No account ID, workspace ID, role, permission, business record, workflow state or timestamp is stored in the Build 126 preference object.

**Reset interface preferences** removes the saved preference object and restores:

- Adaptive density;
- Balanced layout;
- All recommendations.

## Safety boundaries

- no database migration;
- no schema or RLS change;
- no API endpoint;
- no server-side preference table;
- no analytics provider;
- no role-based personalization;
- no permission, role, profile or connector-grant change;
- no automatic workflow transition;
- no business-data search;
- preference changes are presentation and navigation-only.

Destination workflows retain their existing RLS, role checks, confirmations, evidence requirements and business-state controls.

## Verification

The Build 126 verifier requires:

- safe preference sanitization and default fallback;
- viewport-only adaptive density resolution;
- stable explicit density choices;
- deterministic recommendation filtering;
- browser-local persistence;
- immediate preference event propagation;
- shell dataset application;
- role-neutral source boundaries;
- reset controls;
- contextual help coverage;
- continued Build 125 compatibility.

## Next roadmap item

**Build 127 — Interface Preference Presets, Accessibility-Safe Preference Reconciliation & Operator Reset Governance.**
