# Build 265 — Integration Delivery Simulator & Contract Compatibility Center

## Purpose

Build 265 adds a read-only simulator for approved integration batches so operators can inspect package compatibility before delivery.

## Preview contents

For every eligible approved/exported batch, the simulator shows:

- package ID and package shape;
- schema identifier and contract version;
- adapter contract and target;
- operation count and action types;
- target allowed-field capabilities;
- local validation result and errors;
- consumer endpoint configuration status;
- expected acknowledgement fields.

## Dry-run boundary

The simulator builds packages using the existing persisted-batch package builder and validates them with the existing integration contract validator.

It does not:

- send a network request;
- record a consumer receipt;
- append a delivery-attempt event;
- mutate a downstream business system;
- activate QL-266.

The displayed dry-run result means the package passed or failed local contract validation only.

## Workspace authority

Package previews that require module payload access are available to workspace owners/admins. Other authorized members can see that simulation requires elevated workspace authority.

## QL-266 boundary

QL-266 remains **UNDER_REVIEW**.
External test status remains **REVIEW_DEFERRED**.
Connection state remains **DISCONNECTED**.
Build 265 does not restart external integration testing.

## Next build

**Build 266 — Security, Workspace Access & Least-Privilege Review.**
