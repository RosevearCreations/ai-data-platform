# Build 282 — Shared Application Identity, Environment & Tenant Mapping

## Purpose

Build 282 extends the Build 281 peer-application registry with stable application identities, normalized environment aliases and explicit logical tenant/workspace bindings.

The goal is to stop future connectors from repeating hand-written app names, environment names and workspace assumptions.

## Stable application identities

Each Build 281 peer application now has:

- one stable application ID;
- one stable identity key using the `rosevear.app.<application>.v1` form;
- a controlled alias list for legacy/operator naming;
- one stable logical tenant key;
- the existing repository identity and Integration v1 business identity where one already exists.

Aliases resolve to the stable application identity only. They do not create or authorize a connection.

## Environment normalization

Build 282 defines three canonical application environments:

- `local` — aliases include `development` and `dev`;
- `preview` — aliases include `staging`, `stage` and `nonproduction`;
- `production` — alias `prod`.

The current Integration v1 gateway is nonproduction-only. Therefore:

- local and preview may map to the existing `nonproduction` transport environment;
- production deliberately has no Integration v1 transport mapping and remains ineligible for that gateway;
- no environment mapping grants consequential write authority.

## Tenant and workspace mapping

Every peer application receives a stable **logical tenant key**. This is a routing identity, not a provisioned external tenant and not a credential.

Only existing durable AI Data Platform workspaces are bound:

| Application | Workspace state | Workspace |
| --- | --- | --- |
| Rosie Dazzlers | mapped | `rosiedazzlers` |
| Devil n Dove | mapped | `devilndove` |
| Yard Workers | unmapped | none |
| iCamp | unmapped | none |
| Rosevear Comms Hub | unmapped | none |
| Rosevear AI Hub | unmapped | none |

Build 282 does **not** invent workspace rows for applications that do not currently have them.

## Delivered

- `apps/web/lib/application-identity-mapping.ts`
  - stable application identities;
  - stable logical tenant keys;
  - controlled aliases;
  - environment normalization;
  - evidence-backed workspace bindings;
  - deterministic alias/environment resolvers.
- `GET /api/app-connections/mappings`
  - authenticated;
  - no-store;
  - returns the Build 282 mapping model.
- Updated `/app-connections` screen showing identity, tenant, environment and workspace state.
- Build 282 verifier and QL-266 review evidence.

## Safety and authorization

Build 282 does not:

- create a database workspace;
- create an external tenant;
- issue a credential;
- populate Integration v1 tenant IDs;
- activate a connection;
- enable production Integration v1;
- grant a mutating capability;
- infer owner authorization;
- resume QL-266.

QL-266 remains `UNDER_REVIEW`, external test status remains `REVIEW_DEFERRED`, and connection state remains `DISCONNECTED`.

## Next build

Build 283 can use these stable identities and mappings to implement the Connector Setup Wizard without repeating application, environment or tenant naming logic.
