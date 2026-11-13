# AI Data Platform Build 389 / QL-442 — Signed Isolated Receiver Shutdown, Lease Expiry Enforcement, Independent OFF Attestation & Three-Master Pilot Closure Continuity

## Scope and authority boundary

QL-442 is the **AI Data Platform intelligence/coordination-side verification** of an isolated receiver shutdown after Comms Hub QL-441. It does **not** activate or deactivate any physical receiver, write a durable custody record, upgrade any Master/source to CONNECTED, or substitute an AI Data Platform signature for the original Windows host or the independent receiver observer.

Software production GREEN only certifies the code and CI checks. Until genuine external, source-bound, protected, signed records are supplied, the actual receiver state is **unverified**, and the correct operator disposition remains **HOLD**.

## Evidence required for a closure-ready decision

1. The exact durable **QL-441 GO or NO_GO witnessed ON review-only** summary, unchanged original incident/challenge/lease, original independently witnessed ON digest and decision receipt digest. The prior record must have `connection=HOLD`, `activationAuthorized=false`, and `receiver=ON_WITNESSED_ISOLATED_LEASE_SHUTDOWN_REQUIRED`.
2. An independently pinned, fresh signed **Comms Hub source proof** of the precise QL-441 summary digest and protected decision receipt. A previous unsigned or stale browser card is not a trusted source.
3. The **original Windows host DESKTOP-AE894KC** signs a fresh `OFF` shutdown receipt bound to the exact incident, challenge, lease, prior independent ON digest and QL-441 decision receipt; watchdog must be armed and shutdown sequence strictly positive. No TEMPLAR substitution, missing watchdog, ON receipt or unsigned claim is acceptable.
4. A **distinct independent receiver observer** signs a later `OFF` reading bound to the original signed host shutdown hash, with a shutdown continuity sequence no lower than the host's. The host cannot sign the receiver observer's evidence with the same key.
5. Compare **both host shutdown and independent OFF observation times** with the original QL-441 lease expiry using a separately verified protected clock. If either observed OFF *after* expiry, classify `LATE_OFF_ATTESTED_LEASE_EXCEPTION_OPEN`; do not close the incident or present an on-time release.
6. Three **distinct signed Master reports**—`rosevear-ai-hub`, `rosevear-comms-hub`, `ai-data-platform`—must bind the same original host shutdown and independent OFF hashes. On-time signers must say `SIGNED_OFF_CLOSEOUT_REVIEW` with `ON_TIME`; late signers must say `SIGNED_LATE_OFF_KEEP_EXCEPTION_OPEN` with `EXPIRED_EXCEPTION`. A missing, forged, duplicated, inconsistent, stale or authority-broadening report fails closed.
7. Two **different original owner and reviewer identities** must each sign the same source-bound closeout action and canonical (Master-ID ordered) three-Master report digest. On-time decision: `CLOSE_ISOLATED_PILOT_ONLY_NO_ACTIVATION`. Expired-lease decision: `ACKNOWLEDGE_LEASE_EXCEPTION_KEEP_OPEN`.

## Status/decision semantics

The pure function `evaluateQl442IsolatedShutdown` returns one of:

- `HOLD`: incomplete, tampered, stale, mismatched or missing evidence. Request new signed independent OFF and manual receiver isolation as needed.
- `SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION`: valid, fresh source/host/observer/three-Master/two-owner evidence with both OFF timestamps within the original lease. This is **evidence acceptance only**, not a committed or persisted closure.
- `LATE_OFF_ATTESTED_LEASE_EXCEPTION_OPEN`: both independently signed OFF witnesses are valid, but at least one OFF observation occurred after lease expiry. Requires separately reviewed lease exception and evidence renewal; pilot remains OPEN.

**All three outcomes** explicitly retain `connection=HOLD`, `activationAuthorized=false`, `physicalReceiverCurrentlyOff=false` (a historical signed reading is not a fresh physical state reading) and `manualIsolationAndIndependentOffRequired=true`. A later authoritative custodian must separately implement one-use protected append-only evidence admission, fsync/transactional readback, exception/replay controls and fresh independent receiver OFF confirmation before any real closure claim. This build intentionally **does not** pretend a Node/TypeScript model has contacted the actual Windows host.

## Regression and promotion

`apps/web/scripts/verify-build-389-ql442-shutdown-closure.ts` covers a positive on-time decision, late-lease exception, untrusted clock, missing QL-441 custody, replay, source forgery, host machine/ON/watchdog/lease mismatch, independent receiver absence/sequence rollback/forgery/staleness, missing/duplicate/false-connect Master decision, owner identity collision/activation intent/signature mismatch/staleness.

The verifier is included in the web `ci:spine` and `build` gates and available as `pnpm --filter @rosevear/ai-data-web verify:build389`. Follow the repository's authoritative `Verify` workflow on PR to `main` (Node 24, pnpm 12, Postgres 18, migrations, typecheck, lint, compact promotion suite; historical audit when impact requires). Production readiness requires a successful exact commit on `main`, not just a passing feature-branch pipeline.

## Master Shell presentation

Keep the Build 388 governed Master Instrument theme. Where QL-442 appears in the intelligence dashboard, show: three signed Master verdicts; independent OFF receipt timestamp/source; original Windows shutdown receipt; lease expiry/late exception; the exact digest; and clear `HOLD` vs `CLOSURE-READY EVIDENCE` labels. Never substitute a coloured GREEN styling badge for a fresh authenticated runtime OFF reading or permission to activate.

**Next proposed AI Data Platform Build 390 / QL-443 — Protected Shutdown Custody Admission, Expired-Lease Exception Handoff & Three-Master Fresh OFF Readback Renewal.**
