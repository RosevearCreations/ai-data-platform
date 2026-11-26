# AI Data Platform — Source of Truth adoption, Build 451 and next verified workflow gap
**Reference:** Rosevear All Applications Source of Truth, 26 November 2026; sections "Autonomous testing across all seven applications", "Three Masters", "Distinctive features" and "Build order and release evidence".

## Scope and ownership
AI Data Platform is a read-only or otherwise authorized Master. Business transactions, guest identities, customer photos and financial ledgers remain with their four owning products. Build 451 owns the Master source-signer diagnostic and Windows relay receipt handling only, not the private source signer keys or source application's deployments.

## Verified gap selected for Build 451
At production baseline, Build 432 has a 7/7 signed source run on 22 November and a 1/7 signed source run on 26 November. The five external signed HTTP 200 source probes returned the generic error `build423_telemetry_scope_or_freshness_invalid`; the original Windows Hub had no fresh authenticated outbound relay receipt. This collapsed different failure types and impeded safe repair. The Build 441 field-witness ledger is distinct and contains no fresh independent physical-device attestations. Do not portray the 1/7 current signed status as evidence that historical connections never worked.

Build 451 adds a **read-only diagnostic stage** that uses the existing enrolled Ed25519 public key and verifies the canonical source signature and pinned fingerprint *before* classifying a possible source commit drift, timestamp/expiry problem, protocol mismatch or privacy scope problem. Classification is not admission. It cannot rotate any signer pin or grant peer authority. A Cloudflare endpoint returning HTTP 200 without a configured read token can still offer a signed-candidate diagnosis, not a trusted admission. Source commit repairs require independent verification of the actual deployed revision. The original Windows relay now validates its genuine signed challenge envelope **before** consuming the one-time challenge; an invalid signature can no longer burn an unused challenge. No Windows service is remotely restarted.

## Acceptance categories
- **Software deployed:** GitHub dev/main merge plus Vercel exact SHA READY, successful existing regressions and Build451 diagnostics.
- **Source connectivity:** 7 apps in denominator; retain historical 7/7 signed run, latest run count, observation age and independent signer failure codes. A reachable HTTP 200 endpoint does not imply an admitted signature.
- **Field custody:** 7 distinct independent original-device signatures and source/revision/owner/ACK proof are a different gate. Their absence is HOLD, not a software-build failure.
- **Customer workflow:** the Stage 12 sample flow for iCamp is a future Master event-tracing task. Build451 does not claim it was exercised.

## Operator workflow and observable results
**Entry points:** original owner sign-in → `/owner-connection-validation` and `/owner-signer-authority`.
**Expected:** correct masked account, seven source-specific statuses, last observation and denominator, source-age HOLD after expiry, exact next intervention class, and independently reported field-witness status. API `GET /api/owner-signer-authority` is authenticated/owner-scoped and `Cache-Control: no-store`.

**Automated tests:** `apps/web/scripts/verify-build-451-signer-diagnostics.ts` creates temporary test Ed25519 keys to prove valid signed candidate, stale clock, pin mismatch, unsafe scope, protocol mismatch and tamper rejection. `verify-build-451-continuity.ts` tests stale/partial counts, repair action classification and original Windows signature preflight happens before challenge consumption. Temporary unit-test keys are **never production keys**.

**Browser test:** anonymous navigation must redirect to sign-in; owner role readback requires an actual authenticated session. Document viewport and environment and do not pretend that an unauthenticated browser proves owner workflow. Do not borrow production credentials.

## Product event contract and next verified gap — Build 452
The next first workflow gap is defined by the Source of Truth Master test: **Site 12 free maintenance request and paid add-on → staff acknowledgement → same folio**. For every shared event keep product, tenant, event ID, type, observed timestamp, source object/stay ID, version and allowed purpose; raw guest and ledger data remain in iCamp. Review request, staff acceptance, payment approval/capture, folio posting and final state independently. The Master must show sample window, denominator, exclusions, missing stages, stale warning and **no margin** if costs are missing. Test a duplicate event ID and older case resolution to ensure one logical case and last valid status. Do not invent Site 12 guest, tablet, folio or payment screenshots when no authorized iCamp test session is available.

Build 452 is **selected as next proposal, not yet an authorized or queued PR**; it must be checked against existing implementation and a real test tenant before numbering and scope are finalized.

## Queue provenance as checked on 26 November
No open AIDP build PR found before Build451. One enabled legacy AIDP Build432 retry automation exists and must not be treated as uncompleted Builds 433–450. No fixed backlog length can be verified from the Source of Truth. Report one current authorized build and the next first evidence-grounded gap rather than guessing completion percentages.

## Dependencies that cannot be bypassed
- Vercel AIDP production holds the existing master telemetry pins plus iCamp/YW read tokens. Do not rotate or reveal values to repair failed checks.
- iCamp/YW current signer/pin policy must be validated against independently verified deployed source revision.
- Comms Hub, Devil n Dove and Rosie Dazzlers require Cloudflare source-side signer/secret authority and may need other application maintainers.
- Ree's original Windows AI Hub outbound relay can be restored only by a genuine locally operating signer/host agent with source-authorized custody, not by cloud impersonation.
- Never count a queued HTTP request, historic receipt, simulated test, or operator acknowledgement as a fresh independent physical witness.

**Build handoff:** AI Data Platform Build451 • Master owner and source-side signer dependencies • owner connection-validation and source-authority pages • actionable signed failure classification • cryptographic/continuity regression tests and exact production READY • original-device and source-side secret gaps retained as separate HOLD.
