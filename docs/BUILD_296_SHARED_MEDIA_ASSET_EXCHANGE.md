# Build 296 — Shared Media & Asset Exchange

## Purpose

Build 296 standardizes references to photos, documents, receipts, generated media, video and audio across the Rosevear application estate without introducing unnecessary duplicate uploads.

The build reuses the Build 286 shared media contract:

- `rosevear.shared.media.v1`

It does not create a second media schema and it does not store binary file bodies.

## Supported applications

Media references may originate from or target:

- Devil n Dove;
- Rosie Dazzlers;
- Yard Workers;
- iCamp;
- Rosevear Comms Hub;
- Rosevear AI Hub.

The source application remains authoritative for the source record and media location.

## Reference-first model

An owner/admin records a stable HTTPS media reference plus provenance:

- source application;
- canonical tenant;
- source record ID and optional version;
- source updated timestamp;
- asset kind;
- Build 286 media type;
- optional owner kind and owner record ID;
- optional alt text and caption;
- optional creation time;
- optional MIME type;
- optional byte size;
- optional SHA-256 content digest.

The portable record is validated against `rosevear.shared.media.v1`.

Build 296 rejects URL credentials and secret-like query parameters such as tokens, API keys, signatures and expiring signed-URL fields. Durable references are expected to be stable and non-secret.

## Deduplication

Build 296 creates a canonical asset identity inside the same workspace and canonical tenant.

Deduplication prefers:

1. caller-supplied SHA-256 content digest;
2. otherwise the SHA-256 digest of the normalized stable HTTPS URL.

Multiple source applications can therefore retain their own immutable source references while converging on the same canonical asset.

The system stores metadata and digests only. It does not download a file to calculate a digest and it does not upload a duplicate copy.

## Database evidence

Migration `0099_shared_media_asset_exchange.sql` adds:

- `app.shared_media_assets`;
- `app.shared_media_references`;
- `app.shared_media_exchange_packages`;
- `app.shared_media_exchange_reviews`;
- `app.shared_media_exchange_audit`.

All five tables use RLS. Runtime access is SELECT/INSERT only.

The compact integration database gate verifies all Build 296 tables and migration 0099.

## Exchange packages

A reviewed source reference may be wrapped in a destination exchange package.

The package binds:

- source application/tenant/record/version;
- source asset kind;
- destination application/tenant;
- canonical dedupe identity;
- shared media contract ID/version;
- portable media reference.

Source and destination applications must differ.

Every package is created with:

- `state = held`;
- `hold_reason = media-exchange-not-authorized`;
- `binaryTransferRequested = false`.

There is no release or transport transition in Build 296.

## Review

Each package may receive one immutable owner/admin review:

- `approve` records suitability for possible future transport;
- `reject` records that the reference package should not proceed.

Approval does not move a file, change package state, dispatch a message or write to a peer application.

## Operator surface

The authenticated `/media-asset-exchange` console provides:

- source media reference registration;
- content-hash or stable-URL deduplication standing;
- canonical asset/reference counts;
- held destination package preparation;
- approve/reject review;
- explicit no-binary-transfer and no-dispatch readback.

The API is `/api/media-asset-exchange`.

## Authorization boundary

Build 296 performs:

- no binary upload;
- no binary download;
- no remote content fetch;
- no peer-application write;
- no automatic dispatch;
- no QL-337 media payload delivery;
- no connection activation.

QL-266 remains:

- `UNDER_REVIEW`;
- external test `REVIEW_DEFERRED`;
- connection `DISCONNECTED`.

External requests remain 0 and live exchanges remain 0.

## Next build

**Build 297 — Cross-App Notification & Consent Service**.
