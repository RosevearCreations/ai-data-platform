# Build 237 — Repair Recovery Audit, Renewal Preset Persistence, Receipt Recovery Filtering & QL-258 Follow-Up

## Recovery scope
Build 237 advances the browser-local recovery cycle with:
- newest-first repair recovery audit evidence;
- renewal recovery preset persistence with unsupported IDs safely recovered to All;
- receipt recovery filtering for All, Recent 24 hours and Recent 7 days.

No database migration or server-side synchronization is introduced.

## Current source A
The current audited source A is `467ca1fad5822ce61c53689bb5826b35e26b5dc0`.

Its matching successful GitHub Actions run is:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41063977694`

The run's `head_sha` equals source A. Existing QL-265 connection-interface work remains preserved.

## QL-258 sanitized owner-action return reconciliation
Build 237 reuses the fixed-enum QL-258 validation contract and adds return reconciliation.

A valid return must:
- use the exact sanitized owner-action schema;
- contain exactly seven allowed progress values;
- contain no unknown/private fields;
- keep owner authorization `NOT_GIVEN`;
- keep connection `DISCONNECTED`;
- keep all 12 live-pilot holds.

A completed seven-answer self-report can reconcile only to `QL258_OWNER_RETURN_RECONCILED_SELF_REPORT_ONLY`. It still does not authenticate identity or authorize proof publication or gateway testing.

No completed sanitized owner-action return has been supplied. Current reconciliation is `QL258_OWNER_RETURN_NOT_RECEIVED_OR_INCOMPLETE`.

## Immutable proof publication follow-up
The immutable path `docs/integration/ql246-source-proof.json` was rechecked at exact source A and remains HTTP 404.

Build 237 adds publication follow-up logic:
- non-200 remains `QL258_PROOF_PUBLICATION_FOLLOWUP_NOT_PUBLISHED`;
- a future HTTP 200 must pass the existing A/B, digest, SPKI, ancestry and exact source-CI checks before becoming verified;
- a verified public proof still leaves owner TEST authorization separately held.

Current proof-B publication status remains not published. No B SHA or raw digest is claimed.

## Custody-source activation evidence aging
Build 237 adds evidence-aging protection so old custody data cannot silently remain acceptable.

A future evidence set must contain:
- exact public signer SPKI digest;
- registry snapshot digest;
- three distinct opaque nonsecret receipt IDs;
- challenge duration no longer than five minutes;
- challenge still unexpired;
- a last-verification timestamp within the configured evidence-age limit.

The default maximum evidence age is 30 minutes and may be explicitly bounded between one minute and 24 hours.

No real custody-source activation evidence currently exists. Aging status is therefore `QL258_CUSTODY_EVIDENCE_NOT_AVAILABLE`.

Even fresh future evidence does not itself activate the connection. Activation, proof publication, owner TEST authorization and authenticated gateway GET execution remain separate gates.

## Current boundary
- signer: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`;
- custodian/witness/reviewer: `NOT_ASSIGNED`;
- approved restricted key host/store: `NOT_APPROVED`;
- independent public SPKI pin: `NOT_VERIFIED`;
- owner TEST-only authorization: `NOT_GIVEN`;
- authenticated gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED / HOLD`.

## Next roadmap item
**Build 238 — Repair Recovery Filtering, Renewal Preset Recovery & Receipt Recovery Search, plus QL-259 owner-status refresh, custody-source evidence renewal and immutable proof publication exception review while authenticated gateway GETs remain HELD.**
