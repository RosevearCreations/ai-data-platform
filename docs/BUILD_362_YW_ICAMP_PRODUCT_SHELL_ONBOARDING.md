# Build 362 — Yard Workers & iCamp Product-Shell Onboarding, Source Identity Binding, Health Projection & Supervised Master Acceptance

## Objective

Build 362 begins the first source-application wave at the **platform-shell identity** level for Yard Workers and iCamp.

The owner has authorized the implementation even though the prior runtime synchronization condition is not yet satisfied. That authorization opens code work; it does **not** convert missing runtime evidence into acceptance.

## Current Master receipt

Rosevear Comms Hub:

- receipt: `MASTER360-COMMS-QL413-ACK`
- controller main: `69355a853f10bbe4d3785bcede8b44e0c788be65`
- Comms main: `c670c2523001294e8ac2e4f283a1f8e5edda3ddb`
- AI Hub main observed: `27b234337f5a3f041dfca4541e33ed6aa821fa4f`
- code: `GREEN`
- receipt intake: `CODE_READY_RUNTIME_HOLD`
- operational uptime: `HOLD`
- protected signer: `HOLD`
- durable replay ledger: `CODE_READY_DEPLOYMENT_HOLD`
- incident acceptance: `HOLD`
- owner connection decision: `HOLD`
- receiver: `OFF`
- connection: `HOLD`

Therefore the three Masters remain **not synchronized**.

## Yard Workers binding

- Master source ID: `yw`
- source app ID: `yard-workers`
- repository: `RosevearCreations/yw`
- current production main: `cdc368e2f2773863595ff9cf6f35c1f02773eeaf`
- manifest revision: `028aee250857415b9b9035aaec50060757e377a5`
- tenant boundary: `platform_shell`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`

The manifest revision is behind the current production main, so revision drift is visible and cannot be silently accepted.

## iCamp binding

- Master source ID: `icamp`
- repository: `RosevearCreations/iCamp`
- current production main: `e2d343595363ca9106e7f1dbc60006e3a6c616aa`
- manifest revision: `dc1369338a4b191fc72031b7e62f7e48fd805bcd`
- tenant boundary: `platform_shell`
- signer: `AWAITING_INDEPENDENT_SOURCE_SIGNER`
- connection: `DISCONNECTED / HOLD`

Its revision drift is likewise retained as a blocker.

## Tenant boundary

Build 362 binds the product/platform shells only:

- Yard Workers is the source; Rosevear Landscaping remains a child/sample business.
- iCamp is the source; Camp Rosevear remains a campground tenant.

Child tenants cannot be promoted into Master source identities.

## Health projection

The Build 362 dashboard exposes:

- source identity;
- current production main;
- manifest revision;
- revision-current status;
- independent signer state;
- source connection state;
- read-only health-projection eligibility;
- supervised Master acceptance state.

The code path is production-ready while source acceptance remains HOLD.

## Production CI correction

Build 362 also closes the verifier gap identified after Build 361.

The Vercel production `build` script now executes the numbered Build 351–362 verifier chain before production migrations and the Next.js production build. These verifiers remain present in `ci:spine` as well.

This means Build 351+ verification is no longer confined to `ci:spine`; it is part of the Vercel production build path.

## Acceptance rule

Supervised Master acceptance remains HOLD until:

1. the three-Master runtime gate is genuinely synchronized;
2. each source manifest matches its current production revision;
3. each source has an independently enrolled signer;
4. each source's connection is independently accepted;
5. owner review accepts the resulting evidence.

Deployment GREEN is not connection proof.


## Build 363 handoff

Build 363 supersedes the static Build 362 source-revision observations with a dedicated convergence workflow. Yard Workers and iCamp remain platform-shell identities; source-owned manifest, independent signer and verified health evidence remain required before supervised acceptance can close.
