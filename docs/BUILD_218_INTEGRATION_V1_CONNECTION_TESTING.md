# Build 218 — Integration v1 QL-243 nonproduction connection-testing foundation

This Build 218 companion scope implements the AI Data Platform side of the owner-provided **Rosevear Integration Contract v1 QL-243 secure connection-testing handoff** while preserving the queued Build 218 recovery-preference work.

## Delivered

- AI Data Platform remains the sole integration gateway; no application database is shared.
- Added authenticated server-only:
  - `GET /api/integration/v1/health`
  - `GET /api/integration/v1/capabilities`
  - `GET /api/integration/v1/audit/receipts/{receipt_id}`
- Added exact twelve-line HMAC-SHA256 GET canonicalization matching the Comms Hub QL-243 harness.
- Added strict `rosevear.integration.v1`, source, destination, business, tenant, environment, key ID, timestamp, nonce and signature validation.
- Enforced ±300-second freshness and constant-time signature comparison.
- Added durable atomic nonce replay suppression.
- Added immutable sanitized request-audit evidence and immutable signed receipt storage.
- Added Ed25519 response signing using a server-only private key; the public SPKI SHA-256 fingerprint is produced only by a trusted server-side operator command for separate-channel verification.
- Added an explicit nonproduction-only registration command for `rosevear-comms-hub → ai-data-platform / devilndove / tenant null` with only:
  - `read_health`
  - `read_capabilities`
- Added server-only key rotation/revocation helpers.
- Added blocked-route handling for write/mutating methods; no events, commands, payments, Etsy writes, communications dispatch, reservation changes, job dispatch or device actuation is enabled.
- Production deployments fail closed: the QL-243 routes only become available when `ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED=true` **and** `VERCEL_ENV` is not `production`.
- Connection state remains `DISCONNECTED`. Owner pilot authorization **NOT GIVEN**.

## Server-side configuration

The repository stores names and public identifiers only. Do not commit credential values.

Required only on the trusted nonproduction server/test runner:

- `ROSEVEAR_INTEGRATION_V1_NONPROD_ENABLED=true`
- `ROSEVEAR_INTEGRATION_V1_COMMS_DND_HMAC_KEY_B64` — base64 of exactly 32 random bytes.
- `ROSEVEAR_INTEGRATION_V1_ED25519_PRIVATE_KEY_PEM` — gateway Ed25519 private signing key.
- `ROSEVEAR_INTEGRATION_V1_SOURCE_REVISION` only when the runtime does not already expose the exact 40-character Git source SHA.

The nonsecret registration profile uses key ID `np-devilndove-current`; it is created only by the trusted nonproduction `register-devilndove` command. The HMAC secret and Ed25519 private key are never returned by an endpoint, written to the database, logged, or committed.

## Evidence flow

1. Provision the two server-side secrets through the approved secret manager, then run the trusted `register-devilndove` command on the nonproduction server. Production migrations intentionally create no connection registration.
2. Perform authenticated negative tests. Denial evidence only counts when HMAC possession is verified.
3. Perform health, then capabilities. Their signed receipts are immutable.
4. Run the trusted server command to prepare the gateway audit. It refuses to sign the QL-242 audit until all required verified denial evidence exists.
5. Obtain the gateway public SPKI SHA-256 fingerprint from the trusted server and verify it through a separate channel.
6. The Comms Hub QL-243 harness may then perform its four authenticated nonproduction GETs.
7. Independently verify the audit record after restart/redeploy before claiming durability.
8. Build 220 supersedes the earlier provisional `HOLD` label with the QL-245 truthful state: owner pilot authorization **NOT GIVEN** and connection state `DISCONNECTED` until a later explicit decision.

## Trusted operator commands

These commands must run only on a trusted server/test runner. Secret values stay in environment variables.

```sh
pnpm --filter @rosevear/ai-data-web integration:v1-admin register-devilndove
pnpm --filter @rosevear/ai-data-web integration:v1-admin fingerprint
pnpm --filter @rosevear/ai-data-web integration:v1-admin prepare-audit --connection np-comms-hub-devilndove
pnpm --filter @rosevear/ai-data-web integration:v1-admin revoke --connection np-comms-hub-devilndove
```

Rotation requires a new key ID, environment-variable **name**, and new public receipt IDs. The key value is provisioned separately before rotation.

## Safety boundary

This build adds a nonproduction server gateway boundary and migration, so the older recovery-cycle statement “no API endpoint / no database migration” applies only to the recovery-preference portion of Build 218. The integration portion intentionally adds migration `0086_integration_v1_nonproduction_connection_testing.sql` and the three read-only authenticated GET endpoints.

No product/customer records are copied into the gateway. No remote write, command, dispatch, live communications, Etsy change, booking change, reservation change, job dispatch or device actuation is authorized.


## QL-245 superseding scope correction

Build 220 supersedes the older future-candidate product/listing scope described by the original QL-243 handoff. The current initial candidate advertises only `read_health` and `read_capabilities`, remains `DISCONNECTED`, and requires seven independently executed signed denial categories before a QL-245 source envelope can be prepared. See `BUILD_220_INTEGRATION_V1_QL245_EVIDENCE_RETURN.md`.
