# Build 347 — Master Security, Authorization, Consent & Evidence Certification

## Purpose

Build 347 adds a suite-wide, evidence-backed security certification layer for the exact six Master Shell source identities.

Each source is certified independently across six required dimensions:

- source signing and trust;
- role authorization;
- consent;
- sensitive-data handling;
- audit evidence;
- fail-closed controls.

A source is PASS only when all six dimensions have fresh PASS evidence. Any FAIL fails the source certification. Any BLOCKED dimension keeps the source BLOCKED. Expired evidence becomes STALE. Missing evidence remains UNKNOWN.

## Evidence and authority boundaries

Build 347 is deliberately evidence-only:

- source signing software or a configured key does not prove signer custody or trust;
- role/device acceptance does not grant source authorization;
- workspace membership does not imply consent;
- prior communications do not imply current consent;
- Build 346 relationship PASS does not imply security certification;
- deployment GREEN does not imply security certification;
- no signer enrollment, consent grant, role grant, HOLD release, connection activation, source mutation, peer write or external probe is performed.

## Persistence

Migration `0125_master_security_certification.sql` adds:

- `app.master_security_certification_runs`;
- `app.master_security_certification_assertions`.

Both tables are append-only to the runtime role, RLS protected, and limited to suite owner/admin review.

## Operator surfaces

- `/master-security-certification`;
- `/api/master-security-certification`.

The recorder requires one evidence URI and detail for every certification dimension. The default outcome is BLOCKED so an incomplete review cannot accidentally become PASS.

## Relationship to earlier controls

Build 347 reconciles evidence from existing controls without replacing them. Existing source-proof, tenant/role, notification-consent, security-access-review and relationship-certification layers remain authoritative within their own boundaries.

## Next queued build

**Build 348 — Six-Application Source Onboarding & Supervised Production Pilot.**
