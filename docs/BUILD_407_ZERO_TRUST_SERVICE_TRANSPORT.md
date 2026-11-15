# AI Data Platform Build 407 — Zero-Trust Service-to-Service Authentication, Key Rotation, Secretless Routing & Transport Policy Enforcement

Build 407 turns Build 406's trust matrix into enforceable transport requirements without manufacturing runtime connection state.

## Zero-trust service identity

Every one of the seven applications receives an independently reviewed service-principal contract. Requests use Ed25519 signatures, exact issuer and audience binding, a body digest, a one-time nonce and a maximum age of 300 seconds. Public-key references and key IDs may cross applications; raw private keys may not.

## Rotation and replay

Each application requires an evidence-backed rotation receipt. Rotation intervals are capped at 90 days, overlap windows are bounded, public-key pin digests are recorded, and secret values remain outside the governance envelope.

The 14 canonical Build 406 relationships become 28 directional transport policies. Every direction requires verified TLS, signed requests, replay defense, secretless routing, no T5 transport, no peer database writes and no delegated operational authority.

Devil n Dove and Rosie Dazzlers are direct Master applications. Build 407 requires each to have authenticated transport policy routes to all three Master applications: AI Data Platform, Rosevear AI Hub and Rosevear Comms Hub.

## Branch governance

Only `dev` and `main` are valid long-term branches. Any feature, release, fix or historical branch is cleanup-only after its work is merged and verified. Build 407 does not authorize deleting `dev` or `main`.

## Visual architecture

The three Master applications use the shared `rosevear-master-instrument.v1` theme. iCamp and Yard Workers remain Slave Application Shells and may keep their own Meadow/Orbit and Yard Workers visual themes.

## Database transport hardening

Production migration connections explicitly normalize PostgreSQL TLS to `sslmode=verify-full`; weak compatibility mode is removed. This resolves the future pg/libpq security-semantic warning without weakening certificate verification.

## Final state

`ZERO_TRUST_SERVICE_TRANSPORT_ENFORCED`

Production GREEN still does not imply a runtime connection is active. Live CONNECTED state continues to require application-specific signer, receiver, owner and health evidence.
