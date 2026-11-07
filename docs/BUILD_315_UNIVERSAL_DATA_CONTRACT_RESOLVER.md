# Build 315 — Universal Data Contract Resolver & Host Schema Discovery

## Purpose

Build 315 packages the existing Build 286 canonical contract registry, Build 287 field-mapping rules and Build 288 schema-drift engine behind one host-neutral, read-only discovery contract.

Initial schema discovery requires structural descriptors only. Raw business records are neither required nor accepted by the discovery API.

## Host schema descriptors

A host supplies:

- stable host application ID;
- host environment;
- schema ID;
- source schema version;
- structural field descriptors: path, type, required flag and optional enum values.

The resolver normalizes the descriptor and records two hashes:

- source schema fingerprint;
- descriptor evidence fingerprint binding host, environment, schema ID/version and source fingerprint.

No record values, credentials or tenant contents are included.

## Canonical contract resolution

The resolver uses the existing canonical registry from Build 286.

Resolution reports:

- canonical contract ID/version;
- canonical schema ID;
- canonical schema fingerprint;
- compatibility result;
- required-field diagnostics;
- mapping validation;
- mapping suggestions;
- schema-drift analysis when a prior profile exists.

A compatibility result is evidence for review only. It does not authorize data exchange.

## Mapping suggestions

Build 315 suggests mappings without saving or approving them.

A deterministic suggestion requires one unique normalized field-name match with compatible types. A required target with only one type-compatible candidate may be suggested as review-required.

Every suggestion contains `autoApproved: false`.

Build 287 remains authoritative for actual mapping validation and persistence.

## Required-field diagnostics

Every required canonical target is reported as:

- already mapped;
- unmapped with a reviewable suggestion; or
- unmapped with no unique compatible suggestion.

Unmapped required targets remain blocking.

## Drift integration

When a previous mapping profile is supplied, Build 315 delegates to Build 288 for:

- source version drift;
- source fingerprint drift;
- canonical fingerprint changes;
- field additions/removals;
- type/required/enum changes;
- affected mappings;
- repair suggestions.

No repair is automatically applied.

## Live-safe discovery

`GET /api/module-data-contracts` returns only canonical contract metadata, fingerprints, required-field structure and resolver policy.

It does not return source record contents.

## Security boundary

Build 315 does **not**:

- require or inspect raw source records for discovery;
- grant authorization from schema discovery;
- auto-approve mapping suggestions;
- authorize live exchange from compatibility;
- activate a peer connection;
- resume QL-266.

QL-266 remains `DISCONNECTED / HOLD`.

## QL-365D Comms attachment closure work

The same release closes the concrete source-side software gaps identified by the QL-365D six-app handoff:

- source identity remains exactly `ai-data-platform`;
- repository remains `RosevearCreations/ai-data-platform`;
- shell boundary remains `support_broker / no_customer_tenant`;
- health handler remains `GET /api/integration/v1/shell/health`;
- the public discovery manifest now uses an immutable 40-character source revision;
- the route now supplies fail-closed source authorization, one-use claim and source-signing adapters;
- source/master QL-362 approvals are cryptographically reverified against separately enrolled public pins;
- verified public authority records are read-only to the runtime;
- the runtime can only insert one append-only operation claim;
- source receipt signing requires the existing QL-256 app-specific Ed25519 signer to report `SIGNER_EXISTS_CUSTODY_VERIFIED`, match its independently enrolled source-signer pin and be present in the server secret environment.

The release does not promote the QL-256 signer from Preview to Production and does not change its custody state. That remains an original human trust decision.

The public manifest remains unsigned while source-signer custody is unverified. This is intentionally a HELD discovery state, not a fabricated signed contract.

## Genuine connection boundary

Synthetic handler tests prove request scoping, signature format, replay rejection and response redaction. They do not prove a genuine private TEST.

A genuine QL-365D/QL-362 TEST still requires the original external issuer/witness/enrollment chain, independently enrolled source/master/source-signer pins, the exact signed owner approvals, one fresh operation and an independently verified receipt/closure.

Until that evidence exists, the correct state is `DISCONNECTED / HOLD`.

## Next queued build

**Build 316 — Cross-App Search & Linked Record Explorer** remains the next product roadmap item. It is not required to complete QL-365D Comms authentication.
