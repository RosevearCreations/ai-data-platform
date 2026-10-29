# Build 235 — Repair Preset Persistence, Renewal Recovery Search, Receipt Preset Recovery & QL-257 Owner Status Intake

## Recovery scope
Build 235 advances the browser-local recovery cycle with:
- sanitized repair-preset persistence;
- renewal recovery search across audit ID, requested/recovered preset IDs and reason;
- receipt preset recovery that fails safely to All when a persisted preset is no longer supported.

No database migration or server-side synchronization is introduced by this recovery cycle.

## Current Source A
The current audited source A is `24c54b189f41c2473dad58af9847a5c28dff0483`.

Its matching successful GitHub Actions run is:

`https://github.com/RosevearCreations/ai-data-platform/actions/runs/40939115385`

The run's `head_sha` equals source A. The immutable proof path at source A remains HTTP 404.

## QL-257 independent owner-status intake
Build 235 adds strict fixed-enum intake for the sanitized owner status packet. It:
- rejects unknown fields;
- rejects private-data flags;
- requires owner authorization to remain `NOT_GIVEN`;
- requires connection to remain `DISCONNECTED / HOLD`;
- never treats a QL-257 packet as a custody receipt;
- preserves all 12 live-pilot holds;
- reports a valid self-report only as `OWNER_REPORTS_DONE_NOT_VERIFIED`.

No independently authenticated owner-status packet has been returned to this app yet. Current real intake state is `NOT_RECEIVED_FROM_INDEPENDENT_OWNER_PROCESS`.

## QL-258 owner-action handoff
The attached QL-258 handoff is an operator worksheet instruction, not an authenticated owner packet. No sanitized AI Data Platform handoff exported from that worksheet has been supplied in this build conversation.

Current QL-258 intake state:
- sanitized packet: `NOT_RECEIVED`;
- owner authorization: `NOT_GIVEN`;
- network test: not authorized;
- connection: `DISCONNECTED`;
- live pilot holds: 12.

No new environment variables or bindings are required for this QL-258 intake.

## Custody-role approval reconciliation
Reconciliation requires more than a self-report. Build 235 requires:
- an accepted sanitized owner-status packet;
- separate external independent role authentication;
- custodian, distinct witness and reviewer each `ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED`;
- approved restricted private-key host/store;
- public SPKI pin `VERIFIED_OUT_OF_BAND`;
- exact public signer fingerprint;
- registry snapshot digest;
- three distinct opaque receipt references;
- distinct roles;
- a fresh challenge no longer than five minutes.

None of those independent receipt/authentication requirements has been satisfied in the current record. Reconciliation therefore remains `HELD_NOT_RECONCILED`.

## Proof-B publication authorization preparation
Publication authorization is prepared only after custody-role approval reconciliation and requires:
- source A with exact successful CI head SHA;
- signer state `SIGNER_EXISTS_CUSTODY_VERIFIED`;
- verified public pin;
- private key available only in an approved restricted store and not exported;
- canonical payload and signed envelope prepared;
- the immutable proof path;
- two-SHA A→B rule accepted;
- separate publication reviewer receipt;
- `AUTHORIZED_FOR_PUBLIC_PROOF_ONLY`.

Current authorization state is `HELD_CUSTODY_APPROVAL_MISSING`. Proof B is not published, no B SHA is claimed and no raw proof digest is claimed.

## Gateway boundary
Even future proof-publication authorization does not authorize a gateway request. Current owner TEST-only authorization remains `NOT_GIVEN`, authenticated gateway GETs remain `NOT_RUN`, and connection remains `DISCONNECTED / HOLD`.

## Safety boundaries
- no fabricated owner authentication;
- no fabricated custodian/witness/reviewer receipts;
- no private signer material in GitHub;
- no secret-manager addresses or private credential-store paths;
- no proof-B publication while custody approval is missing;
- no owner TEST authorization inferred from GREEN deployment;
- no gateway execution while HELD.

## Next roadmap item
**Build 236 — Repair Preset Recovery, Renewal Recovery Presets & Receipt Recovery Audit, plus QL-258 sanitized owner-action packet validation, immutable proof refresh and custody-source activation readiness while authenticated gateway GETs remain HELD.**
