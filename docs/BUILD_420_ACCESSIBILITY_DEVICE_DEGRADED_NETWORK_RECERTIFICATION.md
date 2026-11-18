# AI Data Platform Build 420 — Accessibility, Device & Degraded-Network Re-Certification

Build 420 renews accessibility, device and degraded-operation evidence across all seven Rosevear applications. It composes earlier Build 271 hardening, Build 345 role/device acceptance and Build 413 seven-application acceptance concepts into a fresh fail-closed re-certification layer.

## Re-certification matrix

Nine dimensions are required per application:

- Desktop
- Tablet
- Mobile
- Keyboard/focus and assistive semantics
- Contrast and forced-colors behavior
- Reduced motion
- Loading, empty, error and safe-retry states
- Offline/degraded-network behavior
- Recovery behavior

Across seven applications this produces **63 required evidence slots**.

## PASS requirements

Every slot must be:

- fresh and unexpired;
- source-owned;
- non-synthetic;
- owner reviewed;
- independently verified;
- at least 90% accepted;
- zero critical failures;
- backed by at least one test run and a cryptographic evidence digest.

Device evidence must show no critical horizontal overflow. Desktop evidence uses a 1024 px or wider observation. Tablet uses 768–1023 px. Mobile uses 320–767 px and requires a minimum 44 px touch target.

Keyboard/focus evidence requires keyboard-only workflow completion, visible focus and screen-reader semantics. Contrast evidence requires forced-colors behavior and AA contrast. Reduced-motion evidence must be explicit.

Loading/degraded evidence requires loading, empty and error states plus safe retry. Offline/degraded-network evidence must verify both offline and impaired-network behavior, safe retry and duplicate-effect prevention. Recovery evidence must prove data preservation and duplicate-effect prevention.

## Safety boundary

Build 420 is validation and re-certification only. It does not automatically repair a peer application, force a retry, change network behavior or infer an offline state is healthy. Missing, stale, PARTIAL or FAILED evidence remains unresolved.

Production GREEN proves the Build 420 software and migration were deployed successfully. It does not prove that all 63 live re-certification slots are PASS.
