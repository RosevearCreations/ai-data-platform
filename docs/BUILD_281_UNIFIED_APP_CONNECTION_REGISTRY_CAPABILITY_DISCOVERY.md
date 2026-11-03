# Build 281 — Unified App Connection Registry & Capability Discovery

## Purpose

Build 281 starts the owner-authorized Unified Connectivity & Autonomous Operations batch by creating one authoritative registry for the six peer applications that the AI Data Platform will increasingly coordinate:

- Devil n Dove — `RosevearCreations/devilndove-site`
- Rosie Dazzlers — `RosevearCreations/rosiedazzlers`
- Yard Workers — `RosevearCreations/yw`
- iCamp — `RosevearCreations/iCamp`
- Rosevear Comms Hub — `RosevearCreations/rosevear-comms-hub`
- Rosevear AI Hub — `RosevearCreations/rosevear-ai-hub`

## Delivered

- A typed peer-application registry in `app-connection-registry.ts`.
- Stable app IDs, display names, repository identities and functional categories.
- Reuse of the existing Integration v1 business capability declarations instead of creating a competing connection contract.
- Safe discovery classification:
  - `gateway-read-only-ready` where the existing gateway declares `read_health` and `read_capabilities`;
  - `catalog-only` where the application is known but no current gateway business identity exists.
- A signed-in `/app-connections` Operations Command screen.
- A signed-in, no-store `/api/app-connections` JSON surface for later setup wizards and dashboards.
- Navigation entry under Integrations & Execution.

## Important distinction

The historical QL-246 six-application proof set contains AI Data Platform itself and does not contain Rosevear Comms Hub.

Build 281 does not rewrite that historical evidence.

The new Build 281 registry is a **peer-application catalog**: it describes the six other applications the AI Data Platform needs to connect with and coordinate going forward.

## Safety and authorization

Build 281 performs registry and capability discovery only.

It does not:

- activate a connection;
- issue credentials;
- exchange secrets;
- invoke a mutating endpoint;
- infer owner authorization;
- resume QL-266;
- change any application database;
- claim that a repository entry proves a working network connection.

All registry entries remain `DISCONNECTED`. Owner authorization remains `NOT_GIVEN`. QL-266 remains `UNDER_REVIEW`, external test status remains `REVIEW_DEFERRED`.

## Why this matters

Future connectivity builds now have one stable source for:

- application identity;
- repository identity;
- current discovery state;
- safe discovery capabilities;
- connection state;
- authorization state.

Build 282 can build shared environment and tenant mapping on this registry instead of repeating app identity logic in every connector.
