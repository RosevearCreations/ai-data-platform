# Build 284 — Connection Credential Vault & Rotation Readiness

## Purpose

Build 284 adds a durable, workspace-scoped credential **reference** vault for the connection work introduced in Builds 281–283.

The vault centralizes non-secret credential metadata, expiry/rotation dates and owner-controlled replacement evidence without storing or exposing passwords, tokens, API keys, HMAC keys or other secret values.

## Reference-only design

A vault record contains:

- workspace scope;
- peer application ID;
- canonical environment;
- friendly label;
- provider/system name;
- reference kind;
- validated reference locator;
- active/revoked lifecycle state;
- replacement readiness;
- rotation due date;
- expiry date;
- last-rotated timestamp;
- creator/updater identity and timestamps.

Supported reference locators are intentionally structured:

- environment variable: `PROVIDER_API_TOKEN`;
- external vault record: `vault:<provider>:<record/path>`;
- provider-managed reference: `provider:<provider>:<identifier>`.

The API and database never accept a secret-value field.

## Durable schema

Migration `0089_connection_credential_vault_rotation_readiness.sql` adds:

### `app.workspace_credential_references`

The current reference inventory. RLS allows:

- workspace members to read;
- workspace owners/admins to create or update;
- no delete grant.

### `app.workspace_credential_reference_events`

Append-only evidence for:

- `created`;
- `rotation-scheduled`;
- `replacement-prepared`;
- `rotation-completed`;
- `revoked`.

Workspace members may read events. Only owners/admins may insert. No update/delete grant exists.

## Owner-controlled replacement

Build 284 does not rotate a secret automatically.

The intended sequence is:

1. owner/admin reviews the reference and rotation dates;
2. owner/admin replaces or stages the real secret in its actual environment/provider/vault;
3. owner/admin marks **replacement prepared** in AI Data Platform;
4. only after that evidence exists can **rotation completed** be recorded;
5. the event history records the metadata transition without reading the secret.

A completed rotation may record a new next-rotation date and expiry date. No date is fabricated automatically.

## Rotation readiness

The UI derives a current risk state:

- `active`;
- `rotation-soon` — within 30 days;
- `rotation-due`;
- `replacement-prepared`;
- `expired`;
- `revoked`.

These states are metadata guidance only. They do not activate a connector or authorize an external request.

## Delivered

- `db/migrations/0089_connection_credential_vault_rotation_readiness.sql`;
- `apps/web/lib/credential-vault-database.ts`;
- authenticated `GET/POST/PATCH /api/credential-vault`;
- authenticated `/credential-vault` operator surface;
- owner/admin mutation with member read-only visibility;
- integration navigation and operator-tool coverage;
- links from Connector Setup and Connector Diagnostics;
- Build 284 verifier and QL-266 review evidence.

## Safety boundary

Build 284 does **not**:

- store secret values;
- read secret values;
- expose secret values;
- copy environment variable contents into PostgreSQL;
- perform provider authentication;
- execute a connection test;
- install or enable a connector;
- rotate a secret automatically;
- create a tenant or workspace;
- activate a connection;
- resume QL-266.

QL-266 remains `UNDER_REVIEW`, external test status remains `REVIEW_DEFERRED`, and connection state remains `DISCONNECTED`.

## Next build

Build 285 — Automatic Connection Testing & Configuration Validation can consume Build 284 reference readiness to validate URLs, authentication configuration, permissions, webhook destinations and required environment settings through bounded tests without exposing secret values.
