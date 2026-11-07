# Build 314 — Theme, Design Token, Accessibility & Locale Bridge

## Purpose

Build 314 lets a supported host visually adapt AI Data Platform module surfaces while preserving module independence, accessibility and security visibility.

Host presentation context is styling input only. It does not grant authorization or alter Build 312 capability decisions.

## Theme and design-token import

The bridge accepts:

- light, dark or system theme preference;
- an explicit resolved light/dark value when the preference is system;
- compact, comfortable or spacious density;
- bounded typography family, scale and line height;
- a fixed semantic design-token allowlist.

Raw CSS and arbitrary selectors are not accepted.

The semantic token allowlist includes background, surface, text, muted text, border, accent, danger, warning and success colours plus radius, spacing and focus-ring width.

Colours must be literal hex values. Numeric tokens are constrained to accessibility-safe ranges.

## Security and approval visibility

Host styling cannot style arbitrary module selectors.

The presentation contract explicitly records:

- `securityStatesStyleable: false`;
- `approvalStatesStyleable: false`;
- `securityIndicatorsMayBeHidden: false`;
- `approvalStatesMayBeHidden: false`.

Hosts may make the module visually belong in their shell, but may not hide security, approval, denial or warning states.

## Density and typography

Density is projected as a bounded spacing multiplier.

Typography accepts only:

- system-ui;
- sans-serif;
- serif;
- monospace.

Font scale is bounded from 0.875 to 1.25. Line height is bounded from 1.2 to 1.8.

## Reduced motion

When the host reports `reduce`, projected module motion duration becomes 0 ms.

The bridge does not let a theme override the reduced-motion request.

## Forced colors

When forced colors are active, host colour-token projection is suppressed so operating-system/user-agent forced-colour behavior remains authoritative.

Layout, typography, spacing and focus-ring sizing remain available.

## Locale and time zone

Locale must be a valid BCP 47 locale and is canonicalized through the platform's Intl support.

Time zone must be a valid IANA time-zone identifier.

The bridge can project theme, locale and time zone directly from the validated universal host context.

## Keyboard and focus boundary checks

`checkKeyboardFocusBoundary()` verifies that:

- a boundary has focusable elements;
- active focus exists;
- active focus remains inside the declared boundary.

The check returns explicit failure reasons rather than silently accepting escaped focus.

## Accessible embedded-dialog behavior

`createAccessibleDialogContract()` requires:

- role `dialog`;
- `aria-modal=true`;
- a valid labelled-by target;
- at least one focusable element;
- initial focus inside the dialog;
- cyclic tab focus trapping;
- focus restoration on close;
- configurable Escape close behavior.

The dialog contract cannot hide security or approval states and cannot grant authorization.

## Live-safe metadata

`GET /api/module-presentation` exposes only bridge capabilities and safety rules. It exposes no private host theme configuration or user-specific locale data.

## Security boundary

Build 314 does **not**:

- accept raw CSS;
- accept arbitrary selectors;
- let host styling hide security/approval states;
- override reduced-motion or forced-colors behavior;
- create module authorization;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Next queued build

**Build 315 — Universal Data Contract Resolver & Host Schema Discovery** — host schema descriptors, compatibility resolution, mapping-profile suggestions, drift integration, version/fingerprint evidence, required-field diagnostics and read-only schema discovery by default.
