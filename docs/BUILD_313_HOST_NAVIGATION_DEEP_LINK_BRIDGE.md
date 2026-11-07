# Build 313 — Host Navigation, Deep Links & Command Palette Bridge

## Purpose

Build 313 lets a supported host application expose AI Data Platform surfaces inside its own menus, deep-link flow and command palette without turning navigation into authorization.

## Registration

A host navigation registration binds:

- host application ID;
- environment;
- host instance ID;
- exact HTTPS host origin;
- exact AI Data Platform module origin;
- audit correlation ID;
- supported navigation items;
- optional explicit compatibility fallback surface.

Every navigation item points to a surface already present in the universal module manifest.

A navigation item may carry capability hints for display/filtering, but those hints are **not grants**. Build 312 remains authoritative for whether a requested capability is callable.

## Deep links

Build 313 creates module deep links only to registered module surface routes.

The deep link carries non-secret navigation metadata:

- host application;
- host environment;
- host instance;
- audit correlation;
- optional safe return path;
- allowlisted scalar contextual launch parameters.

Unsupported surfaces and routes fail closed unless the launch explicitly opts into the registration's known compatibility fallback.

## Breadcrumbs and back stack

Each successful launch provides:

- a module breadcrumb;
- a current-surface breadcrumb;
- a bounded navigation back stack.

The back stack is limited to the latest 20 entries and never stores credentials or arbitrary host URLs.

## Command palette

A registration can expose command-palette entries tied to the same supported navigation items.

Command IDs are unique within a registration. Command-palette presence does not grant module permission.

## Contextual launch parameters

Launch context is intentionally small and non-authorizing:

- at most 20 scalar parameters;
- strict lowercase key format;
- secret-like keys such as password, token, cookie, authorization, credential, API key or private key are rejected;
- bearer-like values are rejected;
- string values are bounded;
- total encoded context is bounded.

Context values can shape the destination view but cannot carry authentication or capability grants.

## Safe return-to-host

Return navigation accepts only a host-relative path beginning with a single `/`.

Build 313 rejects:

- absolute return URLs;
- protocol-relative paths;
- backslash-based paths;
- control characters;
- oversized values.

The resulting return URL is always recomposed against the exact registered host origin.

## Route compatibility fallback

Fallback is not automatic.

A launch must explicitly set fallback opt-in, and the registration must contain a valid supported fallback surface.

When used, the launch evidence records `explicit_compatibility_fallback`.

## Security boundary

Build 313 does **not**:

- create authority from menu registration;
- create authority from a deep link;
- create authority from command-palette registration;
- allow arbitrary module routes;
- accept raw secrets in launch parameters;
- accept arbitrary external return URLs;
- bypass Build 312 capability decisions;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## Next queued build

**Build 314 — Theme, Design Token, Accessibility & Locale Bridge** — governed host theme/design-token import, dark/light preference bridge, density/typography adaptation, reduced-motion and forced-colors support, locale/time-zone context, keyboard/focus checks and accessible embedded-dialog behavior.
