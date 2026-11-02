# Build 271 — Accessibility, Mobile, Performance & Failure-Recovery Hardening

## Purpose

Build 271 performs an application-wide hardening pass over the existing Operations Command experience rather than introducing another workflow domain.

## Accessibility

The application retains and strengthens:

- skip-to-content navigation;
- keyboard-visible focus treatment;
- a polite route-change announcement for assistive technology;
- reduced-motion behavior;
- forced-colors / high-contrast behavior;
- explicit status semantics for loading and failure states.

The route announcement reports navigation context without moving keyboard focus unexpectedly.

## Mobile and narrow layouts

The shared shell now treats 360px as the practical narrow-layout audit floor.

At mobile breakpoints:

- navigation and action groups wrap instead of forcing viewport overflow;
- disclosure controls and key actions receive at least a 44px interaction height;
- long labels, code, table content and cards can wrap or scroll inside their own region;
- the top bar and application page avoid horizontal page-level overflow.

## Failure recovery

Build 271 adds shared Next.js loading and error boundaries.

Loading exposes semantic status and busy state.

Unexpected route errors expose:

- a safe Retry action;
- a route back to the Command Center;
- a digest/reference when one is provided by the runtime.

Retry preserves all normal authentication, RLS and workflow safety gates.

Empty-state guidance remains evidence-aware: missing evidence must be described as missing rather than converted into a successful zero.

## Performance

Build 271 introduces no new runtime package, third-party analytics client, billing client or application telemetry store.

The audit standard favors:

- server rendering for audit/status surfaces;
- bounded workspace-scoped reads;
- parallel independent lookups where existing builders already support them;
- no duplicate external fetch on route render;
- responsive containment rather than JavaScript-driven layout measurement.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 271 does not resume QL-266.

## Next build

**Build 272 — Owner Acceptance, Legacy Cleanup & Production Learning IV.**
