# Build 337 — Read-Only Source Update Ingestion & Provenance Normalization

## Purpose

Build 337 implements the first source-update ingestion stage of the Rosevear Suite Master Shell.

It reuses the existing Build 290 webhook trust boundary rather than inventing a parallel transport:

1. the source posts a signed `rosevear.webhook.v1` request;
2. the webhook gateway verifies HMAC identity, timestamp freshness and replay nonce;
3. an accepted signed receipt is persisted;
4. Build 337 re-verifies that receipt against the configured HMAC key reference;
5. the nested `rosevear.master-shell.event.v1` envelope is validated;
6. exact source, tenant, audience, event family, sequence, idempotency, expiry and provenance are normalized into an append-only read model.

## Supported source-update families

Build 337 ingests:

- `source.health.reported`;
- `release.promoted`;
- `module.readiness.changed`;
- `audit.evidence.recorded`.

Incident, consent and workflow-operation families remain outside this read-only source-update intake.

## Transport binding

The accepted outer webhook event type must be:

`master-shell.source-update`

Webhook source identities map to Master Shell source IDs:

- `yard-workers` → `yw`;
- `icamp` → `icamp`;
- `rosiedazzlers` → `rosiedazzlers`;
- `devilndove` → `devilndove`;
- `rosevear-ai-hub` → `rosevear-ai-hub`.

Rosevear Comms Hub is rejected as a child source because it remains the complementary control plane.

AI Data Platform self-events are not fabricated through the external webhook path.

## Fail-closed provenance

The ingestion service requires:

- an accepted webhook receipt;
- successful receipt-signature re-verification;
- current configured HMAC key material;
- receipt/endpoint/key/source/event/hash binding;
- exact Master Shell source mapping;
- exact tenant match between transport and Master Shell envelope;
- `ai-data-platform` in the event audience;
- supported source-update event family;
- payload hash integrity from Build 335;
- event-specific normalized payload shape;
- evidence expiry after event occurrence.

Only normalized operational fields are persisted. The raw webhook body and raw HMAC secret are not copied into the Master Shell ledger.

A SHA-256 fingerprint of the verified secret is stored as transport provenance; the secret itself is zeroed after use.

## Replay, idempotency and ordering

Migration `0119_master_shell_source_update_ingestion.sql` adds:

`app.master_shell_source_updates`

The ledger is append-only and suppresses duplicate:

- webhook receipt ID;
- Master Shell event ID;
- source sequence number;
- source + idempotency key.

Source sequence is classified as:

- `first`;
- `in-order`;
- `out-of-order`.

Out-of-order evidence is retained but cannot advance the source registry.

## Expiry

Every supported Build 337 payload requires `expiresAt`.

Expired evidence is retained as `stale`, but stale evidence cannot advance the source registry.

## Registry projection

Normalization and registry acceptance are separate owner/admin actions.

A registry projection is eligible only when:

- the event is `source.health.reported`;
- the evidence is fresh;
- the source sequence is not out of order;
- the Master Shell verification state is `independently-verified`;
- the owner/admin explicitly requests state acceptance.

The registry signer key ID is derived from the verified webhook endpoint key ID. The signer fingerprint is derived from the verified HMAC secret and stores no raw secret.

The Build 336 transition rules remain authoritative. A source cannot skip directly from UNKNOWN to CONNECTED.

## Read-only boundary

Build 337 does not:

- mutate a source application;
- call a source application;
- send an outbound command;
- release an event-bus delivery;
- authorize a peer write;
- reinterpret an unsigned legacy receipt as Master Shell V1;
- infer CONNECTED from a successful software deployment.

## Surfaces

- `/master-shell-ingestion`;
- `/api/master-shell-ingestion`.

## Next queued build

**Build 338 — Master Completion Requirements Registry & Evidence-Axis Scoring.**
