# Build 336 — Six-Source Registry, Freshness & Source State Machine

## Purpose

Build 336 implements the next Master Shell stage after Build 335 Contract V1.

It provides one evidence-backed registry view for the exact six source shells:

- `yw`;
- `icamp`;
- `rosiedazzlers`;
- `devilndove`;
- `ai-data-platform`;
- `rosevear-ai-hub`.

Rosevear Comms Hub remains the complementary communications/control plane and is not counted as a seventh child source.

## Separate from legacy connection evidence

Build 336 does not overwrite or reinterpret the older application registry, QL-266, QL-364/365D or legacy `DISCONNECTED / HOLD` records.

The Master Shell registry is its own evidence model.

With no accepted Build 336 evidence, a source is `UNKNOWN`.

## Append-only evidence

Migration `0118_master_shell_source_registry.sql` adds:

- `app.master_shell_source_registry_evidence`.

The table is append-only for the runtime role.

Each record has:

- exact source ID;
- monotonically increasing per-source record version;
- environment;
- declared state;
- observed and expiry timestamps;
- evidence URI;
- optional manifest/revision/capability/origin;
- optional signer identity;
- allowed roles;
- authorization HOLD reason;
- TEST and connection evidence references;
- independent-verification flags;
- evidence authority;
- actor and recorded timestamps.

No row is seeded as CONNECTED.

## State machine

The positive sequence is:

`UNKNOWN → DISCOVERED → CONFIGURED → AUTHORIZATION_HELD → TEST_VERIFIED → CONNECTED`

Operational interruption states are:

- `STALE`;
- `DEGRADED`;
- `DISCONNECTED`;
- `REVOKED`;
- `ERROR`.

An interruption does not silently recover to a higher state. New evidence must restart from `DISCOVERED`.

## Freshness

Positive evidence is time-bounded.

When evidence for DISCOVERED, CONFIGURED, AUTHORIZATION_HELD, TEST_VERIFIED or CONNECTED expires, the effective state becomes `STALE`.

Expiry does not fabricate `DISCONNECTED`.

UNKNOWN remains distinct from STALE and DISCONNECTED.

## Positive-state evidence

CONFIGURED and later require:

- manifest URI;
- immutable revision;
- capability version;
- approved origin.

AUTHORIZATION_HELD additionally requires:

- an explicit HOLD reason;
- no owner authorization claim.

TEST_VERIFIED additionally requires:

- `independent-source-verification` authority;
- owner authorization evidence;
- independently verified TEST evidence;
- source signer key/fingerprint;
- TEST evidence URI.

CONNECTED additionally requires:

- independent connection verification;
- connection evidence URI.

## Operator boundary

The owner/admin API may record:

- DISCOVERED;
- CONFIGURED;
- AUTHORIZATION_HELD;
- STALE;
- DEGRADED;
- DISCONNECTED;
- REVOKED;
- ERROR.

The operator API **cannot create TEST_VERIFIED or CONNECTED**.

Those states are reserved for independently verified source ingestion in Build 337.

## Surfaces

- `/master-shell-registry`;
- `/api/master-shell-registry`.

The screen always renders all six source identities, even when every source is UNKNOWN.

## Security

Registry SELECT/INSERT is restricted to authenticated users with owner/admin membership.

Runtime UPDATE and DELETE are revoked.

The Build 336 API does not activate connections, release routes, authorize peer writes or change source trust.

## Next queued build

**Build 337 — Read-Only Source Update Ingestion & Provenance Normalization.**
