# Build 283 — Connector Setup Wizard & Guided Connection Assistant

## Purpose

Build 283 turns the Build 281 application registry and Build 282 shared identity/environment/tenant mapping into a guided connection-preparation workflow.

The wizard reduces repeated manual setup while preserving the existing authorization boundary: it prepares a connection draft and safe-test checklist, but it does not create credentials, contact a provider, install a connector, enable a connector or activate a live connection.

## Guided flow

The authenticated `/connector-setup` screen guides the operator through:

1. selecting one of the six registered peer applications;
2. selecting the canonical `local`, `preview` or `production` environment;
3. selecting a supported connection path;
4. reviewing derived tenant/workspace and required configuration;
5. selecting a registered Connector SDK manifest when that path is used;
6. reviewing blockers, warnings and safe-test preparation steps;
7. saving the non-secret draft in browser localStorage.

The browser-local draft contains only:

- application ID;
- canonical environment;
- connection type;
- optional registered connector manifest key.

It contains no credential value or authorization state.

## Connection paths

### Repository metadata

Available for all six peer applications.

The wizard derives the stable application identity and repository from Build 281/282 and prepares a metadata-only read path.

### Integration v1 read-only discovery

Available only when the application has an existing Integration v1 gateway business identity.

The current gateway remains nonproduction-only:

- `local` → `nonproduction`;
- `preview` → `nonproduction`;
- `production` → blocked for Integration v1.

The wizard prepares the health-before-capabilities sequence but does not execute it.

### Workspace Connector SDK

Available only for applications with an existing durable AI Data Platform workspace binding.

At Build 283 that means:

- Rosie Dazzlers — available;
- Devil n Dove — available;
- Yard Workers — blocked because no durable workspace is mapped;
- iCamp — blocked because no durable workspace is mapped;
- Rosevear Comms Hub — blocked because no durable workspace is mapped;
- Rosevear AI Hub — blocked because no durable workspace is mapped.

The wizard shows registered manifest capabilities, configuration fields and environment-variable **names** for declared secret references. It never asks for or stores secret values.

## Delivered

- `apps/web/lib/connector-setup-contract.ts`
  - browser-safe wizard contract and setup-draft shape.
- `apps/web/lib/connector-setup-wizard.ts`
  - derives setup choices from Builds 281/282 and the Connector SDK registry;
  - deterministic server-side draft review;
  - production/nonproduction and workspace fail-closed checks.
- `apps/web/app/connector-setup/page.tsx`
  - authenticated Build 283 setup surface.
- `apps/web/app/connector-setup/ConnectorSetupWizard.tsx`
  - guided application/environment/connection/manifest workflow;
  - browser-local non-secret draft persistence;
  - blocker and safe-test checklist display.
- `GET /api/app-connections/setup`
  - authenticated;
  - no-store;
  - exposes the reusable wizard model.
- Integration navigation/operator-tool links.
- Build 283 verifier and QL-266 review evidence.

## Safety boundary

Build 283 does **not**:

- accept raw passwords, API keys, HMAC keys, tokens or provider secrets;
- persist setup drafts to PostgreSQL;
- create an external tenant;
- create a platform workspace;
- issue a credential;
- install or enable a Connector SDK connector;
- execute an Integration v1 request;
- execute a repository/provider connection test;
- activate a connection;
- grant a mutating capability;
- resume QL-266.

All setup paths retain activation state `DISCONNECTED`.

QL-266 remains `UNDER_REVIEW`, external test status remains `REVIEW_DEFERRED`, and connection state remains `DISCONNECTED`.

## Next build

Build 284 — Connection Credential Vault & Rotation Readiness can add owner-controlled credential **references**, expiry/rotation evidence and replacement readiness without exposing secret values.
