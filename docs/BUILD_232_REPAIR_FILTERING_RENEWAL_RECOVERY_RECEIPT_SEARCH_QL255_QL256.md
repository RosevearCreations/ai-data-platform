# Build 232 — Repair Recovery Filtering, Renewal Preset Recovery, Receipt Recovery Search, QL-255 Disposition & QL-256 Signer Provisioning

## Recovery scope
- filter repair recovery audit by All / 24h / 7d;
- recover unsupported renewal preset IDs safely to All;
- search receipt recovery evidence across audit ID, requested/recovered preset IDs and reason.

## QL-255
Build 232 records the current proof publication disposition as NOT_PUBLISHED because the immutable proof path at pre-build main `c658bce8c207dcbfdf6c9afa5f304428dd3e31d3` remains HTTP 404. Private custody exception closure requires distinct authenticated custodian, witness and reviewer receipts plus a fresh <=5 minute challenge. Mini-server trial preparation remains architecture-only and does not install or start a relay.

## QL-256 real signer provisioning
A real app-specific Ed25519 signing key was generated and stored only in the Vercel Preview sensitive environment variable `QL256_SIGNER_PRIVATE_KEY_PEM`. The private key is not committed, documented or returned.

Public signer evidence:
- key ID: `ql256-ai-data-platform-d16f21ab82c12760`;
- SPKI SHA-256: `d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6`;
- signer decision: `SIGNER_EXISTS_CUSTODY_NOT_VERIFIED`.

Source A is the genuine GREEN commit `76f73363a9a29a34ed8bf09b6b4ff58a0dc77482`, with matching GitHub Actions run:
`https://github.com/RosevearCreations/ai-data-platform/actions/runs/40806025614`.

The existing receiving validator already implements the QL-248 two-SHA rule: signed `source_revision=A` is distinct from later proof commit B.

## Exact remaining QL-256 blocker
Independent custody is not yet verified. A separately authenticated custodian must verify the public SPKI fingerprint, with a distinct witness and independent reviewer, complete a fresh <=5-minute challenge, and return three distinct opaque non-secret receipt references. Until that happens, proof B must not be published and no TEST GET may run.

Owner TEST authorization remains NOT_GIVEN. Connection remains DISCONNECTED / HOLD.

## Next roadmap item
**Build 233 — Repair Recovery Search, Renewal Recovery Audit & Receipt Recovery Presets, plus QL-256 independent signer-custody evidence intake, proof-B publication readiness and authenticated owner TEST-only decision preparation while gateway execution remains HELD.**
