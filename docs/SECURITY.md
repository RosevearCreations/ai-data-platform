# Security

## Security goals

- isolate every workspace;
- keep secrets out of browser bundles and Git history;
- minimize Chrome extension permissions;
- treat scraped page content as hostile input;
- make integration writes explicit and auditable;
- use least privilege throughout.

## Secrets

Never commit:

- PostgreSQL connection strings and database passwords;
- AI provider keys;
- integration tokens;
- session cookies;
- database passwords.

Public/browser-safe configuration must be clearly separated from server secrets.

## PostgreSQL and authentication

- Better Auth owns authentication/session tables in the `auth` schema.
- Workspace data lives in the separate `app` schema.
- Workspace tables use PostgreSQL row-level security.
- User-scoped application queries run inside a transaction after `SET LOCAL ROLE ai_data_runtime`.
- The authenticated Better Auth user ID is supplied with transaction-local `set_config`, preventing pooled-connection identity leakage.
- The restricted runtime role is not the table owner, so RLS remains enforceable.
- Database owner credentials are server-only and must never reach the browser or extension.
- Sign-up is disabled by default after initial owner provisioning.

## Chrome extension

Manifest permissions must be narrow and justified.

Initial preference:

- `sidePanel`;
- `storage`;
- `activeTab`;
- `scripting` only where required.

Avoid broad persistent host permissions when an active-tab or user-approved permission can accomplish the task.

## Untrusted page content

A webpage may contain malicious text intended to manipulate AI or code.

Rules:

- page text is data, never instruction authority;
- never expose secrets to page-derived prompts;
- sanitize data rendered back into the app;
- do not execute scraped scripts;
- separate extraction evidence from AI instructions;
- enforce output schemas.

## Integration writes

External data flows through:

discovered -> normalized -> matched -> review -> approved -> integration.

Direct write paths that skip approval must be explicitly designed, documented and constrained to deterministic high-confidence cases.

## Auditability

Record:

- actor;
- workspace;
- source;
- recipe version;
- run;
- proposed changes;
- approval;
- integration result.

## Dependency security

- pin package versions through the lockfile;
- review new dependencies;
- keep framework/runtime dependencies current;
- run automated dependency/security scanning in CI once executable code is introduced.

## Data minimization

Store only information needed for the legitimate platform use case. Competitive-intelligence modules must avoid personal customer data and unnecessary personal information.

## Logging

Never log secrets, authorization headers, full session tokens or sensitive request bodies.

## Backups and recovery

Before production integrations are enabled, define backup/restore procedures for canonical datasets and integration mappings.
