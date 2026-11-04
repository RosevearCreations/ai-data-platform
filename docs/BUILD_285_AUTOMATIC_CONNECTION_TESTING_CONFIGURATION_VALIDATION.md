# Build 285 — Automatic Connection Testing & Configuration Validation

## Purpose

Build 285 turns the connection preparation work from Builds 281–284 into a bounded automatic validation gate.

It validates configured Connector SDK installations, reconciles non-secret credential-reference metadata from Build 284, evaluates endpoint/webhook safety, verifies capability grants, and automatically executes eligible non-export connector tests using the existing sandboxed Connector SDK boundary.

## Automatic validation

For each configured connector Build 285 checks:

- registered connector and manifest-version compatibility;
- required connector configuration schema;
- URL, endpoint, webhook, callback and return destination policy;
- supported least-privilege capability grants;
- manifest-declared authentication-reference structure;
- Build 284 vault metadata for mapped peer-application workspaces;
- credential-reference lifecycle/rotation readiness;
- connector enabled state;
- owner/admin execution authority;
- availability of a non-export automatic test capability.

Each connector is classified as:

- `eligible` — every automatic-test safety gate passes;
- `blocked` — configuration, credential, destination, enablement or authorization prevents automatic execution;
- `manual-review` — export-only execution is intentionally excluded from automatic testing.

## Destination safety

Build 285 does **not** issue generic HEAD/GET requests to arbitrary URLs stored in connector configuration.

That would turn connector configuration into an SSRF surface.

Instead Build 285 statically validates destination-shaped configuration and blocks automatic tests when:

- the URL is not absolute;
- the scheme is not HTTPS;
- the destination is localhost, link-local or a literal private/reserved IPv4 address;
- inline URL username/password credentials are present.

Actual automatic execution occurs only through an already registered Connector SDK definition and its existing bounded sandbox.

## Credential-reference validation

Build 285 never returns or persists a credential value.

For manifest-declared environment-variable secrets it checks:

1. the connector installation stores the exact approved reference structure;
2. the workspace has an evidence-backed Build 282 peer-application mapping;
3. Build 284 contains an active vault metadata row for the same workspace, application, runtime environment and environment-variable name;
4. the reference is not expired, revoked, rotation-due or replacement-prepared.

`rotation-soon` remains visible as metadata but does not by itself block a bounded test.

The registered connector boundary may resolve its hosting environment secret internally during actual execution, but Build 285 does not expose that value to its API, UI, audit summary or validation model.

## Automatic bounded tests

`POST /api/connection-validation` automatically runs all currently eligible connectors, capped at 12 executions per batch.

Each execution:

- is registered Connector SDK code only;
- requires an enabled installation;
- requires owner/admin workspace authority;
- uses one granted `import` or `enrichment` capability;
- never automatically selects `export`;
- uses a bounded empty diagnostic payload;
- continues through individual failures instead of aborting the entire batch;
- writes execution evidence through the existing connector audit path.

No connector is automatically installed or enabled.

## Delivered

- `apps/web/lib/connection-validation-contract.ts`;
- `apps/web/lib/connection-validation.ts`;
- authenticated `GET/POST /api/connection-validation`;
- authenticated `/connection-validation` operator surface;
- Build 285 navigation/operator-tool coverage;
- cross-links from Connector Setup, Credential Vault and Connector Diagnostics;
- Build 285 verifier and QL-266 evidence.

## Safety boundary

Build 285 does **not**:

- accept credential values;
- return credential values;
- persist credential values;
- perform arbitrary URL/network probing;
- automatically execute export;
- automatically install or enable a connector;
- automatically provision tenants or workspaces;
- activate a peer-app connection;
- resume QL-266.

QL-266 remains `UNDER_REVIEW`, external test status remains `REVIEW_DEFERRED`, and connection state remains `DISCONNECTED`.

## Next build

Build 286 — Cross-App Data Contract Registry will define versioned shared data contracts so validated connections can reason about compatible records and schemas before any cross-app exchange.
