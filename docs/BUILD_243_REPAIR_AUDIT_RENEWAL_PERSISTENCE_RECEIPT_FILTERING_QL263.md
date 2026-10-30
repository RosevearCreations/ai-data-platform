# Build 243 — Repair Recovery Audit, Renewal Persistence, Receipt Filtering & QL-263

## Recovery scope
Build 243 advances the browser-local recovery cycle with repair recovery audit ordering, renewal preset persistence with unsupported IDs sanitized to `all`, and bounded receipt filtering for All, Recent 24h and Recent 7d. Manual search text remains outside persisted preset state.

## QL-263 owner-packet renewal evidence
A renewal can only extend a still-fresh QL-262 owner packet with a distinct renewal receipt, renewed packet digest and bounded renewal expiry. No qualifying owner packet renewal evidence exists.

Current state: `QL263_OWNER_PACKET_RENEWAL_NOT_AVAILABLE`.

## Signer-custody audit freshness enforcement
QL-263 layers freshness over the QL-262 signer-custody receipt audit. The prior audit must pass and remain inside a bounded age window. No qualifying evidence exists.

Current state: `QL263_SIGNER_CUSTODY_AUDIT_FRESHNESS_NOT_AVAILABLE`.

## Source-proof publication exception review
Verified source A is Build 242 main: `13b14183807d5c08c9dcb3defe426349619a393e`.

The immutable proof path `docs/integration/ql246-source-proof.json` remains HTTP 404 / NOT_FOUND at that source. The publication exception therefore remains open and cannot be waived.

Current state: `QL263_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED`.

## Operations Command deeper workflow panels
Build 243 continues the real visual conversion with deeper workflow panels and status drill-downs on Data Review, Remote Execution, Adoption & Permissions, and the Comms Hub connection gate. These panels route operators through real governed workflows and live status surfaces without inserting fictional metrics.

## Safety boundary
- owner packet renewal: `NOT_AVAILABLE`
- signer-custody audit freshness: `NOT_AVAILABLE`
- immutable proof: HTTP 404
- proof exception: open / publication required
- owner TEST-only authorization: `NOT_GIVEN`
- authenticated gateway GETs: `NOT_RUN`
- connection: `DISCONNECTED / HOLD`
- live pilot holds: `12`

## Next roadmap item
**Build 244 — Repair Filtering, Renewal Recovery & Receipt Search, plus QL-264 owner-packet renewal reconciliation, signer-custody freshness receipt renewal and source-proof exception disposition while authenticated gateway GETs remain HELD, with Operations Command conversion continuing through action drawers, exception queues and evidence timelines.**
