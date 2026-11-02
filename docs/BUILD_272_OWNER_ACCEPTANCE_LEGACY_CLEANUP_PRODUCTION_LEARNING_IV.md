# Build 272 — Owner Acceptance, Legacy Cleanup & Production Learning IV

## Purpose

Build 272 closes the 254–272 roadmap cycle and creates a clean renewal checkpoint.

The build does three things:

1. removes obsolete build-era compatibility markers and presentation debris that were being retained only for historical verifiers;
2. exposes an owner-acceptance review backed by the existing authenticated, RLS-scoped Production Learning evidence path;
3. stops automatic roadmap expansion after Build 272 so any Builds 273+ are based on measured operational evidence and owner acceptance.

## Legacy cleanup

Removed from the runtime UI:

- Build 240–259 legacy verifier-marker comments in the shared application shell;
- page-level "legacy verifier marker" comments on Operations Command surfaces;
- stale build-number branding in the application-shell footer;
- escaped presentation separators left in JSX.

Historical Build 250–259 verifiers remain executable, but their shell assertions are updated to validate the canonical Operations Command shell rather than obsolete build-number strings.

This keeps regression coverage while removing compatibility scaffolding from the live interface.

## Owner acceptance

The new `/owner-acceptance` route reads the existing Production Learning review and Build 271 hardening audit.

It shows:

- authorized workspaces reviewed;
- action findings;
- watch/gap findings;
- unresolved renewal evidence gaps;
- hardening coverage;
- the explicit roadmap-renewal rule.

It does not create a second evidence store and does not bypass authorization.

## Production Learning IV

The existing `/production-learning` route remains the canonical evidence source.

Build 272 relabels the renewal checkpoint as Production Learning IV and makes the post-cycle rule explicit: missing evidence remains missing, successful deployment is not equivalent to operational acceptance, and no speculative Builds 273+ are generated automatically.

## QL-266 boundary

The unrelated owner-deferred QL-266 remains **UNDER_REVIEW**.

External test status remains **REVIEW_DEFERRED**.

Connection state remains **DISCONNECTED**.

Build 272 does not resume QL-266.

## Roadmap rule

Build 272 is the renewal checkpoint. No long speculative Build 273+ queue is created automatically.

The next build batch must be based on real operational evidence, owner acceptance findings and measured gaps.
