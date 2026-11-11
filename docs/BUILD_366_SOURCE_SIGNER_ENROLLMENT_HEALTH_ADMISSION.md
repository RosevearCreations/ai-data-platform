# AI Data Platform Build 366 — Independent Source Signer Enrollment Intake, Public-Key Pin Custody Verification, Genuine Signed Health Receipt Admission & Owner Review Preparation

## Objective

Build 366 turns the Build 365 trusted-signer and receipt ledgers into an explicit owner-controlled admission ceremony without weakening the existing fail-closed boundaries.

The controller can now:

1. accept a candidate **public** Ed25519 source key plus a separately obtained SPKI SHA-256 pin and opaque evidence references;
2. recompute the public-key SPKI SHA-256 and require an exact match;
3. issue a five-minute source custody challenge;
4. verify the source's Ed25519 signature over the canonical challenge payload;
5. commit the public signer to the Build 365 trusted registry only after pin match + live possession proof;
6. admit a genuine source-bound HEALTHY receipt only through the existing Build 364/365 signature, revision, freshness and replay gates;
7. prepare the source for explicit owner review without auto-accepting connection state.

Private source signing keys are never accepted, transmitted to the controller, logged or stored.

## Current source truth

### Yard Workers

- source: `yw` / `yard-workers`
- production main: `0010bbd5ae71cb025d77e613cce9bc6e3f064d34`
- production code: GREEN
- revision convergence: VERIFIED
- independent source signer: HOLD / not enrolled
- genuine signed HEALTHY receipt: HOLD / not admitted
- source-side durable replay proof: HOLD
- connection: HOLD
- owner acceptance: HOLD

The source already contains Build 364-compatible signing code, but it explicitly requires an external encrypted source-held private key, independently enrolled public pin and fresh real HEALTHY observation. Synthetic tests are not accepted as production evidence.

### iCamp

- source: `icamp`
- production main: `00112c6714ecdf4d49dc114d4b29a0a8b9a8bced`
- production code: GREEN
- revision convergence: VERIFIED
- independent source signer: HOLD / not enrolled
- genuine signed HEALTHY receipt: HOLD / not admitted
- durable replay: HOLD
- connection: HOLD
- owner acceptance: HOLD

iCamp's own Build 241 documentation states that signer enrollment and a valid signed health receipt remain HOLD until an independently authenticated owner/custodian completes the private-key and public-pin ceremony.

## Signer enrollment intake

The append-only table:

`app.master_source_signer_enrollment_intake_events`

records:

- source ID;
- intake ID;
- public key ID;
- public Ed25519 key;
- controller-computed SPKI SHA-256;
- separately supplied SPKI SHA-256 pin;
- opaque pin/custody/witness evidence references;
- non-secret challenge text;
- challenge expiry;
- returned signature;
- admission event state.

The three evidence references must be distinct. A matching digest proves only that the supplied public key matches the separately supplied pin. It does **not** by itself prove private-key custody or owner acceptance.

## Five-minute custody challenge

After a valid pin match, Build 366 generates a random non-secret challenge and canonical payload:

`rosevear.ai-data-platform.source-signer-custody-challenge.v1`

The source must sign that exact payload using the private Ed25519 key held outside AI Data Platform.

The controller verifies the signature against the already pinned public key and rejects expired or invalid challenges.

Only after this possession proof does Build 366 insert an `ENROLLED` event into:

`app.master_source_signer_registry_events`

If another active signer already exists for that source, Build 366 fails closed until the old signer is explicitly revoked.

## Genuine signed-health admission

Build 366 does not create a second receipt-verification standard.

It atomically reuses Build 365's verified receipt admission helper, which itself uses Build 364's source-bound verification contract.

A receipt must still prove:

- exact source identity;
- exact expected repository and handoff;
- exact current source production revision;
- exact manifest revision convergence;
- trusted enrolled signer key ID;
- Ed25519 signature;
- HEALTHY source runtime state;
- fresh receipt and health observation timestamps;
- nonce replay safety.

Successful admission enters the durable Build 365 convergence receipt ledger and records an `ADMITTED` event in:

`app.master_source_health_admission_events`

Known verification failures are recorded as `REJECTED` admission attempts without inserting an unverified receipt into the trusted ledger.

## Owner-review preparation

The Build 366 read model reports per source:

- independent public pin match;
- current/expired custody challenge;
- private-key possession verification;
- trusted signer enrollment;
- signed-health admission;
- receipt freshness;
- Master runtime gate;
- next required action;
- owner-review readiness.

The sequence is fail-closed:

1. `SUBMIT_INDEPENDENT_PUBLIC_KEY_PIN`
2. `ISSUE_CUSTODY_CHALLENGE`
3. `PROVE_PRIVATE_KEY_CUSTODY`
4. `ADMIT_GENUINE_SIGNED_HEALTH`
5. `WAIT_FOR_MASTER_RUNTIME_CLOSURE`
6. `READY_FOR_OWNER_REVIEW`

`READY_FOR_OWNER_REVIEW` is **not** owner acceptance and is **not** connection activation.

## Runtime permissions

Build 366 evidence tables are RLS protected and append-only for `ai_data_runtime`:

- SELECT allowed to authorized owner/admin contexts;
- INSERT restricted by policy;
- UPDATE revoked;
- DELETE revoked.

## Explicit non-goals

Build 366 does not:

- generate a source private key;
- accept a private key in any API;
- treat repository fixtures or Vercel GREEN as custody proof;
- let a source-supplied key self-establish trust without the separately supplied pin;
- accept an expired possession challenge;
- admit an untrusted, stale, replayed, wrong-revision or unhealthy source receipt;
- bypass the three-Master runtime gate;
- record an owner ACCEPT decision;
- mark Yard Workers or iCamp CONNECTED;
- elevate Rosevear Landscaping or Camp Rosevear into Master source identities.
