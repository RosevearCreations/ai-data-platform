# Build 118 — Marble Design System, Card Framework & Visual Theme Foundation

## Objective

Add a reusable visual system on top of the Build 117 application shell so the platform has a coherent interface rather than independent page-specific cards.

## Scope

- named `Marble Standard` theme registry;
- root-level theme declaration;
- CSS token contract for background, text, borders, accent, focus, status and marble surfaces;
- CSS-generated marble veining with no image dependency;
- reusable `SurfaceCard` component;
- default, raised, metric, interactive and inset hierarchy variants;
- neutral, healthy, attention, critical and information semantics;
- standardized focus, button, badge and contextual-help treatment;
- Appearance & Design System specimen screen;
- navigation entry and contextual help for the design system;
- migration of Build 117 operator surfaces to shared card variants;
- generic adoption for existing `.card`, `.panel`, `.metricCard` and selected current card families;
- reduced-motion and responsive handling.

## Non-goals

- no database migration;
- no stored user theme preference;
- no theme selector persistence;
- no business logic change;
- no permission/RLS change;
- no new external image asset;
- no operational status inferred from appearance.

## Acceptance

- root document declares `data-theme="marble-standard"`;
- theme registry exposes Marble Standard as the default active theme;
- Appearance screen renders all SurfaceCard variants and status treatments;
- Build 117 card families carry shared `uiSurfaceCard` variants;
- generic cards receive the marble token layer;
- contextual help remains visible on major cards;
- status labels remain textual and semantic;
- production typecheck/lint/build/tests and database/auth/workspace isolation remain green.

## Next roadmap item

**Build 119 — Command Center V2 — Functional Dashboard & Operator Home.**
