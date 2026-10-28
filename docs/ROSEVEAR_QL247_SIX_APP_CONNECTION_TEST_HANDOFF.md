# Rosevear Interconnectivity QL-247 — six-application connection-test readiness handoff

**Forward this to the six companion GitHub applications. Do not include credentials.**

Each app is in the `RosevearCreations` GitHub account, but **GitHub identity is not service-to-service authentication**. We can independently retrieve public source proof; a live API test requires app-specific nonproduction endpoint access, separately provisioned scoped credentials, pinned signing keys and an independent reviewer. All four operating businesses remain `DISCONNECTED / HOLD` and Comms Hub phone/SMS/live dispatch remains disabled.

## Required next return, one per app

| Application | Correct GitHub repo | Immediate missing item |
| --- | --- | --- |
| AI Data Platform | `RosevearCreations/ai-data-platform` | Publish the QL-246 source proof and a separate owner-safe return. Its gateway must stay nonproduction-only. |
| Devil n Dove | `RosevearCreations/devilndove-site` | Publish independently signed source proof; confirm product/listing data reads and marketplace writes remain disabled. |
| Rosie Dazzlers | `RosevearCreations/rosiedazzlers` | Publish source proof; record real gateway read-only test and seven independently observed denials if and when safely performed. |
| Yard Workers | `RosevearCreations/yw` | Verify Build 477 is actually production promoted; publish proof with a genuine isolated company tenant ID. |
| iCamp | `RosevearCreations/iCamp` | Publish proof with an independently confirmed campground tenant ID; no gate or reservation commands. |
| Rosevear AI Hub | `RosevearCreations/rosevear-ai-hub` | Preserve LAN/private-only operation; establish an approved **private test runner** before considering key issuance or signed proofs. Do not publish IPs, hostnames, device or vault information. |

## Phase A — public source and trust preparation

1. Each app independently takes the exact current 40-character `main` commit SHA and its corresponding GitHub Actions CI run.
2. Prepare an Ed25519 source signer and obtain its public SPKI SHA-256 fingerprint through a separately authenticated channel. Keep the private key only in the app's approved secret manager.
3. Return repository, immutable SHA, CI URL, signer-key readiness, out-of-band fingerprint verification, business/tenant mapping, genuine original receipt IDs and remaining PENDING items.
4. The final `docs/integration/ql246-source-proof.json` requires seven actually observed denial tests. It is correct for the file to remain MISSING/BLOCKED until Phase B has genuinely occurred.

## Phase B — controlled nonproduction authenticated GETs

- Requires separate owner authorization for the exact nonproduction test only.
- Use distinct 256-bit random HMAC secrets per source/tenant/environment in approved secret stores.
- Invoke only `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`.
- Require the QL-243 canonical HMAC, ±5-minute timestamp window and atomic nonce replay suppression.
- Independently witness replay, stale timestamp, wrong business, wrong tenant, revoked key, prohibited write and dispatch denials.
- Re-read durable audit evidence after restart/redeploy and verify pinned gateway signing keys, deployed source SHA, rotation/revocation and rollback.
- Only after genuine observations may a fresh one-hour QL-246 challenge be used to sign the final proof.

## Phase C — owner-safe pilot decision

Not authorized. A later read-only pilot requires a new, explicit, specific, time-bounded and reversible owner decision per business and tenant.

Never paste secrets, credentials, customer records, personal health information or household network topology into the return.
