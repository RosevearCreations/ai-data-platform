# Build 234 — Repair Recovery Presets, Renewal Recovery Filtering, Receipt Preset Persistence & QL-256 Custody Challenge

## Recovery scope
- deterministic repair recovery presets for All, Recent 24 hours, Recent 7 days, Recovered to All and Recovery reasons;
- renewal recovery filtering for All / 24h / 7d;
- browser-local receipt recovery preset persistence with fail-safe sanitization.

No database migration or server-side synchronization is introduced by this recovery cycle.

## Source A and signer
The current audited source A is `a86dce3a71cd6795f5b32b22ddf4320c091dd7a5`.
Its matching successful GitHub Actions run is `https://github.com/RosevearCreations/ai-data-platform/actions/runs/40928884781`, whose `head_sha` equals source A.

The app-specific signer remains:
- key ID: `ql256-ai-data-platform-d16f21ab82c12760`;
- public SPKI SHA-256: `d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6`;
- real state: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`.

## QL-257 owner-safe status
No independent owner-status reply has assigned/authenticated the custody roles or approved the long-term key host. Therefore:
- custodian: `NOT_ASSIGNED`;
- distinct witness: `NOT_ASSIGNED`;
- reviewer: `NOT_ASSIGNED`;
- approved restricted key host/store: `NOT_APPROVED`;
- public SPKI pin: `NOT_VERIFIED`;
- owner TEST-only authorization: `NOT_GIVEN`;
- connection: `DISCONNECTED / HOLD`.

Only status words and the already-public fingerprint are recorded. No private names, passwords, keys, raw tokens, secret-manager addresses or home IP addresses are stored.

## Custody-challenge reconciliation
Build 234 adds fail-closed reconciliation requiring:
- exact expected public SPKI fingerprint;
- registry snapshot SHA-256;
- three distinct opaque non-secret receipt references;
- custodian, witness and reviewer each independently authenticated;
- approved restricted key host/store;
- out-of-band public-pin verification;
- distinct roles;
- a fresh challenge window of at most five minutes.

No genuine challenge package is currently available, so reconciliation is `HELD_NOT_RECONCILED`.

## Signed proof-B publication execution readiness
Execution readiness requires reconciled custody, GREEN source CI exactly matching A, signer state `SIGNER_EXISTS_CUSTODY_VERIFIED`, the private key available only in the approved store, no private-key export, canonical payload and signed envelope preparation, the immutable proof path, and the two-SHA A→B rule.

Those prerequisites are not currently met. The immutable proof path remains HTTP 404, proof-B publication has not been attempted, and no proof-B SHA or raw digest is claimed.

## Owner TEST-only authorization evidence intake
Authorization evidence is accepted only after custody reconciliation and verified proof publication. It further requires:
- separately authenticated owner identity;
- an opaque owner authorization receipt;
- explicit nonproduction TEST-only approval;
- exact business ID `devilndove`;
- GET only;
- only `/api/integration/v1/health` and `/api/integration/v1/capabilities`;
- future window no longer than 30 minutes.

Even accepted authorization evidence does not itself execute a gateway GET. Current owner authorization remains `NOT_GIVEN` and authenticated gateway GETs remain `NOT_RUN`.

## Safety boundaries
- no fabricated custody identities or receipts;
- no private signer material in GitHub;
- no proof B publication before independently verified custody;
- no owner authorization inferred from chat, GitHub ownership or Production GREEN;
- no gateway execution while HELD;
- no direct companion production-database sharing.

## Next roadmap item
**Build 235 — Repair Preset Persistence, Renewal Recovery Search & Receipt Preset Recovery, plus QL-257 independent owner-status intake, custody-role approval reconciliation and proof-B publication authorization preparation while authenticated gateway GETs remain HELD.**
