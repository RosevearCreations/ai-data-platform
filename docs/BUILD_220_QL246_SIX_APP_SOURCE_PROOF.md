# AI Data Platform — QL-246 six-app independent source-proof verification

**Integration companion scope to the AI Data Platform Build 219 baseline.** QL-246 is the inter-application contract sequence; it does not renumber AI Data Platform's internal recovery-preset roadmap. No production connection or owner release is authorized.

## Delivered

- A nonproduction, operator-invoked **public-only** source verifier for all six applications: `ai-data-platform`, `devilndove`, `rosiedazzlers`, `yw`, `icamp`, `rosevear-ai-hub`.
- Six exact immutable GitHub commit-SHA source locations: `https://raw.githubusercontent.com/RosevearCreations/{repository}/{40-char-sha}/docs/integration/ql246-source-proof.json`.
- An **independently obtained** trust manifest binding each application to its separately verified Ed25519 SPKI SHA-256 public-key pin, expected business/tenant, exact Git commit SHA and SHA-256 of the public JSON evidence. The source file's own claimed key or fingerprint is **never trusted** without this independent pin.
- A random 256-bit one-hour challenge, unique challenge ID, source payload detached Ed25519 verification and expiry guard. Six unique source keys/repositories are required; cross-company/tenant confusion is denied.
- An explicit `--fetch-public-proof` mode, GET-only to an allowlisted public raw GitHub host and immutable path, with redirects, credentials, queries, excessive responses, non-JSON responses and invalid signatures denied.
- A conservative, read-only verdict with six per-app statuses. Even six valid public signatures yields **`SIX_PUBLIC_SOURCES_VERIFIED_EXTERNAL_TESTS_PENDING_HELD`**, never an operational release.
- Executable positive and negative regression tests. No database migration, no new server route and no production secrets.

## Operational procedure

1. **Trusted operator** runs this on a private nonproduction review workstation:

   ```sh
   node apps/web/scripts/ql246-create-trusted-challenge.mjs --output /private/ql246-trusted-pins.json
   ```

   The created file is deliberately incomplete, uses restrictive file permissions and must **never** be committed. It expires one hour after issuance. If six apps cannot complete in that window, restart this challenge after they are ready. **Do not reuse an expired challenge.**

2. Send each app the **source-proof handoff** `docs/ROSEVEAR_QL246_SIX_APP_SOURCE_PROOF_HANDOFF.md` and the challenge ID plus SHA-256 hash of the nonce. Each app must return its own signed **public** proof JSON from its committed SHA. No secrets, private keys, token values, customer records or live endpoints belong in the document.
3. Independently obtain each app's source signing SPKI SHA-256 fingerprint **from a separately authenticated channel** (not the public JSON itself) and its exact Git commit SHA. Require an independent source owner/reviewer to confirm the repo-to-system mapping and tenant identity before filling the six manifest rows. Record the exact raw JSON SHA-256 and repo slug. Do not accept claims of actual authenticated GETs based solely on signed metadata.
4. Inspect the manifest and run the explicit nonproduction public test:

   ```sh
   node apps/web/scripts/ql246-verify-source-proofs.mjs --trusted-pins /private/ql246-trusted-pins.json --fetch-public-proof --output /private/ql246-review-output.json
   ```

   Without `--fetch-public-proof`, the checker returns `HOLD_FETCH_NOT_AUTHORIZED` and makes zero requests. If any source cannot be fetched, has a SHA/pin mismatch, an invalid signer, stale challenge or wrong tenant/scope, the verdict is HOLD. Exit code `2` means incomplete/invalid source verification; a `0` still means **signature-only acceptance, connection HOLD**.

5. External gateway validation is a **separate** later ceremony: independent authenticated HMAC GET `/health`, `/capabilities`, and signed immutable audit-receipt GET, verified public gateway key pins, negative/replay/tenant tests, real durable audit reread after restart, separately verified owner identity, distinct credential custody and explicit, scoped owner authorization. None is supplied or inferred by this checker.

## Mandatory safety and decision record

| Gate | QL-246 default result |
| --- | --- |
| Public immutable six-app signed source proof | Pending actual third-party retrieval and separately verified pins |
| Trusted public pin challenge | Generated only by private operator; not prefilled or fabricated |
| Independent authenticated nonproduction gateway GET | Not performed |
| Independent credential exchange and rotated/revoked key test | Not performed |
| Durable audit receipt after restart/redeploy | Not performed |
| Separate owner identity attestation and explicit pilot authorization | **NOT GIVEN** |
| Production or nonproduction data flow | **DISCONNECTED / HOLD** |
| Customer messages, calls, SMS, payments, product changes, jobs, reservations, devices | **0 actions authorized** |
| QL-181 held real pilot scenarios | **12/12 HELD** |

`main` Production GREEN refers solely to **successful deployment of the safe code and offline verification tools**, not to approval to establish live integrations. No provider, tenant, or owner authorization can be simulated as a real outcome.

## Verify

```sh
node apps/web/scripts/verify-ql246-independent-six-app-source-proof.mjs
pnpm --filter @rosevear/ai-data-web test
```
