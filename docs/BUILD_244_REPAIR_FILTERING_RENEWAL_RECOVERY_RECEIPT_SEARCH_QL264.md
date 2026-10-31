# Build 244 — Repair Filtering, Renewal Recovery, Receipt Search & QL-264

## Recovery scope
Build 244 advances the existing browser-local recovery cycle with repair audit filtering for All / Recent 24h / Recent 7d, renewal preset recovery that sanitizes unsupported persisted IDs to `all`, and receipt recovery search across audit ID, requested preset, recovered preset and recovery reason.

No database migration or server-side recovery synchronization is introduced.

## QL-264 owner-packet renewal reconciliation
QL-264 adds reconciliation on top of the QL-263 owner-packet renewal contract. Reconciliation requires a verified renewal, a separate reconciliation receipt, matching renewal receipt identity, matching renewed packet SHA-256 and a status return inside the bounded renewal lifetime.

No qualifying owner-packet renewal or reconciliation evidence exists.

Current state: `QL264_OWNER_PACKET_RENEWAL_RECONCILIATION_NOT_AVAILABLE`.

A reconciled packet remains status-only evidence and does not authorize an authenticated gateway GET.

## Signer-custody freshness receipt renewal
QL-264 adds a distinct freshness-renewal receipt on top of a still-fresh QL-263 signer-custody audit. The renewal receipt must be distinct from the audit receipt, include a receipt-set SHA-256 and remain inside a bounded renewal window.

No qualifying signer-custody evidence exists.

Current state: `QL264_SIGNER_CUSTODY_FRESHNESS_RECEIPT_RENEWAL_NOT_AVAILABLE`.

Activation remains held.

## Source-proof publication exception disposition

This is the Build 244 **source-proof exception disposition** gate.
Verified source A is Build 243 main:

`c6178ed786cba9cfeb33769e61d41a0559e6451e`

The Build 243 GitHub Actions run is:

`https://github.com/RosevearCreations/ai-data-platform/actions/runs/41112571900`

That run completed with `failure` because the historical Build 241 verifier incorrectly pinned the mutable shell label. Build 244 repairs that verifier contract instead of hiding the failure.

The immutable proof path `docs/integration/ql246-source-proof.json` is still HTTP 404 / NOT_FOUND at source A. The exception therefore remains open:

`QL264_PROOF_PUBLICATION_EXCEPTION_DISPOSITION_OPEN_PUBLICATION_REQUIRED`

No exception waiver is allowed and no proof B publication is claimed.

## Template-driven Operations Command interface
Build 244 adopts the owner-provided generic UI recreation specification as the interface interpretation guide while keeping AI Data Platform data and workflows authoritative.

The implementation adds reusable:

- action drawers / inspector surfaces;
- exception queues with semantic status treatments;
- evidence timelines;
- responsive mobile drawer behavior;
- existing shared shell, navigation, card, status and drill-down language.

The new components are wired to real workflows:

- Data Review uses a governed action drawer;
- Remote Execution derives its exception queue from live readiness flags and its timeline from provider events;
- Adoption & Permissions derives its review queue from actual recommendations;
- Integration Delivery derives readiness exceptions from configured consumer state and timelines from durable delivery acknowledgements.

No sample KPI values from the reference document are introduced as production data.

## Safety boundary
- owner packet renewal reconciliation: `NOT_AVAILABLE`;
- signer-custody freshness renewal: `NOT_AVAILABLE`;
- immutable proof: HTTP 404;
- proof exception disposition: open / publication required;
- proof B publication attempted: `false`;
- owner TEST-only authorization: `NOT_GIVEN`;
- authenticated gateway GETs: `NOT_RUN`;
- connection: `DISCONNECTED / HOLD`;
- live pilot holds: `12`.

## Next roadmap item
**Build 245 — Repair Search, Renewal Recovery Audit & Receipt Presets, plus QL-265 owner-renewal freshness reconciliation, signer-custody renewal receipt audit and source-proof disposition closure readiness while authenticated gateway GETs remain HELD, with Operations Command conversion continuing through reusable tables, inspectors, status badges and responsive workflow layouts.**
