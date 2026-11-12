# AI Data Platform Build 378 — YW562 Runtime Prerequisite Evidence Intake, Fresh Source-Bound Receipt Admission, QL-422 Original-Host Witness/Three-Master Ledger Correlation & Protected Activation Readiness

## Objective

Build 378 advances the Yard Workers YW562 path without manufacturing runtime trust.

It adds four controller stages:

1. cryptographically verify and admit a source-signed YW562 runtime-prerequisite report;
2. bind the exact fresh YW562 source-health receipt to that verified runtime evidence;
3. correlate QL-422 original-host / three-Master evidence while keeping owner-submitted references non-authoritative;
4. calculate protected activation readiness without turning on a receiver, marking CONNECTED or marking the three Masters synchronized.

## Current production baselines

Build 378 is bound to the production revisions observed at implementation:

- AI Data Platform Build 377 main: `6b09a552bf7e17331ea311bf6c983afadeaa134a`
- Yard Workers YW562 main: `6e0b77eebcfc77aa7fc48dcc398da958af8df696`
- Rosevear AI Hub Build 312 main: `e64e4b2e79e7c07bbd077284c298207414b149ad`
- Rosevear Comms Hub QL-422 main: `5f360821b361b43dd28aa5b2ca4c147565a84f0a`
- required original AI Hub host: `DESKTOP-AE894KC`

The current external handoffs remain fail-closed.

YW562 explicitly reports that the required YW553–561 schema chain was not proven installed in its connected database at authoring. In particular, the prerequisite `ywi_landscape_recovery_cases_556` and `ywi_landscape_provider_verified_561` tables were absent. YW562 itself additionally depends on `ywi_landscape_provider_pilot_decisions_562`, RLS, the original owner helper and the protected Master summary.

AI Hub 312 exposes code-level original-host/controller/three-Master review but states that signed pilot evidence, three-Master receipts, owner certification, receiver and connection remain HOLD.

Comms QL-422 remains a protected metadata reconciliation model. It reports receiver OFF, connection HOLD, owner acceptance HOLD and slave onboarding HOLD unless separately authenticated protected runtime evidence exists.

## Source-signed YW562 runtime-prerequisite intake

Build 378 defines the canonical signed report:

`rosevear.yw.runtime-prerequisite-evidence.v1`

The server accepts the report only when all of the following are true:

- exact source = `yw`;
- environment = production;
- source revision exactly equals YW562 production main;
- exactly one active YW signer is enrolled;
- the signer public key is recovered from the previously committed Build 366 enrollment;
- the enrolled public-key fingerprint exactly matches the trusted signer registry;
- key type is Ed25519;
- the report signature verifies over the canonical payload;
- the exact prerequisite table set is present:
  - `ywi_landscape_recovery_cases_556`
  - `ywi_landscape_provider_verified_561`
  - `ywi_landscape_provider_pilot_decisions_562`
- ordered schema dependency verification, RLS verification, owner-helper verification and protected-summary verification are all asserted inside the signed report;
- the report is no more than 15 minutes old and not more than two minutes in the future;
- the signed nonce is unique.

The controller stores only the report digest, signature digest, evidence reference and bounded metadata. It does not store a private key or raw signed source envelope.

## Fresh source-bound receipt admission

Build 378 reuses the existing trusted source ledgers.

The exact current YW562 receipt must already satisfy:

- exact YW562 source and manifest revisions;
- current uniquely enrolled signer;
- current receipt age;
- controller health admission = `ADMITTED`;
- exact durable replay correlation = `VERIFIED_CORRELATED`.

Only after current source-signed runtime-prerequisite evidence is `VERIFIED_CURRENT` can Build 378 create an append-only `ADMITTED_CURRENT` binding between that runtime evidence and the exact receipt.

This admission is evidence correlation. It is not Master owner acceptance.

## Exact Master owner acceptance

Protected activation readiness also requires the existing append-only owner-decision audit to contain an explicit `ACCEPT` for the same exact current YW562 receipt.

A missing decision remains HOLD. A REJECT remains HOLD. Historical YW561 decisions cannot apply.

## QL-422 original-host / three-Master correlation

Build 378 stores sanitized correlation metadata for:

- exact Build 377 controller revision;
- exact YW562 production revision;
- exact AI Hub Build 312 production revision;
- exact Comms QL-422 production revision;
- original host `DESKTOP-AE894KC`;
- source episode;
- source receipt digest;
- receiver ACK digest;
- closure digest;
- handoff receipt ID;
- original-host witness digest;
- exactly three distinct Master receipts:
  - `rosevear-ai-hub`
  - `rosevear-comms-hub`
  - `ai-data-platform`
- terminal durable-ledger digest;
- five-minute protected evidence freshness.

### Authority boundary

The normal owner/browser runtime can write only:

- `evidence_authority = owner-reference-only`
- `correlation_state = CANDIDATE_HOLD`

Database constraints and RLS prohibit that path from writing `VERIFIED_CORRELATED`.

A trusted future protected backend may insert:

- `evidence_authority = protected-runtime`
- `actor_user_id = NULL`
- `correlation_state = VERIFIED_CORRELATED`

Only that protected-runtime state is considered verified by the Build 378 model.

A later owner reference does not overwrite a still-current protected correlation; protected evidence remains independently selected.

## Protected activation readiness

Build 378 yields `READY_FOR_PROTECTED_ACTIVATION` only when all are simultaneously current:

- YW562 signed runtime prerequisites = `VERIFIED_CURRENT`;
- exact YW562 source receipt = `ACTIVE_CURRENT`;
- Build 378 receipt binding = `ADMITTED_CURRENT`;
- exact current Master owner decision = `ACCEPTED_CURRENT`;
- QL-422 protected correlation = `VERIFIED_CORRELATED`.

Even then Build 378 reports:

- connection = `DISCONNECTED_HOLD`;
- mastersSynced = false.

A later activation build must perform any actual receiver/connection transition under a separate protected contract.

## Persistence

Migration `0142_master_yw562_runtime_ql422_protected_readiness.sql` adds four append-only RLS-protected ledgers:

- `app.master_yw562_runtime_prerequisite_evidence_intakes`
- `app.master_yw562_fresh_source_receipt_admission_events`
- `app.master_ql422_original_host_three_master_correlation_events`
- `app.master_build378_protected_activation_readiness_events`

Runtime UPDATE and DELETE remain revoked.

## Current truthful state

At the current observed production evidence:

- YW562 code: GREEN, runtime prerequisite installation independently unproven;
- fresh exact YW562 controller receipt: not established here;
- exact current Master owner ACCEPT: not established here;
- AI Hub Build 312 protected pilot: HOLD;
- Comms QL-422 protected correlation: HOLD;
- protected activation readiness: HOLD;
- connection: `DISCONNECTED_HOLD`;
- Masters synchronized: false.

Build 378 implements the admission and readiness path; production GREEN does not fabricate the missing runtime evidence.
