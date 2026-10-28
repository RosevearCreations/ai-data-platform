# Rosevear six-application handoff — QL-246 source-proof and trusted pin challenge

**Copy this file to the six applications. This is a technical request, not permission to connect.**

## All six apps — return exactly one public signed metadata record

Applies to **AI Data Platform, Devil n Dove, Rosie Dazzlers, Yard Workers (YW), iCamp and Rosevear AI Hub**. Each repository independently publishes `docs/integration/ql246-source-proof.json` at an immutable Git commit SHA (not a mutable branch name). An app may report PENDING instead of inventing completed tests; QL-246 will HOLD until all strict assertions match.

1. Have a trusted local operator generate an Ed25519 source signing key. Store the **private key only in the app's secret manager**; never commit it or include it in JSON. Export public SPKI PEM and send the SHA-256 of its DER SPKI through a **different independently authenticated channel** to the AI Data Platform operator. Cross-application reuse of the same signing key is prohibited.
2. Obtain the private operator's one-time `challengeId` and `sha256(challengeNonce)`; sign those values alongside your system, business, tenant, immutable source revision, GitHub CI run URL, and exact read-only API paths.
3. Use exact canonical signing bytes: UTF-8 with one line per field, each line `JSON.stringify([fieldName, fieldValue])`, in the field order below, joined with a `\n` newline and **without a trailing newline**. Ed25519 sign these bytes and encode the 64-byte detached signature as base64url with no padding.
4. Publish a JSON object with exactly `publicKeyPem`, `payload` and `signature`; record the exact SHA-256 of the **raw JSON bytes**. Provide the immutable commit SHA, exact GitHub repository slug, SHA-256 bytes digest, independently supplied public key fingerprint, business/tenant identity to the AI Data Platform operator. Do not supply a credential value or owner approval.
5. The public proof must reflect the actual stage of testing. All current QL-246 source claims are nonproduction read-only and **DISCONNECTED**. No owner approval and no external GET confirmation is inferred from this file.

## Exact signed payload schema and order

The `payload` object contains exactly these keys, ordered for canonicalization as shown:

```text
schema_version, source_system, repository, source_revision,
challenge_id, challenge_sha256, business_id, tenant_id,
environment, ci_run_url, allowed_methods, allowed_paths,
negative_tests, gateway_audit_receipt_id, health_receipt_id,
capabilities_receipt_id, registered_key_id, owner_authorization,
connection_state, external_gateway_get_verified, durable_audit_verified,
owner_identity_verified, issued_at, expires_at
```

Value requirements:

- `schema_version`: `rosevear.integration.v1`; `source_system`: one of `ai-data-platform`, `devilndove`, `rosiedazzlers`, `yw`, `icamp`, `rosevear-ai-hub`.
- `repository`: `RosevearCreations/` plus the independently verified GitHub repository slug; `source_revision`: lowercase 40-hex commit SHA, identical to the immutable fetched file's commit.
- `challenge_id`: private operator's `np-...` identifier; `challenge_sha256`: lowercase hex SHA-256 of the public operator challenge nonce.
- `business_id`: system name except AI Data Platform uses `devilndove`; `tenant_id`: `null` except YW/iCamp require a separately confirmed, app-specific `np-...` tenant ID.
- `environment`: `nonproduction`; `ci_run_url`: exact GitHub Actions run at that repo, e.g. `https://github.com/RosevearCreations/<repo>/actions/runs/<numeric-run>`.
- `allowed_methods`: `["GET"]`; `allowed_paths`: `["/api/integration/v1/health","/api/integration/v1/capabilities"]`. This proof requests no customer/product/reference data endpoints.
- `negative_tests`: object with **exactly** seven boolean `true` values (only if independently observed): `nonce_replay_denied`, `stale_request_denied`, `cross_business_denied`, `cross_tenant_denied`, `revoked_key_denied`, `write_denied`, `dispatch_denied`. Do not mark them true based solely on local unit tests or fixture receipts. If any is unverified, **do not fabricate a signed acceptance proof**; return an exception list in your normal app build handoff.
- `gateway_audit_receipt_id`, `health_receipt_id`, `capabilities_receipt_id`, `registered_key_id`: `null` if absent; otherwise actual nonsecret `np-...` IDs. Never invent receipt IDs.
- `owner_authorization`: `NOT_GIVEN`; `connection_state`: `DISCONNECTED`; `external_gateway_get_verified`, `durable_audit_verified`, `owner_identity_verified`: **all `false`** until an independently witnessed later acceptance procedure. Source-only QL-246 review never accepts `true` for these fields.
- `issued_at`, `expires_at`: Unix epoch **milliseconds**; issue after challenge, expire within one hour, and be unexpired at retrieval time.
- `publicKeyPem`: the app's real Ed25519 public SPKI PEM; `signature`: detached Ed25519 signature over the canonical payload bytes, not the whole envelope.

## Six-app return checklist

| App | Source report | Special evidence |
| --- | --- | --- |
| AI Data Platform | Gateway health/capabilities, denied methods, signed public-only proof | No direct database sharing; production routes fail closed |
| Devil n Dove | Public readiness receipt, exact nonproduction health/capabilities | Product, listing, Etsy/Marketplace writes and live publication remain disabled |
| Rosie Dazzlers | Nonproduction health/capabilities and negative tenant cases | No booking change, gift delivery, payment, SMS or customer contact |
| Yard Workers | Tenant-specific deny and source evidence with isolated tenant ID | No employee/payroll data, job dispatch or route changes |
| iCamp | Campground-specific tenant deny, nonproduction receipts | No reservations, gate actions or visitor access changes |
| Rosevear AI Hub | Private/off-by-default nonproduction safe source report | No device actuation, cameras, passwords or local-network exposure |

## AI Data Platform gate

The independent operator will inspect six source code revisions and signatures, verify pins received out of band, retrieve six public immutable files over HTTPS, and produce a signed-metadata-only HOLD result. **A successful public proof is not an authenticated gateway test.** Do not start any live connection, rotate real production secrets, send SMS, or claim the pilot is authorized. Explicit separately verified owner authorization remains a later gate.

If a participating repository cannot safely publish nonsecret proof, respond with an honest **PENDING / BLOCKED** reason and send the immutable commit SHA and CI URL; the integration will remain HOLD.
