# Build 220 — QL-245 six-app evidence-return readiness

Build 220 reconciles the AI Data Platform gateway with the revised **Rosevear Integration Contract v1 QL-245 six-app evidence return and conditional connection-testing handoff**.

## Truthful current posture

This repository contains code readiness only. A production deployment, CI success, fixture, signature or stored test row is **not** proof that a real nonproduction HMAC exchange occurred.

- source system: `ai-data-platform`
- candidate business: `devilndove`
- tenant: `null`
- environment: `nonproduction`
- connection state: `DISCONNECTED`
- owner authorization: `NOT_GIVEN`
- audit storage review: `INDEPENDENT_RESTART_PROOF_PENDING`
- live pilot: not authorized
- product/listing/customer reference reads: not advertised or callable
- events/commands/messages/payments/dispatch/device writes: disabled

## QL-245 scope correction

The old future-candidate capabilities `read_product_reference` and `read_listing_reference` are removed from the initial Devil n Dove registration profile.

The exact allowed source-check surface is:

1. `GET /api/integration/v1/health`
2. `GET /api/integration/v1/capabilities`

The exact advertised scope is:

1. `read_health`
2. `read_capabilities`

A later reference-data pilot requires a separate capability decision and is outside Build 220.

## Seven negative denials

QL-245 requires real, independently reviewable execution of all seven denial cases:

- `nonce_replay_denied`
- `stale_request_denied`
- `cross_business_denied`
- `cross_tenant_denied`
- `revoked_key_denied`
- `write_denied`
- `dispatch_denied`

When a denial is produced by a caller whose HMAC possession is verified, the gateway attempts to persist a separate Ed25519-signed nonsecret denial receipt containing bounded routing metadata, HTTP status, trace ID and denial receipt ID. If the signing key is unavailable, the raw denial audit may still be stored, but that row cannot satisfy QL-245 signed-negative evidence.

Gateway-audit preparation requires all seven verified signed denial receipts across the same source/business/tenant/environment credential lineage.

## Public QL-245 source envelope

The trusted server command can prepare a source envelope only after the registered connection is active-key / `DISCONNECTED`, exact health/capability scope is present, health/capability/gateway-audit receipts exist, and all seven signed denial categories exist.

The signed payload uses exactly this field order:

```text
schema_version, source_system, signer_key_id, business_id, tenant_id,
environment, source_revision, ci_run_url, key_id, registry_receipt_id,
health_receipt_id, capabilities_receipt_id, gateway_audit_id,
allowed_paths, scope, negative_tests, source_receipt_id,
audit_storage_review, owner_authorization, connection_state,
issued_at, expires_at
```

Build 220 emits:

- `schema_version = rosevear.integration.v1`
- `source_system = ai-data-platform`
- `business_id = devilndove`
- `tenant_id = null`
- `environment = nonproduction`
- ordered allowed paths = health, capabilities
- ordered scope = `read_health`, `read_capabilities`
- seven negative booleans, all required to be true from stored signed evidence
- `audit_storage_review = INDEPENDENT_RESTART_PROOF_PENDING`
- `owner_authorization = NOT_GIVEN`
- `connection_state = DISCONNECTED`
- validity no longer than one hour

The command validates the GitHub Actions URL format and exact runtime source SHA, but **does not independently prove** that the supplied Actions run is green, that the deployed nonproduction origin matches that SHA, that restart durability was witnessed, that the public-key pin came from a separate channel, or that the owner approved a pilot. Those remain external review requirements.

## Trusted operator flow

Server-side secrets remain outside GitHub/chat/evidence files.

```sh
pnpm --filter @rosevear/ai-data-web integration:v1-admin register-devilndove
pnpm --filter @rosevear/ai-data-web integration:v1-admin fingerprint
pnpm --filter @rosevear/ai-data-web integration:v1-admin prepare-audit --connection np-comms-hub-devilndove
pnpm --filter @rosevear/ai-data-web integration:v1-admin prepare-ql245-source \
  --connection np-comms-hub-devilndove \
  --ci-run-url https://github.com/RosevearCreations/ai-data-platform/actions/runs/REAL_RUN_ID
```

Do not run the evidence commands until a separately authorized nonproduction key has been provisioned and the original tests have actually occurred.

The public SPKI fingerprint must be obtained and pinned through a separate trusted channel. Never treat a fingerprint delivered inside the signed packet as independently trusted.

## Migration

Migration `0087_integration_v1_ql245_evidence_scope.sql`:

- changes registry state metadata from the older `HOLD` value to `DISCONNECTED`;
- adds a nonsecret registry receipt ID slot;
- adds response-status and signed denial-receipt references to request audit evidence;
- permits immutable `negative_denial` and `ql245_source` receipt kinds;
- does not seed a connection;
- adds no product/customer record tables or live write capability.

## Evidence that remains external

Build 220 does **not** claim any of the following:

- a separately authorized nonproduction HMAC credential was issued;
- a live nonproduction GET occurred;
- the deployed nonproduction origin was independently matched to source SHA;
- six distinct source public pins plus assessor pin were separately obtained;
- audit evidence survived restart/redeploy and was independently inspected;
- an external reviewer witnessed all seven denials and rollback;
- the owner authenticated and approved a scope/duration-specific pilot;
- a kill switch/rollback was independently witnessed.

Until those items are genuinely completed, the truthful public answer is **UNVERIFIED / NOT PROVISIONED where applicable, actual connection DISCONNECTED**.
