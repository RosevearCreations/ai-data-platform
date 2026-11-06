# Build 294 — Shared Customer & Contact Identity Resolution

## Purpose

Build 294 creates a reviewed, privacy-minimized identity layer for customer/contact records that belong to authorized Rosevear applications.

It does not fetch customer records from peer applications and it does not write identity decisions back to them. Operators supply an authorized source record reference and the contact evidence needed for a match review.

## Privacy-minimized evidence

The authenticated server accepts:

- source application;
- canonical tenant key;
- source customer/contact record ID and optional source version;
- email, phone, display name and postal code evidence.

Before persistence, contact values are normalized and SHA-256 fingerprinted. The database stores the fingerprints and source record reference, not the raw email, phone, name or postal value.

An observation requires at least one strong contact identifier (email or phone), or the exact combination of normalized name plus postal code.

## Match rules

Candidate generation is deterministic and cross-application only within the same workspace and canonical tenant key.

Supported rules are:

1. exact email + exact phone — confidence 100;
2. exact email — confidence 95;
3. exact phone — confidence 90;
4. exact name + exact postal code — confidence 75.

No fuzzy, phonetic, AI-inferred or cross-tenant match is created.

## Owner review

Every candidate starts as `pending-review`.

Only a workspace owner/admin can accept or reject a match, and a bounded review reason is required.

An accepted match creates or extends a shared identity group. If both observations are already linked to different groups, Build 294 fails closed with a manual-resolution conflict instead of merging groups automatically.

A rejected match records an immutable decision and creates no shared link.

## Database evidence

Migration `0097_shared_customer_contact_identity.sql` adds:

- `app.customer_identity_observations`;
- `app.customer_identity_candidates`;
- `app.customer_identity_decisions`;
- `app.customer_identity_groups`;
- `app.customer_identity_links`;
- `app.customer_identity_audit`.

All six tables use RLS. Runtime access is SELECT/INSERT only, with no UPDATE or DELETE grants.

## Operator surface

The authenticated `/customer-identities` console provides:

- privacy-minimized evidence intake;
- exact-match candidate review;
- accept/reject controls with reason;
- shared identity group standing;
- explicit policy readback.

The API is `/api/customer-identities`.

## Authorization boundary

Build 294 performs no outbound network request and no peer-app record mutation. It does not enable a customer-data transport path through QL-337 or any other TEST broker.

QL-266 remains:

- `UNDER_REVIEW`;
- external test `REVIEW_DEFERRED`;
- connection `DISCONNECTED`.

External requests remain 0 and live exchanges remain 0.

## CI

Build 294 is added to the compact Build 292A integration spine and the production build gate. The compact database verifier now requires all six Build 294 RLS tables, append-only grants and migration 0097.

## Next build

**Build 295 — Shared Product, Service & Catalogue Exchange**.
