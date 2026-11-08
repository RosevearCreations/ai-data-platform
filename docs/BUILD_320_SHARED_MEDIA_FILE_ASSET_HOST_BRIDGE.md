# Build 320 — Shared Media, File & Asset Host Bridge

## Purpose

Build 320 exposes the existing Build 296 media/asset exchange as a portable host module service.

Build 296 remains authoritative for normalized media references, the shared media contract, content/reference deduplication and held peer exchange packages. Build 320 adds host-facing metadata and handoff contracts without creating a second binary store or transport engine.

## Media reference registration

`registerMediaHostReference()` accepts the same reference input used by Build 296 and returns:

- the normalized shared-media reference;
- deterministic host/source correlation;
- content/reference checksum evidence;
- source ownership metadata;
- MIME/size policy standing;
- a reference-only preview contract.

The bridge accepts metadata only. It does not accept raw binary bodies.

## Checksum and deduplication

Build 320 inherits Build 296's preference order:

1. content SHA-256 when supplied;
2. SHA-256 of the normalized stable HTTPS reference when a content hash is unavailable.

The registration exposes both the dedupe key and the basis used so a host can make duplicate-aware decisions without copying content.

## Source ownership metadata

Ownership metadata is carried from the Build 296 portable media record:

- source application;
- source record and optional source version;
- optional owner kind;
- optional owner record ID.

Missing owner metadata is represented as undeclared rather than inferred.

## MIME and size policy

`evaluateMediaHostPolicy()` applies a portable default policy:

- image: 100 MiB;
- document: 250 MiB;
- audio: 1 GiB;
- video: 2 GiB.

MIME types must match the declared media family.

Missing MIME or byte-size metadata produces `review-required`; a family mismatch or size over the limit produces `blocked`.

A missing content checksum does not block registration because Build 296 already provides stable-URL SHA-256 fallback, but the policy records the weaker dedupe basis explicitly.

## Preview references

Preview contracts are reference-only.

They carry the normalized stable HTTPS URL, media type, optional MIME type, alt text and caption. The bridge does not fetch the resource, copy bytes, or automatically render sensitive content.

## Host download/upload handoff contracts

`createMediaHostTransferHandoff()` prepares upload or download handoff metadata.

Every binary handoff requires an exact capability grant bound to:

- direction;
- host application/environment;
- platform tenant;
- workspace;
- asset dedupe SHA-256;
- expiry and review time.

Sensitive binary content additionally requires the grant to set `sensitiveBinaryCopyAuthorized = true`.

A missing grant leaves the handoff held. A sensitive handoff without explicit sensitive-copy permission also remains held.

Even an authorized handoff records `binaryTransferPerformed = false`: the bridge prepares the contract but does not copy bytes itself.

## Idempotency

The handoff idempotency key deterministically binds:

- reference correlation;
- transfer direction;
- sensitivity flag;
- reference fingerprint;
- asset dedupe fingerprint.

Retries for the same logical handoff must reuse that identity.

## Retention and deletion-state evidence

`recordMediaLifecycleEvidence()` records metadata evidence for:

- active retention;
- retain-until;
- legal hold;
- expired/review-required;
- deletion not requested/requested/approved/deleted/denied.

A `deleted` state requires a source-system receipt ID. The bridge does not perform deletion and never treats its own evidence record as proof that bytes were removed.

## Operator usability

The existing `/media-asset-exchange` workbench remains the authoritative operator surface.

Build 320 adds a link to the read-only portable bridge descriptor:

`GET /api/module-media-assets`

## Security boundary

Build 320 does not:

- accept raw binary content through the module descriptor;
- fetch preview content;
- transfer upload/download bytes itself;
- authorize transfer merely because a Build 296 package was approved;
- infer sensitive-content permission;
- infer ownership metadata;
- delete source content;
- claim deletion without a source receipt;
- release existing Build 296 held exchange packages.

## Next queued build

**Build 321 — Connector Driver Packaging & Dynamic Module Registry** remains the next regular product roadmap item.
